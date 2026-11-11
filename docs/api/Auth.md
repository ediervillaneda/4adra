# Auth.md

> **Área:** API / Autenticación y perfil  
> **Versión API:** v1

## Alcance

La identidad la provee **Better Auth**, que corre dentro del mismo Worker que la API (ADR-016), con un único proveedor: **Google**. La API no administra contraseñas. Este documento describe cómo los clientes inician sesión, presentan identidad y administran el perfil de la plataforma.

## Inicio y cierre de sesión (Better Auth, `/api/auth/*`)

Todo ocurre en el mismo origen que la API (`https://4adra.edier.me`; en local `http://localhost:8787`), así que no hay CORS ni tokens visibles para el cliente.

1. **Iniciar sesión con Google:** `POST /api/auth/sign-in/social` con `{ "provider": "google", "callbackURL": "/" }`. La respuesta trae la URL de Google a la que el cliente redirige. El SDK cliente de Better Auth lo hace con `signIn.social({ provider: 'google' })`.
2. **Callback:** Google redirige a `/api/auth/callback/google`. Better Auth crea o vincula la identidad (tablas `user` y `account`), abre una sesión (`session`) y emite la cookie.
3. **Sesión actual:** `GET /api/auth/get-session`, que el cliente usa para saber si hay sesión.
**Acceso solo por invitación (ADR-018):** si el correo de Google no está inscrito en la lista de acceso, no se crea la cuenta. Google redirige a `/api/auth/error?error=NOT_INVITED`, y la PWA debe mostrar "Necesitas una invitación para usar 4adra". Los usuarios ya registrados no se ven afectados.

4. **Cerrar sesión:** `POST /api/auth/sign-out` invalida la sesión y borra la cookie.

## Autenticación de solicitudes

Todas las rutas `/api/v1/*` requieren la cookie de sesión. El navegador la envía automáticamente:

```http
Cookie: __Secure-better-auth.session_token=<token firmado>
```

La cookie es `HttpOnly; Secure; SameSite=Lax`. En local (HTTP) no lleva `Secure` y se llama `better-auth.session_token`, sin el prefijo `__Secure-`.

El Worker valida la firma, la existencia y la expiración de la sesión en D1, y obtiene el actor exclusivamente de la sesión validada. Una solicitud sin cookie, con cookie alterada o con sesión expirada responde `401 UNAUTHENTICATED` con el sobre de error estándar.

El cliente nunca lee ni guarda el token (es `HttpOnly`): solo usa las rutas `/api/auth/*`.

## Obtener perfil actual

```http
GET /api/v1/me
```

Respuesta `200`:

```json
{
  "data": {
    "id": "0193f6c2-5b1e-7c3a-9f00-2a4d6e8b1c90",
    "displayName": "Ana Pérez",
    "email": "ana@example.com",
    "photoUrl": null,
    "preferredCurrency": "COP",
    "language": "es",
    "timeZone": "America/Bogota",
    "status": "ACTIVE",
    "createdAt": "2026-07-13T12:00:00Z",
    "updatedAt": "2026-07-13T12:00:00Z"
  },
  "meta": { "requestId": "req_123" }
}
```

Si el perfil (tabla `users`) aún no existe, el backend lo crea de forma idempotente a partir de los datos de la sesión (correo, nombre y foto de Google) y aplica los valores por defecto aprobados. El `id` es el mismo identificador (UUID v7) de la identidad de Better Auth.

## Actualizar perfil

```http
PATCH /api/v1/me
Content-Type: application/json
```

```json
{
  "displayName": "Ana Pérez",
  "photoUrl": "https://...",
  "preferredCurrency": "COP",
  "language": "es",
  "timeZone": "America/Bogota"
}
```

Campos permitidos: `displayName`, `photoUrl`, `preferredCurrency`, `language` y `timeZone`. `email`, `id`, `status`, roles y fechas no se actualizan por este endpoint. La respuesta es `200` con el perfil actualizado.

Validaciones:

- `displayName`: 1 a 100 caracteres después de normalización.
- `photoUrl`: URL HTTPS permitida o `null`; el producto puede sustituirla por una referencia a R2.
- `preferredCurrency`: código ISO-4217 soportado.
- `language`: etiqueta BCP 47 admitida.
- `timeZone`: zona IANA válida.

## Estados y errores

| Código | Situación |
|---|---|
| `UNAUTHENTICATED` | Falta la cookie de sesión, fue alterada o la sesión expiró |
| `USER_DISABLED` | Usuario bloqueado o eliminado |
| `VALIDATION_ERROR` | Perfil contiene valor inválido |
| `RATE_LIMITED` | Se excedió límite de solicitudes |

Los cambios de perfil generan auditoría. No publican eventos financieros ni modifican grupos o balances.

## Seguridad y privacidad

El cliente solo puede leer o modificar su propio perfil mediante `/me`. Las funciones administrativas, si se crean, requieren roles explícitos y auditoría reforzada. Evitar mostrar el correo electrónico a miembros de grupos salvo que la política de privacidad lo permita.
