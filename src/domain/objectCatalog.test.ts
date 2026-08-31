import { describe, expect, it } from 'vitest';
import { OBJECT_CATEGORIES, OBJECT_GROUPS, OBJECT_PRESETS } from './objectCatalog';

describe('fixed object catalog', () => {
  it('covers every V1 fixed object category', () => {
    for (const category of OBJECT_CATEGORIES) {
      expect(OBJECT_PRESETS.some((preset) => preset.category === category)).toBe(true);
    }
  });

  it('covers every default object group', () => {
    for (const group of OBJECT_GROUPS) {
      expect(OBJECT_PRESETS.some((preset) => preset.group === group)).toBe(true);
    }
  });

  it('provides a useful starter library for a whole house', () => {
    expect(OBJECT_PRESETS.length).toBeGreaterThanOrEqual(45);
    expect(OBJECT_PRESETS.map((preset) => preset.name)).toEqual(expect.arrayContaining([
      'Interior door · 30 in',
      'Window · 36 in',
      'Toilet',
      'Kitchen island',
      'Queen bed',
      'Washer',
      'Stair run',
      'Electrical panel',
      'Grill',
    ]));
  });

  it('uses positive starter dimensions that remain user-editable', () => {
    for (const preset of OBJECT_PRESETS) {
      expect(preset.widthIn).toBeGreaterThan(0);
      expect(preset.depthIn).toBeGreaterThan(0);
    }
  });
});
