from pathlib import Path

path = Path('src/PersistentPlanner.tsx')
text = path.read_text()

text = text.replace(
    "import { createId, type FixtureInstance, type Point } from './domain/project';\n",
    "import { createId, type FixtureInstance, type Point } from './domain/project';\nimport { OBJECT_GROUPS, OBJECT_PRESETS } from './domain/objectCatalog';\n",
    1,
)

old_presets = """const presets = [
  { name: 'Toilet', category: 'Toilet', widthIn: 18, depthIn: 30 },
  { name: 'Shower', category: 'Shower', widthIn: 60, depthIn: 36 },
  { name: 'Vanity', category: 'Vanity', widthIn: 48, depthIn: 22 },
];

"""
if old_presets not in text:
    raise SystemExit('local preset block not found')
text = text.replace(old_presets, """const presetGroups = OBJECT_GROUPS.map((group) => ({
  group,
  presets: OBJECT_PRESETS.filter((preset) => preset.group === group),
}));

""", 1)

old_state = """  const [customObjectOpen, setCustomObjectOpen] = useState(false);
  const [customName, setCustomName] = useState('');
"""
if old_state not in text:
    raise SystemExit('custom object state anchor not found')
text = text.replace(old_state, """  const [objectLibraryOpen, setObjectLibraryOpen] = useState(false);
  const [customObjectOpen, setCustomObjectOpen] = useState(false);
  const [customName, setCustomName] = useState('');
""", 1)

old_add = """    setSelectedFixtureId(id);
    setSelectedWall(null);
    setMode('select');
  }

  function openCustomObjectCreator() {
"""
if old_add not in text:
    raise SystemExit('addPreset tail not found')
text = text.replace(old_add, """    setSelectedFixtureId(id);
    setSelectedWall(null);
    setMode('select');
    setObjectLibraryOpen(false);
  }

  function openCustomObjectCreator() {
""", 1)

old_buttons = """          <h2>Fixed objects</h2>
          <div className=\"object-buttons\">
            {presets.map((preset) => <button key={preset.name} onClick={() => addPreset(preset.name, preset.category, preset.widthIn, preset.depthIn)}>+ {preset.name}</button>)}
            <button type=\"button\" onClick={openCustomObjectCreator}>+ Custom object</button>
          </div>
"""
if old_buttons not in text:
    raise SystemExit('fixed object buttons block not found')
text = text.replace(old_buttons, """          <h2>Object library</h2>
          <div className=\"object-library-groups\">
            {presetGroups.map(({ group, presets }) => <details className=\"object-group\" key={group} open={group === 'Doors & windows'}>
              <summary>{group}<span>{presets.length}</span></summary>
              <div className=\"object-buttons\">
                {presets.map((preset) => <button key={preset.name} onClick={() => addPreset(preset.name, preset.category, preset.widthIn, preset.depthIn)}>+ {preset.name}</button>)}
              </div>
            </details>)}
            <button type=\"button\" className=\"primary-action\" onClick={openCustomObjectCreator}>+ Custom object</button>
          </div>
""", 1)

modal_anchor = """      {customObjectOpen && <div className=\"custom-object-backdrop\" onPointerDown={() => setCustomObjectOpen(false)}>
"""
if modal_anchor not in text:
    raise SystemExit('custom modal anchor not found')
object_modal = """      {objectLibraryOpen && <div className=\"custom-object-backdrop\" onPointerDown={() => setObjectLibraryOpen(false)}>
        <section className=\"custom-object-sheet object-library-sheet\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"object-library-title\" onPointerDown={(event) => event.stopPropagation()}>
          <div className=\"custom-object-heading\">
            <div><p className=\"eyebrow\">Add to design</p><h2 id=\"object-library-title\">Object library</h2></div>
            <button type=\"button\" className=\"icon-button\" aria-label=\"Close object library\" onClick={() => setObjectLibraryOpen(false)}>×</button>
          </div>
          <p className=\"helper\">Choose a common household object. Starter dimensions can be changed after placement.</p>
          <div className=\"object-library-dialog-groups\">
            {presetGroups.map(({ group, presets }) => <details className=\"object-group\" key={group} open={group === 'Doors & windows'}>
              <summary>{group}<span>{presets.length}</span></summary>
              <div className=\"object-buttons\">
                {presets.map((preset) => <button key={preset.name} onClick={() => addPreset(preset.name, preset.category, preset.widthIn, preset.depthIn)}>+ {preset.name}</button>)}
              </div>
            </details>)}
          </div>
          <button type=\"button\" className=\"primary-action\" onClick={() => { setObjectLibraryOpen(false); openCustomObjectCreator(); }}>+ Custom object</button>
        </section>
      </div>}

"""
text = text.replace(modal_anchor, object_modal + modal_anchor, 1)

old_mobile = """          <button type=\"button\" onClick={openCustomObjectCreator}>+ Object</button>
"""
if old_mobile not in text:
    raise SystemExit('mobile object button not found')
text = text.replace(old_mobile, """          <button type=\"button\" onClick={() => setObjectLibraryOpen(true)}>+ Object</button>
""", 1)

path.write_text(text)
