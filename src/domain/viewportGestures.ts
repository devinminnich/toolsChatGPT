export type Viewport = { x: number; y: number; width: number; height: number };
export type ScreenPoint = { x: number; y: number };

export function midpoint(a: ScreenPoint, b: ScreenPoint): ScreenPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function pointDistance(a: ScreenPoint, b: ScreenPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function panViewport(view: Viewport, deltaPx: ScreenPoint, canvasPx: { width: number; height: number }): Viewport {
  if (!canvasPx.width || !canvasPx.height) return view;
  return {
    ...view,
    x: view.x - (deltaPx.x / canvasPx.width) * view.width,
    y: view.y - (deltaPx.y / canvasPx.height) * view.height,
  };
}

export function pinchViewport(
  startView: Viewport,
  startA: ScreenPoint,
  startB: ScreenPoint,
  currentA: ScreenPoint,
  currentB: ScreenPoint,
  canvasPx: { width: number; height: number },
  minWidth = 500,
  maxWidth = 200000,
): Viewport {
  const startDistance = pointDistance(startA, startB);
  const currentDistance = pointDistance(currentA, currentB);
  if (!startDistance || !currentDistance || !canvasPx.width || !canvasPx.height) return startView;

  const startMid = midpoint(startA, startB);
  const currentMid = midpoint(currentA, currentB);
  const rawWidth = startView.width * (startDistance / currentDistance);
  const width = Math.min(maxWidth, Math.max(minWidth, rawWidth));
  const height = startView.height * (width / startView.width);

  const anchorX = startView.x + (startMid.x / canvasPx.width) * startView.width;
  const anchorY = startView.y + (startMid.y / canvasPx.height) * startView.height;

  return {
    x: anchorX - (currentMid.x / canvasPx.width) * width,
    y: anchorY - (currentMid.y / canvasPx.height) * height,
    width,
    height,
  };
}
