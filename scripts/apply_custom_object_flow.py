from pathlib import Path

planner_path = Path('src/PersistentPlanner.tsx')
planner = planner_path.read_text()

planner = planner.replace("  { name: 'Custom', category: 'Custom', widthIn: 24, depthIn: 24 },\n", "", 1)

state_anchor = """  const [widthInput, setWidthInput] = useState(valueForInput(INITIAL_WIDTH, 'ft-in'));
  const [depthInput, setDepthInput] = useState(valueForInput(INITIAL_DEPTH, 'ft-in'));
  const svgRef"""
state_replacement = """  const [widthInput, setWidthInput] = useState(valueForInput(INITIAL_WIDTH, 'ft-in'));
  const [depthInput, setDepthInput] = useState(valueForInput(INITIAL_DEPTH, 'ft-in'));
  const [customObjectOpen, setCustomObjectOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customWidthInput, setCustomWidthInput] = useState('');
  const [customDepthInput, setCustomDepthInput] = useState('');
  const [customObjectError, setCustomObjectError] = useState('');
  const svgRef"""
if state_anchor not in planner:
    raise SystemExit('state anchor not found')
planner = planner.replace(state_anchor, state_replacement, 1)

function_anchor = """  function addPreset(name: string, category: string, widthIn: number, depthIn: number) {
    const id = createId('fixture');
    const fixture: FixtureInstance = {
      id,
      lineageId: id,
      name,
      category,
      widthMm: inchesToMm(widthIn),
      depthMm: inchesToMm(depthIn),
      xMm: roomBounds.minX + roomWidth / 2 - inchesToMm(widthIn) / 2,
      yMm: roomBounds.minY + roomDepth / 2 - inchesToMm(depthIn) / 2,
      rotationDeg: 0,
    };
    setFixtures((items) => [...items, fixture]);
    setSelectedFixtureId(id);
    setSelectedWall(null);
    setMode('select');
  }

  function addSavedObject"""
function_replacement = """  function addPreset(name: string, category: string, widthIn: number, depthIn: number) {
    const id = createId('fixture');
    const fixture: FixtureInstance = {
      id,
      lineageId: id,
      name,
      category,
      widthMm: inchesToMm(widthIn),
      depthMm: inchesToMm(depthIn),
      xMm: roomBounds.minX + roomWidth / 2 - inchesToMm(widthIn) / 2,
      yMm: roomBounds.minY + roomDepth / 2 - inchesToMm(depthIn) / 2,
      rotationDeg: 0,
    };
    setFixtures((items) => [...items, fixture]);
    setSelectedFixtureId(id);
    setSelectedWall(null);
    setMode('select');
  }

  function openCustomObjectCreator() {
    setCustomName('');
    setCustomWidthInput(valueForInput(inchesToMm(24), unit));
    setCustomDepthInput(valueForInput(inchesToMm(24), unit));
    setCustomObjectError('');
    setCustomObjectOpen(true);
  }

  function createCustomObject() {
    const name = customName.trim();
    const widthMm = parseMeasurement(customWidthInput, unit);
    const depthMm = parseMeasurement(customDepthInput, unit);
    if (!name) {
      setCustomObjectError('Give the object a name.');
      return;
    }
    if (!widthMm || !depthMm || widthMm < 25 || depthMm < 25) {
      setCustomObjectError('Enter valid width and depth values.');
      return;
    }

    const id = createId('fixture');
    const fixture: FixtureInstance = {
      id,
      lineageId: id,
      name,
      category: 'Custom',
      widthMm,
      depthMm,
      xMm: snap(roomBounds.minX + roomWidth / 2 - widthMm / 2),
      yMm: snap(roomBounds.minY + roomDepth / 2 - depthMm / 2),
      rotationDeg: 0,
    };
    setFixtures((items) => [...items, fixture]);
    setSelectedFixtureId(id);
    setSelectedWall(null);
    setMode('select');
    setCustomObjectOpen(false);
    setCustomObjectError('');
  }

  function addSavedObject"""
if function_anchor not in planner:
    raise SystemExit('addPreset anchor not found')
planner = planner.replace(function_anchor, function_replacement, 1)

desktop_anchor = """          <div className=\"object-buttons\">
            {presets.map((preset) => <button key={preset.name} onClick={() => addPreset(preset.name, preset.category, preset.widthIn, preset.depthIn)}>+ {preset.name}</button>)}
          </div>"""
desktop_replacement = """          <div className=\"object-buttons\">
            {presets.map((preset) => <button key={preset.name} onClick={() => addPreset(preset.name, preset.category, preset.widthIn, preset.depthIn)}>+ {preset.name}</button>)}
            <button type=\"button\" onClick={openCustomObjectCreator}>+ Custom object</button>
          </div>"""
if desktop_anchor not in planner:
    raise SystemExit('desktop object buttons anchor not found')
planner = planner.replace(desktop_anchor, desktop_replacement, 1)

nav_anchor = """      <nav className=\"mobile-actions\">
        <button className={mode === 'select' ? 'active' : ''} onClick={() => { setMode('select'); setDraft([]); }}>Select</button>
        <button className={mode === 'draw' ? 'active' : ''} onClick={beginDraw}>Draw</button>
        <button className={mode === 'pan' ? 'active' : ''} onClick={() => { setMode('pan'); setDraft([]); }}>Pan</button>
        <button onClick={() => addPreset('Custom', 'Custom', 24, 24)}>+ Object</button>
      </nav>"""
nav_replacement = """      {customObjectOpen && <div className=\"custom-object-backdrop\" onPointerDown={() => setCustomObjectOpen(false)}>
        <section className=\"custom-object-sheet\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"custom-object-title\" onPointerDown={(event) => event.stopPropagation()}>
          <div className=\"custom-object-heading\">
            <div><p className=\"eyebrow\">New object</p><h2 id=\"custom-object-title\">Create custom object</h2></div>
            <button type=\"button\" className=\"icon-button\" aria-label=\"Close custom object\" onClick={() => setCustomObjectOpen(false)}>×</button>
          </div>
          <p className=\"helper\">Name it and set its size. It will appear centered in the room, ready to drag into place.</p>
          <label className=\"custom-object-field\"><span>Name</span><input autoFocus aria-label=\"Custom object name\" value={customName} onChange={(event) => { setCustomName(event.target.value); setCustomObjectError(''); }} placeholder=\"e.g. Linen cabinet\" /></label>
          <div className=\"custom-object-dimensions\">
            <label className=\"custom-object-field\"><span>Width</span><input aria-label=\"Custom object width\" value={customWidthInput} onChange={(event) => { setCustomWidthInput(event.target.value); setCustomObjectError(''); }} /></label>
            <label className=\"custom-object-field\"><span>Depth</span><input aria-label=\"Custom object depth\" value={customDepthInput} onChange={(event) => { setCustomDepthInput(event.target.value); setCustomObjectError(''); }} /></label>
          </div>
          {customObjectError && <p className=\"custom-object-error\" role=\"alert\">{customObjectError}</p>}
          <div className=\"custom-object-actions\">
            <button type=\"button\" className=\"secondary-button\" onClick={() => setCustomObjectOpen(false)}>Cancel</button>
            <button type=\"button\" className=\"primary-action\" onClick={createCustomObject}>Create object</button>
          </div>
        </section>
      </div>}

      <nav className=\"mobile-actions\">
        <button className={mode === 'select' ? 'active' : ''} onClick={() => { setMode('select'); setDraft([]); }}>Select</button>
        <button className={mode === 'draw' ? 'active' : ''} onClick={beginDraw}>Draw</button>
        <button className={mode === 'pan' ? 'active' : ''} onClick={() => { setMode('pan'); setDraft([]); }}>Pan</button>
        <button type=\"button\" onClick={openCustomObjectCreator}>+ Object</button>
      </nav>"""
if nav_anchor not in planner:
    raise SystemExit('mobile nav anchor not found')
planner = planner.replace(nav_anchor, nav_replacement, 1)
planner_path.write_text(planner)

css_path = Path('src/workspace.css')
css = css_path.read_text()
css += """

.custom-object-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(11, 31, 58, .46);
}

.custom-object-sheet {
  width: min(460px, 100%);
  border: 1px solid #d8e0ea;
  border-radius: 16px;
  background: #fff;
  padding: 18px;
  box-shadow: 0 24px 70px rgba(11, 31, 58, .28);
}

.custom-object-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.custom-object-heading h2 { margin: 2px 0 0; font-size: 1.15rem; color: #0b1f3a; }
.custom-object-sheet > .helper { margin: 10px 0 14px; }
.custom-object-field { display: grid; gap: 5px; color: #607086; font-size: .76rem; font-weight: 650; }
.custom-object-field input { width: 100%; min-height: 44px; border: 1px solid #cbd5e1; border-radius: 9px; padding: 8px 10px; background: #fff; color: #0b1f3a; font: inherit; font-size: .92rem; }
.custom-object-field input:focus { outline: 2px solid #0f9d8a; outline-offset: 1px; border-color: #0f9d8a; }
.custom-object-dimensions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.custom-object-error { margin: 10px 0 0; color: #b42318; font-size: .78rem; }
.custom-object-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.custom-object-actions .primary-action { width: auto; margin: 0; }

@media (max-width: 640px) {
  .custom-object-backdrop { place-items: end center; padding: 0; }
  .custom-object-sheet { width: 100%; border-radius: 18px 18px 0 0; padding: 18px 16px calc(20px + env(safe-area-inset-bottom)); }
  .custom-object-actions { display: grid; grid-template-columns: 1fr 1fr; }
  .custom-object-actions button { min-height: 46px; }
}
"""
css_path.write_text(css)

test_path = Path('e2e/custom-object.e2e.ts')
test_path.write_text("""import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByLabel('Current renovation project')).toBeVisible();
});

test('creates a named custom object centered in the room without asking for placement coordinates', async ({ page, isMobile }) => {
  await page.getByLabel('Units').selectOption('in');
  await page.getByRole('button', { name: isMobile ? '+ Object' : '+ Custom object', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Create custom object' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('X position')).toHaveCount(0);
  await expect(dialog.getByLabel('Y position')).toHaveCount(0);

  await dialog.getByLabel('Custom object name').fill('Linen cabinet');
  await dialog.getByLabel('Custom object width').fill('30');
  await dialog.getByLabel('Custom object depth').fill('18');
  await dialog.getByRole('button', { name: 'Create object' }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Linen cabinet' })).toBeVisible();
  await expect(page.locator('.fixture.selected text').first()).toHaveText('Linen cabinet');
  await expect(page.getByLabel('Width')).toHaveValue('30');
  await expect(page.getByLabel('Depth')).toHaveValue('18');
  await expect(page.getByLabel('X position')).toHaveValue('71');
  await expect(page.getByLabel('Y position')).toHaveValue('37');
});

test('requires a custom object name before creation', async ({ page, isMobile }) => {
  await page.getByRole('button', { name: isMobile ? '+ Object' : '+ Custom object', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create custom object' });
  await dialog.getByRole('button', { name: 'Create object' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Give the object a name.');
  await expect(dialog).toBeVisible();
});
""")
