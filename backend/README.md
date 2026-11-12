# backend/

Backend de 4adra: un **Cloudflare Worker** (`4adra`) en TypeScript estricto con Hono, Cloudflare D1 y Better Auth (Google). Sirve la API (`/api/v1/*`), el login (`/api/auth/*`) y los archivos estáticos de la PWA (`/*`) desde un mismo origen: `https://4adra.edier.me` (ADR-014..016).

## Estructura

```text
backend/
├── src/
│   ├── domain/           # entidades, value objects, puertos y estrategias (sin Cloudflare, sin HTTP)
│   ├── application/      # casos de uso, comandos y DTOs de aplicación (sin D1 directo)
│   ├── infrastructure/
│   │   ├── d1/           # D1UserRepository, D1AuditLogWriter
│   │   └── auth/         # createAuth (Better Auth), BetterAuthAuthenticationProvider
│   ├── presentation/     # app Hono, middlewares, controladores y compositionRoot
│   └── index.ts          # entrada del Worker: export default { fetch }
├── migrations/           # migraciones SQL de D1 (NNNN_descripcion.sql), nunca se editan una vez aplicadas
├── public/               # Static Assets (placeholder hasta la PWA)
├── test/                 # unit/ (Node), integration/ (runtime de Workers + D1 local), contract/ (OpenAPI)
├── wrangler.jsonc        # Worker, binding D1 `DB`, assets, ruta 4adra.edier.me
└── worker-configuration.d.ts  # tipos generados con `npm run cf-typegen`
```

## Comandos

```bash
npm ci
cp .dev.vars.example .dev.vars   # BETTER_AUTH_SECRET obligatorio; GOOGLE_* para login real
npm run db:migrate:local
npm run dev                      # http://localhost:8787
npm test                         # unitarias + cobertura
npm run test:integration
npm run test:contract
npm run lint && npm run typecheck && npm run format:check
npm run build                    # wrangler deploy --dry-run --outdir dist
```

El deploy a producción lo hace CI (`.github/workflows/deploy-cloudflare.yml`) con push a `main`. Primera configuración: `docs/Deployment.md`.

## Referencias

- `docs/DevelopmentGuide.md`: cómo agregar una funcionalidad o una estrategia del motor de cálculo.
- `docs/CodingStandards.md`: convenciones de TypeScript, nombres y estructura.
- `docs/DatabaseSchema.md` y `docs/examples/D1Schema.sql`: esquema D1.
- `docs/api/openapi.yaml`: contrato HTTP.
