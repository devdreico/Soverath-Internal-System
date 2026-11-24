# Recuperación de MFA — SIS

1. Generar códigos de recuperación de un solo uso fuera de la app o en un proceso controlado.
2. Guardar solo hashes en `private.mfa_recovery_codes`.
3. Al usar un código, marcar `used_at` y no permitir reutilización.
4. Revocar y regenerar códigos tras cualquier uso o sospecha de exposición.
5. Nunca guardar códigos en claro ni en logs.
