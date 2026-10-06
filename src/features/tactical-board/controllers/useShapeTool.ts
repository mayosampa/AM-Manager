import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BoardState, GeometricShape, Point } from '../../../types';

type ShapeTool = 'rectangle' | 'circle' | 'polygon' | 'line';
const SHAPE_TOOLS: string[] = ['rectangle', 'circle', 'polygon', 'line'];

/** Below this drag distance (in %) a click inserts a default-sized shape at the pitch centre. */
const CLICK_THRESHOLD_PCT = 1.5;

interface Preview { shape: GeometricShape; mode: 'draft' | 'resize' }

interface Deps {
  boardState: BoardState;
  setBoardState: React.Dispatch<React.SetStateAction<BoardState>>;
  getRelativePosition: (x: number, y: number) => Point;
  captureBoardRect: () => DOMRect | null;
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
 * Shape drawing / resizing controller.
 * The working shape lives in a ref; React only receives ONE update per animation frame,
 * and only the local preview re-renders (the global board state is committed on pointerup).
 */
export function useShapeTool({ boardState, setBoardState, getRelativePosition, captureBoardRect }: Deps) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const workRef = useRef<Preview | null>(null);
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
    if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
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
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    if (tool === 'polygon') {
      const current = workRef.current;
      if (current && current.shape.type === 'polygon') {
        // Fix the floating vertex where the user clicked and spawn a new floating one
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
    if (!work) return false;
    const pos = getRelativePosition(e.clientX, e.clientY);
    const pts = [...work.shape.points];
    if (work.mode === 'resize' && resizeIdxRef.current !== null) pts[resizeIdxRef.current] = pos;
    else pts[pts.length - 1] = pos;
    work.shape = { ...work.shape, points: pts };
    schedule();
    return true;
  }, [getRelativePosition, schedule]);

  const onPointerUp = useCallback(() => {
    const work = workRef.current;
    if (!work) return;

    if (work.mode === 'resize') {
      const committed = work.shape;
      setBoardState(prev => ({ ...prev, shapes: prev.shapes.map(s => s.id === committed.id ? committed : s) }));
      reset();
      return;
    }
    if (work.shape.type === 'polygon') return; // polygons are committed on double click

    const [a, b] = work.shape.points;
    const isClick = Math.hypot(b.x - a.x, b.y - a.y) < CLICK_THRESHOLD_PCT;
    const shape = isClick ? centeredDefault(work.shape.type as 'rectangle' | 'circle' | 'line', work.shape.color) : work.shape;
    setBoardState(prev => ({ ...prev, shapes: [...prev.shapes, shape], selectedShapeId: shape.id, selectedTokenId: null, currentTool: 'pointer' }));
    reset();
  }, [setBoardState, reset]);

  const onDoubleClick = useCallback(() => {
    const work = workRef.current;
    if (!work || work.shape.type !== 'polygon') return;
    // Drop the floating vertex + duplicates generated by the two clicks of the dblclick
    const pts: Point[] = [];
    work.shape.points.forEach(p => {
      const last = pts[pts.length - 1];
      if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 0.5) pts.push(p);
    });
    if (pts.length >= 3) {
      const shape = { ...work.shape, points: pts };
      setBoardState(prev => ({ ...prev, shapes: [...prev.shapes, shape], selectedShapeId: shape.id, currentTool: 'pointer' }));
    }
    reset();
  }, [setBoardState, reset]);

  const startResize = useCallback((e: React.PointerEvent, shape: GeometricShape, handleIdx: number) => {
    e.stopPropagation();
    captureBoardRect();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    resizeIdxRef.current = handleIdx;
    workRef.current = { mode: 'resize', shape: { ...shape, points: [...shape.points] } };
    schedule();
  }, [captureBoardRect, schedule]);

  return { preview, onPointerDown, onPointerMove, onPointerUp, onDoubleClick, startResize };
}
