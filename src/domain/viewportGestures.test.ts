import { describe, expect, it } from 'vitest';
import { panViewport, pinchViewport } from './viewportGestures';

const view = { x: 0, y: 0, width: 1000, height: 500 };
const canvas = { width: 1000, height: 500 };

describe('viewport gestures', () => {
  it('pans in viewBox coordinates', () => {
    expect(panViewport(view, { x: 100, y: 50 }, canvas)).toEqual({ x: -100, y: -50, width: 1000, height: 500 });
  });

  it('pinch-out zooms in while preserving the midpoint anchor', () => {
    const next = pinchViewport(
      view,
      { x: 400, y: 250 },
      { x: 600, y: 250 },
      { x: 300, y: 250 },
      { x: 700, y: 250 },
      canvas,
    );
    expect(next.width).toBe(500);
    expect(next.height).toBe(250);
    expect(next.x).toBe(250);
    expect(next.y).toBe(125);
  });

  it('pinch midpoint movement pans while zooming', () => {
    const next = pinchViewport(
      view,
      { x: 400, y: 250 },
      { x: 600, y: 250 },
      { x: 350, y: 300 },
      { x: 750, y: 300 },
      canvas,
    );
    expect(next.width).toBe(500);
    expect(next.x).toBe(225);
    expect(next.y).toBe(100);
  });
});
