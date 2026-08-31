from pathlib import Path

path = Path('src/PersistentPlanner.tsx')
text = path.read_text()
old = """              {roomEditing && <button type=\"button\" onClick={finishRoomEdit}>Done room</button>}
              <button type=\"button\" onClick={() => fitToView()}>Fit</button>"""
new = """              {roomEditing && mode !== 'draw' && <button type=\"button\" onClick={beginDraw}>Redraw</button>}
              {roomEditing && <button type=\"button\" onClick={finishRoomEdit}>Done room</button>}
              <button type=\"button\" onClick={() => fitToView()}>Fit</button>"""
if old not in text:
    if new in text:
        raise SystemExit(0)
    raise SystemExit('toolbar marker not found')
path.write_text(text.replace(old, new, 1))
