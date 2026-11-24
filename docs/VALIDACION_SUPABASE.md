# Validación de Supabase — SIS

Ejecutar en este orden:

1. Aplicar `supabase/migrations/0001_sis_base.sql`.
2. Aplicar `supabase/migrations/0002_file_workspaces.sql`.
3. Aplicar `supabase/migrations/0003_ai_action_proposals.sql`.
4. Ejecutar `supabase/verify.sql` en el SQL Editor.
5. Confirmar que todas las tablas críticas existen.
6. Confirmar `rowsecurity = true` en tablas expuestas.
7. Confirmar políticas del Founder con AAL2.
8. Confirmar bucket `sis-private` con `public = false`.

No considerar SIS listo para datos reales hasta que esta validación pase.
