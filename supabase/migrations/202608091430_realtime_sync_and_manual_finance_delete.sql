create or replace function public.admin_delete_financial_entry(p_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.financial_entries%rowtype;
begin
  if not public.club_is_admin() then
    raise exception 'Acesso administrativo necessário.';
  end if;

  select * into v_entry
  from public.financial_entries
  where id = p_entry_id;

  if not found then
    raise exception 'Lançamento não encontrado.';
  end if;

  if v_entry.order_id is not null or v_entry.category in ('sale_payment', 'refund') then
    raise exception 'Este lançamento veio de um pedido ou pagamento e não pode ser excluído manualmente.';
  end if;

  delete from public.financial_entries where id = p_entry_id;
  return jsonb_build_object('id', p_entry_id, 'deleted', true);
end;
$$;

revoke all on function public.admin_delete_financial_entry(uuid) from public;
revoke all on function public.admin_delete_financial_entry(uuid) from anon;
grant execute on function public.admin_delete_financial_entry(uuid) to authenticated;

alter publication supabase_realtime add table
  public.products,
  public.categories,
  public.store_settings,
  public.orders,
  public.order_transactions,
  public.financial_entries,
  public.coupons,
  public.club_customers,
  public.club_payments,
  public.club_points_ledger,
  public.club_rewards,
  public.club_settings,
  public.marketing_campaigns,
  public.marketing_campaign_assets,
  public.marketing_campaign_badges,
  public.marketing_campaign_placements,
  public.marketing_campaign_price_rules,
  public.marketing_campaign_targets,
  public.marketing_settings,
  public.product_promotions;
