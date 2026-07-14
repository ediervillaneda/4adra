# android/

Directorio previsto para el cliente Android de 4adra: Kotlin, Jetpack Compose, MVVM, Hilt, Coroutines y Flow (`docs/AGENTS.md`).

Vacío intencionalmente — el scaffolding real (proyecto Gradle, módulos) es parte de la Fase 0, ver `docs/checklists/Fase0-FundacionTecnica.md`.

**Nombre de paquete / `applicationId`:** `com.edier.adra.app` — registrado en Firebase (proyecto `adra-54655`, mismo `project_number` `996278378799` que el cliente Web), ver ADR-012 en `docs/Decisions.md`. Es esencialmente permanente una vez publicado en Play Store.

**`google-services.json`:** ya está en `android/app/google-services.json` con el `package_name` correcto (`com.edier.adra.app`) — esa es la ubicación estándar que busca el plugin `com.google.gms.google-services` por defecto (junto al módulo `:app`, no en la raíz de `android/`). Queda una copia vieja del registro anterior (`com.edier.cuadra.app`) en `android/google-services.json` (raíz); ya no se usa, se puede borrar.

No es un secreto en el mismo sentido que una clave de cuenta de servicio (Admin SDK): Google documenta explícitamente que `google-services.json` es seguro de incluir en el APK/repositorio, porque no otorga acceso privilegiado por sí solo. La protección real sigue siendo la misma de siempre: `firestore.rules`/`storage.rules` denegando acceso directo de clientes (ADR-009) y, específicamente para esta API key, restringirla en Google Cloud Console (Credentials → esa key → Application restrictions → **Android apps**, con el `applicationId` `com.edier.adra.app` y el SHA-1 del certificado de firma) antes de publicar — hoy no tiene esa restricción. Pendiente en el checklist de Fase 0.

## Reglas clave

- No implementa balances, repartos ni autorización de negocio en el ViewModel (`docs/CodingStandards.md` § "Android Kotlin").
- Estados de pantalla sellados: `Loading`, `Content`, `Empty`, `Error`.
- `suspend`/`Flow`/corrutinas estructuradas; nunca `GlobalScope`.
- Repositorio remoto encapsula la API; Hilt inyecta dependencias.

## Referencias

- `docs/CodingStandards.md` § "Android Kotlin".
- `docs/api/openapi.yaml` — contrato HTTP consumido por el cliente API.
- `docs/TestingGuide.md` § "Clientes" — qué prueba Android y qué no.
