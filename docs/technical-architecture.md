# V1 Technical Architecture

## 1. Architecture decision

Build the product as an installable Progressive Web App (PWA) using one responsive codebase for phone, tablet, and desktop.

### Frontend
- React
- TypeScript
- Vite
- SVG-based design canvas
- Pointer Events for unified touch/mouse interactions
- Zustand for client editor state
- TanStack Query for server/cache state
- Zod for validation and persisted schema boundaries

### Backend
Use Supabase for V1:
- Postgres database
- Authentication
- Row Level Security
- Object/file storage
- Realtime/sync capabilities where useful

This keeps V1 operationally small while preserving a relational data model that can migrate later if necessary.

### Deployment
- Frontend: Vercel
- Backend/data/storage: Supabase
- PWA manifest + service worker for installability and progressively improved offline behavior

## 2. Geometry model

Geometry is a first-class domain layer and must not depend on React components.

Store canonical distances internally in integer millimeters. Display/input conversion handles feet/inches, inches, decimal feet, millimeters, centimeters, and meters.

Why integer millimeters:
- avoids floating-point drift for most homeowner-scale measurements;
- unit conversions remain deterministic;
- works for a small bathroom and large outdoor areas;
- rendering scale remains independent of stored geometry.

Core geometry types:

```ts
type Point = { xMm: number; yMm: number };

type Wall = {
  id: string;
  start: Point;
  end: Point;
  thicknessMm: number;
};

type DesignObjectInstance = {
  id: string;
  definitionId?: string;
  category: string;
  name: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  depthMm: number;
  rotationDeg: number;
  metadata: Record<string, unknown>;
};
```

Room/area geometry is represented by connected wall segments/polygons rather than a rectangle-specific model. Rectangles are simply a fast creation tool.

## 3. Drawing engine

Use SVG rather than a bitmap canvas for V1.

Reasons:
- walls and fixtures remain addressable DOM/vector objects;
- dimension lines and labels are straightforward;
- selection handles remain crisp at any zoom;
- PDFs can reuse vector geometry;
- pointer interactions work on touch and mouse;
- accessibility is more practical than a bitmap-only editor.

Required editor capabilities:
- create rectangle by dimensions;
- draw arbitrary closed geometry;
- drag vertices/walls;
- exact wall-length editing;
- pan/zoom/pinch zoom;
- clean snapping with user override;
- object selection/movement;
- resize through exact dimensions;
- rotation;
- overlap permitted;
- distance/dimension annotations;
- undo/redo command history;
- duplicate/delete;
- fit-to-view.

Snapping is advisory rather than destructive. The editor should prefer horizontal, vertical, endpoints, nearby edges, grid intervals, and common angles while allowing free placement when the user deliberately moves away from the snap target.

## 4. Cross-device interaction contract

Every editor action must have a touch path and a mouse path.

Desktop layout:
- object/tool rail on left;
- central canvas;
- selected-object properties on right;
- keyboard shortcuts as optional accelerators.

Phone layout:
- canvas remains primary;
- compact top tool controls;
- selected object opens a bottom sheet;
- controls target approximately 44px minimum touch size;
- one-finger selected-object drag;
- two-finger canvas pan/pinch;
- exact numeric editing available without precision dragging.

No required feature may depend on hover or right-click.

## 5. Data hierarchy

```text
User
  Home
    Project / Area
      Existing Design
      Proposed Design(s)
      Scope
      Estimates
      RFQs
      Contractor Quotes
  Saved Object Definitions
```

### Key entities
- profiles
- homes
- projects
- designs
- design_walls
- object_definitions
- design_object_instances
- design_revisions
- scopes
- scope_items
- estimate_versions
- estimate_items
- rfqs
- contractor_quotes
- contractor_quote_items
- attachments

A saved object definition describes reusable dimensions/default metadata. A design object instance describes where that object exists in a specific design.

## 6. Existing vs proposed model

A proposed design is created from an existing/baseline design and retains lineage.

Objects copied into the proposal retain a stable lineage key so the comparison engine can identify:
- unchanged;
- moved;
- resized;
- rotated;
- removed;
- added.

The comparison slider is visual only. Scope inference operates on structured geometry/object diffs.

## 7. Scope engine

The scope engine consumes design differences and produces editable suggestions.

Example:

```text
Change: toilet moved 1219 mm
Inference: fixture relocation
Suggested work:
- remove existing toilet;
- modify/relocate plumbing;
- install toilet at proposed location;
- repair affected finishes.
```

Every suggestion has states:
- suggested
- accepted
- edited
- ignored

The homeowner remains authoritative. Scope inference must never silently become committed project scope.

Scope categories should map to trades/work types such as demolition, framing, drywall, painting, flooring, tile, plumbing, electrical, cabinetry, exterior, concrete/masonry, landscaping, and general work.

## 8. Material/assembly engine

Homeowners choose an outcome and quality tier rather than needing to know construction assemblies.

Default tiers:
- Budget
- Standard
- Premium
- Custom

An assembly contains:
- geometry basis (area, perimeter, count, length, etc.);
- waste factor;
- component materials;
- consumables;
- optional tools/equipment;
- regional price assumptions;
- contractor labor assumptions;
- user overrides.

Example: tile floor uses calculated floor area and expands it into tile, waste, mortar, grout, and related consumables.

Store assumptions separately from calculated quantities so the UI can distinguish facts derived from the drawing from uncertain market estimates.

## 9. Estimating engine

Produce two scenarios from the same accepted scope.

### DIY
- calculated materials;
- consumables;
- tools/equipment rental;
- disposal;
- permit allowance when relevant;
- contingency.

### Contractor
- regional low/typical/high ranges;
- materials where contractor supplied;
- labor;
- disposal;
- permits/allowances where relevant;
- contingency/uncertainty.

V1 pricing source is curated regional-average assumption data with manual overrides. Live retailer pricing is not required for the first release but the estimate schema must support a future external price source.

Every estimate item stores source/provenance such as calculated, regional assumption, user override, or contractor quote.

## 10. RFQ system

Generate an editable RFQ from:
- project information;
- existing design;
- proposed design;
- accepted scope;
- calculated quantities;
- material responsibility (owner/contractor/undecided);
- optional attachments/photos.

RFQ output asks contractors to identify labor, materials, allowances, permits, disposal, exclusions, optional work, schedule, and payment terms.

V1 exports the RFQ to PDF rather than implementing multi-user sharing.

## 11. Contractor quote ingestion

V1 supports:
- PDF upload;
- image/screenshot upload;
- pasted text;
- manual quote entry.

The system stores the original source plus normalized extracted fields:
- contractor;
- date;
- expiration;
- total;
- labor;
- materials;
- allowances;
- exclusions;
- scope;
- schedule;
- payment terms.

Quote analysis compares normalized contractor scope against accepted project/RFQ scope and identifies likely included, excluded, missing, ambiguous, and optional items.

Automated extraction is assistive. Users can correct all extracted fields before accepting them.

## 12. PDF generation

V1 output types:
1. Dimensioned Design
2. Project Estimate
3. Request for Quote
4. Contractor Quote Comparison

Generate PDFs server-side for consistent output. Design geometry should be rendered as vector SVG where possible before PDF composition.

## 13. Revision/history model

Autosave current working state while periodically creating meaningful revisions.

Track events such as:
- design created/duplicated;
- geometry changed;
- fixture added/removed/moved;
- scope accepted/edited;
- material tier changed;
- estimate regenerated;
- contractor quote imported;
- manual price override.

Users should be able to understand how the project evolved without storing an expensive snapshot for every pointer movement.

## 14. Security

- Supabase Auth for accounts.
- Row Level Security on all user-owned records.
- Private object storage for quotes/photos/project documents.
- Signed URLs for temporary document access.
- Validate all persisted payloads at API boundaries.
- Treat uploaded contractor documents as untrusted input.

## 15. PWA/offline strategy

V1 is cloud-backed but the editor should tolerate temporary connectivity loss.

- local draft/editor state while actively editing;
- queued synchronization when practical;
- explicit sync status;
- never discard unsynced design work silently.

Full offline project/document management can follow after the core editor is stable.

## 16. Build sequence

### Milestone 0 — Foundation
- React/TypeScript/Vite/PWA shell
- responsive layout primitives
- routing
- domain types
- unit conversion library
- test framework
- Supabase configuration boundary

### Milestone 1 — Geometry editor
- SVG viewport
- rectangle creation
- free-form polygon/wall creation
- pan/zoom
- snapping
- wall/vertex selection
- exact dimensions
- undo/redo
- responsive touch/mouse interactions

### Milestone 2 — Objects and saving
- fixed-object library
- custom dimensioned objects
- reusable object definitions
- placement/move/rotate/resize
- homes/projects/design persistence
- autosave and cloud sync

### Milestone 3 — Existing/proposed
- duplicate design
- lineage/diff engine
- comparison overlay/slider
- change summary

### Milestone 4 — Scope and estimating
- scope inference rules
- scope review/edit workflow
- assembly/material engine
- Budget/Standard/Premium tiers
- regional estimate assumptions
- DIY and contractor estimates
- overrides/provenance

### Milestone 5 — Contractor workflow
- RFQ generation
- design/estimate/RFQ PDFs
- contractor quote upload
- extraction/normalization workflow
- scope/price comparison
- quote comparison PDF

### Milestone 6 — Hardening
- bathroom acceptance test end-to-end
- additional indoor test (e.g. kitchen/garage)
- outdoor/large-area test (e.g. deck/patio/yard)
- phone usability pass
- desktop usability pass
- accessibility pass
- error/recovery/offline-sync testing

## 17. V1 acceptance test

Using the real bathroom test project, the user must be able to:
1. draw the existing room on a phone;
2. enter exact dimensions;
3. create exact-dimension toilet/shower/other fixed objects;
4. save/reuse those objects;
5. save the project;
6. reopen the same project on desktop;
7. duplicate the existing design;
8. rearrange/add/remove fixed objects;
9. compare existing and proposed layouts;
10. review automatically suggested scope;
11. choose homeowner-friendly material grades;
12. receive material quantities and DIY cost range;
13. receive regional contractor cost range;
14. generate a dimensioned design PDF and RFQ PDF;
15. import a real contractor quote;
16. correct extracted quote details if necessary;
17. compare the quote to the requested scope;
18. export a quote comparison PDF.

The same core drawing and estimating architecture must also function for non-bathroom indoor projects and large outdoor areas.
