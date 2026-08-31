import type { Design, Project } from './project';
import type { ScopeSuggestion } from './scopeInference';
import type { MaterialQuantity } from './materials';
import type { EstimateSummary } from './estimating';

export type MaterialResponsibility = 'owner' | 'contractor' | 'undecided';

export type RfqScopeLine = {
  id: string;
  category: string;
  title: string;
  description: string;
};

export type RfqMaterialLine = MaterialQuantity & {
  responsibility: MaterialResponsibility;
};

export type RfqDocument = {
  id: string;
  projectId: string;
  projectName: string;
  generatedAt: string;
  existingDesignName: string;
  proposedDesignName: string;
  overview: string;
  scope: RfqScopeLine[];
  materials: RfqMaterialLine[];
  pricingRequest: string[];
  contractorQuestions: string[];
  estimateReference?: {
    low: number;
    typical: number;
    high: number;
    note: string;
  };
};

export function generateRfq(
  project: Project,
  existing: Design,
  proposed: Design,
  scope: ScopeSuggestion[],
  materials: MaterialQuantity[],
  estimate?: EstimateSummary,
): RfqDocument {
  const includedScope = scope.filter((item) => item.status !== 'ignored');

  return {
    id: `rfq:${project.id}:${proposed.id}`,
    projectId: project.id,
    projectName: project.name,
    generatedAt: new Date().toISOString(),
    existingDesignName: existing.name,
    proposedDesignName: proposed.name,
    overview: `Provide a written proposal for the ${project.name} renovation based on the Existing and ${proposed.name} designs and the scope below. Identify any assumptions, exclusions, substitutions, or missing information that could affect price or schedule.`,
    scope: includedScope.map((item) => ({
      id: item.id,
      category: item.category,
      title: item.title,
      description: item.description,
    })),
    materials: materials.map((item) => ({ ...item, responsibility: 'undecided' as const })),
    pricingRequest: [
      'Labor subtotal',
      'Contractor-supplied materials subtotal',
      'Allowances and allowance assumptions',
      'Permit costs or permit exclusions',
      'Demolition and disposal costs',
      'Optional work priced separately',
      'Taxes, fees, and other charges',
      'Total proposed contract price',
    ],
    contractorQuestions: [
      'What work is specifically excluded from this proposal?',
      'What owner-supplied materials or site preparation are assumed?',
      'What is the anticipated start window and estimated project duration?',
      'What payment schedule and deposit are required?',
      'What conditions could result in change orders?',
      'Are permits included, and who is responsible for obtaining them?',
    ],
    estimateReference: estimate ? {
      low: estimate.total.low,
      typical: estimate.total.typical,
      high: estimate.total.high,
      note: 'Internal homeowner planning range generated from regional assumptions; not intended to anchor contractor pricing.',
    } : undefined,
  };
}
