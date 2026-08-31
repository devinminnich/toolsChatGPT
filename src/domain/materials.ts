import type { Design, FixtureInstance } from './project';

export type MaterialQuantity = {
  id: string;
  fixtureLineageId?: string;
  category: string;
  name: string;
  quantity: number;
  unit: 'sq ft' | 'linear ft' | 'each' | 'bag' | 'gal';
  wastePercent?: number;
  basis: string;
  assumption?: string;
};

const SQ_MM_PER_SQ_FT = 92903.04;
const MM_PER_FT = 304.8;
const SHOWER_WALL_HEIGHT_MM = 2438.4; // 8 ft homeowner-friendly default

function sqFt(squareMm: number) {
  return squareMm / SQ_MM_PER_SQ_FT;
}

function linearFt(mm: number) {
  return mm / MM_PER_FT;
}

function round(value: number, places = 1) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function showerMaterials(fixture: FixtureInstance): MaterialQuantity[] {
  const floorArea = sqFt(fixture.widthMm * fixture.depthMm);
  const threeWallArea = sqFt((fixture.widthMm + fixture.depthMm * 2) * SHOWER_WALL_HEIGHT_MM);
  const tiledArea = floorArea + threeWallArea;
  const waste = 0.12;
  const tileWithWaste = tiledArea * (1 + waste);
  const trimLength = linearFt(fixture.widthMm + SHOWER_WALL_HEIGHT_MM * 2);

  return [
    {
      id: `material:${fixture.lineageId}:tile`, fixtureLineageId: fixture.lineageId,
      category: 'Tile', name: 'Shower tile', quantity: round(tileWithWaste), unit: 'sq ft', wastePercent: 12,
      basis: `Three shower walls plus floor (${round(tiledArea)} sq ft net).`,
      assumption: 'Assumes an 8 ft tiled wall height and three tiled walls.',
    },
    {
      id: `material:${fixture.lineageId}:waterproofing`, fixtureLineageId: fixture.lineageId,
      category: 'Waterproofing', name: 'Waterproofing membrane/system', quantity: round(tiledArea * 1.1), unit: 'sq ft', wastePercent: 10,
      basis: 'Tiled shower wall and floor area.', assumption: 'Coverage should be adjusted to the selected manufacturer system.',
    },
    {
      id: `material:${fixture.lineageId}:backer`, fixtureLineageId: fixture.lineageId,
      category: 'Substrate', name: 'Tile backer/substrate', quantity: round(threeWallArea * 1.1), unit: 'sq ft', wastePercent: 10,
      basis: 'Three shower wall surfaces.', assumption: 'Floor substrate/pan system is not included in this backer quantity.',
    },
    {
      id: `material:${fixture.lineageId}:mortar`, fixtureLineageId: fixture.lineageId,
      category: 'Setting materials', name: 'Thinset mortar', quantity: Math.max(1, Math.ceil(tileWithWaste / 55)), unit: 'bag',
      basis: 'Approx. 55 sq ft per bag allowance.', assumption: 'Actual coverage varies substantially with tile size, trowel, substrate, and mortar.',
    },
    {
      id: `material:${fixture.lineageId}:grout`, fixtureLineageId: fixture.lineageId,
      category: 'Setting materials', name: 'Grout', quantity: Math.max(1, Math.ceil(tileWithWaste / 150)), unit: 'bag',
      basis: 'Approx. 150 sq ft per bag planning allowance.', assumption: 'Tile size and joint width can materially change grout usage.',
    },
    {
      id: `material:${fixture.lineageId}:sealant`, fixtureLineageId: fixture.lineageId,
      category: 'Sealants', name: 'Color-matched silicone/sealant', quantity: 2, unit: 'each',
      basis: 'Planning allowance for changes of plane and penetrations.',
    },
    {
      id: `material:${fixture.lineageId}:trim`, fixtureLineageId: fixture.lineageId,
      category: 'Trim', name: 'Tile edge trim', quantity: round(trimLength * 1.1), unit: 'linear ft', wastePercent: 10,
      basis: 'Front vertical shower edges plus opening width.', assumption: 'Actual trim depends on enclosure/opening configuration.',
    },
  ];
}

function fixtureInstallMaterials(fixture: FixtureInstance): MaterialQuantity[] {
  const category = fixture.category.toLowerCase();
  if (category.includes('toilet')) {
    return [
      { id: `material:${fixture.lineageId}:wax`, fixtureLineageId: fixture.lineageId, category: 'Plumbing', name: 'Toilet seal/ring', quantity: 1, unit: 'each', basis: 'One toilet installation.' },
      { id: `material:${fixture.lineageId}:supply`, fixtureLineageId: fixture.lineageId, category: 'Plumbing', name: 'Toilet supply connector', quantity: 1, unit: 'each', basis: 'One toilet installation.' },
    ];
  }
  if (category.includes('vanity') || category.includes('sink')) {
    return [
      { id: `material:${fixture.lineageId}:drain`, fixtureLineageId: fixture.lineageId, category: 'Plumbing', name: 'Sink drain/P-trap allowance', quantity: 1, unit: 'each', basis: 'One sink/vanity installation.' },
      { id: `material:${fixture.lineageId}:supplies`, fixtureLineageId: fixture.lineageId, category: 'Plumbing', name: 'Faucet supply connectors', quantity: 2, unit: 'each', basis: 'Hot and cold supply connections.' },
    ];
  }
  return [];
}

export function calculateMaterials(design: Design): MaterialQuantity[] {
  return design.fixtures.flatMap((fixture) => {
    const category = fixture.category.toLowerCase();
    if (category.includes('shower')) return [...showerMaterials(fixture), ...fixtureInstallMaterials(fixture)];
    return fixtureInstallMaterials(fixture);
  });
}
