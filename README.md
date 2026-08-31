# Home Renovation Planner

A cross-device home renovation planning application for homeowners.

The product is designed to work as a first-class experience on both phones and desktop browsers. It lets a homeowner quickly sketch an indoor or outdoor space, dimension it precisely, place persistent fixed objects, create proposed layouts, derive renovation scope from design changes, estimate DIY and contractor costs, generate RFQs, import contractor quotes, and export project documents as PDF.

## Core V1 workflow

1. Create a home and project/area.
2. Draw an existing layout using touch/mouse or exact dimensions.
3. Add fixed objects such as doors, windows, toilets, showers, vanities, cabinets, appliances, stairs, columns, and custom objects.
4. Save reusable objects with their dimensions.
5. Duplicate the existing design into one or more proposed designs.
6. Move, add, remove, resize, or rotate objects.
7. Compare existing and proposed layouts.
8. Generate and edit a draft scope of work from detected design changes.
9. Generate homeowner-friendly material quantities and DIY/contractor cost ranges.
10. Generate an RFQ PDF.
11. Import contractor estimates and compare scope, exclusions, and price.
12. Export dimensioned design, estimate, RFQ, and quote-comparison PDFs.

## Product principles

- Mobile and desktop are equal editing experiences.
- Dragging is fast; numeric dimensions are authoritative.
- The application is for homeowners, not professional estimators.
- Construction assumptions should use sensible defaults with Budget / Standard / Premium options and editable overrides.
- Calculated quantities and estimated prices must be clearly distinguished.
- The architecture must support bathrooms, kitchens, garages, basements, decks, yards, patios, sheds, fences, and other indoor/outdoor home projects.
- The bathroom remodel is the first acceptance-test project, not a bathroom-specific architecture.

See `docs/technical-architecture.md` for the V1 technical design and build sequence.
