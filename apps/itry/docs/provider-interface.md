# Catalog and commerce provider contract

Production providers should expose capability metadata so iTry never assumes recommendation access equals purchase access.

```ts
interface ProviderCapabilities {
  search: boolean
  affiliateLink: boolean
  directCheckout: boolean
  autopilotPurchase: boolean
  deliveryEstimate: boolean
  giftWrap: boolean
  personalization: boolean
}
```

A provider may be recommendation-only. Autopilot candidates must be restricted to providers that explicitly support an authorized direct-purchase flow. External checkout remains useful and should not be represented as an automatic purchase.
