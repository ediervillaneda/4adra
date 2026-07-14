// Configuración del cliente Firebase (Web) para el proyecto `development`
// (`adra-54655`, ver .firebaserc.example / docs/Decisions.md ADR-008).
//
// Esto NO es un secreto: la propia documentación de Firebase confirma que
// el objeto de configuración del SDK cliente (apiKey incluido) está pensado
// para viajar en el bundle público del navegador — cualquiera que abra las
// herramientas de desarrollador de un sitio con Firebase puede verlo. La
// protección real de este proyecto es:
//   1. `firestore.rules` / `storage.rules` en la raíz del repo, que hoy
//      deniegan el 100 % del acceso directo de clientes (ADR-009) — toda
//      lectura/escritura de datos pasa por la API (Cloud Functions).
//   2. Las restricciones de la API key en Google Cloud Console
//      (Credentials → esta key → "Application restrictions": HTTP
//      referrers del dominio real de la app Web una vez exista, en vez de
//      dejarla sin restricción). Pendiente de configurar — ver checklist
//      de Fase 0.
//   3. Que este archivo solo inicializa Firebase Auth (para obtener el ID
//      token que se envía a la API); no se usa el SDK de Firestore/Storage
//      desde el cliente (ver Architecture.md).
//
// Lo que SÍ es secreto y nunca debe pegarse aquí ni en el chat: una clave
// de cuenta de servicio (Admin SDK, JSON con "private_key"). Eso vive en
// Secret Manager o variables de CI, nunca en el repositorio (Security.md).
//
// TODO (Fase 0): cuando exista un proyecto Firebase separado para
// staging/production, crear environment.staging.ts / environment.production.ts
// análogos y configurar fileReplacements en angular.json.
export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyAvS4dRx6Xuq4zZHO2_khdr3HHSI4-OuOM",
    authDomain: "adra-54655.firebaseapp.com",
    projectId: "adra-54655",
    storageBucket: "adra-54655.firebasestorage.app",
    messagingSenderId: "996278378799",
    appId: "1:996278378799:web:8c8c1dd455eb15434901da",
    measurementId: "G-TWC8RCVY8R",
  },
  // Base URL de la API (Cloud Functions), ver docs/ApiSpecification.md.
  // Ajustar cuando exista la región/proyecto reales desplegados.
  apiBaseUrl: "https://us-central1-adra-54655.cloudfunctions.net/api/v1",
};
