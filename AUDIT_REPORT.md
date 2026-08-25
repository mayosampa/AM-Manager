# 🚨 Reporte de Auditoría Arquitectónica: AM Manager

**Fecha:** 25 de Agosto, 2026
**Rol:** Principal Software Engineer & Solutions Architect (Antigravity Agent)
**Metodología:** Bonsai Approach & Agent-First

---

## 1. Estructura de Directorios (Desorganización y Fuga de Contexto)
❌ **Diagnóstico:** El patrón actual es un "Flat Bag" (bolsa plana) en la carpeta `src/components`. No existe distinción entre componentes "Tontos" (UI pura), Páginas/Pantallas, y Controladores.
- **Archivos huérfanos y mal agrupados:** Mezclar `FinesManagement.tsx` con `BoardTokenItem.tsx` o `LiveMatch.tsx` reduce drásticamente la mantenibilidad.
- **Ausencia de capas:** No hay capa de Dominio, Infraestructura o Presentación. Esto satura el contexto de cualquier LLM (coste de tokens altísimo) porque, para entender el modelo de datos, hay que leer componentes visuales.

## 2. Acoplamiento de Código (UI vs. Lógica)
❌ **Diagnóstico:** Violación sistemática del Principio de Responsabilidad Única (SRP).
- **El caso de `TacticalBoard.tsx` (520+ líneas):** Actúa como Vista, Controlador y Servicio de Exportación. Maneja observadores del DOM (`ResizeObserver`), lógica de exportación asíncrona (html2canvas) y UI al mismo tiempo.
- **El "God Hook" `useBoardInteraction.ts` (400+ líneas):** Debería ser un controlador pasivo, pero aglutina toda la matemática de rotación, drag & drop, historial de "scenes" e inyección de datos. La interfaz no es una vista pasiva, es un rehén de la lógica.

## 3. Manejo del Estado de la Pizarra (Rendimiento y Bloqueo de Hilo)
❌ **Diagnóstico:** Riesgo crítico de *Jank* (caída de FPS) y fugas de memoria (OOM).
- **Virtual DOM Diffing extremo:** El hook `useBoardInteraction.ts` actualiza el estado completo del tablero mediante React (`setBoardState`) en CADA evento `onPointerMove`. En pantallas táctiles o mouses rápidos, esto satura el Hilo Principal (Main Thread). **No se está utilizando `requestAnimationFrame`.**
- **Clonación profunda insana:** En la generación de escenas (`saveScene`), se abusa de `JSON.parse(JSON.stringify(boardState))`. Si hay una animación de 50 fotogramas, estás guardando en memoria 50 copias profundas de objetos masivos, provocando picos del Garbage Collector (GC).

## 4. Consistencia de Datos y Persistencia (Deuda Crítica)
❌ **Diagnóstico:** El sistema de persistencia actual (`src/services/db.ts`) es frágil, temporal y peligroso.
- **Límite de `localStorage`:** Todo se almacena crudo en el `localStorage` del navegador. Este tiene un límite duro estricto de ~5MB. Dado que los ejercicios guardan *thumbnails en Base64* (Data URLs) y copias profundas del `boardState`, la aplicación **explotará** (lanzando `QuotaExceededError`) después de guardar apenas media docena de animaciones.
- **Falta de DTOs:** No hay separación entre las entidades del dominio (lo que la app usa) y los Data Transfer Objects (lo que se guarda).

## 5. Análisis de Dependencias (Bloatware y Redundancia)
❌ **Diagnóstico:** El `package.json` está sucio y sufre de solapamiento.
- **Redundancia:** Tienes instalados `html-to-image` y `html2canvas` simultáneamente. Ambos resuelven exactamente el mismo problema (exportar HTML a imagen/canvas).
- **Server/Frontend mixtos:** Paquetes backend de Node (`express`, `dotenv`) están mezclados en las `dependencies` de una app Vite React que debería ser puramente cliente. (Si existe un backend, no está en una arquitectura de monorepo separada).
- **Vite duplicado:** La librería `vite` aparece listada tanto en `dependencies` como en `devDependencies`.

---

## 🎯 Conclusión del Arquitecto
La aplicación actual funciona como un MVP (Minimum Viable Product), pero su arquitectura interna ha tocado techo. Continuar inyectando características (Gestión de Sanciones, Convocatorias, SaaS) sobre esta base inflará los costes de los agentes de IA debido al inmenso ruido de contexto, producirá lentitud en dispositivos móviles, y corromperá los datos de los usuarios por los límites de almacenamiento.

**Requiere refactorización (Poda Bonsai) antes de iterar.**
