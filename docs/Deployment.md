# Deployment.md

> **Proyecto:** Expense Sharing Platform  
> **Versión:** 1.0  
> **Estado:** Draft

## Objetivo

Define el proceso seguro y repetible para desplegar backend Firebase, reglas, clientes Web y Android, con validación, reversión y monitoreo.

## Entornos

| Entorno | Propósito | Datos | Acceso |
|---|---|---|---|
| Local | Desarrollo y pruebas rápidas | Emuladores, sintéticos | Desarrolladores |
| Development | Integración continua | Sintéticos/anonimizados | Equipo técnico |
| Staging | Validación previa a producción | Sintéticos representativos | Equipo autorizado |
| Production | Usuarios reales | Datos reales | Mínimo privilegio |

Cada entorno usa proyecto Firebase, Storage, secretos, cuentas de servicio y configuración propios. Está prohibido reutilizar secretos o datos de producción en entornos inferiores.

## Artefactos desplegables

- Cloud Functions/API y sus dependencias bloqueadas.
- Reglas e índices de Firestore.
- Reglas y configuración de Firebase Storage.
- Configuración de Scheduler, mensajería y alertas.
- Aplicación Web estática y configuración de entorno.
- Aplicación Android firmada, distribuida en canal interno, beta o producción.

## Requisitos previos

Antes de cualquier despliegue: versión identificable, cambios revisados, CI en verde, pruebas con emuladores, análisis de seguridad, secretos configurados en el entorno destino, migración compatible preparada y plan de reversión documentado.

Los cambios de API, perfil de cálculo, esquema o reglas de seguridad deben tener prueba de compatibilidad y aprobación explícita.

## Pipeline recomendado

```text
Formato/lint -> tipos -> unitarias -> integración con emuladores
-> contrato -> build -> análisis de dependencias/seguridad
-> despliegue Development -> smoke tests
-> despliegue Staging -> E2E y aprobación
-> producción canaria -> monitoreo -> despliegue gradual
```

El pipeline usa una cuenta de servicio con IAM mínimo y secretos administrados; nunca credenciales personales ni variables impresas en logs.

## Backend Firebase

1. Validar configuración y versión de runtime Node.js.
2. Desplegar índices y reglas compatibles antes de código que los requiera.
3. Desplegar Cloud Functions de forma gradual o por función cuando sea posible.
4. Ejecutar smoke tests autenticados: perfil, grupo, gasto, balances y liquidación.
5. Revisar errores, latencia, consumo y auditoría.

No realizar borrados destructivos ni cambios de reglas que bloqueen clientes existentes sin periodo de transición. Mantener funciones/contratos anteriores durante la ventana de deprecación.

## Web y Android

Web: generar artefacto reproducible con configuración del entorno; publicar inicialmente en canal/canary y verificar autenticación, CSP, API y errores de cliente.

Android: firmar en infraestructura segura, probar contra staging, publicar primero en pista interna/beta y monitorizar fallos antes de producción. No incluir claves privadas, secretos ni configuraciones de producción editables en el binario.

## Migraciones y perfiles de cálculo

Las migraciones son aditivas, idempotentes, registran avance y pueden reiniciarse sin duplicar datos. Hacer copia/plan de recuperación antes de cambios masivos. No reescribir importes históricos.

Una estrategia o `CalculationProfile` publicado es inmutable. Para cambiar comportamiento, publicar versión nueva, activarla solo para cálculos futuros y verificar con pruebas doradas que los gastos previos mantienen resultados reproducibles.

## Reversión e incidentes

Revertir una función o Web a un artefacto anterior conocido; no revertir datos financieros mediante borrado. Si una mutación ya se confirmó, usar una operación compensatoria auditada.

Ante incidente: contener acceso, pausar despliegue, preservar logs/auditoría, evaluar impacto, aplicar reversión segura, comunicar a responsables y documentar acciones correctivas.

## Verificación posterior

- Salud de funciones, tasa de errores, latencia y cuota.
- Autenticación, autorización y reglas de Firestore/Storage.
- Creación de gasto, cálculo de balance y confirmación de liquidación.
- Eventos, auditoría, notificaciones y exportaciones.
- Métricas de cliente: errores, inicio de sesión y llamadas API.
- Confirmación de que no se publicaron secretos ni datos de prueba.

Registrar versión, hora, responsable, entorno, resultado de smoke tests, migraciones y decisión de avance/reversión en el registro de despliegue.
