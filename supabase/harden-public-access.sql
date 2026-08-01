-- Remove permissões públicas desnecessárias detectadas pelo Security Advisor.

begin;

-- Buckets públicos servem arquivos pela URL pública sem uma policy SELECT.
-- Retirar a policy impede a listagem do conteúdo completo do bucket.
drop policy if exists "public can view product images" on storage.objects;

-- Função preexistente no projeto: não deve ficar exposta como RPC pública.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

commit;
