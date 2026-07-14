# Auth.md

> **Área:** API / Autenticación y perfil  
> **Versión API:** v1

## Alcance

La identidad la provee Firebase Authentication. La API no administra contraseñas ni emite tokens propios. Este documento describe cómo los clientes presentan identidad y administran el perfil de la plataforma.

## Autenticación de solicitudes

Todas las rutas requieren:

```http
Authorization: Bearer <Firebase-ID-token>
```

La Cloud Function valida token, firma, emisor, audiencia y expiración. El actor se obtiene exclusivamente de las *claims* verificadas. Una solicitud sin token o con token inválido responde `401 UNAUTHENTICATED`.

Los SDK oficiales administran el inicio de sesión, refresco y cierre de sesión. No enviar contraseñas a endpoints de esta API ni guardar ID tokens de forma persistente no protegida.

## Obtener perfil actual

```http
GET /api/v1/me
```

Respuesta `200`:

```json
{
  "data": {
    "id": "usr_ana",
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

Si el documento de perfil aún no existe, el backend lo crea de forma idempotente a partir de las *claims* mínimas y aplica valores por defecto aprobados.

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
- `photoUrl`: URL HTTPS permitida o `null`; el producto puede sustituirla por referencia a Storage.
- `preferredCurrency`: código ISO-4217 soportado.
- `language`: etiqueta BCP 47 admitida.
- `timeZone`: zona IANA válida.

## Estados y errores

| Código | Situación |
|---|---|
| `UNAUTHENTICATED` | Falta token, no es válido o expiró |
| `USER_DISABLED` | Usuario bloqueado o eliminado |
| `VALIDATION_ERROR` | Perfil contiene valor inválido |
| `RATE_LIMITED` | Se excedió límite de solicitudes |

Los cambios de perfil generan auditoría. No publican eventos financieros ni modifican grupos o balances.

## Seguridad y privacidad

El cliente solo puede leer o modificar su propio perfil mediante `/me`. Las funciones administrativas, si se crean, requieren roles explícitos y auditoría reforzada. Evitar mostrar correo electrónico a miembros de grupos salvo que la política de privacidad lo permita.
