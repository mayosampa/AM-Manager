/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, Suspense } from 'react';
import { Bell, Settings, Calendar, Users, BarChart3, Presentation, Home, Library, PlayCircle, History, Loader2, Gavel } from 'lucide-react';
import { useSession } from './context/SessionContext';

const TacticalBoard = React.lazy(() => import('./features/tactical-board/components/TacticalBoard').then(module => ({ default: module.TacticalBoard })));
const HomeScreen = React.lazy(() => import('./components/HomeScreen').then(module => ({ default: module.HomeScreen })));
const TeamManagement = React.lazy(() => import('./components/TeamManagement').then(module => ({ default: module.TeamManagement })));
const LibraryScreen = React.lazy(() => import('./components/LibraryScreen').then(module => ({ default: module.LibraryScreen })));
const MatchDashboard = React.lazy(() => import('./components/MatchDashboard').then(module => ({ default: module.MatchDashboard })));
const MatchHistory = React.lazy(() => import('./components/MatchHistory').then(module => ({ default: module.MatchHistory })));
const PlayerStatistics = React.lazy(() => import('./components/PlayerStatistics').then(module => ({ default: module.PlayerStatistics })));
const TrainingPlanner = React.lazy(() => import('./components/TrainingPlanner').then(module => ({ default: module.TrainingPlanner })));
const FinesManagement = React.lazy(() => import('./components/FinesManagement').then(module => ({ default: module.FinesManagement })));


export default function App() {
  const [activeView, setActiveView] = useState<'home' | 'tactics' | 'roster' | 'match' | 'calendar' | 'stats' | 'library' | 'history' | 'fines'>('home');
  const { sessionId } = useSession();

  return (
    <div className="h-screen bg-[#0A0A0C] text-[#E0E0E0] font-sans flex overflow-hidden">
      
      {/* Left Sidebar - Navigation */}
      <aside className="hidden md:flex w-20 flex-col items-center py-6 gap-6 bg-[#121215] border-r border-[#2A2A2E] shrink-0 z-20 h-full">
        <div 
          onClick={() => setActiveView('home')}
          className="w-12 h-12 bg-[#FF4B4B] rounded-xl flex items-center justify-center font-bold text-black text-xl shadow-lg shadow-[#FF4B4B]/20 cursor-pointer hover:scale-105 transition-transform shrink-0"
        >
          AM
        </div>
        
        <nav className="flex flex-col gap-6 w-full px-2 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-2">
          
          {/* GENERAL */}
          <div className="flex flex-col gap-3 items-center w-full">
            <button 
              onClick={() => setActiveView('home')}
              className={`p-3 rounded-xl transition-colors group ${activeView === 'home' ? 'bg-[#2A2A2E] text-[#FF4B4B] shadow-inner' : 'hover:bg-[#1C1C1F] text-[#6E6E75] hover:text-[#E0E0E0]'}`}
              title="Inicio"
            >
              <Home className={`w-6 h-6 ${activeView === 'home' ? '' : 'group-hover:scale-110 transition-transform'}`} />
            </button>
            <button 
              onClick={() => setActiveView('calendar')}
              className={`p-3 rounded-xl transition-colors group ${activeView === 'calendar' ? 'bg-[#2A2A2E] text-[#FF4B4B] shadow-inner' : 'hover:bg-[#1C1C1F] text-[#6E6E75] hover:text-[#E0E0E0]'}`}
              title="Planificador"
            >
              <Calendar className={`w-6 h-6 ${activeView === 'calendar' ? '' : 'group-hover:scale-110 transition-transform'}`} />
            </button>
          </div>

          {/* EQUIPO */}
          <div className="flex flex-col gap-3 items-center w-full">
            <div className="w-8 h-[2px] bg-[#2A2A2E] rounded-full mb-1"></div>
            <button 
              onClick={() => setActiveView('roster')}
              className={`p-3 rounded-xl transition-colors group ${activeView === 'roster' ? 'bg-[#2A2A2E] text-[#FF4B4B] shadow-inner' : 'hover:bg-[#1C1C1F] text-[#6E6E75] hover:text-[#E0E0E0]'}`}
              title="Plantilla"
            >
              <Users className={`w-6 h-6 ${activeView === 'roster' ? '' : 'group-hover:scale-110 transition-transform'}`} />
            </button>
            <button 
              onClick={() => setActiveView('fines')}
              className={`p-3 rounded-xl transition-colors group ${activeView === 'fines' ? 'bg-[#2A2A2E] text-[#FF4B4B] shadow-inner' : 'hover:bg-[#1C1C1F] text-[#6E6E75] hover:text-[#E0E0E0]'}`}
              title="Régimen Interno (Sanciones)"
            >
              <Gavel className={`w-6 h-6 ${activeView === 'fines' ? '' : 'group-hover:scale-110 transition-transform'}`} />
            </button>
            <button 
              onClick={() => setActiveView('stats')}
              className={`p-3 rounded-xl transition-colors group ${activeView === 'stats' ? 'bg-[#2A2A2E] text-[#FF4B4B] shadow-inner' : 'hover:bg-[#1C1C1F] text-[#6E6E75] hover:text-[#E0E0E0]'}`}
              title="Estadísticas"
            >
              <BarChart3 className={`w-6 h-6 ${activeView === 'stats' ? '' : 'group-hover:scale-110 transition-transform'}`} />
            </button>
          </div>

          {/* TACTICA Y PARTIDO */}
          <div className="flex flex-col gap-3 items-center w-full">
            <div className="w-8 h-[2px] bg-[#2A2A2E] rounded-full mb-1"></div>
            <button 
              onClick={() => setActiveView('match')}
              className={`p-3 rounded-xl transition-colors group ${activeView === 'match' ? 'bg-[#2A2A2E] text-[#FF4B4B] shadow-inner' : 'hover:bg-[#1C1C1F] text-[#6E6E75] hover:text-[#E0E0E0]'}`}
              title="Día de Partido"
            >
              <PlayCircle className={`w-6 h-6 ${activeView === 'match' ? '' : 'group-hover:scale-110 transition-transform'}`} />
            </button>
            <button 
              onClick={() => setActiveView('tactics')}
              className={`p-3 rounded-xl transition-colors group ${activeView === 'tactics' ? 'bg-[#2A2A2E] text-[#FF4B4B] shadow-inner' : 'hover:bg-[#1C1C1F] text-[#6E6E75] hover:text-[#E0E0E0]'}`}
              title="Pizarra Táctica"
            >
              <Presentation className={`w-6 h-6 ${activeView === 'tactics' ? '' : 'group-hover:scale-110 transition-transform'}`} />
            </button>
            <button 
              onClick={() => setActiveView('library')}
              className={`p-3 rounded-xl transition-colors group ${activeView === 'library' ? 'bg-[#2A2A2E] text-[#FF4B4B] shadow-inner' : 'hover:bg-[#1C1C1F] text-[#6E6E75] hover:text-[#E0E0E0]'}`}
              title="Biblioteca de Ejercicios"
            >
              <Library className={`w-6 h-6 ${activeView === 'library' ? '' : 'group-hover:scale-110 transition-transform'}`} />
            </button>
            <button 
              onClick={() => setActiveView('history')} 
              className={`p-3 rounded-xl transition-colors group ${activeView === 'history' ? 'bg-[#2A2A2E] text-[#FF4B4B] shadow-inner' : 'hover:bg-[#1C1C1F] text-[#6E6E75] hover:text-[#E0E0E0]'}`} 
              title="Historial de Partidos" 
            >
              <History className={`w-6 h-6 ${activeView === 'history' ? '' : 'group-hover:scale-110 transition-transform'}`} />
            </button>
          </div>
        </nav>
        
        <div className="mt-auto flex flex-col gap-4 shrink-0">
          <button className="p-3 text-[#6E6E75] hover:text-[#E0E0E0] hover:bg-[#1C1C1F] rounded-xl transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </aside>

      {/* Main Center Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-16 md:pb-0">
        {/* Top bar is common across modules */}
        <header className="px-6 py-5 border-b border-[#2A2A2E] flex items-center justify-between bg-[#0A0A0C] z-10 shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">
              {activeView === 'home' && 'AM Manager'}
              {activeView === 'tactics' && 'Análisis Ofensivo vs 4-4-2'}
              {activeView === 'roster' && 'Gestión de Plantilla'}
              {activeView === 'match' && 'Panel de Partido'}
              {activeView === 'library' && 'Biblioteca de Ejercicios'}
              {activeView === 'calendar' && 'Planificador de Sesiones'}
              {activeView === 'stats' && 'Análisis de Rendimiento'}
              {activeView === 'history' && 'Historial de Partidos'}
              {activeView === 'fines' && 'Régimen Interno'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-[#6E6E75] hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div className={`flex-1 overflow-y-auto overflow-x-hidden flex flex-col ${activeView === 'tactics' ? 'p-0' : 'p-4 sm:p-6 lg:p-8'}`}>
          <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#FF4B4B]" /></div>}>
            {activeView === 'home' && <HomeScreen onNavigate={setActiveView} />}
            
            {activeView === 'tactics' && (
              <div className="w-full h-full flex-1 flex">
                <TacticalBoard key={sessionId} />
              </div>
            )}

            {activeView === 'roster' && <TeamManagement />}
            {activeView === 'fines' && <FinesManagement />}
            
            {activeView === 'match' && <MatchDashboard onNavigate={setActiveView} />}
            {activeView === 'history' && <MatchHistory onNavigate={setActiveView} />}
            {activeView === 'stats' && <PlayerStatistics />}
            
            {activeView === 'library' && <LibraryScreen onNavigate={setActiveView} />}
            
            {activeView === 'calendar' && <TrainingPlanner />}
          </Suspense>
        </div>
      </main>

      {/* Bottom Navigation (Mobile & Tablet Portrait) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-[#121215] border-t border-[#2A2A2E] z-50 flex items-center justify-around px-2 py-2 pb-safe">
        <button onClick={() => setActiveView('home')} className={`p-2 flex flex-col items-center gap-1 transition-colors ${activeView === 'home' ? 'text-[#FF4B4B]' : 'text-[#6E6E75]'}`}>
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Inicio</span>
        </button>
        <button onClick={() => setActiveView('tactics')} className={`p-2 flex flex-col items-center gap-1 transition-colors ${activeView === 'tactics' ? 'text-[#FF4B4B]' : 'text-[#6E6E75]'}`}>
          <Presentation className="w-5 h-5" />
          <span className="text-[10px] font-medium">Pizarra</span>
        </button>
        <button onClick={() => setActiveView('roster')} className={`p-2 flex flex-col items-center gap-1 transition-colors ${activeView === 'roster' ? 'text-[#FF4B4B]' : 'text-[#6E6E75]'}`}>
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">Equipo</span>
        </button>
        <button onClick={() => setActiveView('fines')} className={`p-2 flex flex-col items-center gap-1 transition-colors ${activeView === 'fines' ? 'text-[#FF4B4B]' : 'text-[#6E6E75]'}`}>
          <Gavel className="w-5 h-5" />
          <span className="text-[10px] font-medium">Multas</span>
        </button>
        <button onClick={() => setActiveView('calendar')} className={`p-2 flex flex-col items-center gap-1 transition-colors ${activeView === 'calendar' ? 'text-[#FF4B4B]' : 'text-[#6E6E75]'}`}>
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-medium">Agenda</span>
        </button>
        <button onClick={() => setActiveView('library')} className={`p-2 flex flex-col items-center gap-1 transition-colors ${activeView === 'library' ? 'text-[#FF4B4B]' : 'text-[#6E6E75]'}`}>
          <Library className="w-5 h-5" />
          <span className="text-[10px] font-medium">Rutinas</span>
        </button>
      </nav>

    </div>
  );
}
