# android/

Directorio previsto para el cliente Android de 4adra: Kotlin, Jetpack Compose, MVVM, Hilt, Coroutines y Flow (`docs/AGENTS.md`).

Vacío intencionalmente — el scaffolding real (proyecto Gradle, módulos) es parte de la Fase 0, ver `docs/checklists/Fase0-FundacionTecnica.md`.

**Nombre de paquete / `applicationId`:** `com.adra.app` (Proposed, ver `docs/Decisions.md`). Sigue la misma convención que el project ID de Firebase (`adra-54655`, sin el "4" inicial porque ni Android ni Firebase aceptan segmentos que empiecen con dígito). Debe coincidir con el nombre de la app Android que se registre dentro de ese mismo proyecto Firebase al generar `google-services.json`. Es esencialmente permanente una vez publicado en Play Store — confirmar antes de crear el proyecto Gradle real.

## Reglas clave

- No implementa balances, repartos ni autorización de negocio en el ViewModel (`docs/CodingStandards.md` § "Android Kotlin").
- Estados de pantalla sellados: `Loading`, `Content`, `Empty`, `Error`.
- `suspend`/`Flow`/corrutinas estructuradas; nunca `GlobalScope`.
- Repositorio remoto encapsula la API; Hilt inyecta dependencias.

## Referencias

- `docs/CodingStandards.md` § "Android Kotlin".
- `docs/api/openapi.yaml` — contrato HTTP consumido por el cliente API.
- `docs/TestingGuide.md` § "Clientes" — qué prueba Android y qué no.
