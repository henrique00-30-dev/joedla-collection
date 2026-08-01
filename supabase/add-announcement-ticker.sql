-- Adiciona os comunicados da faixa rolante às configurações públicas da loja.
-- A gravação continua restrita aos administradores pelas políticas existentes.

alter table public.store_settings
add column if not exists ticker_messages text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'store_settings_ticker_messages_limit'
      and conrelid = 'public.store_settings'::regclass
  ) then
    alter table public.store_settings
    add constraint store_settings_ticker_messages_limit
    check (cardinality(ticker_messages) <= 20);
  end if;
end;
$$;
