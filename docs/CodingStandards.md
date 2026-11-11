# CodingStandards.md

> **Proyecto:** 4adra  
> **Versión:** 1.0  
> **Estado:** Draft

## Objetivo

Define convenciones para el backend TypeScript (Cloudflare Worker) y la PWA Angular, de forma que el código sea consistente, legible, testeable y respete la arquitectura oficial.

## Reglas universales

- Priorizar código claro y pequeño sobre abstracciones prematuras.
- Cada clase o función tiene una responsabilidad principal.
- No duplicar lógica; extraer una abstracción cuando haya necesidad estable.
- Para dinero usar `Money` y decimales de precisión arbitraria; nunca `float` o `double`.
- Domain y UI no acceden directamente a D1, R2 ni Better Auth; solo los adaptadores de Infrastructure.
- Prohibidos `Manager`, `Helper`, `Utils`, `Common`, `Data` y `Misc` como nombres genéricos.
- Documentar decisiones, invariantes y efectos no evidentes; no comentar lo obvio.

## Nombres y estructura

Usar `PascalCase` en clases, interfaces, tipos y componentes; `camelCase` en métodos, propiedades y variables; `UPPER_SNAKE_CASE` en constantes. Preferir `amount`, `participant`, `expenseRepository` y evitar abreviaturas.

Sufijos representativos: `CreateExpenseUseCase`, `ExpenseRepository`, `D1ExpenseRepository`, `ExpenseDto`, `ExpenseMapper`, `EqualSplitStrategy`, `ExpenseCreated`.

```text
backend/src/
├── domain/          # entidades, value objects, interfaces y estrategias
├── application/     # casos de uso, comandos y DTOs de aplicación
├── infrastructure/  # d1/ (D1*Repository), auth/ (Better Auth), R2 y mensajería
├── presentation/    # app Hono, middlewares, handlers y compositionRoot
└── index.ts         # entrada del Worker (único export default)
```

La PWA se organiza por funcionalidad y separan `presentation`, `data` y dominio local. No replican algoritmos financieros del backend.

## Backend TypeScript

- Activar `strict: true`; prohibido `any`. Usar `unknown` y validarlo.
- Usar `const` por defecto; no mutar argumentos.
- Interfaces de repositorios y servicios en Domain; implementaciones D1/Better Auth en Infrastructure. Solo `compositionRoot.ts` instancia adaptadores concretos.
- SQL siempre con parámetros (`prepare(...).bind(...)`), nunca concatenando valores. Dinero en columnas `TEXT`, nunca `REAL`.
- Trabajo en segundo plano solo con `ctx.waitUntil` y con sus errores capturados y registrados.
- Handlers HTTP solo convierten transporte, extraen identidad, llaman un caso de uso y mapean respuestas/errores.
- Validar DTO en el borde y convertir a value objects antes de dominio.

```ts
const command = CreateExpenseCommand.fromRequest(request.body, actor);
const expense = await createExpenseUseCase.execute(command);
return toExpenseResponse(expense);
```

Cada función propaga `requestId`, exige idempotencia para mutaciones y retorna errores documentados.

## Angular Web (PWA)

- TypeScript estricto y componentes pequeños.
- Servicios API encapsulan HTTP; componentes no construyen URLs ni interpretan errores de dominio.
- Usar RxJS con cancelación y limpieza de suscripciones.
- Sanitizar contenido externo; no usar `innerHTML` no confiable.
- Formularios tipados y estados discriminados (`Loading`, `Content`, `Empty`, `Error`).
- Diseño responsive primero: la misma app sirve PC y celular.
- Llamar a la API con rutas relativas (`/api/v1/...`); nunca leer ni guardar tokens de sesión.
- No implementar balances, repartos ni autorización de negocio en la PWA.

## Errores, fechas y pruebas

Usar errores específicos de dominio; convertirlos a HTTP únicamente en Presentation. Fechas en UTC y presentación según zona del usuario. Importes se transportan como cadenas y se formatean solo en Presentation.

Toda funcionalidad requiere pruebas unitarias y el dominio mantiene 100 % de cobertura. La integración corre en el runtime de Workers con D1 local (`npm run test:integration`). Nombrar pruebas por comportamiento, por ejemplo `shouldRejectSplitWhenAmountsDoNotMatchExpenseTotal`.

## Formato y revisión

Automatizar formato/lint (`Prettier`/`ESLint`, Angular lint). No deshabilitar reglas sin justificación local. Antes de revisión: compilar, ejecutar pruebas pertinentes, revisar permisos y confirmar que no hay secretos, archivos generados o cambios ajenos. Commits en imperativo y con alcance: `feat(expenses): validate percentage split totals`.
