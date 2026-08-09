-- Auditoria de segurança 08/08/2026.
-- Mantém as exclusões administrativas disponíveis somente para sessões autenticadas.

revoke execute on function public.admin_delete_cancelled_order(uuid) from public, anon;
revoke execute on function public.club_admin_delete_customer(uuid) from public, anon;

grant execute on function public.admin_delete_cancelled_order(uuid) to authenticated;
grant execute on function public.club_admin_delete_customer(uuid) to authenticated;
