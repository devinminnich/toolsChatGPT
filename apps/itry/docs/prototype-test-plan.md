# Prototype test plan

## Web acceptance

1. Home loads with an upcoming occasion and private budget.
2. See gift ideas scrolls to recommendations.
3. Selecting a gift confirms selection without claiming a purchase.
4. Possible-duplicate warning does not block manual selection.
5. Autopilot limit slider changes the effective displayed ceiling.
6. People screen changes the active recipient/occasion.
7. For me screen exposes only the current user's inferred topics.
8. Settings can pause/resume learning.
9. Extension-style feedback can record one of four explicit signals.
10. Mobile layout remains usable below 800px.

## Extension acceptance

1. Extension requests no broad browsing-history permission.
2. Active-page information is read only after the user opens the helper and chooses an action.
3. Four explicit preference actions store a normalized local signal.
4. No connection can access the saved page from this prototype.

## Autopilot invariants for backend implementation

- In-limit candidate -> veto pending.
- Above-limit candidate -> explicit approval required.
- Possible duplicate -> no automatic purchase.
- Timeout never authorizes above-limit spend.
- Material changes to item/price/merchant invalidate stale authorization.
