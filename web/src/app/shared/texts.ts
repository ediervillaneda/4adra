/**
 * Todos los textos visibles de la PWA (solo español, ADR-019). Las plantillas no llevan
 * literales: así la interfaz se puede traducir después sin buscar textos sueltos.
 */
export const TEXTS = {
  appName: '4adra',
  tagline: 'Cuentas claras, gastos compartidos',
  nav: {
    home: 'Inicio',
    profile: 'Perfil',
    privacy: 'Privacidad',
  },
  login: {
    continueWithGoogle: 'Continuar con Google',
    notInvited:
      'Necesitas una invitación para usar 4adra. Pídele acceso a quien te recomendó la app.',
    genericError: 'No se pudo iniciar sesión. Intenta de nuevo.',
  },
  home: {
    greeting: (name: string): string => `Hola, ${name}`,
    emptyGroupsTitle: 'Tus grupos aparecerán aquí',
    emptyGroupsBody: 'Crea un grupo para empezar a compartir gastos.',
    groupsTitle: 'Mis grupos',
    invitationsTitle: 'Invitaciones',
    invitedBy: (name: string, role: string): string => `Te invita ${name} · ${role}`,
    acceptInvitation: 'Aceptar',
    declineInvitation: 'Rechazar',
    invitationAnswerError: 'No se pudo responder la invitación. Intenta de nuevo.',
    invitationsLoadError:
      'No se pudieron cargar tus invitaciones. Recarga la página para intentarlo de nuevo.',
    closedInvitation: {
      INVITATION_EXPIRED: 'Esta invitación ya venció.',
      INVITATION_ALREADY_RESPONDED: 'Ya respondiste esta invitación.',
      INVITATION_NOT_FOUND: 'Esta invitación ya no está disponible.',
    } as Record<string, string>,
    createGroup: 'Crear grupo',
    reviewProfileHint: 'Revisa tu perfil: confirma tu moneda y zona horaria.',
    reviewProfileAction: 'Ir a mi perfil',
  },
  groups: {
    createTitle: 'Nuevo grupo',
    membersTitle: 'Miembros',
    notFoundTitle: 'Grupo no encontrado',
    backHome: 'Volver al inicio',
    invite: 'Invitar',
    inviteTitle: 'Invitar a alguien',
    inviteEmail: 'Correo',
    inviteRole: 'Rol',
    inviteSend: 'Enviar invitación',
    inviteSent: 'Invitación enviada',
    inviteErrors: {
      EMAIL_NOT_ALLOWED: 'Ese correo no está en la lista de acceso de 4adra.',
      MEMBER_ALREADY_ACTIVE: 'Esa persona ya es miembro del grupo.',
    } as Record<string, string>,
    name: 'Nombre del grupo',
    description: 'Descripción (opcional)',
    defaultCurrency: 'Moneda base',
    create: 'Crear grupo',
    cancel: 'Cancelar',
    roles: {
      OWNER: 'Propietario',
      ADMINISTRATOR: 'Administrador',
      MEMBER: 'Miembro',
      READ_ONLY: 'Solo lectura',
    } as Record<string, string>,
    errors: {
      required: 'Este campo es obligatorio.',
      length_1_to_120: 'Debe tener entre 1 y 120 caracteres.',
      max_length_500: 'Máximo 500 caracteres.',
      must_be_string: 'Valor inválido.',
      unsupported_currency: 'Moneda no soportada.',
      unknown: 'Valor inválido.',
    } as Record<string, string>,
  },
  profile: {
    title: 'Mi perfil',
    photoAlt: (name: string): string => `Foto de ${name}`,
    photoFromGoogle: 'La foto viene de tu cuenta de Google.',
    displayName: 'Nombre',
    email: 'Correo',
    preferredCurrency: 'Moneda preferida',
    language: 'Idioma',
    timeZone: 'Zona horaria',
    timeZoneSearch: 'Busca tu ciudad, por ejemplo Bogota',
    save: 'Guardar',
    saved: 'Perfil guardado',
    signOut: 'Cerrar sesión',
    languages: { es: 'Español', en: 'Inglés' } as Record<string, string>,
    errors: {
      required: 'Este campo es obligatorio.',
      length_1_to_100: 'Debe tener entre 1 y 100 caracteres.',
      must_be_string: 'Valor inválido.',
      must_be_https_url: 'Debe ser una dirección https://.',
      unsupported_currency: 'Moneda no soportada.',
      unsupported_language: 'Idioma no soportado.',
      invalid_time_zone: 'Zona horaria no válida.',
      not_allowed: 'Este campo no se puede cambiar.',
      unknown: 'Valor inválido.',
    } as Record<string, string>,
  },
  errors: {
    generic: 'Algo salió mal.',
    withReference: (requestId: string): string =>
      `Algo salió mal. Código de referencia: ${requestId}.`,
    userDisabled: 'Tu cuenta está deshabilitada. Escribe a privacidad@edier.me.',
    offline: 'Sin conexión. Algunas acciones no están disponibles.',
    dismiss: 'Cerrar',
  },
  notFound: {
    title: 'Esta página no existe',
    backHome: 'Volver al inicio',
  },
  loading: 'Cargando…',
} as const;

/** Contenido de la política de privacidad (spec §6). Fecha: 11 de noviembre de 2026. */
export const PRIVACY = {
  title: 'Política de privacidad',
  updatedAt: 'Última actualización: 11 de noviembre de 2026',
  contactEmail: 'privacidad@edier.me',
  sections: [
    {
      heading: 'Quién es responsable',
      paragraphs: [
        '4adra es una aplicación para llevar cuentas claras de gastos compartidos. Para cualquier pregunta sobre tus datos escribe a privacidad@edier.me.',
      ],
    },
    {
      heading: 'Qué datos guardamos',
      paragraphs: [
        'Al iniciar sesión con Google guardamos tu nombre, tu correo y tu foto de perfil de Google.',
        'También guardamos tus preferencias (moneda, idioma y zona horaria), tus sesiones activas y un registro de auditoría de los cambios que haces.',
        'Google nos entrega tokens de acceso al iniciar sesión; los guardamos cifrados y no los usamos para nada más.',
      ],
    },
    {
      heading: 'Qué datos no recolectamos',
      paragraphs: [
        'No pedimos ni guardamos tu número de teléfono, tu ubicación, tus contactos ni datos de pago.',
        'No usamos publicidad ni herramientas de analítica de terceros.',
        'Las fuentes tipográficas se cargan desde Google Fonts, por lo que tu navegador se conecta a los servidores de Google para descargarlas.',
      ],
    },
    {
      heading: 'Dónde y para qué',
      paragraphs: [
        'Tus datos se guardan en Cloudflare (base de datos D1) y se usan solo para que la aplicación funcione. No los vendemos ni los compartimos con nadie.',
      ],
    },
    {
      heading: 'Cookies',
      paragraphs: [
        'Usamos una única cookie, la de sesión, que es esencial para mantenerte conectado. No usamos cookies de seguimiento.',
      ],
    },
    {
      heading: 'Borrar tus datos',
      paragraphs: [
        'Puedes pedir que borremos tus datos escribiendo a privacidad@edier.me. Lo hacemos en un plazo máximo de 30 días. Solo conservamos el registro de auditoría financiera con identificadores que no te identifican directamente.',
      ],
    },
  ],
} as const;
