# Security.md

> **Proyecto:** 4adra  
> **Versión:** 1.0  
> **Estado:** Draft

## Objetivo

Define controles de autenticación, autorización, protección de datos, auditoría y respuesta ante incidentes para clientes y Firebase Cloud Functions.

## Principios obligatorios

- Denegar por defecto y aplicar mínimo privilegio.
- Nunca confiar en entradas del cliente ni en datos cacheados para autorizar escrituras críticas.
- Validar y autorizar en Cloud Functions antes de escribir.
- Separar entornos de desarrollo, pruebas y producción.
- No registrar secretos, tokens, información financiera completa ni datos personales innecesarios.

## Autenticación

Firebase Authentication es el proveedor oficial. Toda ruta privada requiere `Authorization: Bearer <Firebase-ID-token>`.

- Validar firma, emisor, audiencia, expiración y revocación cuando aplique.
- No aceptar `userId`, roles ni pertenencia enviados por cliente como autoridad.
- Usar proveedores aprobados y MFA para cuentas administrativas cuando esté disponible.
- Renovar tokens con SDK oficial; no guardar tokens persistentes en texto plano.

## Autorización

La pertenencia activa y rol se verifican en servidor dentro de una transacción o lectura consistente.

| Acción | Owner | Administrator | Member | ReadOnly |
|---|---:|---:|---:|---:|
| Consultar grupo, gastos y balances | Sí | Sí | Sí | Sí |
| Crear gasto | Sí | Sí | Sí | No |
| Editar/eliminar gasto | Sí | Sí | Sí, cualquier gasto activo del grupo | No |
| Invitar/remover miembros | Sí | Sí | No | No |
| Cambiar roles o archivar | Sí | No | No | No |
| Confirmar liquidación | Sí | Sí | Sí, si es pagador o destinatario | No |
| Activar perfil de cálculo | Sí | Sí | No | No |

Nunca permitir que un grupo quede sin Owner. Firestore y Storage deben denegar por defecto; los recursos financieros se escriben mediante funciones autenticadas.

## Validación y concurrencia

Validar esquema JSON, tipos, límites, campos permitidos, monedas ISO-4217, importes decimales positivos, participantes, estados, porcentajes, tasas y versiones. Usar `Idempotency-Key` en mutaciones e `If-Match`/transacciones Firestore para concurrencia. Limitar tamaños de texto, archivos y participantes.

Límites por defecto (ADR-011, ajustables vía `appSettings` sin cambio de código): adjuntos en `image/jpeg`, `image/png`, `image/webp` o `application/pdf`, máximo 10 MB por archivo y 5 adjuntos activos por gasto. Rate limiting por defecto: 60 solicitudes/minuto por usuario autenticado en mutaciones, 300/minuto en lecturas, y 20/minuto por IP en rutas no autenticadas; exceder el límite responde `429 RATE_LIMITED`.

## Protección de datos

- TLS obligatorio; no permitir HTTP.
- Cifrado administrado en reposo de Firebase/Google Cloud.
- Adjuntos en Storage con rutas no adivinables y URLs firmadas de corta duración.
- Recopilar solo datos necesarios; no guardar tarjetas, cuentas bancarias, contraseñas ni tokens de pago.
- Retención por defecto (ADR-011, `Proposed` — pendiente de validación legal por jurisdicción de operación): los datos personales (nombre, correo, foto) se conservan mientras la cuenta esté activa; tras una solicitud de eliminación de cuenta, se anonimizan en un plazo máximo de 30 días. La auditoría financiera (montos, fechas, IDs opacos) se conserva de forma indefinida o según la normativa fiscal aplicable, incluso después de anonimizar al actor.
- URLs firmadas de adjuntos y de descarga de reportes: 15 minutos de duración por defecto (ADR-011).

## Secretos, auditoría y monitoreo

Secretos y claves externas viven en Secret Manager o configuración segura, nunca en repositorio, cliente, logs ni documentación. Las cuentas de servicio usan IAM mínimo; rotar y revocar secretos expuestos de inmediato.

Auditar actor, fecha, operación, entidad, resultado, request ID y cambios relevantes; enmascarar PII. Aplicar rate limiting por usuario, IP y grupo. Alertar ante fallos repetidos de autenticación, escalamiento de privilegios, exportaciones masivas y mutaciones anómalas.

## Clientes y despliegue

- Android: almacenamiento seguro, mínimo offline y sin logs sensibles.
- Web: escape de contenido, CSP, dependencias actualizadas y no usar HTML no confiable.
- Ambos: limpiar caché privada al cerrar sesión y no revelar detalles de permisos.
- Pipeline: pruebas, análisis estático, revisión de reglas Firebase y proyectos separados por entorno.

## Incidentes

1. Contener: revocar tokens/secretos o deshabilitar rutas afectadas.
2. Conservar evidencia: logs, request IDs y auditoría.
3. Evaluar alcance, datos afectados y obligaciones de aviso.
4. Corregir, probar y desplegar control preventivo.
5. Documentar causa, impacto, cronología y acciones correctivas.

Antes de publicar, verificar autenticación/roles, reglas Firebase, ausencia de secretos, validación/idempotencia, dependencias, auditoría y alertas.
