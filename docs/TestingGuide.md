# TestingGuide.md

> **Proyecto:** 4adra  
> **Versión:** 1.0  
> **Estado:** Draft

## Objetivo

Define la estrategia de pruebas para asegurar cálculos financieros correctos, contratos estables, seguridad y comportamiento consistente entre la PWA y el backend.

## Principios

- Las pruebas verifican comportamiento observable, no detalles internos de implementación.
- Todo bug corregido debe incorporar una prueba de regresión.
- Las pruebas deben ser deterministas: sin hora real, red real, orden aleatorio ni tasas externas no controladas.
- Los cálculos monetarios usan valores decimales exactos; no comparaciones aproximadas de `float`/`double`.
- El backend es la fuente de verdad de las reglas financieras; los clientes prueban presentación e integración con contratos.

## Pirámide de pruebas

| Nivel | Propósito | Herramientas sugeridas |
|---|---|---|
| Unitarias | Dominio, casos de uso, mapeos, middlewares Hono (`app.request`) y validaciones | Vitest (`npm test`, Node) |
| Integración | Repositorios D1, Better Auth, triggers y la API de punta a punta (`SELF.fetch`) | Vitest + `@cloudflare/vitest-plugin` (runtime de Workers + D1 local, `npm run test:integration`) |
| Contrato | API HTTP y DTOs contra `docs/api/openapi.yaml` | Vitest + ajv (`npm run test:contract`) |
| UI | Flujos visuales y estado de pantallas de la PWA | Angular TestBed |
| End-to-end | Flujos críticos completos | Producción con cuentas de prueba, o `npm run dev` local |

Cobertura mínima: Domain 100 %, Application 95 %, Infrastructure 80 % y Presentation 70 %. La cobertura no sustituye pruebas de casos límite ni revisión.

## Pruebas de dominio obligatorias

Cubrir cada estrategia de reparto: `Equal`, `Percentage`, `ExactAmount`, `Shares` y `Custom`; importes positivos, residuales, orden determinista, porcentaje inválido, montos inconsistentes, participantes repetidos, usuarios fuera del grupo y divisas con diferente número de decimales.

Para balances y liquidaciones, probar:

- `Σ Pagado = Σ Consumido` y `Σ Balance = 0`.
- Grupos vacíos, un participante y gastos individuales.
- Gastos eliminados/restaurados y liquidaciones pendientes, canceladas o confirmadas.
- Liquidaciones parciales, completas, pago a sí mismo y monto superior a la deuda.
- Múltiples monedas con tasas históricas congeladas.
- Idempotencia de recálculos y comandos.
- Desempates por `UserId` y resultados reproducibles.

## Motor de algoritmos configurable

Cada `CalculationProfile` y estrategia requiere pruebas de registro, selección, versión y compatibilidad. Debe verificarse que:

1. El perfil activo se usa en gastos nuevos.
2. El gasto conserva `calculationProfileVersion` y reproduce el resultado histórico aunque se active otro perfil.
3. Estrategias no admitidas o versiones inexistentes se rechazan.
4. Toda estrategia es pura, determinista e idempotente.
5. Los cambios de perfil no reescriben los importes históricos.

Usar conjuntos de *golden tests*: entradas fijas y resultados esperados compartidos entre backend y, cuando sea útil, clientes.

## Integración en el runtime de Workers (D1 local)

Las pruebas de integración corren dentro de `workerd` (Miniflare) con una D1 local a la que se aplican todas las migraciones de `backend/migrations/` antes de cada archivo (`test/integration/applyMigrations.ts`). Nunca se ejecutan contra producción y nunca llaman a Google. Cubrir:

- Repositorios D1: ida y vuelta de campos, upsert, llaves foráneas, `UNIQUE` y `db.batch` atómico.
- Triggers de inmutabilidad (`audit_logs`, tasas, perfiles publicados).
- Better Auth: sesión real sembrada con un `createAuth` de prueba (email/contraseña habilitado solo ahí), cookie falsificada o vencida → `401`.
- Autorización por rol con usuarios Owner, Administrator, Member, ReadOnly y no miembro.
- API de punta a punta con `SELF.fetch`: errores HTTP, idempotencia y concurrencia.
- Carga de adjuntos, URL firmada y denegación de rutas ajenas.
- Eventos, auditoría, notificaciones simuladas y recálculo de balances.

Cada suite crea datos aislados y los elimina al finalizar. No compartir IDs ni depender de orden de ejecución.

## Contrato y API

Verificar códigos HTTP, formatos de error, paginación, campos requeridos/opcionales, serialización decimal y compatibilidad hacia atrás. Todo endpoint nuevo o cambio de contrato actualiza `ApiSpecification.md` y agrega pruebas de contrato.

## Clientes

La PWA (`web/`) usa Vitest, que es el runner por defecto de Angular 22, con TestBed y `HttpTestingController`. Corre con `npm test` y tiene un umbral de cobertura del 70 % en `src/app`. Las pruebas de configuración leen `ngsw-config.json` y el manifest para garantizar que el service worker nunca cachea `/api/*`. Hay una prueba explícita de que el perfil no tiene ningún campo de teléfono.

La PWA prueba estados de presentación, navegación clave, manejo de carga/error, formato de dinero/fechas, diseño responsive (PC y celular), componentes, formularios tipados, accesibilidad básica, servicios API y limpieza de suscripciones. Ningún cliente debe tener pruebas que validen una implementación local alternativa de balances.

## E2E críticos

Ejecutar contra `npm run dev` antes de publicar una versión, y la prueba de humo en producción después (`Deployment.md`):

1. Registro/inicio de sesión y carga de perfil.
2. Crear grupo e invitar miembro.
3. Registrar gasto con reparto y verificar balances en PC y en celular.
4. Confirmar liquidación y validar auditoría.
5. Cambiar perfil de cálculo y registrar un gasto nuevo sin alterar uno histórico.
6. Cargar y acceder a un adjunto autorizado; rechazar acceso no autorizado.
7. Exportar un reporte.

## Datos, calidad y CI

Usar fábricas de datos legibles (`aGroup`, `anExpense`, `aMember`) y valores explícitos; nunca datos personales reales. Congelar reloj, generador de IDs y tipo de cambio mediante inyección de dependencias.

El pipeline ejecuta formato, lint, tipos, unitarias, migraciones D1 en limpio, integración en el runtime de Workers, pruebas de contrato y análisis de cobertura. Un cambio no se integra si falla una prueba, reduce los mínimos o altera una prueba dorada sin decisión y revisión explícitas.
