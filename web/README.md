# web/

Directorio previsto para el cliente Web de 4adra: Angular, TypeScript, Angular Material y RxJS (`docs/AGENTS.md`).

Vacío intencionalmente — el scaffolding real (Angular CLI, configuración de build/lint) es parte de la Fase 0, ver `docs/checklists/Fase0-FundacionTecnica.md`.

## Reglas clave

- No implementa cálculos financieros ni reglas de negocio: solo presenta lo que devuelve la API (`docs/AGENTS.md`, `docs/CodingStandards.md`).
- Servicios API encapsulan HTTP; los componentes no construyen URLs ni interpretan errores de dominio directamente.
- Organización por funcionalidad, separando presentación, datos y dominio local (sin replicar `domain/` del backend).

## Referencias

- `docs/CodingStandards.md` § "Angular Web".
- `docs/api/openapi.yaml` — contrato HTTP consumido por el cliente API.
- `docs/TestingGuide.md` § "Clientes" — qué prueba Web y qué no.
