import React, { useState, useRef, useCallback, useEffect } from 'react';
import { BoardState, BoardToken, Point, ToolMode, DrawingPath, SavedScene } from '../types';
import { useSession } from '../context/SessionContext';
import { useTeam } from '../context/TeamContext';

const INITIAL_TOKENS: BoardToken[] = [];

export function useBoardInteraction() {
  const { loadedExercise, clearLoadedExercise } = useSession();
  const { activeTeam } = useTeam();
  const boardRef = useRef<HTMLDivElement>(null);

  // Initialize depending on modality
  const initializeTokens = () => {
    const isF7 = activeTeam?.modality === 'F7';
    const initTokens: BoardToken[] = [];
    
    if (isF7) {
      // Home Team (F7)
      const homePositions = [
        { label: '1', pos: { x: 5, y: 50 } }, { label: '2', pos: { x: 25, y: 20 } }, { label: '3', pos: { x: 20, y: 50 } },
        { label: '4', pos: { x: 25, y: 80 } }, { label: '5', pos: { x: 45, y: 35 } }, { label: '6', pos: { x: 45, y: 65 } },
        { label: '7', pos: { x: 75, y: 50 } },
      ];
      // Away Team (F7)
      const awayPositions = [
        { label: '1', pos: { x: 95, y: 50 } }, { label: '2', pos: { x: 75, y: 80 } }, { label: '3', pos: { x: 80, y: 50 } },
        { label: '4', pos: { x: 75, y: 20 } }, { label: '5', pos: { x: 55, y: 65 } }, { label: '6', pos: { x: 55, y: 35 } },
        { label: '7', pos: { x: 25, y: 50 } },
      ];

      homePositions.forEach(p => initTokens.push({ id: Math.random().toString(36), type: 'player', color: '#f43f5e', position: p.pos, label: p.label, rotation: 0 }));
      awayPositions.forEach(p => initTokens.push({ id: Math.random().toString(36), type: 'player', color: '#3b82f6', position: p.pos, label: p.label, rotation: 0 }));
    } else {
      // Home Team (F11 - 4-3-3 default)
      const homePositions = [
        { label: '1', pos: { x: 5, y: 50 } }, { label: '2', pos: { x: 25, y: 85 } }, { label: '3', pos: { x: 25, y: 15 } },
        { label: '4', pos: { x: 20, y: 35 } }, { label: '5', pos: { x: 20, y: 65 } }, { label: '6', pos: { x: 40, y: 50 } },
        { label: '8', pos: { x: 55, y: 30 } }, { label: '10', pos: { x: 55, y: 70 } }, { label: '7', pos: { x: 75, y: 85 } },
        { label: '11', pos: { x: 75, y: 15 } }, { label: '9', pos: { x: 85, y: 50 } },
      ];
      // Away Team (F11 - 4-3-3 default)
      const awayPositions = [
        { label: '1', pos: { x: 95, y: 50 } }, { label: '2', pos: { x: 75, y: 15 } }, { label: '3', pos: { x: 75, y: 85 } },
        { label: '4', pos: { x: 80, y: 65 } }, { label: '5', pos: { x: 80, y: 35 } }, { label: '6', pos: { x: 60, y: 50 } },
        { label: '8', pos: { x: 45, y: 70 } }, { label: '10', pos: { x: 45, y: 30 } }, { label: '7', pos: { x: 25, y: 15 } },
        { label: '11', pos: { x: 25, y: 85 } }, { label: '9', pos: { x: 15, y: 50 } },
      ];

      homePositions.forEach(p => initTokens.push({ id: Math.random().toString(36), type: 'player', color: '#f43f5e', position: p.pos, label: p.label, rotation: 0 }));
      awayPositions.forEach(p => initTokens.push({ id: Math.random().toString(36), type: 'player', color: '#3b82f6', position: p.pos, label: p.label, rotation: 0 }));
    }
    return initTokens;
  };

  const [boardState, setBoardState] = useState<BoardState>({
    tokens: initializeTokens(),
    paths: [],
    selectedTokenId: null,
    currentTool: 'pointer',
    currentPathType: 'pass',
    drawingColor: '#ffffff'
  });
  
  // Sync when loading an exercise from Library
  useEffect(() => {
    if (loadedExercise?.boardState) {
      setBoardState(loadedExercise.boardState);
      clearLoadedExercise(); // Consume it once loaded
    }
  }, [loadedExercise, clearLoadedExercise]);

  useEffect(() => {
    // Clear and reset tokens when modality changes
    setBoardState(prev => ({
      ...prev,
      tokens: initializeTokens(),
      paths: [],
      selectedTokenId: null
    }));
  }, [activeTeam?.modality]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPathPoints, setCurrentPathPoints] = useState<Point[]>([]);
  const [rotatingTokenId, setRotatingTokenId] = useState<string | null>(null);
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);

  const [savedScenes, setSavedScenes] = useState<SavedScene[]>(() => {
    try {
      const saved = localStorage.getItem('am_manager_scenes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('am_manager_scenes', JSON.stringify(savedScenes));
  }, [savedScenes]);

  const getRelativePosition = useCallback((clientX: number, clientY: number): Point => {
    if (!boardRef.current) return { x: 0, y: 0 };
    const rect = boardRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }, []);

  const handleRotateStart = useCallback((e: React.PointerEvent, id: string) => {
    if (boardState.currentTool !== 'pointer') return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setRotatingTokenId(id);
    setBoardState(prev => ({ ...prev, selectedTokenId: id }));
  }, [boardState.currentTool]);

  const handleTokenPointerDown = useCallback((e: React.PointerEvent, id: string) => {
    if (boardState.currentTool !== 'pointer') return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setBoardState(prev => ({ ...prev, selectedTokenId: id }));
    setDraggingTokenId(id);
  }, [boardState.currentTool]);

  const handleBoardPointerDown = useCallback((e: React.PointerEvent) => {
    if (boardState.currentTool === 'draw') {
      e.currentTarget.setPointerCapture(e.pointerId);
      const pos = getRelativePosition(e.clientX, e.clientY);
      setCurrentPathPoints([pos]);
    } else if (boardState.currentTool === 'pointer') {
      // Clear selection when clicking on the board background
      setBoardState(prev => ({ ...prev, selectedTokenId: null }));
    }
  }, [boardState.currentTool, getRelativePosition]);

  const handleBoardPointerMove = useCallback((e: React.PointerEvent) => {
    if (rotatingTokenId) {
      const token = boardState.tokens.find(t => t.id === rotatingTokenId);
      if (!token) return;
      
      const pos = getRelativePosition(e.clientX, e.clientY);
      // Calculate angle from center of token to pointer
      // Since screen coords have y going down, and we want 0 deg pointing UP
      // dx = cursorX - centerX, dy = cursorY - centerY
      const dx = pos.x - token.position.x;
      const dy = pos.y - token.position.y;
      
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      // Normalizar entre 0 y 360
      if (angle < 0) angle += 360;

      setBoardState(prev => ({
        ...prev,
        tokens: prev.tokens.map(t => 
          t.id === rotatingTokenId ? { ...t, rotation: angle } : t
        )
      }));
    } else if (draggingTokenId && boardState.currentTool === 'pointer') {
      const pos = getRelativePosition(e.clientX, e.clientY);
      setBoardState(prev => ({
        ...prev,
        tokens: prev.tokens.map(t => 
          t.id === draggingTokenId ? { ...t, position: pos } : t
        )
      }));
    } else if (boardState.currentTool === 'draw' && currentPathPoints.length > 0) {
      const pos = getRelativePosition(e.clientX, e.clientY);
      setCurrentPathPoints(prev => [...prev, pos]);
    }
  }, [rotatingTokenId, draggingTokenId, boardState.currentTool, getRelativePosition, currentPathPoints.length, boardState.tokens]);

  const handleBoardPointerUp = useCallback((e: React.PointerEvent) => {
    if (rotatingTokenId) {
      setRotatingTokenId(null);
    } else if (draggingTokenId) {
      setDraggingTokenId(null);
    } else if (boardState.currentTool === 'draw' && currentPathPoints.length > 0) {
      setBoardState(prev => ({
        ...prev,
        paths: [...prev.paths, {
          id: Math.random().toString(36).substring(7),
          type: prev.currentPathType,
          points: currentPathPoints,
          color: prev.drawingColor
        }]
      }));
      setCurrentPathPoints([]);
    }
  }, [boardState.currentTool, currentPathPoints, boardState.drawingColor, rotatingTokenId, draggingTokenId]);

  const handleToolChange = useCallback((tool: ToolMode) => {
    setBoardState(prev => ({ ...prev, currentTool: tool, selectedTokenId: null }));
    setRotatingTokenId(null);
  }, []);

  // Global pointer up to prevent sticky dragging/rotating
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (rotatingTokenId) {
        setRotatingTokenId(null);
      }
      if (draggingTokenId) {
        setDraggingTokenId(null);
      }
    };

    if (rotatingTokenId || draggingTokenId) {
      window.addEventListener('pointerup', handleGlobalPointerUp);
      window.addEventListener('pointercancel', handleGlobalPointerUp);
    }

    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
    };
  }, [rotatingTokenId, draggingTokenId]);

  const handleColorChange = useCallback((color: string) => {
    setBoardState(prev => ({ ...prev, drawingColor: color }));
  }, []);

  const handlePathTypeChange = useCallback((type: DrawingPath['type']) => {
    setBoardState(prev => ({ ...prev, currentPathType: type, currentTool: 'draw' }));
  }, []);

  const undoPath = useCallback(() => {
    setBoardState(prev => ({ ...prev, paths: prev.paths.slice(0, -1) }));
  }, []);

  const addToken = useCallback((type: BoardToken['type']) => {
    setBoardState(prev => ({
      ...prev,
      tokens: [...prev.tokens, {
        id: Math.random().toString(36).substring(7),
        type,
        position: { x: 50, y: 50 }
      }]
    }));
  }, []);

  const addPlayer = useCallback((team: 'home' | 'away', label: string, playerId?: string, position?: {x: number, y: number}, color?: string, playerName?: string) => {
    setBoardState(prev => ({
      ...prev,
      tokens: [...prev.tokens, {
        id: Math.random().toString(36).substring(7),
        type: 'player',
        team,
        label,
        playerId,
        playerName,
        color,
        position: position || { x: team === 'home' ? 40 : 60, y: 50 }
      }]
    }));
  }, []);

  const clearBoard = useCallback(() => {
    setBoardState(prev => ({
      ...prev,
      tokens: [],
      paths: [],
      selectedTokenId: null
    }));
    setSavedScenes([]);
    setRotatingTokenId(null);
    setCurrentPathPoints([]);
  }, []);

  const addFormation = useCallback((team: 'home' | 'away', formationKey: string) => {
    const FORMATIONS: Record<string, {label: string, pos: Point}[]> = {
      '2-3-1': [
        { label: '1', pos: { x: 5, y: 50 } }, { label: '2', pos: { x: 25, y: 20 } }, { label: '3', pos: { x: 20, y: 50 } },
        { label: '4', pos: { x: 25, y: 80 } }, { label: '5', pos: { x: 45, y: 35 } }, { label: '6', pos: { x: 45, y: 65 } },
        { label: '7', pos: { x: 75, y: 50 } },
      ],
      '3-2-1': [
        { label: '1', pos: { x: 5, y: 50 } }, { label: '2', pos: { x: 25, y: 15 } }, { label: '3', pos: { x: 20, y: 50 } },
        { label: '4', pos: { x: 25, y: 85 } }, { label: '5', pos: { x: 45, y: 35 } }, { label: '6', pos: { x: 45, y: 65 } },
        { label: '7', pos: { x: 75, y: 50 } },
      ],
      '2-2-2': [
        { label: '1', pos: { x: 5, y: 50 } }, { label: '2', pos: { x: 25, y: 30 } }, { label: '3', pos: { x: 25, y: 70 } },
        { label: '4', pos: { x: 45, y: 30 } }, { label: '5', pos: { x: 45, y: 70 } }, { label: '6', pos: { x: 75, y: 30 } },
        { label: '7', pos: { x: 75, y: 70 } },
      ],
      '4-4-2': [
        { label: '1', pos: { x: 5, y: 50 } }, { label: '2', pos: { x: 25, y: 85 } }, { label: '3', pos: { x: 25, y: 15 } },
        { label: '4', pos: { x: 20, y: 35 } }, { label: '5', pos: { x: 20, y: 65 } }, { label: '6', pos: { x: 45, y: 35 } },
        { label: '8', pos: { x: 45, y: 65 } }, { label: '7', pos: { x: 50, y: 85 } }, { label: '11', pos: { x: 50, y: 15 } },
        { label: '9', pos: { x: 75, y: 40 } }, { label: '10', pos: { x: 75, y: 60 } },
      ],
      '4-3-3': [
        { label: '1', pos: { x: 5, y: 50 } }, { label: '2', pos: { x: 25, y: 85 } }, { label: '3', pos: { x: 25, y: 15 } },
        { label: '4', pos: { x: 20, y: 35 } }, { label: '5', pos: { x: 20, y: 65 } }, { label: '6', pos: { x: 40, y: 50 } },
        { label: '8', pos: { x: 55, y: 30 } }, { label: '10', pos: { x: 55, y: 70 } }, { label: '7', pos: { x: 75, y: 85 } },
        { label: '11', pos: { x: 75, y: 15 } }, { label: '9', pos: { x: 85, y: 50 } },
      ],
      '3-5-2': [
        { label: '1', pos: { x: 5, y: 50 } }, { label: '4', pos: { x: 20, y: 20 } }, { label: '5', pos: { x: 15, y: 50 } },
        { label: '3', pos: { x: 20, y: 80 } }, { label: '11', pos: { x: 45, y: 15 } }, { label: '6', pos: { x: 35, y: 50 } },
        { label: '8', pos: { x: 45, y: 35 } }, { label: '10', pos: { x: 45, y: 65 } }, { label: '2', pos: { x: 45, y: 85 } },
        { label: '9', pos: { x: 75, y: 35 } }, { label: '7', pos: { x: 75, y: 65 } },
      ]
    };

    const baseTokens = FORMATIONS[formationKey];
    const newTokens: BoardToken[] = baseTokens.map((t, index) => {
      const x = team === 'away' ? 100 - t.pos.x : t.pos.x;
      const y = team === 'away' ? 100 - t.pos.y : t.pos.y;
      return {
        id: `${team}-${formationKey}-${Date.now()}-${index}`,
        type: 'player',
        team,
        label: t.label,
        position: { x, y },
        rotation: 0
      };
    });

    setBoardState(prev => ({
      ...prev,
      tokens: [...prev.tokens, ...newTokens]
    }));
  }, []);

  const deleteSelectedToken = useCallback((idOrEvent?: string | any) => {
    const id = typeof idOrEvent === 'string' ? idOrEvent : undefined;
    setBoardState(prev => {
      const targetId = id || prev.selectedTokenId;
      if (!targetId) return prev;
      return {
        ...prev,
        tokens: prev.tokens.filter(t => t.id !== targetId),
        selectedTokenId: prev.selectedTokenId === targetId ? null : prev.selectedTokenId
      };
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && boardState.selectedTokenId) {
        // Prevent default back navigation on backspace if needed
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        deleteSelectedToken();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boardState.selectedTokenId, deleteSelectedToken]);

  const rotateSelectedToken = useCallback((delta: number) => {
    setBoardState(prev => ({
      ...prev,
      tokens: prev.tokens.map(t =>
        t.id === prev.selectedTokenId
          ? { ...t, rotation: ((t.rotation || 0) + delta) % 360 }
          : t
      )
    }));
  }, []);

  const saveScene = useCallback((title: string) => {
    const newScene: SavedScene = {
      id: Math.random().toString(36).substring(7),
      title,
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(boardState)) // Deep clone for independent frames
    };
    setSavedScenes(prev => [...prev, newScene]);
  }, [boardState]);

  const loadScene = useCallback((scene: SavedScene) => {
    setBoardState(scene.state);
  }, []);

  const deleteScene = useCallback((id: string) => {
    setSavedScenes(prev => prev.filter(s => s.id !== id));
  }, []);

  const playAnimation = useCallback(() => {
    if (savedScenes.length < 2) return;
    setIsPlaying(true);
    let frameIdx = 0;

    const playNext = () => {
      if (frameIdx >= savedScenes.length) {
        setIsPlaying(false);
        return;
      }
      setBoardState(savedScenes[frameIdx].state);
      frameIdx++;
      setTimeout(playNext, 1500); // 1.5s per frame transition
    };

    playNext();
  }, [savedScenes]);

  return {
    boardRef,
    boardState,
    isPlaying,
    currentPathPoints,
    handleTokenPointerDown,
    handleBoardPointerDown,
    handleBoardPointerMove,
    handleBoardPointerUp,
    handleToolChange,
    handlePathTypeChange,
    handleColorChange,
    undoPath,
    clearBoard,
    addFormation,
    addToken,
    addPlayer,
    deleteSelectedToken,
    handleRotateStart,
    rotateSelectedToken,
    savedScenes,
    saveScene,
    loadScene,
    deleteScene,
    playAnimation
  };
}
