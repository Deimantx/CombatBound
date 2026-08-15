import {
  DEBUG_DOCK_MIN_HEIGHT,
  DEBUG_DOCK_MIN_WIDTH,
  DEBUG_DOCK_VIEWPORT_MARGIN,
} from "../devToolsTypes";

export type DockResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export interface DockRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DockViewport {
  width: number;
  height: number;
}

function includes(direction: DockResizeDirection, axis: "n" | "s" | "e" | "w") {
  return direction.includes(axis);
}

export function clampDockRect(rect: DockRect, viewport: DockViewport, margin = DEBUG_DOCK_VIEWPORT_MARGIN): DockRect {
  const maxWidth = Math.max(DEBUG_DOCK_MIN_WIDTH, viewport.width - margin * 2);
  const maxHeight = Math.max(DEBUG_DOCK_MIN_HEIGHT, viewport.height - margin * 2);
  const width = Math.max(DEBUG_DOCK_MIN_WIDTH, Math.min(maxWidth, rect.width));
  const height = Math.max(DEBUG_DOCK_MIN_HEIGHT, Math.min(maxHeight, rect.height));
  const maxX = Math.max(margin, viewport.width - width - margin);
  const maxY = Math.max(margin, viewport.height - height - margin);
  return {
    x: Math.max(margin, Math.min(maxX, rect.x)),
    y: Math.max(margin, Math.min(maxY, rect.y)),
    width,
    height,
  };
}

export function resizeDockRect(
  start: DockRect,
  direction: DockResizeDirection,
  deltaX: number,
  deltaY: number,
  viewport: DockViewport,
): DockRect {
  let width = start.width;
  let height = start.height;
  let x = start.x;
  let y = start.y;
  if (includes(direction, "e")) width = start.width + deltaX;
  if (includes(direction, "w")) width = start.width - deltaX;
  if (includes(direction, "s")) height = start.height + deltaY;
  if (includes(direction, "n")) height = start.height - deltaY;
  const clamped = clampDockRect({ x, y, width, height }, viewport);
  if (includes(direction, "w")) x = start.x + start.width - clamped.width;
  if (includes(direction, "n")) y = start.y + start.height - clamped.height;
  return clampDockRect({ x, y, width: clamped.width, height: clamped.height }, viewport);
}
