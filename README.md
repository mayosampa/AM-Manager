<div align="center">
  <img src="public/am-logo.svg" width="96" height="96" alt="AM Manager Logo" />
  <h1>AM Manager PRO</h1>
  <p><strong>Software Profesional de Gestión Táctica y Deportiva</strong></p>
</div>

---

## Descripción General

**AM Manager** es una aplicación web progresiva (PWA) desarrollada en **React 19 + TypeScript + Vite + Tailwind CSS v4** para entrenadores y cuerpos técnicos de fútbol (F7 y F11).

### Módulos Principales
- **Clasificación y Competición Oficial (`src/features/rfaf/`)**: Sincronización en 1 clic de plantilla oficial, calendario de 30 jornadas, rivales del grupo y tabla de clasificación de 16 equipos mediante selector guiado de Competición, Grupo y Equipo.
- **Día de Partido y Cronómetro en Vivo (`MatchDashboard`, `PreMatch`, `LiveMatch`)**: Convocatorias con control de disponibilidad y sanciones, seguimiento de eventos en directo y registro de actas.
- **Pizarra Táctica Animada (`src/features/tactical-board/`)**: Pizarra F7/F11 con trayectorias curvas, keyframes de animación y exportación a vídeo MP4 (`mp4-muxer`) y PDF (`jsPDF`).
- **Rivales & Scouting (`src/features/rivals/`)**: Informes tácticos por fases del juego, historial Head-to-Head (H2H) y exportación a PDF/WhatsApp.
- **Planificador Semanal, Biblioteca de Tareas, Rendimiento y Régimen Interno**: Planificación de sesiones con control de asistencia, catálogo de ejercicios e indicadores estadísticos de plantilla.

---

## Requisitos y Ejecución Local

1. **Instalar dependencias**:
   ```bash
   npm install
   ```
2. **Variables de entorno (`.env.local`)**:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```
3. **Servidor de desarrollo** (incluye middleware local `/api/fed-proxy`):
   ```bash
   npm run dev
   ```
4. **Verificación de tipos y build de producción**:
   ```bash
   npx tsc --noEmit && npm run build
   ```

---

## Reglas de Arquitectura

Consulta [`AGENTS.md`](./AGENTS.md) para las directrices obligatorias de estructura Feature-First (`src/features/[dominio]/`, `src/shared/ui/`), límite de líneas por componente, rendimiento en eventos táctiles (`requestAnimationFrame`) y persistencia híbrida (`src/services/db.ts` + `cacheService.ts`).
