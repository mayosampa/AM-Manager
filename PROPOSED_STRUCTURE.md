# 🏗 Estructura Propuesta (Feature-First & Clean Architecture)

Para asegurar que las próximas iteraciones de desarrollo sean eficientes, aisladas y de bajo coste en consumo de tokens, aplicaremos una estructura de directorios **basada en funcionalidades (Feature-First) combinada con Arquitectura Limpia**.

## Árbol de Directorios Sugerido

```text
src/
├── app/                        # Capa de Inicialización
│   ├── App.tsx                 # Enrutamiento y Layout principal
│   ├── main.tsx                # Punto de entrada de React
│   └── providers/              # (Antes 'context') Proveedores globales inyectados en la raíz
│
├── core/                       # Capa Transversal (Agnóstica del negocio)
│   ├── constants/              # Colores, configuraciones por defecto
│   ├── utils/                  # Matemáticas, helpers (e.g., generadores de ID, fechas)
│   └── pwa.d.ts                # Configuraciones de Typescript / PWA
│
├── infrastructure/             # Capa de Datos (Fuera de la influencia de UI)
│   ├── database/               # Configuración de base de datos local (Recomendado: IndexedDB vía Dexie.js o SQLite-WASM)
│   ├── repositories/           # Clases o módulos que abstraen el CRUD (e.g., ExerciseRepository.ts)
│   └── dtos/                   # Modelos de datos puros y validación (Zod o Interfaces limpias)
│
├── shared/                     # Capa de Presentación Común
│   ├── ui/                     # Componentes "Tontos" (Botones, Modales, Inputs)
│   ├── layouts/                # Estructuras de rejilla base (Tres columnas, Navbars)
│   └── hooks/                  # Hooks agnósticos (e.g., useWindowSize, useLongPress)
│
└── features/                   # 🚀 Capa de Dominio (Módulos independientes)
    │
    ├── tactical-board/         # Funcionalidad: Pizarra Táctica
    │   ├── components/         # Board.tsx, PitchLines.tsx, Token.tsx (UI pura, sin cálculos)
    │   ├── controllers/        # Lógica de estado (e.g., useBoardManager.ts implementando requestAnimationFrame)
    │   ├── services/           # Lógica pesada (e.g., ExportService.ts para html2canvas)
    │   └── types/              # Tipos específicos del módulo (BoardState, SavedScene)
    │
    ├── library/                # Funcionalidad: Biblioteca y Ejercicios
    │   ├── components/         # LibraryScreen.tsx, ExercisePreviewModal.tsx
    │   └── hooks/              # useLibraryFilters.ts
    │
    ├── team-management/        # Funcionalidad: Plantilla y Disponibilidad
    │   ├── components/
    │   └── services/
    │
    └── match-tracking/         # Funcionalidad: Partidos, Historial y Estadísticas
        ├── components/
        └── types/
```

## Beneficios del "Bonsai Approach" aquí:
1. **Poda de Contexto:** Cuando pidas al Agente que mejore la Pizarra, solo necesitará leer la carpeta `features/tactical-board/`, ahorrando miles de tokens de análisis en código irrelevante.
2. **Reemplazo de Persistencia:** Al aislar `infrastructure/`, el día que pasemos de almacenamiento Local (IndexedDB) a la nube (Firestore/Supabase para SaaS), la UI ni se inmutará, solo cambiaremos los repositorios.
3. **Vistas Pasivas:** Al separar `controllers/` y `services/` de `components/`, evitamos archivos de 500 líneas. Los componentes de React se limitarán a pintar lo que el controlador les diga.
