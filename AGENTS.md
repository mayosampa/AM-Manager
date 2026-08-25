# 🤖 Reglas de Arquitectura para Agentes (Agent-First Guidelines)

**Propósito:** Este documento dicta las reglas inmutables de desarrollo para cualquier IA, Agente (incluido Antigravity) o Subagente que opere sobre este repositorio. El objetivo es mantener el código limpio (Bonsai Approach), prevenir regresiones arquitectónicas y optimizar el rendimiento.

---

## 1. Patrón Feature-First (Regla de Oro de Directorios)
- **NO** crees nuevos componentes visuales en una carpeta global `components/`.
- **SÍ** agrupa los archivos por dominio de negocio dentro de `src/features/[dominio]/`.
- Si un componente se usa en múltiples "Features", extráelo a `src/shared/ui/`.

## 2. Segregación de UI y Lógica de Negocio (Vista Pasiva)
- **NO** incluyas bucles matemáticos complejos, observadores del DOM (`ResizeObserver`), o exportaciones asíncronas (`html2canvas`) directamente dentro del bloque de renderizado de un componente React.
- **SÍ** encapsula la lógica pesada en `services/` (funciones puras asíncronas) o delegarla en "Custom Hooks" (Controladores) ubicados en la subcarpeta respectiva del feature.
- **Línea límite de archivo:** Si un componente de React supera las 200 líneas, detente. Divídelo o extrae su lógica.

## 3. Rendimiento en Animaciones y Pantallas Táctiles
- **NO** uses `setReactState` dentro de eventos `onPointerMove`, `onMouseMove` o `onDrag` sin mitigación, ya que fuerza la reconciliación del Virtual DOM bloqueando el hilo principal.
- **SÍ** utiliza `requestAnimationFrame` y/o Refs (`useRef`) para las transformaciones visuales (arrastrar jugadores o dibujar flechas en la pizarra), sincronizando con el estado de React solo al finalizar la interacción (`onPointerUp`).

## 4. Persistencia e Integridad de Datos
- **NO** accedas directamente a `localStorage` desde los componentes de React o contextos.
- **SÍ** utiliza el patrón Repositorio llamando a clases asíncronas en `src/infrastructure/repositories/`.
- **NO** almacenes imágenes enormes en base64 en memoria profunda. Considera guardar referencias, archivos blob locales (IndexedDB), o manejar la compresión al límite de calidad funcional.
- Las copias de estado para animaciones deben ser ligeras (DTOs de posición) y **no clones masivos** (`JSON.parse(JSON.stringify(boardState))`).

## 5. Gestión de Dependencias
- **NO** instales paquetes de Node (e.g., `express`, `dotenv`) en la aplicación de frontend (`Vite`). Mantén el entorno estrictamente cliente.
- Antes de proponer instalar una nueva dependencia, evalúa si existe otra librería redundante (ej. decidir entre `html-to-image` o `html2canvas` y desinstalar la perdedora).

---

> **⚙️ Instrucción para el Agente:** Al iniciar cualquier tarea en este repositorio, DEBES confirmar en tu plan mental que respetas estas reglas. Si una solicitud del usuario entra en conflicto con este documento, adviértele sobre la deuda técnica que generará antes de proceder.
