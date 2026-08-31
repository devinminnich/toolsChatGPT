from pathlib import Path

path = Path('src/styles.css')
text = path.read_text()
marker = """.draw-status strong { color: var(--navy); }\n"""
css = """

.object-library-groups, .object-library-dialog-groups { display: grid; gap: 8px; }
.object-group { border: 1px solid var(--line); border-radius: 9px; background: white; overflow: hidden; }
.object-group summary { min-height: 42px; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; color: var(--navy); font-size: .78rem; font-weight: 700; cursor: pointer; list-style: none; }
.object-group summary::-webkit-details-marker { display: none; }
.object-group summary::before { content: '›'; font-size: 1rem; transition: transform .15s ease; }
.object-group[open] summary::before { transform: rotate(90deg); }
.object-group summary span { margin-left: auto; min-width: 24px; padding: 2px 6px; border-radius: 999px; background: var(--surface); color: var(--muted); text-align: center; font-size: .68rem; }
.object-group .object-buttons { padding: 0 8px 8px; border-top: 1px solid var(--line); }
.object-group .object-buttons button { text-align: left; font-size: .76rem; }
.object-library-sheet { width: min(560px, calc(100vw - 24px)); max-height: min(82vh, 760px); overflow: auto; }
.object-library-dialog-groups { margin-top: 12px; }
"""
if css.strip() in text:
    raise SystemExit(0)
if marker not in text:
    raise SystemExit('style marker not found')
path.write_text(text.replace(marker, marker + css, 1))
