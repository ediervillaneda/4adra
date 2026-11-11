# PWA base de 4adra (pieza 1 de la primera versión funcional)

> **Proyecto:** 4adra  
> **Fecha:** 2026-11-11  
> **Estado:** Propuesto (pendiente de revisión)  
> **Rama:** `feature/pwa-base`  
> **Contexto:** subproyecto 2 de la migración a Cloudflare. Es la pieza 1 de 4 hacia la primera versión funcional: (1) base de la PWA → (2) grupos y miembros → (3) gastos y balances → (4) liquidaciones. La release a `main` se hace al terminar la pieza 4.

## 1. Intención

**Qué pidió el usuario:**
- Un único cliente: PWA responsive para PC y celular, instalable (ADR-017).
- Primera pieza: base de la PWA, nada de grupos ni gastos.
- Interfaz **solo en español**, con los textos centralizados para traducir después.
- Identidad visual: Material 3 con color semilla verde-azulado, provisional.
- Política de privacidad con contacto mediante un alias (`privacidad@edier.me`), sin nombre completo ni correo personal.
- **No se pide ni se guarda número de teléfono** en ninguna parte de la app.

**Criterios de éxito:**
1. En `https://4adra.edier.me` un usuario inscrito entra con "Continuar con Google" y ve Inicio con su nombre y su foto. Uno no inscrito ve "Necesitas una invitación…".
2. En `/perfil` se editan nombre, moneda, idioma y zona horaria. Los errores de validación del backend aparecen junto a cada campo. Se puede cerrar sesión.
3. La app se puede instalar en Android con Chrome, y abre sin conexión mostrando el aviso de que no hay red.
4. `/privacidad` es pública y describe lo que la app hace de verdad.
5. La app de Google está publicada ("En producción"), así que no hace falta agregar usuarios de prueba. El filtro de invitaciones del Worker sigue controlando el acceso.
6. CI (`web.yml` y `backend.yml`) en verde, deploy desde `deploy-cloudflare.yml` funcionando y cobertura de presentación de al menos 70 %.

**Fuera de alcance:**
- Grupos, gastos, balances y liquidaciones (piezas 2 a 4).
- Interfaz bilingüe.
- Botón propio de "Instalar".
- Cola de operaciones offline.
- Notificaciones push.
- Edición de la foto (solo se muestra la de Google).
- Pantalla obligatoria de "Completar perfil".

## 2. Arquitectura y publicación (enfoque A)

```text
https://4adra.edier.me (Worker "4adra")
 ├─ /api/v1/*, /api/auth/*  → Hono (sin cambios funcionales)
 └─ /*                      → Static Assets = build de web/ (web/dist/web/browser)
```

- **Proyecto:** `web/` con Angular 22. Componentes *standalone*, *signals*, *control flow* nativo y TypeScript estricto.
- **UI:** Angular Material 3, con tema generado desde un color semilla verde-azulado.
- **PWA:** `@angular/service-worker`.
- **Pruebas:** Vitest, el runner por defecto de Angular 22.
- **Lint:** ESLint con `angular-eslint`.
- **Dependencias:** npm con su propio lockfile en `web/` (ADR-008). Node: `web/.nvmrc` en la LTS activa (24).
- **Assets del Worker:** en `backend/wrangler.jsonc`, `assets.directory` pasa a `../web/dist/web/browser` y se elimina `backend/public/`. Se mantienen `run_worker_first: ["/api/*"]` y `not_found_handling: "single-page-application"`.
- **Login sin SDK de Better Auth:** `AuthService` usa `HttpClient` contra `POST /api/auth/sign-in/social`, `GET /api/auth/get-session` y `POST /api/auth/sign-out`. Todo va en el mismo origen, con rutas relativas y sin tokens visibles para el cliente.
- **Desarrollo local:**
  - `ng serve` en `http://localhost:4200`, con un proxy (`web/proxy.conf.json`) que manda `/api` → `http://localhost:8787` (`wrangler dev`).
  - Better Auth recibe `trustedOrigins` desde una variable nueva, `TRUSTED_ORIGINS` (lista separada por comas). Solo `backend/.dev.vars` la define, con `http://localhost:4200`; producción no la define.
  - En el cliente OAuth de Google se agrega el origen `http://localhost:4200`. El callback sigue siendo el de 8787, al que se llega a través del proxy.
  - **Alternativa:** compilar la PWA y probar todo junto en 8787.
- **Deploy (`deploy-cloudflare.yml`):** `npm ci` y `npm run build` en `web/`, luego en `backend/` el build, las migraciones remotas y `wrangler deploy`. Los *paths* del disparador incluyen `web/**`.
- **CI (`web.yml`):** `npm ci`, `npm run lint`, `npm test` (Vitest con cobertura), `npm audit` y `npm run build`. Se retiran las opciones de Karma.
- **Service worker (`ngsw-config.json`):**
  - Cachea la app (HTML, JS, CSS e íconos).
  - **Nunca** cachea `/api/*`: no hay `dataGroups` y las rutas `/api` se excluyen de la navegación del SW (`navigationUrls` con `!/api/**`). Son datos privados (`Security.md`).
  - `index.html` se revisa en la red para que lleguen las versiones nuevas.

## 3. Estructura de `web/src/app`

Se organiza por funcionalidad (`CodingStandards.md`):

```text
app/
├── core/
│   ├── auth/        AuthService, sessionGuard, guestGuard
│   ├── http/        authErrorInterceptor (401 → /entrar; 500 → mensaje con requestId)
│   └── layout/      AppShellComponent (barra superior, navegación inferior / rail, pie con "Privacidad")
├── features/
│   ├── home/        HomeComponent (saludo, estado vacío de grupos, aviso "Revisa tu perfil")
│   ├── login/       LoginComponent (botón Google, mensajes NOT_INVITED / error genérico)
│   ├── profile/     ProfileService, ProfileComponent (formulario + cerrar sesión)
│   ├── privacy/     PrivacyComponent (estático)
│   └── not-found/   NotFoundComponent
└── shared/
    ├── texts.ts     todos los textos visibles en español
    └── api.ts       tipos de la API (UserProfile, ErrorEnvelope) según docs/api/openapi.yaml
```

**Contratos internos:**
- `AuthService`:
  - `session: Signal<SessionState>`, donde `SessionState` es `{ status: 'loading' } | { status: 'anonymous' } | { status: 'authenticated'; user: { name: string; email: string; image: string | null } }`.
  - `refreshSession(): Promise<void>`.
  - `signInWithGoogle(): Promise<void>`: hace POST con `{ provider: 'google', callbackURL: '/', errorCallbackURL: '/entrar' }` y luego `location.assign(url)`.
  - `signOut(): Promise<void>`: hace POST y lleva a `/entrar`.
- `ProfileService`:
  - `getProfile(): Promise<UserProfile>`.
  - `updateProfile(changes: Partial<ProfileChanges>): Promise<UserProfile>`. Si recibe un 400, lanza `ProfileValidationError` con `fieldErrors: Record<string, string>` (campo → mensaje en español, a partir de `reason`).
- **Guards:** `sessionGuard` (`/`, `/perfil`) y `guestGuard` (`/entrar`).

**Better Auth:** se verificará contra la versión instalada que `errorCallbackURL` lleve a `/entrar?error=NOT_INVITED` cuando el registro se rechaza. Si la versión no lo admite, la ruta `/api/auth/error` se redirige desde el Worker a `/entrar?error=...`.

## 4. Pantallas y navegación

| Ruta | Pantalla | Comportamiento | Acceso |
|---|---|---|---|
| `/` | Inicio | Mientras revisa la sesión, muestra el splash. Saluda con nombre y foto, y muestra el estado vacío "Tus grupos aparecerán aquí" con el botón deshabilitado "Crear grupo (pronto)". Muestra el aviso "Revisa tu perfil" hasta el primer guardado del perfil (marca en `localStorage`; sin ella, solo se vuelve a mostrar el aviso). | `sessionGuard` |
| `/entrar` | Login | Logo "4a", tagline "Cuentas claras, gastos compartidos" y el botón "Continuar con Google". Con `?error=NOT_INVITED` muestra "Necesitas una invitación para usar 4adra. Pídele acceso a quien te recomendó la app.". Con cualquier otro `?error=` muestra "No se pudo iniciar sesión. Intenta de nuevo.". | `guestGuard` |
| `/perfil` | Mi perfil | Formulario tipado: nombre (1 a 100), moneda (COP/USD/EUR/MXN/GTQ), idioma (es/en), zona horaria (lista de `Intl.supportedValuesOf('timeZone')` con búsqueda) y foto de Google solo lectura. Guarda con `PATCH /api/v1/me`, muestra los errores de `details` por campo y un *snackbar* "Perfil guardado". Incluye el botón "Cerrar sesión". **Sin campo de teléfono.** | `sessionGuard` |
| `/privacidad` | Política de privacidad | Estática (§6). | Pública |
| `**` | No encontrado | "Esta página no existe" y un enlace a Inicio. | Pública |

**Disposición:** punto de corte de 840 px (*expanded* de Material 3), con `BreakpointObserver` del CDK.
- **< 840 px:** barra superior (título y avatar) y barra de navegación inferior con **Inicio** y **Perfil**.
- **≥ 840 px:** *navigation rail* lateral con los mismos destinos y contenido centrado (ancho máximo de 720 px).
- **Pie:** enlace "Privacidad" en todas las pantallas, incluido el login.

**Estados:**
- Las pantallas con datos modelan `Cargando / Contenido / Error` con signals.
- Sin red se muestra el aviso "Sin conexión. Algunas acciones no están disponibles." (`navigator.onLine` y sus eventos).
- **Accesibilidad básica:** etiquetas en todos los controles, foco visible, contraste AA del tema y textos alternativos en los avatares.

**PWA:**
- `manifest.webmanifest`: `name` y `short_name` "4adra", `display: standalone`, `start_url: "/"`, `theme_color` y `background_color` del tema, `lang: "es"`.
- Íconos "4a" provisionales en SVG y PNG de 192 y 512, más uno *maskable*.

## 5. Manejo de errores

- **401 en `/api/v1/*`:** el interceptor limpia la sesión local y navega a `/entrar`.
- **400 `VALIDATION_ERROR`:** errores por campo en el formulario; nunca un mensaje genérico.
- **403 `USER_DISABLED`:** "Tu cuenta está deshabilitada. Escribe a privacidad@edier.me."
- **5xx o error de red:** "Algo salió mal. Código de referencia: <requestId>." El código de referencia se omite si no viene.
- **Errores de Google o Better Auth en el login:** se muestran a partir de `?error=`, sin exponer detalles técnicos.

## 6. Política de privacidad (contenido mínimo)

- **Responsable:** "4adra". Contacto: `privacidad@edier.me`.
- **Datos que se guardan:**
  - Nombre, correo y foto de la cuenta de Google.
  - Preferencias (moneda, idioma y zona horaria).
  - Sesiones.
  - Registros de auditoría de cambios.
  - Tokens de Google, cifrados y sin otro uso.
- **Datos que no se recolectan:** número de teléfono, ubicación, contactos ni datos de pago. Tampoco hay publicidad ni analítica de terceros.
- **Dónde se guardan y para qué:** en Cloudflare (D1), solo para operar la app. No se venden ni se comparten.
- **Cookies:** solo la de sesión, que es esencial. Por eso no hay banner de cookies.
- **Borrado:** a solicitud a `privacidad@edier.me`, en un plazo máximo de 30 días (ADR-011). Se conserva solo la auditoría financiera con identificadores opacos.
- **Fecha de la última actualización.**

## 7. Pruebas

Vitest con Angular TestBed. `HttpTestingController` cubre las llamadas HTTP.

- **`AuthService`:**
  - `signInWithGoogle` hace POST a `/api/auth/sign-in/social` con `{ provider: 'google', callbackURL: '/', errorCallbackURL: '/entrar' }` y redirige a la URL recibida (`location` inyectado).
  - `getSession` con `null` deja el estado en `anonymous`.
  - Con una sesión, `getSession` deja el estado en `authenticated`.
  - `signOut` hace POST y navega a `/entrar`.
- **`ProfileService`:**
  - GET y PATCH de `/api/v1/me`.
  - Un 400 con `details: [{ field: 'language', reason: 'unsupported_language' }]` produce `fieldErrors.language` en español.
- **Guards:** sin sesión, `/` y `/perfil` redirigen a `/entrar`; con sesión, `/entrar` redirige a `/`.
- **Interceptor:** un 401 navega a `/entrar`; un 500 con `requestId: 'req_9'` expone un mensaje que contiene `req_9`.
- **Componentes:**
  - `LoginComponent`: el botón llama a `signInWithGoogle`. Con `?error=NOT_INVITED` el texto contiene "Necesitas una invitación".
  - `ProfileComponent`: precarga los datos, guarda, muestra el error de idioma junto al campo y cierra sesión.
  - `PrivacyComponent`: contiene `privacidad@edier.me` y "número de teléfono".
  - `ProfileComponent` no tiene ningún control de teléfono.
- **Cobertura:** al menos 70 % en `web/src/app` (umbral en la configuración de Vitest).
- **Backend:** una prueba unitaria de `createAuth`/`composeApp` comprueba que `TRUSTED_ORIGINS` se convierte en `trustedOrigins` cuando está definida y queda vacía cuando no.
- **Prueba de humo del deploy:**
  - `/` devuelve el HTML de la PWA (`<app-root>`).
  - `/manifest.webmanifest` responde 200.
  - `/perfil` devuelve el HTML de la SPA (200).
  - `/api/v1/me` responde 401 en JSON.
  - `/api/nope` responde 404 en JSON.

## 8. Pasos externos (con el usuario, al cierre)

1. **Cloudflare Email Routing:** crear el alias `privacidad@edier.me`, reenviado al Gmail del responsable, y verificar el destino.
2. **Cliente OAuth de Google:** agregar el origen `http://localhost:4200`.
3. **Google Search Console:** verificar la propiedad de `edier.me` con un registro TXT en el DNS de Cloudflare.
4. **Google Auth Platform → Información de la marca:**
   - Página principal: `https://4adra.edier.me`.
   - Política de privacidad: `https://4adra.edier.me/privacidad`.
   - Dominio autorizado: `edier.me`.
   - Logo "4a".
5. **Publicar la app ("En producción")** y comprobar que Klara puede entrar.
6. **Cierre:** deploy y PR a `develop`.

## 9. Documentación

- **ADR-019:** PWA en Angular 22 servida como Static Assets del Worker, login con `HttpClient` sin SDK, service worker sin caché de `/api` y desarrollo con proxy y `TRUSTED_ORIGINS`.
- **`UISpecification.md`:** pantallas de la pieza 1 y regla "sin número de teléfono".
- **`web/README.md`:** comandos reales.
- **`CLAUDE.md` y `AGENTS.md`:** comandos de `web/` y estado.
- **`Deployment.md`:** build de web en el deploy, alias de correo, Search Console y publicación de la app de Google.
- **`TestingGuide.md`:** PWA con Vitest.
- **Checklist de Fase 0:** sección Web completada.
- **`TODO.md`.**
