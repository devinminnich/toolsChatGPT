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

export const OBJECT_GROUPS = [
  'Doors & windows',
  'Bathroom & plumbing',
  'Kitchen',
  'Furniture & storage',
  'Laundry & appliances',
  'Structure',
  'Mechanical & electrical',
  'Outdoor',
] as const;

export type ObjectGroup = typeof OBJECT_GROUPS[number];

export type ObjectPreset = {
  name: string;
  category: ObjectCategory;
  group: ObjectGroup;
  widthIn: number;
  depthIn: number;
};

export const OBJECT_PRESETS: ObjectPreset[] = [
  // Doors & windows
  { name: 'Interior door · 30 in', category: 'Door', group: 'Doors & windows', widthIn: 30, depthIn: 4 },
  { name: 'Interior door · 36 in', category: 'Door', group: 'Doors & windows', widthIn: 36, depthIn: 4 },
  { name: 'Exterior door', category: 'Door', group: 'Doors & windows', widthIn: 36, depthIn: 6 },
  { name: 'Double door', category: 'Door', group: 'Doors & windows', widthIn: 72, depthIn: 6 },
  { name: 'Sliding patio door', category: 'Door', group: 'Doors & windows', widthIn: 72, depthIn: 6 },
  { name: 'Window · 36 in', category: 'Window', group: 'Doors & windows', widthIn: 36, depthIn: 4 },
  { name: 'Window · 60 in', category: 'Window', group: 'Doors & windows', widthIn: 60, depthIn: 4 },
  { name: 'Picture window', category: 'Window', group: 'Doors & windows', widthIn: 72, depthIn: 4 },

  // Bathroom & plumbing
  { name: 'Toilet', category: 'Toilet', group: 'Bathroom & plumbing', widthIn: 18, depthIn: 30 },
  { name: 'Pedestal sink', category: 'Sink', group: 'Bathroom & plumbing', widthIn: 22, depthIn: 20 },
  { name: 'Bathroom sink', category: 'Sink', group: 'Bathroom & plumbing', widthIn: 24, depthIn: 20 },
  { name: 'Vanity · 36 in', category: 'Vanity', group: 'Bathroom & plumbing', widthIn: 36, depthIn: 22 },
  { name: 'Vanity · 48 in', category: 'Vanity', group: 'Bathroom & plumbing', widthIn: 48, depthIn: 22 },
  { name: 'Double vanity', category: 'Vanity', group: 'Bathroom & plumbing', widthIn: 72, depthIn: 22 },
  { name: 'Shower · 36 × 36', category: 'Shower', group: 'Bathroom & plumbing', widthIn: 36, depthIn: 36 },
  { name: 'Walk-in shower', category: 'Shower', group: 'Bathroom & plumbing', widthIn: 60, depthIn: 36 },
  { name: 'Standard tub', category: 'Tub', group: 'Bathroom & plumbing', widthIn: 60, depthIn: 30 },
  { name: 'Freestanding tub', category: 'Tub', group: 'Bathroom & plumbing', widthIn: 66, depthIn: 32 },
  { name: 'Plumbing stack', category: 'Plumbing fixture', group: 'Bathroom & plumbing', widthIn: 8, depthIn: 8 },

  // Kitchen
  { name: 'Base cabinet', category: 'Cabinet', group: 'Kitchen', widthIn: 30, depthIn: 24 },
  { name: 'Wall cabinet', category: 'Cabinet', group: 'Kitchen', widthIn: 30, depthIn: 12 },
  { name: 'Tall pantry cabinet', category: 'Cabinet', group: 'Kitchen', widthIn: 24, depthIn: 24 },
  { name: 'Countertop run', category: 'Counter', group: 'Kitchen', widthIn: 48, depthIn: 25 },
  { name: 'Kitchen island', category: 'Counter', group: 'Kitchen', widthIn: 72, depthIn: 36 },
  { name: 'Kitchen sink', category: 'Sink', group: 'Kitchen', widthIn: 33, depthIn: 22 },
  { name: 'Refrigerator', category: 'Appliance', group: 'Kitchen', widthIn: 36, depthIn: 36 },
  { name: 'Range / oven', category: 'Appliance', group: 'Kitchen', widthIn: 30, depthIn: 28 },
  { name: 'Dishwasher', category: 'Appliance', group: 'Kitchen', widthIn: 24, depthIn: 24 },

  // Furniture & storage
  { name: 'Reach-in closet', category: 'Closet / built-in', group: 'Furniture & storage', widthIn: 72, depthIn: 24 },
  { name: 'Bookcase / shelving', category: 'Closet / built-in', group: 'Furniture & storage', widthIn: 36, depthIn: 12 },
  { name: 'Queen bed', category: 'Generic / custom', group: 'Furniture & storage', widthIn: 60, depthIn: 80 },
  { name: 'King bed', category: 'Generic / custom', group: 'Furniture & storage', widthIn: 76, depthIn: 80 },
  { name: 'Dresser', category: 'Generic / custom', group: 'Furniture & storage', widthIn: 60, depthIn: 20 },
  { name: 'Sofa', category: 'Generic / custom', group: 'Furniture & storage', widthIn: 84, depthIn: 36 },
  { name: 'Dining table', category: 'Generic / custom', group: 'Furniture & storage', widthIn: 60, depthIn: 36 },
  { name: 'Desk', category: 'Generic / custom', group: 'Furniture & storage', widthIn: 48, depthIn: 24 },

  // Laundry & appliances
  { name: 'Washer', category: 'Appliance', group: 'Laundry & appliances', widthIn: 27, depthIn: 30 },
  { name: 'Dryer', category: 'Appliance', group: 'Laundry & appliances', widthIn: 27, depthIn: 30 },
  { name: 'Utility sink', category: 'Sink', group: 'Laundry & appliances', widthIn: 24, depthIn: 24 },

  // Structure
  { name: 'Stair run', category: 'Stair', group: 'Structure', widthIn: 36, depthIn: 120 },
  { name: 'Column / post', category: 'Column / post', group: 'Structure', widthIn: 12, depthIn: 12 },
  { name: 'Fireplace', category: 'Generic / custom', group: 'Structure', widthIn: 48, depthIn: 20 },

  // Mechanical & electrical
  { name: 'Furnace', category: 'HVAC', group: 'Mechanical & electrical', widthIn: 36, depthIn: 36 },
  { name: 'Air handler', category: 'HVAC', group: 'Mechanical & electrical', widthIn: 30, depthIn: 30 },
  { name: 'Floor vent / register', category: 'HVAC', group: 'Mechanical & electrical', widthIn: 12, depthIn: 6 },
  { name: 'Water heater', category: 'Plumbing fixture', group: 'Mechanical & electrical', widthIn: 24, depthIn: 24 },
  { name: 'Electrical panel', category: 'Electrical fixture / obstruction', group: 'Mechanical & electrical', widthIn: 14, depthIn: 4 },
  { name: 'Outlet / switch', category: 'Electrical fixture / obstruction', group: 'Mechanical & electrical', widthIn: 4, depthIn: 2 },

  // Outdoor
  { name: 'Grill', category: 'Appliance', group: 'Outdoor', widthIn: 60, depthIn: 24 },
  { name: 'Patio table', category: 'Generic / custom', group: 'Outdoor', widthIn: 60, depthIn: 36 },
  { name: 'Outdoor storage', category: 'Closet / built-in', group: 'Outdoor', widthIn: 48, depthIn: 24 },
];
