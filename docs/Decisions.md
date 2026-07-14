# Decisions.md

> **Proyecto:** Expense Sharing Platform  
> **Versión:** 1.0  
> **Estado:** Active

## Objetivo

Registro de decisiones de arquitectura (ADR). Cada decisión importante conserva contexto, elección, consecuencias y estado. No se reescriben decisiones aceptadas: una decisión sustituida se marca como tal y se añade una nueva.

## Formato

Cada ADR incluye: identificador, fecha, estado (`Proposed`, `Accepted`, `Superseded`, `Deprecated`), contexto, decisión, consecuencias y referencias. Cambios con impacto en API, datos, seguridad, cálculos o despliegue deben agregar un ADR.

---

## ADR-001 — Clean Architecture y DDD Lite

**Fecha:** 2026-07-13  
**Estado:** Accepted

**Contexto:** La aplicación tiene reglas financieras, múltiples clientes y dependencia inicial de Firebase. La lógica no debe quedar acoplada a UI ni SDK.

**Decisión:** Usar Clean Architecture con capas Presentation, Application, Domain e Infrastructure; aplicar DDD Lite para entidades, value objects, agregados y eventos de dominio.

**Consecuencias:** El dominio queda testeable e independiente. Se requiere disciplina para no importar Firebase/HTTP en Domain y para crear adaptadores adicionales.

---

## ADR-002 — Cloud Functions como backend único

**Fecha:** 2026-07-13  
**Estado:** Accepted

**Contexto:** Android y Web necesitan resultados idénticos y validación de operaciones sensibles.

**Decisión:** Exponer API HTTP mediante Firebase Cloud Functions. Las operaciones financieras críticas no escriben Firestore directamente desde los clientes.

**Consecuencias:** Autorización, auditoría, idempotencia y cálculos se centralizan. El backend requiere observabilidad, despliegue y pruebas con Emulator Suite.

---

## ADR-003 — Firestore como persistencia con esquema lógico

**Fecha:** 2026-07-13  
**Estado:** Accepted

**Contexto:** Firestore no obliga esquema, pero el proyecto requiere consistencia de datos y consultas previsibles.

**Decisión:** Usar Firestore como infraestructura de persistencia, siguiendo `DatabaseSchema.md`, índices explícitos, documentos pequeños y soft delete para datos financieros.

**Consecuencias:** Las migraciones son responsabilidad de aplicación/infraestructura. Firestore no contiene reglas de negocio ni es la única descripción del modelo.

---

## ADR-004 — Dinero decimal y moneda base de grupo

**Fecha:** 2026-07-13  
**Estado:** Accepted

**Contexto:** Los cálculos con punto flotante pueden introducir diferencias entre plataformas.

**Decisión:** Representar dinero con decimal de precisión arbitraria y `Money`; transportar importes como cadenas decimales. Cada gasto conserva moneda original, tasa histórica congelada y valor en moneda base del grupo.

**Consecuencias:** Se requiere un mapeo cuidadoso de DTOs y formateo solo en Presentation. Los balances históricos son reproducibles y no cambian al actualizar tasas.

---

## ADR-005 — Motor de algoritmos y perfiles versionados

**Fecha:** 2026-07-13  
**Estado:** Accepted

**Contexto:** Diferentes grupos pueden requerir criterios de reparto, redondeo, tasa o liquidación distintos, sin alterar gastos existentes.

**Decisión:** Implementar `CalculationEngine` con estrategias intercambiables para split, balance, moneda, redondeo, validación y settlement. Asociar un `CalculationProfile` versionado a cada grupo y guardar su versión en cada gasto.

**Consecuencias:** Las estrategias publicadas son puras, deterministas e inmutables. Cambios de comportamiento requieren una versión nueva y pruebas doradas. Aumenta el número de pruebas y la necesidad de gobernar el registro de estrategias.

---

## ADR-006 — Auditoría inmutable y operaciones compensatorias

**Fecha:** 2026-07-13  
**Estado:** Accepted

**Contexto:** El historial financiero debe ser rastreable y una liquidación confirmada no puede desaparecer sin explicación.

**Decisión:** Registrar auditoría de adición para mutaciones; usar soft delete para gastos y operaciones compensatorias para correcciones financieras confirmadas.

**Consecuencias:** La consulta y retención de datos requieren controles de acceso. No se permite arreglar balances mediante edición directa.

---

## ADR-007 — API versionada e idempotente

**Fecha:** 2026-07-13  
**Estado:** Accepted

**Contexto:** Clientes móviles pueden reintentar solicitudes y actualizarse de manera gradual.

**Decisión:** Versionar API en ruta mayor (`/api/v1`), exigir `Idempotency-Key` en mutaciones y usar `If-Match`/versiones de recurso para concurrencia.

**Consecuencias:** Se almacena estado de idempotencia durante un periodo definido y se mantiene compatibilidad al agregar campos opcionales. Cambios incompatibles exigen versión mayor y deprecación.

## Cómo añadir una decisión

Copiar el formato ADR, usar el siguiente identificador, enlazar documentos afectados y describir riesgos/alternativas consideradas. No usar este registro para tareas pequeñas de implementación ni para notas temporales.
