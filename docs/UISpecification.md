# UISpecification.md

> **Proyecto:** 4adra
> **Versión:** 1.0
> **Estado:** Draft

## Objetivo

Inventario de pantallas, flujo de navegación y reglas de presentación para Android y Web, cubriendo las seis fases de `docs/Roadmap.md`. Es el puente entre la especificación de dominio/API (que ya existe) y el trabajo real de diseño visual (wireframes, mockups de alta fidelidad, prototipo) que todavía no existe — este documento no reemplaza esos artefactos, los antecede: define *qué* pantallas hacen falta y *qué* muestran, no *cómo* se ven exactamente.

No incluye wireframes ni un sistema de diseño completo (paleta de marca, tipografía, logo) — eso sigue pendiente de decisión (ver "Sistema de diseño" abajo) y de las herramientas de diseño reales (Figma u otra).

## Principios (heredados de `docs/CodingStandards.md` y `docs/AGENTS.md`)

- Ninguna pantalla calcula balances, repartos, liquidaciones ni aplica reglas de negocio: solo presenta lo que devuelve la API (`docs/api/openapi.yaml`) y solicita operaciones.
- Toda pantalla que carga datos remotos modela su estado como uno de cuatro estados sellados: `Loading`, `Content`, `Empty`, `Error`. Este documento asume esos cuatro estados en cada pantalla listada abajo, aunque no siempre se repitan en la tabla.
- El rol mínimo de cada pantalla/acción es el que ya define `docs/Security.md`; la UI oculta o deshabilita acciones no permitidas, pero la autorización real vive en el backend — ocultar un botón no es un control de seguridad.
- Fechas en huso horario del usuario, importes formateados según configuración regional, pero el valor exacto (`Money` como string) nunca se recalcula ni se redondea en el cliente (`docs/domain/Money.md`).
- Ambos clientes ya comparten sistema de diseño base por decisión de stack (`docs/AGENTS.md`): **Material Design** (Jetpack Compose Material 3 en Android, Angular Material en Web). Este documento no reinventa eso, construye sobre esa base.

## Sistema de diseño (Proposed — pendiente de confirmación de marca)

No hay todavía paleta de marca, tipografía ni logo definidos en ningún documento del proyecto. Propuesta mínima para no bloquear el trabajo de UI, fácil de reemplazar después sin tocar la estructura de pantallas:

- **Base:** Material Design 3 en ambas plataformas (Material You / dynamic color en Android si se decide soportarlo; tema Angular Material equivalente en Web), sin componentes custom fuera de lo que ya provee cada framework.
- **Color semilla sugerido:** un azul/verde-azulado (asociado a claridad y confianza — coherente con el tagline "Cuentas claras, gastos compartidos"), generado como *seed color* de Material 3 en vez de una paleta fija a mano; se puede ajustar en minutos con Material Theme Builder una vez haya una decisión real de marca.
- **Colores semánticos obligatorios** (más allá de lo estético, por reglas de negocio): positivo/verde para balance a favor (`balance > 0`), negativo/rojo para balance en contra (`balance < 0`), neutro para balance en cero — igual en Android y Web, para que un usuario que usa ambos clientes no tenga que reaprender la convención.
- **Tipografía:** la tipografía por defecto de cada sistema (Roboto/system font en Android, la fuente por defecto de Angular Material en Web) hasta que se decida una tipografía de marca.
- **Pendiente real:** logo, paleta de marca definitiva, ícono de la app. No se puede completar sin una decisión de marca explícita — no inventar esto sin aprobación.

## Navegación

### Android (bottom navigation + navegación anidada por grupo)

```text
Splash (verifica sesión)
├── sin sesión → Login → (usuario nuevo) → Completar perfil ─┐
└── con sesión ───────────────────────────────────────────────┤
                                                                ▼
                                    ┌───────────────────────────────────────┐
                                    │           Navegación raíz              │
                                    │  (bottom navigation, 3 pestañas)       │
                                    ├───────────────┬───────────────┬───────┤
                                    │  Mis grupos    │ Notificaciones │ Perfil │
                                    │  (Fase 1)      │   (Fase 3)     │(Fase1) │
                                    └───────┬────────┴───────────────┴───────┘
                                            ▼
                                   Detalle de grupo
                                   (tabs internas: Gastos | Balances | Liquidaciones | Miembros)
                                            │
                        ┌───────────────────┼──────────────────────┐
                        ▼                   ▼                      ▼
                 Detalle de gasto    Sugerencias de liquidación   Miembros e invitaciones
                 Crear/editar gasto  Confirmar liquidación         Invitar miembro
```

FAB (botón flotante) contextual: "Crear gasto" dentro de la tab Gastos de un grupo; "Crear grupo" dentro de "Mis grupos".

### Web (barra lateral + contenido por grupo)

```text
Login / Completar perfil
        │
        ▼
┌───────────────────────────────────────────────────┐
│  Shell: barra lateral + topbar                     │
│  Sidebar: Mis grupos · Notificaciones (Fase 3) ·    │
│           Perfil                                    │
└───────────────────────┬─────────────────────────────┘
                         ▼
                Detalle de grupo
                (tabs horizontales: Gastos | Balances | Liquidaciones | Miembros | Ajustes)
                         │
        ┌────────────────┼───────────────────────┐
        ▼                ▼                       ▼
 Tabla de gastos   Sugerencias de liquidación   Miembros e invitaciones
 (filtros, búsqueda) Confirmar liquidación        Perfil de cálculo (Fase 2)
```

Diferencia principal con Android: Web usa una tabla/lista densa con filtros visibles (más espacio horizontal), Android usa tarjetas apilables con filtros en un panel colapsable. Ambos consumen los mismos endpoints (`GET /groups/{groupId}/expenses?...`).

## Inventario de pantallas

Convención de columnas: **Estados** asume siempre `Loading/Content/Empty/Error` salvo que se indique otra cosa; **Rol mínimo** según la matriz de `docs/Security.md`; **Datos** referencia la operación de `docs/api/openapi.yaml`.

### Fase 1 — MVP

#### Autenticación y perfil

| Pantalla | Estados particulares | Datos | Rol mínimo | Acciones principales |
|---|---|---|---|---|
| Splash | Verificando sesión (sin `Empty`) | Token local + `GET /me` | Ninguno | Redirige a Login o a Mis grupos |
| Login | `Error` de credenciales | Firebase Auth SDK (no pasa por nuestra API) | Ninguno | Iniciar sesión; ir a Registro |
| Registro | igual que Login | Firebase Auth SDK | Ninguno | Crear cuenta con Firebase Auth |
| Completar perfil | Sin `Empty` | `PATCH /me` | Usuario autenticado | Definir nombre, moneda preferida, idioma, zona horaria |
| Mi perfil | — | `GET /me` | Usuario autenticado | Editar perfil, cerrar sesión |

**Nota abierta:** `docs/Security.md` no especifica qué proveedores de Firebase Auth están aprobados (¿email/password, Google Sign-In, ambos?) — pantallas de Login/Registro dependen de esa decisión, no tomarla aquí sin confirmarla primero.

#### Grupos y miembros

| Pantalla | Estados particulares | Datos | Rol mínimo | Acciones principales |
|---|---|---|---|---|
| Mis grupos (lista) | `Empty` = sin grupos todavía | `GET /groups` | Usuario autenticado | Ver grupos, ir a Crear grupo |
| Crear grupo | — | `POST /groups` | Usuario autenticado (queda Owner) | Nombre, moneda base, perfil de cálculo |
| Detalle de grupo | — | `GET /groups/{groupId}` | Miembro activo | Navega a Gastos/Balances/Liquidaciones/Miembros |
| Editar grupo | — | `PATCH /groups/{groupId}` | Owner, Administrator | Editar nombre, descripción, imagen |
| Archivar grupo (confirmación) | — | `POST /groups/{groupId}/archive` | Owner | Confirmar archivado (irreversible desde UI) |
| Miembros del grupo | `Empty` improbable (siempre ≥1) | `GET /groups/{groupId}/members` | Miembro activo | Ver roles; invitar (Owner/Administrator); cambiar rol/remover (Owner) |
| Invitar miembro | — | `POST /groups/{groupId}/members/invitations` | Owner, Administrator | Correo + rol |
| Invitación recibida | — | `POST /invitations/{id}/accept\|decline` | Destinatario de la invitación | Aceptar / rechazar |
| Abandonar grupo (confirmación) | `Error` si `OUTSTANDING_BALANCE`/`LAST_OWNER` | `POST /groups/{groupId}/leave` | Miembro activo, no último Owner, balance en cero | Confirmar salida |

#### Gastos

| Pantalla | Estados particulares | Datos | Rol mínimo | Acciones principales |
|---|---|---|---|---|
| Lista de gastos | `Empty` = grupo sin gastos; filtros por categoría/pagador/fecha | `GET /groups/{groupId}/expenses` | Miembro activo | Ver, filtrar, ir a Crear/Detalle |
| Detalle de gasto | — | `GET /groups/{groupId}/expenses/{expenseId}` | Miembro activo | Editar, eliminar, restaurar (si aplica) |
| Crear gasto | Validación de reparto en vivo (suma exacta) antes de enviar | `POST /groups/{groupId}/expenses` | Miembro activo | Título, monto, moneda, pagador, tipo de reparto (`Equal/ExactAmount/Percentage/Shares`; `Custom` solo desde Fase 2) |
| Editar gasto | igual que Crear | `PATCH /groups/{groupId}/expenses/{expenseId}` | Cualquier Member del grupo (`docs/Security.md`) | Modificar campos permitidos |
| Eliminar gasto (confirmación) | — | `DELETE /groups/{groupId}/expenses/{expenseId}` | Cualquier Member del grupo | Soft delete |
| Gastos eliminados / Restaurar | `Empty` = nada eliminado | `POST .../restore` | Cualquier Member del grupo | Restaurar un gasto eliminado |

#### Balances y liquidaciones

| Pantalla | Estados particulares | Datos | Rol mínimo | Acciones principales |
|---|---|---|---|---|
| Balances del grupo | `Empty` = grupo sin actividad (todo en cero) | `GET /groups/{groupId}/balances` | Miembro activo | Ver posición de cada miembro |
| Sugerencias de liquidación | `Empty` = nada que liquidar | `GET /groups/{groupId}/settlement-suggestions` | Miembro activo | Ver transferencias sugeridas, ir a Crear liquidación |
| Crear liquidación | — | `POST /groups/{groupId}/settlements` | Miembro activo | Origen, destino, monto, método, nota |
| Detalle de liquidación | `Error` si `SETTLEMENT_AMOUNT_EXCEEDS_DEBT`/`STALE_VERSION` al confirmar | `GET .../settlements/{id}` + `confirm\|cancel\|reject` | Pagador, destinatario, Owner o Administrator para confirmar | Confirmar, cancelar, rechazar |
| Historial de liquidaciones | `Empty` = ninguna todavía | `GET /groups/{groupId}/settlements` | Miembro activo | Filtrar por estado/usuario |

### Fase 2 — Motor configurable

| Pantalla | Estados particulares | Datos | Rol mínimo | Acciones principales |
|---|---|---|---|---|
| Perfil de cálculo del grupo | — | `GET /groups/{groupId}/calculation-profile`, `GET /calculation-profiles` | Miembro activo (ver) / Owner, Administrator (activar) | Ver perfil activo, activar uno nuevo |
| Simular perfil (comparar estrategias) | No persiste nada | `GET .../settlement-suggestions?profileId=...` | Owner, Administrator | Comparar resultado sin aplicar |
| Reparto Custom (paso adicional en Crear/Editar gasto) | — | mismo endpoint de gastos, `split.type = CUSTOM` | Cualquier Member | Combinar importes fijos + porcentajes + residuo |

### Fase 3 — Colaboración y experiencia

| Pantalla | Estados particulares | Datos | Rol mínimo | Acciones principales |
|---|---|---|---|---|
| Adjuntos del gasto | `Empty` = sin adjuntos | `POST .../attachments/upload-url` + descarga por URL firmada | Cualquier Member | Subir, ver, eliminar adjunto |
| Comentarios del gasto | Pendiente de especificar backend (ver `docs/checklists/Fase3-ColaboracionExperiencia.md`) | — | — | Comentar, ver hilo |
| Centro de notificaciones | `Empty` = sin notificaciones | Pendiente de especificar backend (mismo checklist) | Usuario autenticado | Ver, marcar como leída |
| Dashboard de grupo | `Empty` = sin actividad suficiente | Agregaciones sobre gastos/balances ya existentes | Miembro activo | Resumen por categoría/periodo |
| Categorías (catálogo) | — | `GET /categories` | Cualquier usuario autenticado | Elegir categoría al crear/editar gasto (catálogo global, no editable por el usuario) |
| Modo offline (indicador + cola de reintentos) | Estado adicional: `Offline` | Definido por especificar (ver checklist Fase 3) | — | Ver qué queda pendiente de sincronizar |

### Fase 4 — Reportes y administración

| Pantalla | Estados particulares | Datos | Rol mínimo | Acciones principales |
|---|---|---|---|---|
| Solicitar reporte | — | `POST /groups/{groupId}/reports` | Owner, Administrator (todos los tipos); Member/ReadOnly según política del grupo | Elegir tipo, formato, filtros |
| Lista de reportes | Estados del reporte: `QUEUED/PROCESSING/COMPLETED/FAILED/EXPIRED` | `GET /groups/{groupId}/reports` | igual que arriba | Ver estado, descargar |
| Descarga de reporte | — | `POST .../reports/{id}/download-url` | igual que arriba | Abrir/descargar archivo (URL firmada, 15 min) |
| Panel administrativo del grupo | — | Archivar grupo, exportaciones, auditoría | Owner (principalmente) | Acciones administrativas auditadas |

### Fase 5 — Capacidades avanzadas

| Pantalla | Estados particulares | Datos | Rol mínimo | Acciones principales |
|---|---|---|---|---|
| Captura de recibo (OCR) | Estado adicional: `Processing` (OCR en curso) | Por especificar | Cualquier Member | Fotografiar/subir recibo |
| Revisión de gasto sugerido por OCR | — | Por especificar | Cualquier Member | Confirmar o descartar antes de persistir (revisión humana obligatoria, `docs/Roadmap.md`) |
| Presupuestos y alertas | — | Por especificar | Miembro activo | Definir límite, ver alerta (no vinculante) |
| Simulación de reparto | No persiste nada | Por especificar | Miembro activo | Probar un reparto sin crear el gasto real |

Todas las pantallas de Fase 5 están marcadas "por especificar" a propósito: `docs/checklists/Fase5-CapacidadesAvanzadas.md` exige especificación completa (entidades, endpoints, reglas) antes de programarse, y eso todavía no existe.

## Reglas transversales

- **Confirmaciones destructivas o irreversibles** (archivar grupo, eliminar gasto, confirmar liquidación) siempre muestran un diálogo de confirmación explícito con el efecto descrito en palabras simples, no solo un botón de doble clic accidental.
- **Errores de dominio** (`docs/ApiSpecification.md` y `docs/api/*.md`) se traducen a mensajes en español entendibles por el usuario final, no se muestra el `code` técnico crudo (`INVALID_SPLIT`, etc.) salvo en un detalle expandible para soporte.
- **Formato de moneda:** símbolo + código ISO cuando hay ambigüedad de moneda dentro de un mismo grupo multi-moneda (`docs/domain/Currency.md`).
- **Accesibilidad mínima (Fase 3):** contraste AA, tamaños de fuente escalables, etiquetas para lectores de pantalla en toda acción destructiva o de navegación principal.
- **Ningún flujo permite editar un balance directamente** — ni siquiera como campo de "solo lectura editable"; la única forma de cambiar un balance es a través de un gasto, split o liquidación (`docs/BusinessRules.md`).

## Documentos relacionados

`docs/Roadmap.md`, `docs/checklists/*.md`, `docs/Security.md` (matriz de roles), `docs/api/openapi.yaml` (contrato exacto de cada pantalla), `docs/CodingStandards.md` (estados sellados, reglas de Android/Web), `docs/domain/Money.md`, `docs/domain/Currency.md`, `docs/BusinessRules.md`.

## Pendiente fuera de este documento

- Wireframes/mockups visuales reales (herramienta de diseño externa, por ejemplo Figma) — este documento da la lista de pantallas y su contenido, no el layout pixel a pixel.
- Decisión de marca (logo, paleta definitiva, tipografía) — ver "Sistema de diseño" arriba.
- Proveedores de Firebase Auth aprobados (afecta directamente las pantallas de Login/Registro).
- Especificación de backend de comentarios, notificaciones, offline y todo lo de Fase 5 (ya rastreado en sus checklists respectivos).
