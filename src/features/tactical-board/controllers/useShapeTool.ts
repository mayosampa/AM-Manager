import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BoardState, GeometricShape, Point } from '../../../types';

type ShapeTool = 'rectangle' | 'circle' | 'polygon' | 'line';
const SHAPE_TOOLS: string[] = ['rectangle', 'circle', 'polygon', 'line'];

/** Below this drag distance (in %) a click inserts a default-sized shape at the pitch centre. */
const CLICK_THRESHOLD_PCT = 1.5;

export interface ShapePreview {
  shape: GeometricShape;
  mode: 'draft' | 'resize' | 'move';
}

interface Deps {
  boardState: BoardState;
  setBoardState: React.Dispatch<React.SetStateAction<BoardState>>;
  getRelativePosition: (x: number, y: number) => Point;
  captureBoardRect: () => DOMRect | null;
  onBeforeMutate?: () => void;
}

const centeredDefault = (type: 'rectangle' | 'circle' | 'line', color: string): GeometricShape => ({
  id: crypto.randomUUID(),
  type,
  color,
  points: type === 'rectangle'
    ? [{ x: 40, y: 35 }, { x: 60, y: 65 }]
    : type === 'line'
    ? [{ x: 20, y: 50 }, { x: 80, y: 50 }]
    : [{ x: 50, y: 50 }, { x: 58, y: 50 }]
});

/**
 * Shape drawing, moving, and resizing controller.
 * The working shape lives in a ref; React receives at most ONE update per animation frame,
 * and global board state is committed on pointerup.
 */
export function useShapeTool({ boardState, setBoardState, getRelativePosition, captureBoardRect, onBeforeMutate }: Deps) {
  const [preview, setPreview] = useState<ShapePreview | null>(null);
  const workRef = useRef<ShapePreview | null>(null);
  const resizeIdxRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const flush = useCallback(() => {
    rafRef.current = null;
    setPreview(workRef.current ? { ...workRef.current } : null);
  }, []);

  const schedule = useCallback(() => {
    if (rafRef.current === null) rafRef.current = requestAnimationFrame(flush);
  }, [flush]);

  const reset = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    workRef.current = null;
    resizeIdxRef.current = null;
    setPreview(null);
  }, []);

  // Abandon an unfinished polygon when the user switches tool
  useEffect(() => {
    if (boardState.currentTool !== 'polygon' && workRef.current?.mode === 'draft') reset();
  }, [boardState.currentTool, reset]);

  const isShapeTool = SHAPE_TOOLS.includes(boardState.currentTool);

  /** Returns true if the event was consumed by the shape tool. */
  const onPointerDown = useCallback((e: React.PointerEvent): boolean => {
    if (!isShapeTool) return false;
    captureBoardRect();
    const pos = getRelativePosition(e.clientX, e.clientY);
    const tool = boardState.currentTool as ShapeTool;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (tool === 'polygon') {
      const current = workRef.current;
      if (current && current.shape.type === 'polygon') {
        const pts = current.shape.points.slice(0, -1);
        current.shape = { ...current.shape, points: [...pts, pos, pos] };
      } else {
        workRef.current = { mode: 'draft', shape: { id: crypto.randomUUID(), type: 'polygon', color: boardState.drawingColor, points: [pos, pos] } };
      }
    } else {
      workRef.current = { mode: 'draft', shape: { id: crypto.randomUUID(), type: tool, color: boardState.drawingColor, points: [pos, pos] } };
    }
    schedule();
    return true;
  }, [isShapeTool, boardState.currentTool, boardState.drawingColor, captureBoardRect, getRelativePosition, schedule]);

  const onPointerMove = useCallback((e: React.PointerEvent): boolean => {
    const work = workRef.current;
    if (!work || work.mode !== 'draft') return false;
    const pos = getRelativePosition(e.clientX, e.clientY);
    const pts = [...work.shape.points];
    pts[pts.length - 1] = pos;
    work.shape = { ...work.shape, points: pts };
    schedule();
    return true;
  }, [getRelativePosition, schedule]);

  const onPointerUp = useCallback(() => {
    const work = workRef.current;
    if (!work || work.mode !== 'draft') return;
    if (work.shape.type === 'polygon') return; // polygons are committed on double click

    const [a, b] = work.shape.points;
    const isClick = Math.hypot(b.x - a.x, b.y - a.y) < CLICK_THRESHOLD_PCT;
    const shape = isClick ? centeredDefault(work.shape.type as 'rectangle' | 'circle' | 'line', work.shape.color) : work.shape;
    onBeforeMutate?.();
    setBoardState(prev => ({
      ...prev,
      shapes: [...prev.shapes, shape],
      selectedShapeId: shape.id,
      selectedTokenId: null,
      selectedPathId: null,
      currentTool: 'pointer',
    }));
    reset();
  }, [setBoardState, reset, onBeforeMutate]);

  const onDoubleClick = useCallback(() => {
    const work = workRef.current;
    if (!work || work.shape.type !== 'polygon') return;
    const pts: Point[] = [];
    work.shape.points.forEach(p => {
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 0.5) pts.push(p);
    });
    if (pts.length >= 3) {
      const shape = { ...work.shape, points: pts };
      onBeforeMutate?.();
      setBoardState(prev => ({
        ...prev,
        shapes: [...prev.shapes, shape],
        selectedShapeId: shape.id,
        selectedTokenId: null,
        selectedPathId: null,
        currentTool: 'pointer',
      }));
    }
    reset();
  }, [setBoardState, reset, onBeforeMutate]);

  /** Start moving (translating) an existing shape via global window listeners */
  const startMove = useCallback((e: React.PointerEvent, shape: GeometricShape) => {
    e.stopPropagation();
    e.preventDefault();
    captureBoardRect();

    setBoardState(prev => ({
      ...prev,
      selectedShapeId: shape.id,
      selectedTokenId: null,
      selectedPathId: null,
      currentTool: prev.currentTool === 'eraser' ? 'eraser' : 'pointer',
    }));

    const startPointer = getRelativePosition(e.clientX, e.clientY);
    const initialPoints = shape.points.map(p => ({ ...p }));
    const minX = Math.min(...initialPoints.map(p => p.x));
    const maxX = Math.max(...initialPoints.map(p => p.x));
    const minY = Math.min(...initialPoints.map(p => p.y));
    const maxY = Math.max(...initialPoints.map(p => p.y));

    let hasMoved = false;
    workRef.current = { mode: 'move', shape: { ...shape, points: initialPoints } };

    const onWindowMove = (ev: PointerEvent) => {
      if (!workRef.current) return;
      const pos = getRelativePosition(ev.clientX, ev.clientY);
      const rawDx = pos.x - startPointer.x;
      const rawDy = pos.y - startPointer.y;
      if (!hasMoved && Math.hypot(rawDx, rawDy) < 0.25) return;
      hasMoved = true;

      const dx = Math.max(-minX, Math.min(100 - maxX, rawDx));
      const dy = Math.max(-minY, Math.min(100 - maxY, rawDy));

      workRef.current.shape = {
        ...shape,
        points: initialPoints.map(p => ({ x: p.x + dx, y: p.y + dy })),
      };
      schedule();
    };

    const onWindowUp = () => {
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', onWindowUp);
      window.removeEventListener('pointercancel', onWindowUp);
      if (hasMoved && workRef.current) {
        const committed = workRef.current.shape;
        onBeforeMutate?.();
        setBoardState(prev => ({
          ...prev,
          shapes: prev.shapes.map(s => (s.id === committed.id ? committed : s)),
        }));
      }
      reset();
    };

    window.addEventListener('pointermove', onWindowMove);
    window.addEventListener('pointerup', onWindowUp);
    window.addEventListener('pointercancel', onWindowUp);
  }, [captureBoardRect, getRelativePosition, setBoardState, schedule, reset, onBeforeMutate]);

  /** Start resizing a vertex/handle of a shape via global window listeners */
  const startResize = useCallback((e: React.PointerEvent, shape: GeometricShape, handleIdx: number) => {
    e.stopPropagation();
    e.preventDefault();
    captureBoardRect();
    resizeIdxRef.current = handleIdx;
    workRef.current = { mode: 'resize', shape: { ...shape, points: shape.points.map(p => ({ ...p })) } };
    schedule();

    let hasResized = false;

    const onWindowMove = (ev: PointerEvent) => {
      if (!workRef.current || resizeIdxRef.current === null) return;
      hasResized = true;
      const pos = getRelativePosition(ev.clientX, ev.clientY);
      const pts = [...workRef.current.shape.points];
      pts[resizeIdxRef.current] = pos;
      workRef.current.shape = { ...workRef.current.shape, points: pts };
      schedule();
    };

    const onWindowUp = () => {
      window.removeEventListener('pointermove', onWindowMove);
      window.removeEventListener('pointerup', onWindowUp);
      window.removeEventListener('pointercancel', onWindowUp);
      if (hasResized && workRef.current) {
        const committed = workRef.current.shape;
        onBeforeMutate?.();
        setBoardState(prev => ({
          ...prev,
          shapes: prev.shapes.map(s => (s.id === committed.id ? committed : s)),
        }));
      }
      reset();
    };

    window.addEventListener('pointermove', onWindowMove);
    window.addEventListener('pointerup', onWindowUp);
    window.addEventListener('pointercancel', onWindowUp);
  }, [captureBoardRect, getRelativePosition, setBoardState, schedule, reset, onBeforeMutate]);

  return { preview, onPointerDown, onPointerMove, onPointerUp, onDoubleClick, startMove, startResize };
}
