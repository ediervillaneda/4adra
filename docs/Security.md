# Security.md

> **Proyecto:** 4adra  
> **Versión:** 1.0  
> **Estado:** Draft

## Objetivo

Define controles de autenticación, autorización, protección de datos, auditoría y respuesta ante incidentes para la PWA y el Cloudflare Worker `4adra` (API + autenticación).

## Principios obligatorios

- Denegar por defecto y aplicar mínimo privilegio.
- Nunca confiar en entradas del cliente ni en datos cacheados para autorizar escrituras críticas.
- Validar y autorizar en el Worker antes de escribir.
- Separar entornos de desarrollo, pruebas y producción.
- No registrar secretos, tokens, información financiera completa ni datos personales innecesarios.

## Autenticación

Better Auth dentro del Worker es el proveedor oficial (ADR-016), con Google como único método de inicio de sesión. Toda ruta `/api/v1/*` requiere la cookie de sesión emitida por Better Auth (`__Secure-better-auth.session_token`).

- **Cookie:** `HttpOnly; Secure; SameSite=Lax`, del mismo origen que la PWA. JavaScript no puede leerla y no viaja a otros sitios. En local se omite `Secure` porque `localhost` es HTTP.
- **Validación de la sesión:** en cada solicitud se valida la firma (con `BETTER_AUTH_SECRET`), la existencia en D1 y la expiración. Una cookie ausente, alterada o vencida produce un `401 UNAUTHENTICATED` sin detalles.
- **Identidad:** no se aceptan `userId`, roles ni pertenencia enviados por el cliente como autoridad. El actor sale únicamente de la sesión validada.
- **Acceso solo por lista (ADR-018):** solo puede crear una cuenta un correo vigente en `allowed_emails`. Cualquier otro recibe `NOT_INVITED` y no se crea ningún registro. La inscripción y la revocación son manuales (`Deployment.md`). Para bloquear a un usuario ya registrado se usa `users.status = 'DISABLED'`.
- **Tokens de Google en reposo:** los `accessToken`, `refreshToken` e `idToken` de Google se cifran en D1 (`account.encryptOAuthTokens`, XChaCha20-Poly1305 con `BETTER_AUTH_SECRET`). La app no los usa después del login.
- **Renovación de sesión:** cuando Better Auth extiende una sesión durante una solicitud `/api/v1/*`, el Worker reenvía el `Set-Cookie` renovado.
- **Cierre de sesión:** `POST /api/auth/sign-out` invalida la sesión en D1, no solo en el navegador.
- **Cuentas administrativas:** usar MFA de Google en las cuentas que administren Cloudflare, GitHub y Google Cloud Console.

## Autorización

La pertenencia activa y rol se verifican en servidor dentro de una transacción o lectura consistente.

| Acción | Owner | Administrator | Member | ReadOnly |
|---|---:|---:|---:|---:|
| Consultar grupo, gastos y balances | Sí | Sí | Sí | Sí |
| Crear gasto | Sí | Sí | Sí | No |
| Editar/eliminar gasto | Sí | Sí | Sí, cualquier gasto activo del grupo | No |
| Invitar/remover miembros | Sí | Sí | No | No |
| Cambiar roles o archivar | Sí | No | No | No |
| Confirmar liquidación | Sí | Sí | Sí, si es pagador o destinatario | No |
| Activar perfil de cálculo | Sí | Sí | No | No |

Nunca permitir que un grupo quede sin Owner. D1 y R2 no son accesibles desde clientes: solo el Worker tiene sus bindings, así que no existen reglas de acceso directo que mantener (ADR-015). Los recursos financieros se escriben únicamente mediante rutas autenticadas del Worker.

## Validación y concurrencia

Validar esquema JSON, tipos, límites, campos permitidos, monedas ISO-4217, importes decimales positivos, participantes, estados, porcentajes, tasas y versiones. Usar `Idempotency-Key` en mutaciones e `If-Match` + restricciones `UNIQUE`/`CHECK` y escrituras `db.batch` atómicas en D1 para concurrencia. Limitar tamaños de texto, archivos y participantes.

Límites por defecto (ADR-011, ajustables vía `appSettings` sin cambio de código): adjuntos en `image/jpeg`, `image/png`, `image/webp` o `application/pdf`, máximo 10 MB por archivo y 5 adjuntos activos por gasto. Rate limiting por defecto: 60 solicitudes/minuto por usuario autenticado en mutaciones, 300/minuto en lecturas, y 20/minuto por IP en rutas no autenticadas; exceder el límite responde `429 RATE_LIMITED`.

## Protección de datos

- TLS obligatorio; no permitir HTTP.
- Cifrado en reposo administrado por Cloudflare (D1 y R2).
- Adjuntos en R2 con claves no adivinables y URLs firmadas de corta duración.
- Recopilar solo datos necesarios; no guardar tarjetas, cuentas bancarias, contraseñas ni tokens de pago.
- Retención por defecto (ADR-011, `Proposed` — pendiente de validación legal por jurisdicción de operación): los datos personales (nombre, correo, foto) se conservan mientras la cuenta esté activa; tras una solicitud de eliminación de cuenta, se anonimizan en un plazo máximo de 30 días. La auditoría financiera (montos, fechas, IDs opacos) se conserva de forma indefinida o según la normativa fiscal aplicable, incluso después de anonimizar al actor.
- URLs firmadas de adjuntos y de descarga de reportes: 15 minutos de duración por defecto (ADR-011).

## Secretos, auditoría y monitoreo

Los secretos y claves externas nunca van en el repositorio, el cliente, los logs ni la documentación. Dónde vive cada uno:

- **Producción:** `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` como secrets del Worker (`wrangler secret put`).
- **Local:** `backend/.dev.vars`, ignorado por git. Solo `backend/.dev.vars.example` va al repositorio, y sin valores.
- **CI:** `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` como secrets de GitHub Actions. El token usa permisos mínimos (Workers Scripts Edit, D1 Edit y la zona `edier.me`).

Rotar `BETTER_AUTH_SECRET` invalida todas las sesiones. Hacerlo de inmediato ante una sospecha de filtración, y revocar en el acto cualquier token expuesto.

Auditar actor, fecha, operación, entidad, resultado, request ID y cambios relevantes; enmascarar PII. Aplicar rate limiting por usuario, IP y grupo. Alertar ante fallos repetidos de autenticación, escalamiento de privilegios, exportaciones masivas y mutaciones anómalas.

## Clientes y despliegue

- PWA: escape de contenido, CSP, dependencias actualizadas y nada de HTML no confiable. Nunca leer ni guardar tokens (la cookie es `HttpOnly`).
- PWA instalada: el service worker no cachea respuestas privadas de `/api/*`. Al cerrar sesión se limpia la caché privada, y la UI no revela detalles de permisos.
- Pipeline: pruebas, análisis estático, `npm audit`, migraciones D1 validadas en limpio, y deploy solo desde `main` con token de alcance mínimo.

## Incidentes

1. Contener: rotar `BETTER_AUTH_SECRET` (cierra todas las sesiones) o el secreto/token afectado, o deshabilitar las rutas afectadas (`wrangler rollback` a una versión anterior si hace falta).
2. Conservar evidencia: logs, request IDs y auditoría.
3. Evaluar alcance, datos afectados y obligaciones de aviso.
4. Corregir, probar y desplegar control preventivo.
5. Documentar causa, impacto, cronología y acciones correctivas.

Antes de publicar, verificar autenticación/roles, que D1/R2 no se expongan fuera del Worker, la ausencia de secretos en el repositorio, validación/idempotencia, dependencias, auditoría y alertas.
