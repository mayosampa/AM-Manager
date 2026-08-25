import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { BoardState, BoardToken, SavedScene } from '../types';
import { db } from '../services/db';

export type SessionType = 'match' | 'training' | null;
export type TrainingCategory = string;

export interface Exercise {
  id: string;
  modality?: 'F7' | 'F11' | 'Universal';
  title: string;
  category: TrainingCategory | 'match';
  thumbnailUrl: string; // Base64 image
  createdAt: number;
  boardState: BoardState;
  scenes?: SavedScene[];
  duration?: number;
}

interface SessionState {
  currentSessionType: SessionType;
  trainingCategory: TrainingCategory | null;
  savedExercises: Exercise[];
  loadedExercise: Exercise | null;
  sessionId: string;
  startMatchSession: () => void;
  startTrainingSession: (category: TrainingCategory) => void;
  saveExercise: (exercise: Exercise) => void;
  deleteExercise: (id: string) => void;
  loadExerciseToBoard: (exercise: Exercise) => void;
  clearSession: () => void;
  clearLoadedExercise: () => void;
}

const generateDefault433 = (): Exercise => {
  const defaultTokens: BoardToken[] = [
    // Goalkeeper
    { id: 'gk', type: 'player', team: 'home', label: '1', position: { x: 5, y: 50 } },
    // Defenders
    { id: 'lb', type: 'player', team: 'home', label: '3', position: { x: 25, y: 15 } },
    { id: 'cb1', type: 'player', team: 'home', label: '4', position: { x: 20, y: 35 } },
    { id: 'cb2', type: 'player', team: 'home', label: '5', position: { x: 20, y: 65 } },
    { id: 'rb', type: 'player', team: 'home', label: '2', position: { x: 25, y: 85 } },
    // Midfielders
    { id: 'cdm', type: 'player', team: 'home', label: '6', position: { x: 40, y: 50 } },
    { id: 'cm1', type: 'player', team: 'home', label: '8', position: { x: 55, y: 30 } },
    { id: 'cm2', type: 'player', team: 'home', label: '10', position: { x: 55, y: 70 } },
    // Forwards
    { id: 'lw', type: 'player', team: 'home', label: '11', position: { x: 75, y: 15 } },
    { id: 'st', type: 'player', team: 'home', label: '9', position: { x: 85, y: 50 } },
    { id: 'rw', type: 'player', team: 'home', label: '7', position: { x: 75, y: 85 } },
  ];

  return {
    id: 'default-433',
    title: 'Plantilla Base: 4-3-3',
    category: 'match',
    thumbnailUrl: '', // Could be empty or a generic icon
    createdAt: Date.now(),
    boardState: {
      tokens: defaultTokens,
      paths: [],
      selectedTokenId: null,
      currentTool: 'pointer',
      currentPathType: 'freehand',
      drawingColor: '#ffffff'
    }
  };
};

const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentSessionType, setCurrentSessionType] = useState<SessionType>(null);
  const [trainingCategory, setTrainingCategory] = useState<TrainingCategory | null>(null);
  const [savedExercises, setSavedExercises] = useState<Exercise[]>([]);
  const [loadedExercise, setLoadedExercise] = useState<Exercise | null>(null);
  const [sessionId, setSessionId] = useState<string>(() => Math.random().toString(36).substring(7));

  // Initialize from DB
  useEffect(() => {
    async function loadData() {
      try {
        const exercises = await db.getExercises();
        if (exercises.length > 0) {
          // Cast SavedScene to Exercise format (they are very similar, but Exercise adds thumbnailUrl and category)
          setSavedExercises(exercises as any as Exercise[]);
        } else {
          // Init with default template
          const defaultEx = generateDefault433();
          setSavedExercises([defaultEx]);
          await db.saveExercises([defaultEx] as any as import('../types').SavedScene[]);
        }
      } catch (err) {
        console.error('Error loading exercises from DB:', err);
      }
    }
    loadData();
  }, []);

  const saveToDB = async (exercises: Exercise[]) => {
    try {
      await db.saveExercises(exercises as any as import('../types').SavedScene[]);
    } catch (err) {
      console.error('Error saving to DB. Might be quota exceeded (images too large).', err);
      alert('Error guardando: Límite de almacenamiento alcanzado.');
    }
  };

  const startMatchSession = () => {
    localStorage.removeItem('am_manager_scenes');
    setSessionId(Math.random().toString(36).substring(7));
    setCurrentSessionType('match');
    setTrainingCategory(null);
  };

  const startTrainingSession = (category: TrainingCategory) => {
    localStorage.removeItem('am_manager_scenes');
    setSessionId(Math.random().toString(36).substring(7));
    setCurrentSessionType('training');
    setTrainingCategory(category);
  };

  const saveExercise = (exercise: Exercise) => {
    setSavedExercises(prev => {
      const existingIdx = prev.findIndex(e => e.id === exercise.id);
      let updated;
      if (existingIdx >= 0) {
        updated = [...prev];
        updated[existingIdx] = exercise;
      } else {
        updated = [...prev, exercise];
      }
      saveToDB(updated);
      return updated;
    });
  };

  const deleteExercise = (id: string) => {
    setSavedExercises(prev => {
      const updated = prev.filter(e => e.id !== id);
      saveToDB(updated);
      return updated;
    });
  };

  const loadExerciseToBoard = (exercise: Exercise) => {
    localStorage.removeItem('am_manager_scenes');
    setSessionId(Math.random().toString(36).substring(7));
    setLoadedExercise(exercise);
    if (exercise.category === 'match') {
      setCurrentSessionType('match');
      setTrainingCategory(null);
    } else {
      setCurrentSessionType('training');
      setTrainingCategory(exercise.category as TrainingCategory);
    }
  };

  const clearSession = () => {
    setCurrentSessionType(null);
    setTrainingCategory(null);
  };

  const clearLoadedExercise = () => {
    setLoadedExercise(null);
  };

  return (
    <SessionContext.Provider 
      value={{ 
        currentSessionType, 
        trainingCategory, 
        savedExercises, 
        loadedExercise,
        sessionId,
        startMatchSession, 
        startTrainingSession, 
        saveExercise,
        deleteExercise,
        loadExerciseToBoard,
        clearSession,
        clearLoadedExercise
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
