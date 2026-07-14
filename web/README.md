# web/

Directorio previsto para el cliente Web de 4adra: Angular, TypeScript, Angular Material y RxJS (`docs/AGENTS.md`).

Vacío intencionalmente — el scaffolding real (Angular CLI, configuración de build/lint) es parte de la Fase 0, ver `docs/checklists/Fase0-FundacionTecnica.md`.

## Reglas clave

- No implementa cálculos financieros ni reglas de negocio: solo presenta lo que devuelve la API (`docs/AGENTS.md`, `docs/CodingStandards.md`).
- Servicios API encapsulan HTTP; los componentes no construyen URLs ni interpretan errores de dominio directamente.
- Organización por funcionalidad, separando presentación, datos y dominio local (sin replicar `domain/` del backend).

## Ya existe

- `src/environments/environment.ts` — configuración del cliente Firebase para el proyecto `development` (`adra-54655`). Ver los comentarios del archivo: no es un secreto, pero sí requiere restringir la API key en Google Cloud Console antes de producción. Falta crear `environment.production.ts`/`environment.staging.ts` cuando existan esos proyectos, y configurar `fileReplacements` en `angular.json` una vez se genere el proyecto real con Angular CLI.

## Referencias

- `docs/CodingStandards.md` § "Angular Web".
- `docs/api/openapi.yaml` — contrato HTTP consumido por el cliente API.
- `docs/TestingGuide.md` § "Clientes" — qué prueba Web y qué no.
- `docs/Security.md` — antes de habilitar Google Analytics (`measurementId`), revisar minimización de datos.
