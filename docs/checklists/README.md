# Checklists de fases — 4adra

Checklists operativos y accionables de cada fase de `docs/Roadmap.md`. Cada archivo traduce los objetivos y criterios de salida del Roadmap en tareas verificables (`- [ ]`), con sus documentos de referencia. Úsalos como fuente de verdad de "qué falta" en cada fase; el Roadmap sigue siendo la fuente de verdad de "por qué" y "en qué orden".

| Fase | Archivo | Objetivo |
|---|---|---|
| 0 — Fundación técnica | [`Fase0-FundacionTecnica.md`](./Fase0-FundacionTecnica.md) | Base repetible: repos, entornos, CI, Firebase, arquitectura escaleteada. |
| 1 — MVP de gastos compartidos | [`Fase1-MVP.md`](./Fase1-MVP.md) | Flujo grupo → gasto → balance → liquidación con reparto Equal/ExactAmount/Percentage/Shares. |
| 2 — Motor configurable | [`Fase2-MotorConfigurable.md`](./Fase2-MotorConfigurable.md) | `CalculationEngine` completo, perfiles versionados, reparto `Custom`, multi-moneda. |
| 3 — Colaboración y experiencia | [`Fase3-ColaboracionExperiencia.md`](./Fase3-ColaboracionExperiencia.md) | Adjuntos, comentarios, notificaciones, dashboard, offline limitado. |
| 4 — Reportes y administración | [`Fase4-ReportesAdministracion.md`](./Fase4-ReportesAdministracion.md) | Exportaciones, reportes, archivo/cierre de grupo, retención. |
| 5 — Capacidades avanzadas | [`Fase5-CapacidadesAvanzadas.md`](./Fase5-CapacidadesAvanzadas.md) | OCR, sugerencias, presupuestos, integraciones — siempre opcionales y confirmables. |

## Cómo mantenerlos

- Marca una casilla solo cuando la tarea esté hecha y verificada, no solo iniciada (mismo criterio que `docs/TODO.md`).
- Si durante una fase descubres un vacío de especificación (como los ya señalados en Fase 2 y Fase 3), documenta la decisión en `docs/Decisions.md` y actualiza el documento fuente correspondiente en el mismo cambio, no solo este checklist.
- Si el alcance de una fase cambia, ajusta primero `docs/Roadmap.md` y luego el checklist correspondiente, para que ambos sigan diciendo lo mismo.
- Estos archivos no reemplazan un backlog de tickets (Jira/Linear/etc.); son el puente entre la especificación y ese backlog.
