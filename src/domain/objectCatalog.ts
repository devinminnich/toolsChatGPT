export const OBJECT_CATEGORIES = [
  'Door',
  'Window',
  'Toilet',
  'Sink',
  'Vanity',
  'Shower',
  'Tub',
  'Cabinet',
  'Counter',
  'Appliance',
  'Closet / built-in',
  'Stair',
  'Column / post',
  'HVAC',
  'Electrical fixture / obstruction',
  'Plumbing fixture',
  'Generic / custom',
] as const;

export type ObjectCategory = typeof OBJECT_CATEGORIES[number];

export type ObjectPreset = {
  name: string;
  category: ObjectCategory;
  widthIn: number;
  depthIn: number;
};

export const OBJECT_PRESETS: ObjectPreset[] = [
  { name: 'Door', category: 'Door', widthIn: 36, depthIn: 4 },
  { name: 'Window', category: 'Window', widthIn: 36, depthIn: 4 },
  { name: 'Toilet', category: 'Toilet', widthIn: 18, depthIn: 30 },
  { name: 'Sink', category: 'Sink', widthIn: 24, depthIn: 20 },
  { name: 'Vanity', category: 'Vanity', widthIn: 48, depthIn: 22 },
  { name: 'Shower', category: 'Shower', widthIn: 60, depthIn: 36 },
  { name: 'Tub', category: 'Tub', widthIn: 60, depthIn: 30 },
  { name: 'Cabinet', category: 'Cabinet', widthIn: 30, depthIn: 24 },
  { name: 'Counter', category: 'Counter', widthIn: 48, depthIn: 25 },
  { name: 'Appliance', category: 'Appliance', widthIn: 30, depthIn: 30 },
  { name: 'Closet', category: 'Closet / built-in', widthIn: 60, depthIn: 24 },
  { name: 'Stair', category: 'Stair', widthIn: 36, depthIn: 120 },
  { name: 'Column', category: 'Column / post', widthIn: 12, depthIn: 12 },
  { name: 'HVAC', category: 'HVAC', widthIn: 24, depthIn: 12 },
  { name: 'Electrical', category: 'Electrical fixture / obstruction', widthIn: 6, depthIn: 6 },
  { name: 'Plumbing', category: 'Plumbing fixture', widthIn: 12, depthIn: 12 },
  { name: 'Custom', category: 'Generic / custom', widthIn: 24, depthIn: 24 },
];
