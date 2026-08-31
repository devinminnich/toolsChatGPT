import { describe, expect, it } from 'vitest';
import { OBJECT_CATEGORIES, OBJECT_PRESETS } from './objectCatalog';

describe('fixed object catalog', () => {
  it('covers every V1 fixed object category', () => {
    for (const category of OBJECT_CATEGORIES) {
      expect(OBJECT_PRESETS.some((preset) => preset.category === category)).toBe(true);
    }
  });

  it('uses positive starter dimensions that remain user-editable', () => {
    for (const preset of OBJECT_PRESETS) {
      expect(preset.widthIn).toBeGreaterThan(0);
      expect(preset.depthIn).toBeGreaterThan(0);
    }
  });
});
