import React, { useState, useRef, useCallback, useEffect } from 'react';
import { BoardState, BoardToken, Point, ToolMode, DrawingPath, SavedScene, TeamType } from '../../../types';
import { useSession } from '../../../context/SessionContext';
import { useTeam } from '../../../context/TeamContext';
import { stabilizePath, buildPathGeometry } from '../utils/svgMath';
import { FORMATIONS, toOwnHalf, findFreeSlot } from '../constants/formations';

/** Minimum pointer travel (in % of pitch) before a new freehand point is recorded. */
const DRAW_DECIMATION_PCT = 0.35;

const uid = () => Math.random().toString(36).substring(2, 9);

/**
 * Board controller.
 *
 * Performance contract: during an active gesture (drag / rotate / scale / freehand draw)
 * NOTHING goes through React state. Pointer data is written into refs and painted
 * imperatively once per animation frame (rAF). React state is committed ONCE on pointerup.
 */
export function useBoardManager() {
  const { loadedExercise, clearLoadedExercise } = useSession();
  const { activeTeam } = useTeam();
  const isF7 = activeTeam?.modality === 'F7';
  const boardRef = useRef<HTMLDivElement>(null);

  // The board ALWAYS starts empty: teams are invoked on demand.
  const [boardState, setBoardState] = useState<BoardState>({
    tokens: [],
    paths: [],
    shapes: [],
    selectedTokenId: null,
    selectedShapeId: null,
    currentTool: 'pointer',
    currentPathType: 'pass',
    drawingColor: '#ffffff',
    laneOverlay: 'none'
  });

  const [savedScenes, setSavedScenes] = useState<SavedScene[]>(() => {
    if (loadedExercise?.scenes) return loadedExercise.scenes;
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

  // Sync when loading an exercise from Library
  useEffect(() => {
    if (loadedExercise) {
      if (loadedExercise.boardState) setBoardState(loadedExercise.boardState);
      if (loadedExercise.scenes) setSavedScenes(loadedExercise.scenes);
      clearLoadedExercise(); // Consume it once loaded
    }
  }, [loadedExercise, clearLoadedExercise]);

  useEffect(() => {
    // Reset to an EMPTY pitch when modality changes (unless an exercise is being loaded)
    if (!loadedExercise) {
      setBoardState(prev => ({ ...prev, tokens: [], paths: [], shapes: [], selectedTokenId: null, selectedShapeId: null }));
    }
  }, [activeTeam?.modality]);

  const [isPlaying, setIsPlaying] = useState(false);

  // ── Gesture refs (never trigger renders) ──
  const rotatingTokenId = useRef<string | null>(null);
  const draggingTokenId = useRef<string | null>(null);
  const scalingTokenId  = useRef<string | null>(null);
  const dragTargetPos   = useRef<Point | null>(null);
  const dragTargetRot   = useRef<number | null>(null);
  const dragTargetScale = useRef<number | null>(null);
  const rafId           = useRef<number | null>(null);
  const boardRectRef    = useRef<DOMRect | null>(null);

  // Freehand drawing (imperative live preview)
  const isDrawingRef    = useRef(false);
  const draftPointsRef  = useRef<Point[]>([]);
  const livePathRef     = useRef<SVGPathElement>(null);
  const liveHeadRef     = useRef<SVGPolygonElement>(null);
  const drawRafRef      = useRef<number | null>(null);

  // Latest-value mirrors so the hot handlers can stay referentially stable
  const tokensRef   = useRef(boardState.tokens);
  const toolRef     = useRef(boardState.currentTool);
  const pathTypeRef = useRef(boardState.currentPathType);
  tokensRef.current   = boardState.tokens;
  toolRef.current     = boardState.currentTool;
  pathTypeRef.current = boardState.currentPathType;

  /** Reads the board rect ONCE per gesture (avoids a forced reflow on every pointermove). */
  const captureBoardRect = useCallback(() => {
    boardRectRef.current = boardRef.current ? boardRef.current.getBoundingClientRect() : null;
    return boardRectRef.current;
  }, []);

  const getRelativePosition = useCallback((clientX: number, clientY: number): Point => {
    const rect = boardRectRef.current || captureBoardRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  }, [captureBoardRect]);

  const selectToken = (id: string) =>
    setBoardState(prev => (prev.selectedTokenId === id && !prev.selectedShapeId ? prev : { ...prev, selectedTokenId: id, selectedShapeId: null }));

  const handleTokenPointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (toolRef.current !== 'pointer') return;
    captureBoardRect();
    draggingTokenId.current = id;
    selectToken(id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [captureBoardRect]);

  const handleRotateStart = useCallback((e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    captureBoardRect();
    rotatingTokenId.current = id;
    selectToken(id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [captureBoardRect]);

  /** Start scaling a token by dragging its scale handle */
  const handleScaleStart = useCallback((e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    captureBoardRect();
    scalingTokenId.current = id;
    selectToken(id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [captureBoardRect]);

  // ── Imperative painters (run inside rAF) ──
  const updateDOM = useCallback(() => {
    rafId.current = null;
    if (draggingTokenId.current && dragTargetPos.current) {
      const el = document.getElementById(`token-${draggingTokenId.current}`);
      if (el) {
        el.style.left = `${dragTargetPos.current.x}%`;
        el.style.top  = `${dragTargetPos.current.y}%`;
      }
    }
    if (rotatingTokenId.current && dragTargetRot.current !== null) {
      const el = document.getElementById(`token-${rotatingTokenId.current}`);
      if (el) {
        const s = parseFloat(el.dataset.scale || '1');
        el.dataset.rotation = String(dragTargetRot.current);
        el.style.transform = `rotate(${dragTargetRot.current}deg) scale(${s})`;
      }
    }
    if (scalingTokenId.current && dragTargetScale.current !== null) {
      const el = document.getElementById(`token-${scalingTokenId.current}`);
      if (el) {
        const r = parseFloat(el.dataset.rotation || '0');
        el.dataset.scale = String(dragTargetScale.current);
        el.style.transform = `rotate(${r}deg) scale(${dragTargetScale.current})`;
        // Controls counter-scale through this CSS var so they keep a constant on-screen size
        el.style.setProperty('--ts', String(dragTargetScale.current));
      }
    }
  }, []);

  const scheduleDOM = () => { if (!rafId.current) rafId.current = requestAnimationFrame(updateDOM); };

  const paintLivePath = useCallback(() => {
    drawRafRef.current = null;
    const rect = boardRectRef.current;
    const pathEl = livePathRef.current;
    if (!rect || !pathEl) return;
    const { d, head } = buildPathGeometry(draftPointsRef.current, pathTypeRef.current, rect.width, rect.height);
    pathEl.setAttribute('d', d);
    if (liveHeadRef.current) liveHeadRef.current.setAttribute('points', head || '');
  }, []);

  const clearLivePath = () => {
    livePathRef.current?.setAttribute('d', '');
    liveHeadRef.current?.setAttribute('points', '');
  };

  const handleBoardPointerDown = useCallback((e: React.PointerEvent) => {
    if (toolRef.current === 'draw') {
      captureBoardRect();
      isDrawingRef.current = true;
      draftPointsRef.current = [getRelativePosition(e.clientX, e.clientY)];
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } else if (toolRef.current === 'pointer') {
      setBoardState(prev => (prev.selectedTokenId || prev.selectedShapeId ? { ...prev, selectedTokenId: null, selectedShapeId: null } : prev));
    }
  }, [captureBoardRect, getRelativePosition]);

  const handleBoardPointerMove = useCallback((e: React.PointerEvent) => {
    if (rotatingTokenId.current) {
      const token = tokensRef.current.find(t => t.id === rotatingTokenId.current);
      if (!token) return;
      const pos = getRelativePosition(e.clientX, e.clientY);
      const rect = boardRectRef.current;
      // Use pixel deltas so the angle is correct on non-square pitches
      const dx = (pos.x - token.position.x) * (rect ? rect.width : 1);
      const dy = (pos.y - token.position.y) * (rect ? rect.height : 1);
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      if (angle < 0) angle += 360;
      dragTargetRot.current = angle;
      scheduleDOM();
    } else if (scalingTokenId.current) {
      const token = tokensRef.current.find(t => t.id === scalingTokenId.current);
      const rect = boardRectRef.current;
      if (!token || !rect) return;
      const centerX = rect.left + (token.position.x / 100) * rect.width;
      const centerY = rect.top  + (token.position.y / 100) * rect.height;
      const d = Math.hypot(e.clientX - centerX, e.clientY - centerY);
      // Map: 20px → 0.5x, 120px → 3.0x
      const MIN_DIST = 20, MAX_DIST = 120, MIN_SCALE = 0.5, MAX_SCALE = 3.0;
      const raw = MIN_SCALE + ((d - MIN_DIST) / (MAX_DIST - MIN_DIST)) * (MAX_SCALE - MIN_SCALE);
      dragTargetScale.current = Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw));
      scheduleDOM();
    } else if (draggingTokenId.current) {
      dragTargetPos.current = getRelativePosition(e.clientX, e.clientY);
      scheduleDOM();
    } else if (isDrawingRef.current) {
      const pos = getRelativePosition(e.clientX, e.clientY);
      const pts = draftPointsRef.current;
      const last = pts[pts.length - 1];
      if (last && Math.hypot(pos.x - last.x, pos.y - last.y) < DRAW_DECIMATION_PCT) return;
      pts.push(pos); // mutate in place: O(1), no array copies
      if (!drawRafRef.current) drawRafRef.current = requestAnimationFrame(paintLivePath);
    }
  }, [getRelativePosition, paintLivePath]);

  const handleBoardPointerUp = useCallback((_e?: React.PointerEvent | PointerEvent) => {
    if (rafId.current) { cancelAnimationFrame(rafId.current); rafId.current = null; }

    if (rotatingTokenId.current) {
      const id = rotatingTokenId.current, rot = dragTargetRot.current;
      rotatingTokenId.current = null; dragTargetRot.current = null;
      if (rot !== null) setBoardState(prev => ({ ...prev, tokens: prev.tokens.map(t => t.id === id ? { ...t, rotation: rot } : t) }));
    } else if (scalingTokenId.current) {
      const id = scalingTokenId.current, scale = dragTargetScale.current;
      scalingTokenId.current = null; dragTargetScale.current = null;
      if (scale !== null) setBoardState(prev => ({ ...prev, tokens: prev.tokens.map(t => t.id === id ? { ...t, scale } : t) }));
    } else if (draggingTokenId.current) {
      const id = draggingTokenId.current, pos = dragTargetPos.current;
      draggingTokenId.current = null; dragTargetPos.current = null;
      if (pos) setBoardState(prev => ({ ...prev, tokens: prev.tokens.map(t => t.id === id ? { ...t, position: pos } : t) }));
    } else if (isDrawingRef.current) {
      isDrawingRef.current = false;
      if (drawRafRef.current) { cancelAnimationFrame(drawRafRef.current); drawRafRef.current = null; }
      // Stabilize: drop a trailing micro-jitter point before committing
      const stablePoints = stabilizePath(draftPointsRef.current);
      draftPointsRef.current = [];
      clearLivePath();
      if (stablePoints.length >= 2) {
        setBoardState(prev => ({
          ...prev,
          paths: [...prev.paths, { id: uid(), type: prev.currentPathType, points: stablePoints, color: prev.drawingColor }]
        }));
      }
    }
    boardRectRef.current = null;
  }, []);

  const handleToolChange = useCallback((tool: ToolMode) => {
    setBoardState(prev => ({ ...prev, currentTool: tool, selectedTokenId: null, selectedShapeId: null }));
    rotatingTokenId.current = null;
  }, []);

  // Global pointer-up safety net (registered once; reads the latest handler via ref)
  const pointerUpRef = useRef(handleBoardPointerUp);
  pointerUpRef.current = handleBoardPointerUp;
  useEffect(() => {
    const onUp = (e: PointerEvent) => {
      if (rotatingTokenId.current || draggingTokenId.current || scalingTokenId.current || isDrawingRef.current) {
        pointerUpRef.current(e);
      }
    };
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const handleColorChange = useCallback((color: string) => {
    setBoardState(prev => ({ ...prev, drawingColor: color }));
  }, []);

  const handlePathTypeChange = useCallback((type: DrawingPath['type']) => {
    setBoardState(prev => ({ ...prev, currentPathType: type, currentTool: 'draw' }));
  }, []);

  const undoPath = useCallback(() => {
    setBoardState(prev => ({ ...prev, paths: prev.paths.slice(0, -1) }));
  }, []);

  /** Materials are always dropped at the visual centre of the pitch. */
  const addToken = useCallback((type: BoardToken['type']) => {
    setBoardState(prev => ({
      ...prev,
      tokens: [...prev.tokens, { id: uid(), type, position: { x: 50, y: 50 } }]
    }));
  }, []);

  const addPlayer = useCallback((team: TeamType, label?: string, playerId?: string, position?: Point, color?: string, playerName?: string) => {
    setBoardState(prev => {
      const slot = position || findFreeSlot(team, prev.tokens, isF7);
      const autoLabel = label ?? String(prev.tokens.filter(t => t.type === 'player' && t.team === team).length + 1);
      return {
        ...prev,
        tokens: [...prev.tokens, { id: uid(), type: 'player', team, label: autoLabel, playerId, playerName, color, position: slot }]
      };
    });
  }, [isF7]);

  const updateToken = useCallback((id: string, updates: Partial<BoardToken>) => {
    setBoardState(prev => ({ ...prev, tokens: prev.tokens.map(t => t.id === id ? { ...t, ...updates } : t) }));
  }, []);

  const updateTeamColor = useCallback((team: 'home' | 'away', color: string) => {
    setBoardState(prev => ({ ...prev, tokens: prev.tokens.map(t => t.team === team ? { ...t, color } : t) }));
  }, []);

  const clearBoard = useCallback(() => {
    setBoardState(prev => ({ ...prev, tokens: [], paths: [], shapes: [], selectedTokenId: null, selectedShapeId: null }));
    setSavedScenes([]);
    rotatingTokenId.current = null;
    draggingTokenId.current = null;
    isDrawingRef.current = false;
    draftPointsRef.current = [];
    clearLivePath();
  }, []);

  /**
   * Places a full team in a base formation INSIDE ITS OWN HALF.
   * Generic tokens of that team from a previous formation are replaced (no stacking).
   */
  const addFormation = useCallback((team: 'home' | 'away', formationKey: string) => {
    const base = FORMATIONS[formationKey];
    if (!base) return;
    const stamp = Date.now();
    const newTokens: BoardToken[] = base.map((slot, index) => ({
      id: `${team}-${formationKey}-${stamp}-${index}`,
      type: 'player',
      team,
      label: slot.label,
      position: toOwnHalf(slot.pos, team),
      rotation: 0
    }));
    setBoardState(prev => ({
      ...prev,
      tokens: [...prev.tokens.filter(t => !(t.type === 'player' && t.team === team && !t.playerId)), ...newTokens],
      selectedTokenId: null
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

  const deleteSelectedShape = useCallback(() => {
    setBoardState(prev => {
      if (!prev.selectedShapeId) return prev;
      return { ...prev, shapes: prev.shapes.filter(s => s.id !== prev.selectedShapeId), selectedShapeId: null };
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (boardState.selectedTokenId) deleteSelectedToken();
      else if (boardState.selectedShapeId) deleteSelectedShape();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [boardState.selectedTokenId, boardState.selectedShapeId, deleteSelectedToken, deleteSelectedShape]);

  const duplicateToken = useCallback(() => {
    setBoardState(prev => {
      const tokenToCopy = prev.tokens.find(t => t.id === prev.selectedTokenId);
      if (!tokenToCopy) return prev;
      const newToken: BoardToken = {
        ...tokenToCopy,
        id: uid(),
        position: { x: Math.min(tokenToCopy.position.x + 4, 96), y: Math.min(tokenToCopy.position.y + 4, 96) }
      };
      return { ...prev, tokens: [...prev.tokens, newToken], selectedTokenId: newToken.id };
    });
  }, []);

  const rotateSelectedToken = useCallback((delta: number) => {
    setBoardState(prev => ({
      ...prev,
      tokens: prev.tokens.map(t => t.id === prev.selectedTokenId ? { ...t, rotation: ((t.rotation || 0) + delta) % 360 } : t)
    }));
  }, []);

  const saveScene = useCallback((title: string) => {
    // Lightweight snapshot: board state is immutable (every update creates new arrays/objects),
    // so a shallow copy of the containers is enough for an independent frame.
    const snapshot: BoardState = {
      ...boardState,
      tokens: boardState.tokens.map(t => ({ ...t, position: { ...t.position } })),
      paths: [...boardState.paths],
      shapes: [...(boardState.shapes || [])],
      selectedTokenId: null,
      selectedShapeId: null
    };
    setSavedScenes(prev => [...prev, { id: uid(), title, timestamp: Date.now(), state: snapshot }]);
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
      if (frameIdx >= savedScenes.length) { setIsPlaying(false); return; }
      setBoardState(savedScenes[frameIdx].state);
      frameIdx++;
      setTimeout(playNext, 1500); // 1.5s per frame transition
    };
    playNext();
  }, [savedScenes]);

  const setLaneOverlay = useCallback((overlay: BoardState['laneOverlay']) => {
    setBoardState(prev => ({ ...prev, laneOverlay: overlay }));
  }, []);

  return {
    boardRef,
    boardState,
    setBoardState, // Exposing this helps the Canvas directly manipulate shapes
    isPlaying,
    livePathRef,
    liveHeadRef,
    captureBoardRect,
    getRelativePosition,
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
    updateToken,
    updateTeamColor,
    deleteSelectedToken,
    duplicateToken,
    deleteSelectedShape,
    setLaneOverlay,
    handleRotateStart,
    handleScaleStart,
    rotateSelectedToken,
    savedScenes,
    saveScene,
    loadScene,
    deleteScene,
    playAnimation
  };
}
