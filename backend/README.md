# backend/

Directorio previsto para el backend de 4adra: TypeScript/Node.js sobre Firebase Cloud Functions, Firestore, Auth, Storage, Cloud Messaging y Scheduler (`docs/AGENTS.md`).

Este directorio está vacío intencionalmente — el scaffolding real (package.json, tsconfig, primera Cloud Function) es parte de la Fase 0, ver `docs/checklists/Fase0-FundacionTecnica.md`.

## Estructura prevista

```text
backend/src/
├── domain/          # entidades, value objects, interfaces y estrategias — sin Firebase, sin HTTP
├── application/      # casos de uso, comandos y DTOs de aplicación — sin Firestore directo
├── infrastructure/   # Firestore*Repository, FirebaseAuthProvider, Storage, mensajería
└── presentation/     # Cloud Functions y mapeo de transporte HTTP
```

## Referencias

- `docs/DevelopmentGuide.md` — cómo agregar una funcionalidad o una estrategia del motor de cálculo.
- `docs/CodingStandards.md` — convenciones de TypeScript, nombres y estructura.
- `docs/Decisions.md` (ADR-008) — versiones y herramientas propuestas, pendientes de confirmar.
- `docs/api/openapi.yaml` — contrato HTTP a implementar.
- `../firebase.json`, `../firestore.rules`, `../storage.rules`, `../firestore.indexes.json` — configuración de la plataforma Firebase que este backend usa.
