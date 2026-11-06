# Soverath Internal System (SIS)

Base web privada de **Andrei / Founder**.

## Asistente AI

El botón **AI** abre un chat conectado a los datos privados de SIS. Cada solicitud vuelve a validar el JWT, el usuario Founder y el nivel MFA AAL2; las consultas y mutaciones a Supabase usan el token del usuario y respetan RLS. El asistente busca y pagina tablas permitidas, y puede proponer crear, editar o borrar registros; cada propuesta muestra los valores relevantes, caduca a los diez minutos y requiere confirmación manual. No se permite SQL arbitrario ni lectura de bytes de archivos privados.

Aplica en Supabase `0001_sis_base.sql`, `0002_file_workspaces.sql` y `0003_ai_action_proposals.sql`, en ese orden. Configura la clave del proveedor elegido como variable privada del servidor; nunca uses el prefijo `NEXT_PUBLIC_`.

`AI_PROVIDER` puede ser `openrouter` o `google`. Si se omite, el servidor elige OpenRouter cuando existe `OPENROUTER_API_KEY`; en otro caso usa Google. OpenRouter usa `OPENROUTER_MODEL` o `openai/gpt-oss-120b` por defecto. Google usa `GOOGLE_AI_MODEL` o `gemini-flash-lite-latest`. `SIS_FOUNDER_USER_ID` es opcional si `NEXT_PUBLIC_FOUNDER_USER_ID` ya está configurado.

El modelo predeterminado de OpenRouter es de pago por tokens; no existe garantía de cuota ilimitada. Verifica saldo y límites de la cuenta en OpenRouter antes de producción. Los modelos `:free` tienen límites de tasa que pueden devolver `429`.

El texto de mensajes y los registros recuperados se envían al proveedor/modelo activo. Revisa las condiciones de privacidad, retención y uso del proveedor, especialmente antes de enviar datos sensibles a modelos gratuitos.
