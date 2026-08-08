-- Corrige dependências nas exclusões auditadas e permite estorno de pedido cancelado.
-- Pedidos cancelados continuam fora de todos os totais financeiros e de fidelidade.

create or replace function public.admin_delete_cancelled_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare o public.orders%rowtype; snap jsonb;
begin
  if not public.club_is_admin() then raise exception 'Acesso administrativo necessário.'; end if;
  select * into o from public.orders where id=p_order_id for update;
  if not found then raise exception 'Pedido não encontrado ou já excluído.'; end if;
  if o.status <> 'cancelled' then raise exception 'Somente pedidos cancelados podem ser excluídos.'; end if;

  snap := jsonb_build_object(
    'order', to_jsonb(o),
    'transactions', coalesce((select jsonb_agg(to_jsonb(t) order by t.occurred_at) from public.order_transactions t where t.order_id=o.id),'[]'::jsonb),
    'financialEntries', coalesce((select jsonb_agg(to_jsonb(f) order by f.occurred_at) from public.financial_entries f where f.order_id=o.id),'[]'::jsonb),
    'clubPayments', coalesce((select jsonb_agg(to_jsonb(cp) order by cp.paid_at) from public.club_payments cp where cp.order_id=o.id),'[]'::jsonb),
    'clubPoints', coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at) from public.club_points_ledger l where l.order_id=o.id),'[]'::jsonb)
  );

  insert into public.admin_deletion_audit(entity_type,entity_id,snapshot,deleted_by)
    values('order',o.id,snap,auth.uid());

  delete from public.financial_entries where order_id=o.id;
  delete from public.club_points_ledger where order_id=o.id;
  delete from public.club_payments where order_id=o.id;
  delete from public.order_transactions where order_id=o.id;
  delete from public.orders where id=o.id;

  return jsonb_build_object('id',o.id,'deleted',true);
end $function$;

create or replace function public.club_admin_delete_customer(p_customer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare c public.club_customers%rowtype; snap jsonb;
begin
  if not public.club_is_admin() then raise exception 'Acesso administrativo necessário.'; end if;
  select * into c from public.club_customers where id=p_customer_id for update;
  if not found then raise exception 'Membro do Clube não encontrado ou já excluído.'; end if;

  snap := jsonb_build_object(
    'customer', to_jsonb(c) - 'pin_hash',
    'pointsBalance', public.club_points_balance(c.id),
    'ledger', coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at) from public.club_points_ledger l where l.customer_id=c.id),'[]'::jsonb),
    'payments', coalesce((select jsonb_agg(to_jsonb(cp) order by cp.paid_at) from public.club_payments cp where cp.customer_id=c.id),'[]'::jsonb)
  );

  insert into public.admin_deletion_audit(entity_type,entity_id,snapshot,deleted_by)
    values('club_customer',c.id,snap,auth.uid());

  delete from public.club_sessions where customer_id=c.id;
  delete from public.club_points_ledger where customer_id=c.id;
  delete from public.club_payments where customer_id=c.id;
  delete from public.club_customers where id=c.id;

  return jsonb_build_object('id',c.id,'deleted',true);
end $function$;

create or replace function public.club_sync_points_for_order(p_order_id uuid, p_reason text default null::text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare o public.orders%rowtype; cid uuid; ratio numeric; net numeric; target integer; current integer; delta integer;
begin
  select * into o from public.orders where id=p_order_id;
  if not found then return 0; end if;
  select c.id into cid from public.club_customers c where c.whatsapp=public.club_normalize_phone(o.customer_whatsapp) and c.pin_hash is not null and c.activated_at is not null and c.deleted_at is null limit 1;
  if cid is null then return 0; end if;
  select reais_per_point into ratio from public.club_settings where id=1 and active;
  if ratio is null or ratio<=0 then return 0; end if;

  if o.status='cancelled' then
    target:=0;
  else
    select greatest(coalesce(sum(amount) filter(where type='payment'),0)-coalesce(sum(amount) filter(where type='refund'),0),0)
      into net from public.order_transactions where order_id=o.id;
    target:=floor(net/ratio)::integer;
  end if;

  select coalesce(sum(points),0) into current from public.club_points_ledger where order_id=o.id and type in('payment','reversal');
  delta:=target-current;
  if delta<>0 then
    insert into public.club_points_ledger(customer_id,order_id,payment_id,points,type,description)
    values(cid,o.id,null,delta,case when delta>0 then 'payment' else 'reversal' end,
      coalesce(nullif(trim(p_reason),''),case when delta>0 then 'Pontos por valor pago no pedido '||o.public_code else 'Ajuste de pontos por estorno/cancelamento no pedido '||o.public_code end));
  end if;
  return delta;
end $function$;

create or replace function public.admin_register_order_refund(p_order_id uuid, p_amount numeric, p_method text, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare o public.orders%rowtype; s jsonb; paid numeric; tid uuid; delta integer; cid uuid; balance integer:=0;
begin
  if not public.club_is_admin() then raise exception 'Acesso administrativo necessário.'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Informe um valor maior que zero.'; end if;
  if p_method not in('pix','cash','card_link','other') then raise exception 'Forma de estorno inválida.'; end if;
  if char_length(trim(coalesce(p_reason,'')))<3 then raise exception 'Informe o motivo do estorno.'; end if;
  select * into o from public.orders where id=p_order_id and deleted_at is null for update;
  if not found then raise exception 'Pedido não encontrado.'; end if;

  s:=public.order_financial_summary(o.id);
  paid:=(s->>'paid')::numeric;
  if p_amount>paid+0.009 then raise exception 'O estorno não pode ser maior que o valor líquido já recebido.'; end if;

  insert into public.order_transactions(order_id,type,amount,method,note,created_by)
    values(o.id,'refund',round(p_amount,2),p_method,trim(p_reason),auth.uid()) returning id into tid;
  insert into public.financial_entries(kind,category,amount,description,order_id,order_transaction_id,created_by)
    values('expense','refund',round(p_amount,2),'Estorno do pedido '||o.public_code||': '||trim(p_reason),o.id,tid,auth.uid());

  delta:=public.club_sync_points_for_order(o.id,'Estorno registrado no pedido '||o.public_code);
  select c.id into cid from public.club_customers c
    where c.whatsapp=public.club_normalize_phone(o.customer_whatsapp) and c.pin_hash is not null and c.activated_at is not null and c.deleted_at is null limit 1;
  if cid is not null then balance:=public.club_points_balance(cid); end if;

  return public.order_financial_summary(o.id)||jsonb_build_object('transactionId',tid,'pointsAdjusted',delta,'pointsBalance',balance,'orderStatus',o.status);
end $function$;
