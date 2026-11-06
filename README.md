# Soverath Internal System (SIS)

Base web privada de **Andrei / Founder**.

## Asistente AI

El botón **AI** abre un chat conectado a los datos privados de SIS. Cada solicitud vuelve a validar el JWT, el usuario Founder y el nivel MFA AAL2; las consultas y mutaciones a Supabase usan el token del usuario y respetan RLS. El asistente busca y pagina tablas permitidas, y puede proponer crear, editar o borrar registros; cada propuesta muestra los valores relevantes, caduca a los diez minutos y requiere confirmación manual. No se permite SQL arbitrario ni lectura de bytes de archivos privados.

Aplica en Supabase `0001_sis_base.sql`, `0002_file_workspaces.sql` y `0003_ai_action_proposals.sql`, en ese orden. La clave de Gemini debe configurarse como variable privada del servidor. El contenido de los mensajes y los datos SIS consultados se envían a Google AI Studio; verifica las condiciones de privacidad, retención y uso de datos del proyecto antes de introducir información sensible.

Configura `GOOGLE_AI_STUDIO_API_KEY` como variable privada del servidor (por ejemplo, en `.env.local` durante desarrollo o en las variables de entorno del despliegue). No uses el prefijo `NEXT_PUBLIC_` para esta clave. `GOOGLE_AI_MODEL` es opcional y por defecto usa `gemini-flash-lite-latest`. `SIS_FOUNDER_USER_ID` es opcional si `NEXT_PUBLIC_FOUNDER_USER_ID` ya está configurado.
