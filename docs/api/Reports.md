# Reports.md

> **Área:** API / Reportes y exportaciones  
> **Versión API:** v1

## Alcance

Los reportes son vistas y exportaciones de datos autorizados del grupo. No recalculan ni cambian información financiera histórica; incluyen la moneda base, tasas y versiones necesarias para interpretar importes.

## Solicitar exportación

```http
POST /api/v1/groups/{groupId}/reports
Idempotency-Key: 63c89495-fd5f-4bd0-bc02-1f85234092c9
```

```json
{
  "format": "CSV",
  "reportType": "EXPENSES",
  "filters": {
    "from": "2027-06-01T00:00:00Z",
    "to": "2027-06-30T23:59:59Z",
    "categoryIds": ["lodging", "transport"],
    "status": ["ACTIVE"]
  },
  "locale": "es-CO",
  "timeZone": "America/Bogota"
}
```

Formatos permitidos: `CSV`, `XLSX`, `PDF`, `JSON`. Tipos iniciales: `EXPENSES`, `BALANCES`, `SETTLEMENTS`, `AUDIT_TRAIL`, `GROUP_SUMMARY`. Owner y Administrator pueden solicitar todos; Member y ReadOnly solo los tipos que la política del grupo permita.

Respuesta `202`:

```json
{
  "data": {
    "reportId": "rpt_123",
    "status": "QUEUED",
    "format": "CSV",
    "reportType": "EXPENSES",
    "createdAt": "2027-06-14T16:00:00Z",
    "expiresAt": "2027-06-15T16:00:00Z"
  },
  "meta": { "requestId": "req_123" }
}
```

Las exportaciones grandes se procesan asíncronamente. La misma clave de idempotencia devuelve el mismo `reportId` mientras su solicitud esté vigente. Por defecto (ADR-011) un reporte generado expira 24 horas después de crearse, y cada `download-url` firmada es válida 15 minutos desde que se solicita.

## Consultar y descargar

```http
GET /api/v1/groups/{groupId}/reports/{reportId}
POST /api/v1/groups/{groupId}/reports/{reportId}/download-url
```

Estados: `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `EXPIRED`. Cuando termina, el detalle incluye conteo de registros, fecha de generación, filtros aplicados, moneda base y versiones relevantes de cálculo. `download-url` devuelve URL firmada de una sola finalidad y corta duración; no expone la ruta interna de Storage.

## Contenido y consistencia

- **EXPENSES:** gasto, pagador, splits, importe original/convertido, tasa, categoría, estado y perfil histórico.
- **BALANCES:** proyección con `calculatedAt`; no se etiqueta como fuente manual de verdad.
- **SETTLEMENTS:** operaciones y estados, incluyendo confirmaciones y referencias compensatorias.
- **AUDIT_TRAIL:** solo para roles autorizados; se minimiza PII según política.
- **GROUP_SUMMARY:** agregados por categoría, miembro y periodo, con filtros explícitos.

Los importes en CSV/JSON deben conservar precisión decimal. PDF/XLSX presentan formatos regionales, pero incluyen moneda y zona horaria. Las filas se ordenan de forma estable y se incluyen metadatos de generación para reproducibilidad.

## Límites y seguridad

Aplicar límites de periodo, cantidad de filas, frecuencia y tamaño. Las solicitudes quedan auditadas con actor, filtros, tipo y resultado. Los archivos expiran y se eliminan de Storage conforme a la política de retención. No incluir secretos, tokens, URL permanentes ni datos que el solicitante no puede consultar por API.

## Errores

| Código | Situación |
|---|---|
| `REPORT_NOT_FOUND` | Reporte inexistente o no visible |
| `REPORT_NOT_READY` | Aún no se puede descargar |
| `REPORT_EXPIRED` | Archivo vencido |
| `INVALID_REPORT_FILTER` | Filtros inválidos o periodo excesivo |
| `REPORT_LIMIT_EXCEEDED` | Tamaño o frecuencia excedidos |
| `PERMISSION_DENIED` | Rol insuficiente |

Una exportación fallida conserva estado y causa segura para diagnóstico, sin revelar detalles internos a clientes.
