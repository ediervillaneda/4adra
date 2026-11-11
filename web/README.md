# web/

Directorio previsto para la **PWA** de 4adra: Angular, TypeScript, Angular Material y RxJS (`docs/AGENTS.md`). Es el único cliente (ADR-017): responsive para PC y celular, instalable desde el navegador.

Vacío intencionalmente. El scaffolding real (Angular CLI, manifest, service worker, login con Google, pantalla de perfil) es el **subproyecto 2** de la migración a Cloudflare y tendrá su propio spec en `docs/superpowers/specs/`.

## Cómo se publicará

El build de producción se sirve como **Workers Static Assets** del mismo Worker que la API (`backend/wrangler.jsonc`, `assets.directory`), en `https://4adra.edier.me`. Al compartir el origen con `/api`, no hay CORS y la cookie de sesión de Better Auth funciona sin configuración extra. La PWA no necesita claves ni configuración de terceros en el bundle.

## Reglas clave

- No implementa cálculos financieros ni reglas de negocio: solo presenta lo que devuelve la API (`docs/AGENTS.md`, `docs/CodingStandards.md`).
- Los servicios API encapsulan HTTP con rutas relativas (`/api/v1/...`). Los componentes no construyen URLs ni interpretan errores de dominio directamente.
- El login usa el cliente de Better Auth (`signIn.social({ provider: 'google' })`, ver `docs/api/Auth.md`). Nunca se leen ni guardan tokens.
- Organización por funcionalidad, separando presentación, datos y dominio local (sin replicar `domain/` del backend).

## Referencias

- `docs/CodingStandards.md` § "Angular Web".
- `docs/api/openapi.yaml`: contrato HTTP consumido por el cliente API.
- `docs/TestingGuide.md` § "Clientes": qué prueba la PWA y qué no.
- `docs/UISpecification.md`: pantallas y navegación.
