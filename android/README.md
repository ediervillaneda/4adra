# android/

Directorio previsto para el cliente Android de 4adra: Kotlin, Jetpack Compose, MVVM, Hilt, Coroutines y Flow (`docs/AGENTS.md`).

Vacío intencionalmente — el scaffolding real (proyecto Gradle, módulos) es parte de la Fase 0, ver `docs/checklists/Fase0-FundacionTecnica.md`.

## Reglas clave

- No implementa balances, repartos ni autorización de negocio en el ViewModel (`docs/CodingStandards.md` § "Android Kotlin").
- Estados de pantalla sellados: `Loading`, `Content`, `Empty`, `Error`.
- `suspend`/`Flow`/corrutinas estructuradas; nunca `GlobalScope`.
- Repositorio remoto encapsula la API; Hilt inyecta dependencias.

## Referencias

- `docs/CodingStandards.md` § "Android Kotlin".
- `docs/api/openapi.yaml` — contrato HTTP consumido por el cliente API.
- `docs/TestingGuide.md` § "Clientes" — qué prueba Android y qué no.
