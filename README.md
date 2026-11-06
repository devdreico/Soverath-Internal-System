# Soverath Internal System (SIS)

Base web privada de **Andrei / Founder**.

## Asistente AI

El botón **AI** abre un chat conectado a los datos privados de SIS. Cada solicitud vuelve a validar el JWT, el usuario Founder y el nivel MFA AAL2; las consultas a Supabase usan el token del usuario y respetan RLS. El asistente puede leer los registros y proponer crear, editar o borrar datos de negocio en las tablas principales; cada operación muestra sus campos y requiere confirmación manual antes de ejecutarse. Las columnas están limitadas por tabla; no se permite SQL arbitrario ni manipulación de archivos binarios.

Configura `GOOGLE_AI_STUDIO_API_KEY` como variable privada del servidor (por ejemplo, en `.env.local` durante desarrollo o en las variables de entorno del despliegue). No uses el prefijo `NEXT_PUBLIC_` para esta clave. `GOOGLE_AI_MODEL` es opcional y por defecto usa `gemini-2.5-flash`. `SIS_FOUNDER_USER_ID` es opcional si `NEXT_PUBLIC_FOUNDER_USER_ID` ya está configurado.

El contenido de los mensajes y los datos SIS consultados se envían a Google AI Studio para generar cada respuesta. Verifica las condiciones de privacidad, retención y uso de datos del proyecto de Google antes de introducir información sensible.