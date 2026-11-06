# Soverath Internal System (SIS)

Base web privada de **Andrei / Founder**. SIS usa Next.js, Supabase Auth, Postgres y Storage privado. Vercel aloja la aplicación; Supabase conserva los datos y aplica el control de acceso.

## Despliegue: Supabase y Vercel

Completa estos pasos en orden. No subas `.env.local`, contraseñas ni claves secretas a GitHub.

### 1. Preparar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com/dashboard). Guarda su URL y deja que termine de aprovisionarse.
2. En **Authentication → Providers → Email**, deja habilitado email/contraseña y desactiva los registros públicos. Crea manualmente el único usuario de SIS para Andrei / Founder desde el panel de usuarios. Confirma el correo desde el panel si Supabase lo requiere.
3. En **Authentication → Multi-Factor Authentication**, asegúrate de permitir el autenticador TOTP y la verificación de factores. SIS solicita Google Authenticator en el primer inicio y exige `aal2` después.
4. Abre **SQL Editor** y ejecuta una sola vez el archivo `supabase/migrations/0001_sis_base.sql` completo.
5. En el panel de usuarios de Supabase, copia el UUID del usuario Founder. En SQL Editor ejecuta, reemplazando el valor:

   ```sql
   insert into private.founder_access (user_id)
   values ('UUID-DEL-USUARIO-FOUNDER');
   ```

6. Copia la **Project URL** y la **Publishable key** desde **Project Settings → API Keys**. También se acepta la clave antigua `anon` si tu proyecto todavía no muestra una publishable key. No uses `secret` ni `service_role`.
7. En **Authentication → URL Configuration**, establece la URL pública de producción como **Site URL**, por ejemplo `https://tu-proyecto.vercel.app`. En **Redirect URLs**, añade esa URL con `/**`. Añade `http://localhost:3000/**` solo si vas a ejecutar SIS localmente.

### 2. Subir el proyecto a GitHub

Descomprime este archivo, crea un repositorio privado en GitHub y sube el contenido de la carpeta del proyecto. La raíz del repositorio debe contener `package.json`, `package-lock.json`, `vercel.json` y las carpetas `app/`, `components/`, `lib/` y `supabase/`.

`.gitignore` excluye variables de entorno, dependencias, cachés y archivos de Vercel. Conserva `.env.example` como referencia; nunca lo reemplaces con valores reales.

### 3. Importar en Vercel

1. En Vercel, crea un proyecto nuevo e importa el repositorio privado de GitHub. Deja **Root Directory** en `./` y el framework en **Next.js**. `vercel.json` fija instalación reproducible (`npm ci`) y compilación (`npm run build`). Node.js 22 está fijado en `package.json` y `.nvmrc`.
2. En **Settings → Environment Variables**, agrega estas tres variables para **Production**:

   | Variable | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (o clave `anon` antigua) |
   | `NEXT_PUBLIC_FOUNDER_USER_ID` | UUID del usuario Founder creado en Supabase |

3. Guarda las variables e inicia el despliegue. Cuando termine, copia la URL de producción y confirma que coincide con el **Site URL** de Supabase.
4. Abre la aplicación, inicia sesión con el usuario Founder y configura Google Authenticator escaneando el QR. SIS no muestra los datos hasta verificar el código TOTP.
5. En **Inicio**, pulsa **Cargar base inicial** para importar el catálogo. La importación agrega solo registros faltantes y no pisa tus ediciones.

Deja las variables en **Production** mientras verificas el sitio. Si habilitas Preview después, añade esas variables conscientemente y agrega el dominio Preview correspondiente a las Redirect URLs de Supabase. Al cambiar variables en Vercel, crea un nuevo despliegue para que Next.js las incorpore.

## Desarrollo local

Requiere Node.js 22 y npm. Copia `.env.example` a `.env.local`, reemplaza los tres valores con los del proyecto Supabase y luego ejecuta:

```bash
npm ci
npm run dev
```

Abre `http://localhost:3000`. Para que funcione el inicio de sesión local, permite `http://localhost:3000/**` en las Redirect URLs de Supabase.

## Qué incluye SIS

- Mapa editable de la red, compañías, marcas, servicios, sistemas y canales, con fuentes y procedencia.
- Conocimiento para estrategias, conceptos y procesos, con autoguardado e historial restaurable.
- Archivos privados para brandbooks, imágenes y documentos, con enlaces de descarga temporales.
- Misiones, proyectos y tareas por empresa, con prioridades, fechas y objetivos.
- Métricas configurables con valores fechados.
- Libro de operaciones interno en COP y balances calculados desde el historial de movimientos.
- Registro de actividad y exportación de registros a JSON.
- Carga inicial idempotente del catálogo público documentado en `INVENTARIO_DOMINIOS_PUBLICOS.md`.

El libro es para seguimiento de gestión: no emite factura electrónica DIAN ni reemplaza la contabilidad fiscal. Las integraciones externas aún no están activadas.

## Seguridad y datos

Las tablas y el bucket privado usan Row Level Security. El acceso a filas y archivos requiere el UUID registrado en `private.founder_access` y un JWT con nivel MFA `aal2`. El cliente solo usa la clave publicable, que no sustituye las políticas RLS. No crees una variable `NEXT_PUBLIC_*` para una clave `service_role` o `secret`.

La primera migración se ejecuta una sola vez en un proyecto Supabase nuevo. Las tablas de negocio se respaldan desde Supabase; usa la exportación JSON de SIS para una copia portátil de los registros. Los archivos binarios se descargan desde la biblioteca de SIS.
