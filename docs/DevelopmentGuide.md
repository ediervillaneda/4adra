# DevelopmentGuide.md

> **Proyecto:** 4adra  
> **Versión:** 1.0  
> **Estado:** Draft

## Objetivo

Guía operativa para contribuir al backend Firebase, cliente Android y cliente Web sin romper la arquitectura, los contratos ni la trazabilidad financiera.

## Requisitos locales

- Node.js LTS y gestor de paquetes bloqueado por el repositorio.
- Firebase CLI y Firebase Emulator Suite.
- JDK y Android Studio para Android.
- Navegador moderno y herramientas Angular para Web.
- Acceso solo a proyectos Firebase de desarrollo o staging; nunca usar producción para pruebas manuales.

Las versiones exactas deben fijarse en los archivos del repositorio (`package.json`, Gradle Wrapper, `.nvmrc` u homólogos) y documentarse al modificarse.

## Inicio rápido

```text
1. Clonar el repositorio y revisar AGENTS.md.
2. Instalar dependencias usando el lockfile.
3. Configurar variables locales desde una plantilla sin secretos.
4. Iniciar Firebase Emulator Suite.
5. Ejecutar pruebas y análisis estático.
6. Levantar backend, Web o Android contra emuladores.
```

No copiar secretos de producción a archivos locales. Usar cuentas de prueba y el proyecto Firebase de desarrollo.

## Organización y límites de capas

```text
backend/src/
├── domain/          entidades, value objects, interfaces, estrategias
├── application/     casos de uso, comandos, DTOs de aplicación
├── infrastructure/  Firestore, Storage, Auth, providers
└── presentation/    Cloud Functions, HTTP y mapeo de transporte
```

El flujo es `Presentation -> Application -> Domain <- Infrastructure`. Una pantalla no llama Firestore para mutaciones críticas; un caso de uso no importa SDK de Firebase; una entidad no retorna DTO HTTP.

## Cómo agregar una funcionalidad

1. Identificar reglas e invariantes en `BusinessRules.md` y `DomainModel.md`.
2. Actualizar la especificación antes o junto al código: API, esquema, algoritmos y seguridad según corresponda.
3. Crear o extender value objects, entidad o servicio de dominio sin dependencias de framework.
4. Definir interfaces de repositorio/servicio en Domain.
5. Crear un caso de uso pequeño en Application.
6. Implementar adaptadores Firebase en Infrastructure.
7. Exponer un handler HTTP delgado en Presentation y protegerlo con autenticación/autorización.
8. Agregar pruebas unitarias, de integración y contrato necesarias.
9. Validar con emuladores y actualizar documentación de cambio.

## Crear un caso de uso

Un caso de uso recibe un comando tipado, valida permisos y estado mediante dependencias inyectadas, ejecuta reglas de dominio, persiste transaccionalmente, escribe auditoría y publica eventos. No debe depender de `Request`, `Response`, Firestore ni interfaces de UI.

```text
CreateExpenseUseCase
  -> validar actor y membresía
  -> resolver CalculationProfile versionado
  -> construir Expense y Split con Domain
  -> transacción de persistencia
  -> auditoría + ExpenseCreated
  -> recálculo de balances
```

## Agregar una estrategia del motor de cálculo

1. Definir la interfaz y contrato en `Algorithms.md`.
2. Implementar una estrategia pura, determinista, sin E/S ni acceso a repositorios.
3. Asignar identificador y versión inmutables.
4. Registrar la estrategia en el `CalculationEngine` mediante composición/inyección, no mediante `if` dispersos.
5. Crear/actualizar `CalculationProfile` versionado.
6. Añadir pruebas doradas, casos límite y prueba de reproducción histórica.
7. No cambiar el comportamiento de estrategias ya publicadas: crear una versión nueva.

## Cambios a Firestore y API

Firestore no aplica esquema, por tanto todo campo nuevo debe tener valor por defecto, lectura compatible y migración si es necesaria. Antes de eliminar un campo, publicar una ruta compatible y medir adopción.

Todo endpoint mutante necesita autenticación, autorización, validación, `Idempotency-Key`, auditoría y prueba de contrato. Las mutaciones concurrentes usan versión de recurso o transacción.

## Flujo de contribución

- Mantener cambios pequeños y enfocados.
- Ejecutar formato, lint, comprobación de tipos y pruebas pertinentes antes de abrir revisión.
- Explicar impacto funcional, datos, seguridad, API y migración en la descripción del cambio.
- No incluir secretos, archivos generados, cambios de dependencias no justificados ni refactors ajenos.
- Registrar decisiones de arquitectura relevantes en `Decisions.md`.

## Depuración

Reproducir primero en local con emuladores y datos mínimos. Usar `requestId`, logs estructurados y audit logs sin exponer PII. No corregir un problema financiero editando balances directamente: identificar el gasto, split, liquidación o estrategia que produce el resultado y aplicar una operación auditada.
