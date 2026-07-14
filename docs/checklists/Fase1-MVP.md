# Fase 1 — MVP de gastos compartidos

> Checklist operativo de `docs/Roadmap.md` Fase 1.

## Objetivo

Resolver el flujo principal (grupo → gasto → balance → liquidación) con información financiera confiable, cubriendo Equal, ExactAmount, Percentage y Shares (no `Custom`, diferido a Fase 2 — ver `docs/BusinessRules.md` y `docs/Roadmap.md`).

## Prerrequisitos

- [ ] Fase 0 completa (`docs/checklists/Fase0-FundacionTecnica.md`), en particular: arquitectura por capas funcionando de punta a punta, Firebase Emulator Suite operativo, CI en verde.

## Checklist

### Dominio (100 % cobertura exigida por `docs/TestingGuide.md`)

- [ ] Value objects: `Money`, `Percentage`, `CurrencyCode`, `Email`, `UserId`, `GroupId`, `ExpenseId` (`docs/domain/Money.md`, `docs/domain/Currency.md`).
- [ ] Entidades: `User`, `Group`, `Membership`, `Invitation`, `Expense`, `Split`, `Settlement`, `Balance`, `Category`, `AuditLog` (`docs/DomainModel.md`).
- [ ] `SplitStrategy`: `Equal`, `ExactAmount`, `Percentage`, `Shares` — con residuales deterministas por `UserId` ascendente (`docs/Algorithms.md`).
- [ ] `BalanceCalculator` (estrategia `Classic`): `Σ Pagado = Σ Consumido`, `Σ Balance = 0`, idempotente (`docs/domain/Balance.md`).
- [ ] `SettlementGenerator`/`DebtOptimizer` con estrategia `MinimumTransactions` (greedy determinista) (`docs/Algorithms.md`).
- [ ] `CurrencyConverter` con estrategia `HistoricRate` (tasa congelada por gasto).
- [ ] `RoundingStrategy` `HalfEven` por defecto.
- [ ] Errores de dominio específicos: `GroupNotFoundException`, `ExpenseNotFoundException`, `PermissionDeniedException`, `CurrencyMismatchException`, `InvalidSplitException` (`docs/Architecture.md`).

### Casos de uso (Application, ≥95 % cobertura)

- [ ] `CreateGroup`, `ArchiveGroup`.
- [ ] `InviteMember`, `AcceptInvitation`, `DeclineInvitation`, `ChangeMemberRole`, `RemoveMember`, `LeaveGroup` (bloqueado si balance ≠ 0, `docs/BusinessRules.md`).
- [ ] `CreateExpense`, `UpdateExpense`, `DeleteExpense`, `RestoreExpense` — cualquier Member puede editar/eliminar cualquier gasto activo del grupo (`docs/Security.md`).
- [ ] `CalculateBalances` (recálculo idempotente, ciclo `BalanceDirty` → `BalanceRecalculated`, `docs/Algorithms.md`).
- [ ] `GenerateSettlementSuggestions`, `CreateSettlement`, `ConfirmSettlement`, `CancelSettlement`, `RejectSettlement`.
- [ ] `UpdateProfile` (`GET/PATCH /me`).
- [ ] Idempotencia vía `Idempotency-Key` en toda mutación (`docs/Security.md`, `docs/ApiSpecification.md`).

### Infraestructura (≥80 % cobertura)

- [ ] `FirestoreUserRepository`, `FirestoreGroupRepository`, `FirestoreMembershipRepository`, `FirestoreInvitationRepository`, `FirestoreExpenseRepository`, `FirestoreSettlementRepository`, `FirestoreBalanceRepository`, `FirestoreAuditLogRepository`.
- [ ] IDs deterministas `{groupId}_{userId}` para `groupMembers` (ADR-010).
- [ ] `FirebaseAuthProvider` (validación de token, claims).
- [ ] Adaptador de adjuntos en Storage con URL firmada de 15 minutos (ADR-011).
- [ ] Índices desplegados desde `firestore.indexes.json`.

### Presentation / API (≥70 % cobertura)

- [ ] Handlers HTTP delgados para cada ruta del MVP en `docs/api/openapi.yaml` (Auth, Groups, Members, Invitations, Expenses, Balances, Settlements).
- [ ] Middleware de autenticación (`Authorization: Bearer`) y de auditoría común.
- [ ] Mapeo de errores de dominio a códigos HTTP de `docs/ApiSpecification.md` y `docs/api/*.md`.
- [ ] Rate limiting por defecto (60/min mutaciones, 300/min lecturas, 20/min por IP no autenticada — ADR-011).

### Android y Web (MVP)

- [ ] Construir las pantallas listadas en `docs/UISpecification.md` § "Fase 1 — MVP" (autenticación/perfil, grupos y miembros, gastos, balances y liquidaciones).
- [ ] Autenticación (Firebase Auth SDK) y perfil.
- [ ] Crear/listar/archivar grupos.
- [ ] Invitar miembro, aceptar/rechazar invitación.
- [ ] Crear/listar/editar/eliminar gastos con reparto Equal/ExactAmount/Percentage/Shares.
- [ ] Ver balances del grupo.
- [ ] Ver sugerencias de liquidación y confirmar una liquidación.
- [ ] Estados sellados `Loading/Content/Empty/Error` en cada pantalla (`docs/CodingStandards.md`).
- [ ] Ningún cálculo financiero implementado en el cliente (solo presentación de lo que devuelve el backend).

### Pruebas

- [ ] Casos de `docs/TestingGuide.md` § "Pruebas de dominio obligatorias" cubiertos para las 4 estrategias de reparto del MVP.
- [ ] Pruebas de integración contra Firebase Emulator (repositorios, reglas, funciones autenticadas, idempotencia y concurrencia).
- [ ] Pruebas de contrato contra `docs/api/openapi.yaml`.
- [ ] E2E críticos 1–4 de `docs/TestingGuide.md` § "E2E críticos" ejecutados en staging.

## Criterios de salida

- [ ] Todos los cálculos de dominio del MVP alcanzan 100 % de cobertura.
- [ ] El flujo grupo → gasto → balance → liquidación funciona con emuladores y E2E de staging.
- [ ] Ningún gasto ni liquidación puede crearse, editarse o confirmarse sin pasar por autorización y auditoría.

## Documentos relacionados

`docs/Roadmap.md` (Fase 1), `docs/DomainModel.md`, `docs/BusinessRules.md`, `docs/Algorithms.md`, `docs/Security.md`, `docs/ApiSpecification.md`, `docs/api/*.md`, `docs/api/openapi.yaml`, `docs/TestingGuide.md`, `docs/Decisions.md` (ADR-010, ADR-011).
