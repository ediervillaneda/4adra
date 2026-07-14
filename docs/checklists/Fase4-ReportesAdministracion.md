# Fase 4 — Reportes y administración

> Checklist operativo de `docs/Roadmap.md` Fase 4.

## Objetivo

Mejorar visibilidad, exportación y gobernanza: exportaciones CSV/XLSX/PDF/JSON, reportes por categoría/miembro/periodo/moneda, archivo/cierre de grupo, retención de datos y herramientas administrativas auditadas.

## Prerrequisitos

- [ ] Fase 1 (MVP) estable; Fase 2 recomendable (reportes históricos son más confiables con perfiles versionados ya probados).

## Checklist

### Especificación previa

- [ ] Confirmar con asesoría legal los valores `Proposed` de ADR-011 (retención de datos personales, anonimización tras eliminación de cuenta) antes de habilitar exportaciones masivas o borrado de cuenta en producción.
- [ ] Definir límites concretos de `docs/api/Reports.md` § "Límites y seguridad" (filas máximas, periodo máximo, frecuencia de solicitud por usuario) — hoy están descritos en prosa sin cifra.

### Backend

- [ ] `POST/GET /groups/{groupId}/reports` y `download-url` (ya en `docs/api/openapi.yaml`) implementados para los 5 `reportType` de `docs/api/Reports.md`.
- [ ] Generadores de `CSV`, `XLSX`, `PDF`, `JSON` con precisión decimal preservada (nunca formatear a `float`).
- [ ] Procesamiento asíncrono con estados `QUEUED/PROCESSING/COMPLETED/FAILED/EXPIRED` y expiración a 24 horas (ADR-011).
- [ ] Herramientas administrativas auditadas para archivo/cierre de grupo y retención de datos, con auditoría reforzada (`docs/Security.md`).

### Android y Web

- [ ] Flujo de solicitud/descarga de reportes.
- [ ] Panel administrativo (si aplica a este producto) para Owner/Administrator: archivo de grupo, exportaciones, auditoría visible.

### Pruebas

- [ ] Reportes reproducibles: la misma solicitud sobre los mismos datos produce el mismo resultado (usa importes y versiones históricas, no valores recalculados con reglas nuevas).
- [ ] Controles de descarga/autorización: un usuario sin rol adecuado no puede solicitar `AUDIT_TRAIL` ni descargar el reporte de otro grupo.

## Criterios de salida

- [ ] Reportes reproducibles con importes históricos.
- [ ] Controles de descarga/autorización verificados.

## Documentos relacionados

`docs/Roadmap.md` (Fase 4), `docs/api/Reports.md`, `docs/Security.md`, `docs/Decisions.md` (ADR-011).
