export type LegalDocType = 'terms' | 'privacy' | 'cookies';

export const LEGAL_VERSION = '1.0';
export const LEGAL_UPDATED_AT = 'Noviembre 2026';

export interface LegalSection {
  title: string;
  paragraphs: string[];
  highlight?: string;
}

export interface LegalDocumentContent {
  id: LegalDocType;
  tabLabel: string;
  heading: string;
  subtitle: string;
  sections: LegalSection[];
}

export const LEGAL_DOCUMENTS: Record<LegalDocType, LegalDocumentContent> = {
  terms: {
    id: 'terms',
    tabLabel: 'Aviso Legal y Condiciones',
    heading: 'Aviso Legal y Condiciones Generales de Uso',
    subtitle: 'Ley 34/2002 (LSSI-CE) · Plataforma AM Manager (ammanager.es)',
    sections: [
      {
        title: '1. Titular de la Plataforma e Información General (LSSI-CE)',
        paragraphs: [
          'En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa que la plataforma web AM Manager (https://ammanager.es) es un entorno SaaS profesional destinado a la dirección técnica, planificación deportiva, pizarra táctica y gestión interna de clubes y cuerpos técnicos de fútbol.',
          'Canal oficial de soporte técnico y notificaciones legales: contacto@ammanager.es.',
        ],
      },
      {
        title: '2. Objeto y Condiciones de Acceso',
        paragraphs: [
          'El registro y acceso a AM Manager está reservado a entrenadores, analistas, directores deportivos y representantes autorizados de clubes o entidades deportivas mayores de 18 años. Cada cuenta es personal e intransferible y está protegida mediante credenciales autenticadas.',
          'El usuario se compromete a custodiar diligentemente su contraseña, a cerrar sesión cuando utilice dispositivos compartidos del club y a no realizar usos ilícitos, automatizados o contrarios a la buena fe.',
        ],
      },
      {
        title: '3. Propiedad Intelectual e Industrial',
        paragraphs: [
          'El código fuente, arquitectura, interfaz visual, pizarra táctica interactiva, generadores de informes PDF/MP4, denominación AM Manager y logotipos asociados son titularidad exclusiva de sus autores y están protegidos por la normativa española y europea de propiedad intelectual e industrial.',
          'El contenido táctico, ejercicios, actas y datos deportivos introducidos por cada club pertenecen íntegramente al club o entrenador titular de la cuenta.',
        ],
      },
      {
        title: '4. Sincronización Informativa con Portales Federativos y Limitación de Responsabilidad',
        paragraphs: [
          'La herramienta opcional de consulta y sincronización de calendarios, clasificaciones o sanciones públicas desde portales federativos autonómicos tiene carácter meramente auxiliar e informativo. AM Manager no es una aplicación oficial de ninguna federación ni garantiza la disponibilidad o exactitud de servidores externos de terceros.',
          'Asimismo, AM Manager proporciona la infraestructura técnica bajo estándares de seguridad comercial razonables, sin asumir responsabilidad por decisiones deportivas, médicas o disciplinarias adoptadas por el cuerpo técnico ni por pérdidas derivadas de credenciales comprometidas por el usuario.',
        ],
      },
      {
        title: '5. Legislación Aplicable y Jurisdicción',
        paragraphs: [
          'Las presentes condiciones se rigen íntegramente por la legislación española y de la Unión Europea. Para la resolución de controversias, las partes se someterán a los Juzgados y Tribunales competentes en España conforme a derecho.',
        ],
      },
    ],
  },
  privacy: {
    id: 'privacy',
    tabLabel: 'Política de Privacidad (RGPD)',
    heading: 'Política de Privacidad y Protección de Datos',
    subtitle: 'Reglamento (UE) 2016/679 (RGPD) y Ley Orgánica 3/2018 (LOPDGDD)',
    sections: [
      {
        title: '1. Roles de Tratamiento: Club/Entrenador vs. AM Manager',
        paragraphs: [
          'a) Datos de cuenta del entrenador/usuario (correo electrónico, credenciales cifradas y registro de aceptación de términos): AM Manager (ammanager.es) actúa como Responsable del Tratamiento para prestar el servicio SaaS, gestionar la autenticación y garantizar la seguridad técnica.',
          'b) Datos deportivos y personales de plantillas y jugadores introducidos en la plataforma (nombre, dorsal, posición, fecha de nacimiento, estadísticas, convocatorias, lesiones o estado de disponibilidad y fotografías): el Club Deportivo o Entrenador titular de la cuenta actúa como único RESPONSABLE DEL TRATAMIENTO (art. 4.7 RGPD), actuando AM Manager estrictamente como ENCARGADO DEL TRATAMIENTO (art. 28 RGPD) bajo sus instrucciones.',
        ],
        highlight:
          'CLÁUSULA OBLIGATORIA SOBRE MENORES DE EDAD Y FÚTBOL BASE (Art. 8 RGPD y Art. 7 LOPDGDD): Si el entrenador o club registra datos de jugadores menores de edad —y especialmente menores de 14 años en España—, el Club/Entrenador declara y garantiza bajo su exclusiva responsabilidad contar previamente con el consentimiento expreso e informado de los padres o tutores legales del menor, así como con la base legitimadora adecuada para registrar incidencias médicas o lesiones deportivas (art. 9 RGPD).',
      },
      {
        title: '2. Finalidades y Base Jurídica del Tratamiento',
        paragraphs: [
          'Ejecución de la relación contractual y prestación del software de gestión deportiva (art. 6.1.b RGPD).',
          'Seguridad de la plataforma, prevención de accesos no autorizados mediante aislamiento multi-usuario RLS (Row Level Security) y cumplimiento de obligaciones legales (arts. 6.1.c y 6.1.f RGPD).',
        ],
      },
      {
        title: '3. Subencargados de Infraestructura y Transferencias Internacionales',
        paragraphs: [
          'AM Manager utiliza proveedores cloud de primer nivel con cifrado en tránsito (TLS/HTTPS) y en reposo, sujetos a alojamiento en la Unión Europea o garantías jurídicas equivalentes (Cláusulas Contractuales Tipo de la Comisión Europea):',
          '• Supabase (Autenticación y Base de Datos PostgreSQL con políticas RLS por usuario).',
          '• Vercel (Alojamiento web y funciones serverless ejecutadas en región europea cdg1 — París).',
          'No vendemos, cedemos ni compartimos datos de tu club ni de tus jugadores con terceros con fines publicitarios o comerciales.',
        ],
      },
      {
        title: '4. Conservación de los Datos',
        paragraphs: [
          'Los datos se conservarán mientras la cuenta permanezca activa o hasta que el club o usuario solicite su supresión. Las cachés técnicas locales en navegador/tablet se eliminan automáticamente al pulsar «Cerrar Sesión».',
        ],
      },
      {
        title: '5. Derechos ARCO-POL y Autoridad de Control (AEPD)',
        paragraphs: [
          'El usuario y los interesados (a través de su club como responsable) pueden ejercer sus derechos de Acceso, Rectificación, Supresión, Oposición, Limitación del tratamiento y Portabilidad escribiendo a contacto@ammanager.es.',
          'Asimismo, asiste el derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es) si consideran vulnerados sus derechos.',
        ],
      },
    ],
  },
  cookies: {
    id: 'cookies',
    tabLabel: 'Política de Cookies',
    heading: 'Política de Cookies y Almacenamiento Local Técnico',
    subtitle: 'Transparencia LSSI-CE (art. 22.2) y Guía de Cookies AEPD',
    sections: [
      {
        title: '1. Uso Exclusivo de Almacenamiento Técnico Esencial (Sin Publicidad ni Rastreadores)',
        paragraphs: [
          'AM Manager NO utiliza cookies publicitarias, de perfilado comportamental, analítica invasiva ni rastreadores de terceros (como Google Ads o Meta Pixel).',
          'De conformidad con el artículo 22.2 de la LSSI-CE, el almacenamiento utilizado es exclusivamente técnico y estrictamente necesario para prestar el servicio solicitado por el usuario y permitir el modo offline de la pizarra táctica.',
        ],
      },
      {
        title: '2. Detalle Técnico de Elementos Almacenados en tu Dispositivo',
        paragraphs: [
          '• Sesión autenticada (Supabase Auth · localStorage `sb-*-auth-token`): mantiene tu sesión activa de forma segura mediante tokens JWT firmados.',
          '• Caché de rendimiento SWR (`am_cache_v1_*` en localStorage): acelera la carga instantánea de plantilla, partidos y ajustes entre vistas. Se purga íntegramente al cerrar sesión.',
          '• Biblioteca offline (`IndexedDB · AMCoachDB` vía Dexie y caché PWA Service Worker): permite consultar y dibujar ejercicios en la pizarra táctica incluso sin cobertura en el campo. Los ejercicios cacheados se limpian al cerrar sesión.',
          '• Preferencia del aviso informativo (`am_cookie_notice_ack_v1`): recuerda que ya has visto este aviso técnico.',
        ],
      },
      {
        title: '3. Gestión y Limpieza en Dispositivos Compartidos',
        paragraphs: [
          'Si compartes tablet u ordenador con otros entrenadores del club, utiliza siempre el botón «Cerrar Sesión» en la barra lateral o en Configuración: AM Manager eliminará automáticamente todas las cachés de equipo, rivales y ejercicios almacenadas en el navegador.',
        ],
      },
    ],
  },
};
