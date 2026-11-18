# Expenses.md

> **Área:** API / Gastos, repartos y adjuntos  
> **Versión API:** v1

## Crear gasto

```http
POST /api/v1/groups/{groupId}/expenses
Idempotency-Key: 5b76ec1c-1d89-455f-8dfc-f93d5c4b91f2
```

```json
{
  "title": "Hotel",
  "description": "Primera noche",
  "categoryId": "lodging",
  "paidBy": "usr_ana",
  "amount": "500.00",
  "currency": "USD",
  "exchangeRate": "1.000000",
  "expenseDate": "2027-06-14T00:00:00Z",
  "split": {
    "type": "PERCENTAGE",
    "participants": [
      { "userId": "usr_ana", "percentage": "50" },
      { "userId": "usr_juan", "percentage": "50" }
    ]
  }
}
```

El backend determina el perfil activo del grupo, conserva su versión en el gasto, resuelve los importes con la estrategia indicada, congela la tasa y persiste gasto, splits, auditoría y proyección de balances en una operación consistente.

**Implementado hoy (pieza 3, historia #1):**
- Solo `split.type: "EQUAL"`, en la moneda base del grupo y con tasa 1. Otra moneda, o una tasa distinta de 1, responde `422 CURRENCY_MISMATCH`. `categoryId` todavía no se usa.
- Pueden crear gastos Owner, Administrator y Member; ReadOnly recibe `403 PERMISSION_DENIED`, quien no es miembro activo `404 GROUP_NOT_FOUND`, y en un grupo archivado se responde `409 GROUP_ARCHIVED`.
- `title` va de 1 a 120 caracteres y `description` (opcional) hasta 500. `expenseDate` es el día del gasto a las 00:00 Z.
- `amount` debe ser positivo y tener los decimales de la moneda (COP ninguno; USD, EUR, MXN y GTQ dos). Si no, responde `400 INVALID_AMOUNT`.
- Pagador y participantes deben ser miembros activos (`422 MEMBER_NOT_ACTIVE`). Sin participantes o con alguno repetido, responde `400 INVALID_SPLIT`.
- **Idempotencia:** `Idempotency-Key` es obligatoria y única por usuario. Repetirla con el mismo contenido devuelve el gasto ya creado (`201`, sin crear otro); repetirla con otro contenido responde `409 IDEMPOTENCY_CONFLICT`.
- Responde `201` con el gasto, que incluye `split.participants` con el `amount` de cada uno. La proyección de balances llega con la historia #3.
- La lista (`GET`) devuelve todos los gastos activos, por `expenseDate` descendente y luego por `id` descendente. Por ahora ignora filtros y paginación.

## Tipos de reparto

| Tipo | Datos por participante | Regla |
|---|---|---|
| `EQUAL` | `userId` | Divide en partes iguales y asigna residuales por orden determinista |
| `EXACT_AMOUNT` | `userId`, `amount` | Los importes totalizan el gasto |
| `PERCENTAGE` | `userId`, `percentage` | Los porcentajes totalizan 100 |
| `SHARES` | `userId`, `shares` | Shares positivas; se distribuye proporcionalmente |
| `CUSTOM` | Definido por perfil | Debe resolver total exacto y ser válido |

El pagador y cada participante deben ser miembros activos. Un gasto tiene un único pagador y monto positivo. Las tasas no se recalculan después de crear el gasto.

## Consultar gastos

```http
GET /api/v1/groups/{groupId}/expenses?status=ACTIVE&categoryId=lodging&paidBy=usr_ana&from=2027-06-01&to=2027-06-30&limit=25&pageToken=...
GET /api/v1/groups/{groupId}/expenses/{expenseId}
```

El detalle incluye importe original y convertido, tasa, perfil y versión, splits calculados, autor, fechas, estado y adjuntos autorizados. Las listas se ordenan por `expenseDate` descendente y después por ID para mantener paginación estable.

## Actualizar, eliminar y restaurar

```http
PATCH /api/v1/groups/{groupId}/expenses/{expenseId}
If-Match: 3
Idempotency-Key: 005d7f6a-29ee-4f6b-a9df-dddcb24fcd57
```

Se pueden actualizar campos permitidos, incluidos reparto y fecha. Al modificar un gasto, el backend conserva historial de auditoría y recalcula balances. La edición usa la versión histórica del perfil salvo que una migración explícita y auditada indique otra cosa.

```http
DELETE /api/v1/groups/{groupId}/expenses/{expenseId}
POST /api/v1/groups/{groupId}/expenses/{expenseId}/restore
```

Eliminar es `soft delete` y excluye el gasto del cálculo. Restaurar requiere permisos equivalentes y vuelve a calcular. Nunca se borra físicamente información financiera mediante estos endpoints.

## Adjuntos

```http
POST /api/v1/groups/{groupId}/expenses/{expenseId}/attachments/upload-url
DELETE /api/v1/groups/{groupId}/expenses/{expenseId}/attachments/{attachmentId}
```

La primera ruta recibe nombre, tipo MIME y tamaño esperado; devuelve una URL firmada de 15 minutos de duración y un identificador provisional. Tras cargar, el backend verifica metadatos y vincula el adjunto. Límites por defecto (ADR-011): tipos `image/jpeg`, `image/png`, `image/webp` o `application/pdf`, máximo 10 MB por archivo y 5 adjuntos activos por gasto; los archivos se guardan en R2, no en D1.

## Errores

| Código | Situación |
|---|---|
| `EXPENSE_NOT_FOUND` | Gasto inexistente o fuera del grupo |
| `INVALID_SPLIT` (400) | Reparto no totaliza o tiene datos inválidos |
| `INVALID_AMOUNT` (400) | Monto no positivo, decimal inválido o con más decimales que la moneda |
| `MEMBER_NOT_ACTIVE` (422) | Pagador o participante no activo |
| `CURRENCY_MISMATCH` (422) | Moneda o tasa no permitida |
| `STALE_VERSION` (409) | Edición concurrente |
| `GROUP_ARCHIVED` (409) | Grupo no permite mutaciones |
| `IDEMPOTENCY_CONFLICT` (409) | Misma `Idempotency-Key` con otro contenido |

Cada alta, edición, eliminación, restauración o modificación de adjuntos queda auditada y emite el evento de dominio correspondiente.
