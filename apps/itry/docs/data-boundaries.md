# Data boundaries

| Data | Owner | Connection visibility |
|---|---|---|
| Display name / shared occasion | Recipient/profile | Shared as allowed |
| Raw preference evidence | Recipient | Never |
| Inferred preference topics | Recipient | Never directly |
| Recommendation | Giver | Giver only |
| Relationship label | Giver | Giver only |
| Budget / Autopilot ceiling | Giver | Giver only |
| Gift intent / purchase | Giver | Giver only during planning |
| Preferred delivery address | Recipient | Address hidden; fulfillment capability only |
| Duplicate risk | System-derived | Coarse warning only |

The recommendation service is the intended privacy boundary between recipient preference evidence and giver-visible output.
