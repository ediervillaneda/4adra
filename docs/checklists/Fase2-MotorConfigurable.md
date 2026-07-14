# Fase 2 — Motor configurable y operación robusta

> Checklist operativo de `docs/Roadmap.md` Fase 2.

## Objetivo

Diferenciar el producto con cálculos extensibles y reproducibles: `CalculationEngine` completo, `CalculationProfile` versionado por grupo, reparto `Custom`, estrategias adicionales de liquidación, redondeo determinista y multi-moneda con tasa congelada.

## Prerrequisitos

- [ ] Fase 1 completa y en producción (o al menos en staging estable) — el motor configurable reemplaza estrategias fijas por versionadas sin alterar resultados históricos, lo que exige tener historial real que no se puede romper.

## Checklist

### Especificación previa (obligatoria antes de programar, según `docs/DevelopmentGuide.md`)

- [ ] Documentar en `docs/Algorithms.md` el contrato completo (entradas, casos límite, pruebas doradas) de cada estrategia hoy solo nombrada:
  - [ ] `BalanceStrategy`: `CashFlow`, `Historical`.
  - [ ] `CurrencyStrategy`: `DailyRate`, `ManualRate`, `AverageRate`.
  - [ ] `SettlementStrategy`: `Greedy`, `MinimumMoneyMoved`, `PriorityBased`, `RoundRobin` (hoy solo tienen descripción breve).
  - [ ] Reparto `Custom` (ya especificado en `docs/Algorithms.md`, revisar antes de implementar).
- [ ] Si `ValidationStrategy` termina variando entre perfiles, añadir su nombre/versión al esquema de `calculationProfiles/{id}` en `docs/DatabaseSchema.md` (pendiente señalado en `docs/Algorithms.md`).
- [ ] Actualizar `docs/domain/Balance.md` y `docs/domain/Currency.md` si las nuevas estrategias cambian invariantes o propiedades.

### Dominio

- [ ] `CalculationEngine` como composición/registro de estrategias (no `if` dispersos), inyectado — nunca instanciado dentro de un caso de uso.
- [ ] `CalculationProfile` versionado e inmutable una vez publicado (`docs/BusinessRules.md`, `docs/Algorithms.md`).
- [ ] Reparto `Custom`: fijos → porcentajes sobre base restante → residuo determinista.
- [ ] Pruebas doradas por estrategia: mismas entradas producen siempre la misma salida, incluso tras publicar una estrategia nueva.
- [ ] Prueba de reproducción histórica: activar un perfil nuevo en un grupo no altera el resultado de gastos ya creados (criterio de salida de Fase 2 en `docs/Roadmap.md`).

### Android y Web

- [ ] Construir las pantallas listadas en `docs/UISpecification.md` § "Fase 2 — Motor configurable" (perfil de cálculo del grupo, simulación de perfiles, paso `Custom` en crear/editar gasto).

### Aplicación / API

- [ ] `PUT /groups/{groupId}/calculation-profile` completamente funcional con validación de perfil publicado y compatible.
- [ ] `GET /calculation-profiles` y `GET /calculation-profiles/{profileId}` sirviendo el catálogo real (no solo el `default-v1`).
- [ ] Simulaciones de perfil en `GET /groups/{groupId}/settlement-suggestions?profileId=...` sin persistir cambios (`docs/api/Balances.md`).
- [ ] Concurrencia: `If-Match`/transacciones para activar perfil y confirmar liquidaciones bajo carga concurrente.

### Infraestructura y operación

- [ ] `calculationProfiles/{id}` en Firestore con versiones inmutables reales (nunca se sobrescribe una versión publicada).
- [ ] Monitoreo y alertas sobre fallos de recálculo, tiempos de `BalanceRecalculated` y uso de `POST /balances/recalculate`.
- [ ] Multi-moneda: al menos dos monedas soportadas end-to-end (por ejemplo USD/COP) con tasa congelada por gasto verificada en pruebas.

### Pruebas

- [ ] Golden tests por estrategia (split, balance, settlement, currency, rounding), compartidos entre backend y, si aplica, clientes (`docs/TestingGuide.md`).
- [ ] Estrategias/versiones no admitidas se rechazan explícitamente.
- [ ] Idempotencia de recálculos y comandos bajo estrategias nuevas.

## Criterios de salida

- [ ] Activar un perfil nuevo no altera resultados históricos.
- [ ] Toda estrategia publicada es determinista, pura y documentada en `docs/Algorithms.md` antes de su implementación.

## Documentos relacionados

`docs/Roadmap.md` (Fase 2), `docs/Algorithms.md`, `docs/Architecture.md`, `docs/DomainModel.md`, `docs/DatabaseSchema.md`, `docs/domain/Balance.md`, `docs/domain/Currency.md`, `docs/TestingGuide.md`, `docs/Decisions.md` (ADR-005).
