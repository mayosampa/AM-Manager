import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { BoardToken } from '../types';
import { exerciseRepository } from '../infrastructure/repositories/ExerciseRepository';
import { ExerciseDTO } from '../infrastructure/database/db';
import { cacheService } from '../services/cacheService';
import { supabase } from '../services/supabase';

export type SessionType = 'match' | 'training' | null;
export type TrainingCategory = string;

export interface Exercise extends ExerciseDTO {
}

interface SessionState {
  currentSessionType: SessionType;
  trainingCategory: TrainingCategory | null;
  savedExercises: Exercise[];
  loadedExercise: Exercise | null;
  sessionId: string;
  startMatchSession: () => void;
  startTrainingSession: (category: TrainingCategory) => void;
  saveExercise: (exercise: Exercise) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
  loadExerciseToBoard: (exercise: Exercise) => void;
  clearSession: () => void;
  clearLoadedExercise: () => void;
}

const generateDefault433 = (userId: string): Exercise => {
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
    id: `default-433-${userId}`,
    title: 'Plantilla Base: 4-3-3',
    category: 'match',
    modality: 'Universal',
    thumbnailUrl: '', // Could be empty or a generic icon
    createdAt: Date.now(),
    boardState: {
      tokens: defaultTokens,
      paths: [],
      shapes: [],
      selectedTokenId: null,
      selectedShapeId: null,
      currentTool: 'pointer',
      currentPathType: 'freehand',
      drawingColor: '#ffffff',
      laneOverlay: 'none'
    }
  };
};

const SessionContext = createContext<SessionState | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [currentSessionType, setCurrentSessionType] = useState<SessionType>(null);
  const [trainingCategory, setTrainingCategory] = useState<TrainingCategory | null>(null);
  const [savedExercises, setSavedExercises] = useState<Exercise[]>(() => cacheService.get<Exercise[]>('exercises', []));
  const [loadedExercise, setLoadedExercise] = useState<Exercise | null>(null);
  const [sessionId, setSessionId] = useState<string>(() => Math.random().toString(36).substring(7));
  const loadedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function loadForUser(userId: string) {
      try {
        const exercises = await exerciseRepository.getAll();
        if (exercises.length > 0) {
          setSavedExercises(exercises as Exercise[]);
        } else {
          const defaultEx = generateDefault433(userId);
          setSavedExercises([defaultEx]);
          await exerciseRepository.save(defaultEx);
        }
      } catch (err) {
        console.error('Error loading exercises from DB:', err);
      }
    }

    const handleSession = (userId: string | null) => {
      if (!userId) {
        loadedUserIdRef.current = null;
        setSavedExercises([]);
        setLoadedExercise(null);
        setCurrentSessionType(null);
        setTrainingCategory(null);
        return;
      }
      if (loadedUserIdRef.current === userId) return;
      loadedUserIdRef.current = userId;
      setTimeout(() => loadForUser(userId), 0);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const startMatchSession = () => {
    setCurrentSessionType('match');
    setTrainingCategory(null);
  };

  const startTrainingSession = (category: TrainingCategory) => {
    setCurrentSessionType('training');
    setTrainingCategory(category);
  };

  const saveExercise = async (exercise: Exercise) => {
    setSavedExercises(prev => {
      const idx = prev.findIndex(e => e.id === exercise.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = exercise;
        return next;
      }
      return [exercise, ...prev];
    });
    
    try {
      // PERSISTENCIA (Preparado para transición a Supabase/Firebase)
      await exerciseRepository.save(exercise);
    } catch (err) {
      console.error('Error saving exercise to DB:', err);
      throw err; // Propagar para que la UI decida si muestra error
    }
  };

  const deleteExercise = async (id: string) => {
    setSavedExercises(prev => prev.filter(e => e.id !== id));
    try {
      await exerciseRepository.delete(id);
    } catch (err) {
      console.error('Error deleting exercise from Dexie:', err);
    }
  };

  const loadExerciseToBoard = (exercise: Exercise) => {
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

