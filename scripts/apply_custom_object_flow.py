from pathlib import Path

planner_path = Path('src/PersistentPlanner.tsx')
planner = planner_path.read_text()

old = """      xMm: snap(roomBounds.minX + roomWidth / 2 - widthMm / 2),
      yMm: snap(roomBounds.minY + roomDepth / 2 - depthMm / 2),"""
new = """      xMm: Math.round(roomBounds.minX + roomWidth / 2 - widthMm / 2),
      yMm: Math.round(roomBounds.minY + roomDepth / 2 - depthMm / 2),"""

if old not in planner:
    raise SystemExit('custom object center placement anchor not found')

planner_path.write_text(planner.replace(old, new, 1))
