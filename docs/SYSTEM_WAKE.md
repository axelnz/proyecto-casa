# Activación desde la app

El login permite comprobar el servidor y reactivar un proyecto Supabase pausado. También aparece la comprobación dentro de la app si falla la conexión o una solicitud devuelve un error 5xx. El usuario ingresa un **código de activación independiente**; nunca su contraseña de Supabase. Después de verificar la conexión a la tabla de usuarios, la página vuelve a cargar `/login`, cierra cualquier sesión local anterior y enfoca la contraseña.

Supabase acepta una solicitud de restore y expone estados, pero no un porcentaje de avance. La UI muestra etapas y una barra indeterminada. La espera se limita a cinco minutos por intento. Un timeout no cancela una restauración en curso; el siguiente intento comprueba el estado primero.

## Configuración del despliegue actual

La app publicada usa:

- Frontend: `https://proyecto-casa-three.vercel.app` (Vercel).
- API Express: `https://proyecto-casa-api.onrender.com/api` (Render).
- Proyecto Supabase: `oqsgvmpvnluppzofjnjf`.

Configurar estas variables **en el servicio backend de Render** y volver a desplegarlo:

| Variable | Valor |
| --- | --- |
| `SUPABASE_PROJECT_REF` | `oqsgvmpvnluppzofjnjf` |
| `SUPABASE_MANAGEMENT_TOKEN` | Token de Management API autorizado para consultar y reactivar ese proyecto |
| `SYSTEM_WAKE_CODE` | Código aleatorio de 12 a 256 caracteres compartido solo con quienes pueden activarlo |
| `DATABASE_URL` | Mantener la conexión actual a la misma base |
| `CORS_ORIGIN` | Incluir el origen exacto del frontend |
| `TRUST_PROXY` | Ajustar a la topología real del proxy; usar direcciones/subredes confiables o número de saltos verificado |

En Vercel mantener `VITE_API_BASE_URL=https://proyecto-casa-api.onrender.com/api`. **No publicar el token administrativo ni el código en variables `VITE_`, JavaScript, Git o logs.** Publicar primero la API y luego el frontend.

El token se genera desde la sección de access tokens de Supabase. Usar, si la cuenta lo permite, un token restringido al proyecto con `project_admin_read` y `project_admin_write` (OAuth: `projects:read` y `projects:write`). Si solo hay tokens personales clásicos, heredan los permisos de la cuenta: evaluar su alcance antes de emitirlos, usar una identidad con acceso limitado y prever su revocación/rotación. Las claves `anon` y `service_role` no reemplazan un token de Management API. No es necesario guardar la contraseña de la cuenta de Supabase.

El código de activación concede solo la operación implementada de despertar este proyecto; no autentica al usuario ni permite leer datos financieros. Debe configurarse explícitamente, no tiene valor por defecto y la función falla cerrada si falta. Con la base disponible, el login y la comprobación funcionan aunque esta opción no esté configurada.

Incluso restringido al proyecto, el permiso Project Settings de lectura/escritura incluye otras operaciones administrativas (como pausar o borrar el proyecto). Supabase no ofrece en este grupo un permiso exclusivo de despertar. La aplicación expone solamente la reactivación y no permite seleccionar otra operación, pero el token requiere protección como cualquier secreto administrativo.

## Controles implementados

- `GET /api/system/status`: consulta de solo lectura, salida mínima, sin IDs, hosts ni secretos; máximo 60 solicitudes por IP/minuto, caché de 5 segundos y una comprobación concurrente por proceso.
- `POST /api/system/wake`: verifica el código con comparación de hash en tiempo constante; máximo 5 intentos por IP/15 minutos; JSON de hasta 1 KB.
- El servidor llama únicamente a la URL fija de Supabase y al proyecto configurado. El cliente no puede elegir un proyecto, URL ni operación administrativa.
- Solo envía restore para `INACTIVE`, evita solicitudes concurrentes y aplica cinco minutos de espera incluso si se pierde la respuesta. Nunca pausa ni reinicia un proyecto activo.
- La comprobación usa un pool separado, una conexión y timeouts de conexión/consulta de cuatro segundos. No inicializa tablas ni lee filas de usuarios en la respuesta HTTP.
- El pool principal limita a cinco segundos la espera de conexión y tolera el cierre de conexiones inactivas para reconectar después de una pausa.
- El frontend consulta cada cinco segundos, admite el arranque de Render, detiene las consultas al salir y no repite un POST de resultado incierto. No reintenta logins ni escrituras de negocio.
- Los límites y la deduplicación viven en memoria de una instancia de Node. Si se escala a varias réplicas, usar un store/lock compartido independiente de Supabase antes de habilitar la activación. Los reinicios del proceso también reinician esos límites.
- Verificar `TRUST_PROXY` en Render para que la IP del cliente sea correcta sin confiar en encabezados falsificados. No establecer `true` sin validar la cadena de proxies.

## Validación

Ejecutar desde la raíz, con Node 18 o superior:

```sh
npm ci --prefix backend
npm ci --prefix frontend
npm test --prefix backend
npm test --prefix frontend
npm run build:frontend
```

Los tests simulan la API de Supabase; no pausan ni restauran la base real. Para comprobar el despliegue, usar primero el estado actual: debe mostrar listo cuando la conexión a la base funciona. Probar una reactivación real cuando el proyecto esté pausado, verificando que el código incorrecto sea rechazado y que el correcto llegue a listo antes de recargar. No pausar producción como parte de una prueba automática.

## Ordenamiento de tablas

Las siete tablas conservan el orden inicial recibido. El primer clic en una columna ordena ascendente; el siguiente, descendente. Otra columna empieza ascendente. Se ordena una copia estable, con fechas/números según su tipo y textos en español. Los importes de gastos se ordenan por el valor absoluto que muestra la celda. La vista previa de importación ordena todos los movimientos antes de mostrar los primeros 50; no modifica el orden de la importación. Las columnas de acciones no se ordenan. Los encabezados siguen accesibles por teclado y en móvil.

## Referencias

- [Reactivar proyecto](https://supabase.com/docs/reference/api/v1-restore-a-project)
- [Consultar proyecto](https://supabase.com/docs/reference/api/v1-get-project)
- [Tokens personales](https://supabase.com/docs/guides/platform/personal-access-tokens)
- [Pausa de proyectos](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Arranque de Render Free](https://render.com/docs/free)
