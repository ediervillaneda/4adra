# Roadmap.md

> **Proyecto:** 4adra  
> **Versión:** 1.0  
> **Estado:** Draft

## Objetivo

Presenta una evolución por etapas. El roadmap orienta la priorización, pero no sustituye una especificación funcional ni compromete fechas. Cada etapa se inicia cuando los criterios de entrada y dependencias estén resueltos.

## Principios de priorización

- Primero exactitud financiera, seguridad y trazabilidad; después conveniencia y automatización.
- No adelantar funcionalidades que requieran cambiar datos históricos o debilitar permisos.
- Medir adopción y calidad antes de ampliar alcance.
- Cada incremento debe mantener clientes compatibles, pruebas automatizadas y observabilidad.

## Fase 0 — Fundación técnica

**Objetivo:** disponer de una base segura y repetible para desarrollo.

- Repositorio, configuración de entornos y CI.
- Firebase Auth, Emulator Suite, reglas mínimas de Firestore y Storage.
- Clean Architecture, inyección de dependencias, manejo de errores y auditoría base.
- Documentación inicial, convenciones, pruebas de dominio y pipeline de despliegue.

**Salida:** backend y clientes pueden autenticarse en desarrollo; el pipeline ejecuta formato, tipos, pruebas y emuladores.

## Fase 1 — MVP de gastos compartidos

**Objetivo:** resolver el flujo principal con información financiera confiable.

- Perfil de usuario y grupos.
- Membresías, roles Owner/Administrator/Member/ReadOnly e invitaciones.
- Gastos de un pagador con repartos Equal, ExactAmount, Percentage y Shares.
- Balance por grupo, soft delete, auditoría y recálculo idempotente.
- Sugerencias de liquidación con estrategia predeterminada.
- Android y Web: crear/listar gastos, ver balances y grupos.

**Criterios de salida:** todos los cálculos de dominio alcanzan cobertura completa; el flujo grupo → gasto → balance → liquidación funciona con emuladores y E2E de staging.

## Fase 2 — Motor configurable y operación robusta

**Objetivo:** diferenciar el producto con cálculos extensibles y reproducibles.

- `CalculationEngine`, registro de estrategias y `CalculationProfile` versionado.
- Reparto `Custom` (combinación de importes fijos, porcentajes y residuo), no incluido en el MVP de Fase 1.
- Perfiles por grupo, conservación de versión en gastos y pruebas doradas históricas.
- Redondeo determinista, manejo de residuales y múltiples monedas con tasa congelada.
- Estrategias adicionales de liquidación: `MinimumTransactions`, `PriorityBased` y extensiones aprobadas.
- Idempotencia HTTP, control de concurrencia, monitoreo y alertas.

**Criterios de salida:** activar un perfil nuevo no altera resultados históricos y toda estrategia publicada es determinista, pura y documentada.

## Fase 3 — Colaboración y experiencia

**Objetivo:** facilitar el uso cotidiano entre participantes.

- Adjuntos de recibos, comentarios e historial visible.
- Notificaciones de invitaciones, gastos, cambios y liquidaciones.
- Filtros, búsqueda, categorías configurables y dashboard de grupo.
- Estado offline limitado en clientes con sincronización segura y resolución explícita de conflictos.
- Accesibilidad, localización, formatos regionales y mejora de rendimiento.

**Criterios de salida:** notificaciones auditables, acceso a adjuntos protegido y flujos principales accesibles en Android y Web.

## Fase 4 — Reportes y administración

**Objetivo:** mejorar visibilidad, exportación y gobernanza.

- Exportaciones CSV, XLSX, PDF y JSON.
- Reportes por categoría, miembro, periodo y moneda base.
- Archivo/cierre de grupo, retención de datos y herramientas administrativas auditadas.
- Métricas operativas, límites de uso y soporte.

**Criterios de salida:** reportes reproducibles con importes históricos y controles de descarga/autorización verificados.

## Fase 5 — Capacidades avanzadas

**Objetivo:** introducir automatización solo sobre una base validada.

- OCR de recibos con revisión humana antes de persistir gasto.
- Sugerencia de categoría y detección de duplicados, siempre explicables y confirmables.
- Presupuestos, alertas y pronóstico no vinculante.
- Integraciones bancarias o de pago, sujetas a evaluación legal, seguridad y consentimiento.
- Simulaciones de reparto sin modificar información real.

**Criterios de salida:** toda automatización es opcional, no modifica datos financieros sin confirmación y conserva auditoría.

## Fuera de alcance inicial

- Custodia de dinero, procesamiento de tarjetas o saldos bancarios propios.
- Cambiar retrospectivamente tasas, estrategias o redondeos de gastos históricos.
- Permisos administrativos globales sin controles y auditoría reforzada.

## Seguimiento

Cada iniciativa debe tener responsable, métricas de éxito, riesgos, dependencias y decisión de salida. Las prioridades se revisan periódicamente con evidencia de uso, incidencias, costo operativo y deuda técnica.
