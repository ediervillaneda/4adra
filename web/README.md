# web/

**PWA de 4adra**, el único cliente (ADR-017 y ADR-019). Está hecha con Angular 22 (standalone, signals, zoneless), Angular Material 3 (tema verde-azulado) y `@angular/service-worker`. Se adapta a PC y celular, se instala desde el navegador y abre sin conexión.

El Worker `4adra` sirve el build (`dist/web/browser`) como Static Assets en `https://4adra.edier.me`, en el mismo origen que la API: sin CORS y con la cookie de sesión `HttpOnly`.

## Comandos

```bash
npm ci
npm start        # ng serve en http://localhost:4200 (proxy.conf.json: /api → http://localhost:8787)
npm test         # Vitest con cobertura (umbral 70 %)
npm run lint     # angular-eslint
npm run build    # dist/web/browser
```

**Login con Google en desarrollo:**
1. En `backend/`: `TRUSTED_ORIGINS=http://localhost:4200` en `.dev.vars`, y luego `npm run dev`.
2. Aquí: `npm start`.
3. El cliente OAuth de Google debe tener `http://localhost:4200` como origen autorizado.

## Estructura

```text
src/app/
├── core/
│   ├── auth/        AuthService (sesión de Better Auth) y guards
│   ├── http/        interceptor (401 → /entrar; 5xx → mensaje con requestId) y notificador
│   ├── layout/      shell responsive (barra inferior < 840 px; navigation rail ≥ 840 px; pie con Privacidad)
│   └── network/     estado de conexión (aviso "Sin conexión")
├── features/        home, login, profile, privacy, not-found
└── shared/          texts.ts (todos los textos, en español), api.ts (tipos del contrato), logo
```

## Reglas

- **Lógica de negocio:** no se calcula nada financiero ni se aplican reglas de negocio aquí. La PWA solo presenta lo que devuelve la API.
- **Textos:** solo en español, y todos salen de `shared/texts.ts`; las plantillas no llevan literales.
- **Datos personales:** nunca se pide ni se guarda un número de teléfono.
- **API:** se llama con rutas relativas (`/api/...`) y nunca se leen ni se guardan tokens.
- **Service worker:** no cachea `/api/*` (`ngsw-config.json`).

## Referencias

- `docs/superpowers/specs/2026-11-11-pwa-base-design.md`: spec de esta pieza.
- `docs/UISpecification.md`: pantallas y navegación.
- `docs/api/Auth.md` y `docs/api/openapi.yaml`: contrato de la API.
