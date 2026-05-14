# Use Cases Definition — LogistChain (Paquetería Express)

> This document defines the fictional "world" of the DApp: company identity, registered actors, product types, and 5 concrete shipment scenarios. All demo data, smart contract test fixtures, and UI examples should use these definitions for consistency.

---

## 1. Platform Identity

| Field | Value |
|---|---|
| **Platform name** | LogistChain |
| **Tagline** | "The chain of trust." |
| **Blockchain** | Ethereum (Sepolia Testnet for delivery / Anvil local for dev) |
| **Admin** | LogistChain Central (Anvil account #0) |

---

## 2. Registered Actors

| # | Company Name | Role | Location | Anvil Account # |
|---|---|---|---|---|
| 0 | LogistChain Central | Admin | Madrid HQ | #0 (deployer) |
| 1 | TechCorp S.L. | Sender | Parque Empresarial Las Rozas, Madrid | #1 |
| 2 | MediSupply S.A. | Sender | Zona Industrial Badalona, Barcelona | #2 |
| 3 | ExpressRide Courier | Carrier | Hub Central Madrid | #3 |
| 4 | UrbanDeliver S.L. | Carrier | Área Metropolitana Barcelona | #4 |
| 5 | Hub Logístico Madrid Centro | Hub | Calle Logística 12, Getafe, Madrid | #5 |
| 6 | Hub Logístico Barcelona Norte | Hub | Av. Industrial 88, Montcada i Reixac, Barcelona | #6 |
| 7 | Startup Innovations S.A. | Recipient | Barcelona Tech Campus, 22@ District | #7 |
| 8 | Hospital Valle Verde | Recipient | Calle Salud 3, Alcorcón, Madrid | #8 |
| 9 | Inspector García (QC) | Inspector | LogistChain HQ, Madrid | #9 |

### Anvil addresses for test fixtures

```solidity
address admin     = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266; // LogistChain Central
address sender1   = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // TechCorp S.L.
address sender2   = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC; // MediSupply S.A.
address carrier1  = 0x90F79bf6EB2c4f870365E785982E1f101E93b906; // ExpressRide Courier
address carrier2  = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65; // UrbanDeliver S.L.
address hub1      = 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc; // Hub Madrid Centro
address hub2      = 0x976EA74026E726554dB657fA54763abd0C3a0aa9; // Hub Barcelona Norte
address recip1    = 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955; // Startup Innovations
address recip2    = 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f; // Hospital Valle Verde
address inspector = 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720; // Inspector García
```

---

## 3. Product / Package Types

| Code | Product Name | Cold Chain | Temp Range | Sector | Notes |
|---|---|---|---|---|---|
| `PKG-TECH` | Laptop Components (×10 units) | No | — | Electronics | High value, tamper-evident |
| `PKG-MED` | COVID Vaccine Batch #V2024 | Yes | 2–8°C | Pharma | Critical; GDP-compliant |
| `PKG-DOC` | Legal Document Bundle | No | — | Documents | Standard; time-sensitive |
| `PKG-LUX` | Limited Edition Watch (×1) | No | — | Luxury | High value; inspection required |
| `PKG-FOOD` | Artisan Cheese Assortment (5 kg) | Yes | 4–6°C | Perishable food | Short shelf life |

---

## 4. Use Case Scenarios

---

### UC-01 — Standard Multi-Hub Electronics Delivery

**Shipment ID:** 1  
**Product:** `PKG-TECH` — Laptop Components (×10)  
**Route:** Las Rozas, Madrid → Barcelona Tech Campus  
**Sender:** TechCorp S.L. | **Recipient:** Startup Innovations S.A.  
**Cold Chain:** No | **Expected duration:** 24–48 h

**Step-by-step flow:**

| # | Actor | Action | Checkpoint Type | → Status | Location | Notes |
|---|---|---|---|---|---|---|
| 1 | TechCorp S.L. | Creates shipment | — | Created | — | Origin: Madrid; Dest: Barcelona |
| 2 | ExpressRide Courier | Picks up package | Pickup | **InTransit** | TechCorp warehouse, Las Rozas | "Sealed box, 5 kg" |
| 3 | Hub Madrid Centro | Package arrives at hub | Hub | **AtHub** | Calle Logística 12, Getafe | "Sorted and ready" |
| 4 | Hub Madrid Centro | Package departs hub | Transit | **InTransit** | Calle Logística 12, Getafe | "Loaded on Barcelona truck" |
| 5 | Hub Barcelona Norte | Package arrives at hub | Hub | **AtHub** | Av. Industrial 88, Montcada | "Received, forwarding to last-mile" |
| 6 | Hub Barcelona Norte | Package departs hub | Transit | **InTransit** | Av. Industrial 88, Montcada | "Handed to UrbanDeliver" |
| 7 | UrbanDeliver S.L. | Last-mile pickup | Transit | InTransit | Hub Barcelona Norte | |
| 8 | UrbanDeliver S.L. | Arrives at recipient | Delivery | **OutForDelivery** | Barcelona Tech Campus, 22@ | "Delivered to reception" |
| 9 | Startup Innovations S.A. | Confirms delivery | — | **Delivered** | — | MetaMask signature |

**Checkpoints:** 7 | **Incidents:** 0  
**Result:** `verifyTemperatureCompliance(1)` → N/A (not cold chain)

---

### UC-02 — Medical Cold Chain Delivery with Temperature Monitoring

**Shipment ID:** 2  
**Product:** `PKG-MED` — COVID Vaccine Batch #V2024  
**Route:** Badalona, Barcelona → Alcorcón, Madrid  
**Sender:** MediSupply S.A. | **Recipient:** Hospital Valle Verde  
**Cold Chain:** Yes (2–8°C) | **Expected duration:** 12 h (priority medical)

**Step-by-step flow:**

| # | Actor | Action | Checkpoint Type | → Status | Location | Temp (°C) | Notes |
|---|---|---|---|---|---|---|---|
| 1 | MediSupply S.A. | Creates shipment | — | Created | — | — | requiresColdChain = true |
| 2 | ExpressRide Courier | Picks up vaccines | Pickup | **InTransit** | MediSupply warehouse, Badalona | 4.0°C | "Insulated packaging verified" |
| 3 | Hub Barcelona Norte | Package arrives | Hub | **AtHub** | Av. Industrial 88 | 5.0°C | "Cold storage dock #3" |
| 4 | ExpressRide Courier | Departs Hub BCN → Hub MAD | Transit | **InTransit** | Av. Industrial 88, Montcada | 5.5°C | "In transit to Madrid" |
| 5 | Hub Madrid Centro | Package arrives | Hub | **AtHub** | Calle Logística 12 | 6.0°C | "Transferred to refrigerated van" |
| 6 | ExpressRide Courier | En route to hospital | Transit | InTransit | A-4 motorway checkpoint | 7.0°C | "All within range" |
| 7 | ExpressRide Courier | Delivers to hospital | Delivery | **OutForDelivery** | Hospital Valle Verde, Alcorcón | 5.0°C | "Received by pharmacy staff" |
| 8 | Hospital Valle Verde | Confirms delivery | — | **Delivered** | — | — | MetaMask signature |

**Checkpoints:** 6 | **Incidents:** 0  
**Result:** `verifyTemperatureCompliance(2)` → `true` (all readings 4–7°C, within 2–8°C)

---

### UC-03 — Damaged Package: Incident Report & Resolution

**Shipment ID:** 3  
**Product:** `PKG-LUX` — Limited Edition Watch  
**Route:** Madrid → Barcelona  
**Sender:** TechCorp S.L. | **Recipient:** Startup Innovations S.A.  
**Cold Chain:** No

**Step-by-step flow:**

| # | Actor | Action | Type | → Status | Notes |
|---|---|---|---|---|---|
| 1 | TechCorp S.L. | Creates shipment | — | Created | High-value item |
| 2 | ExpressRide Courier | Picks up | Pickup | **InTransit** | "Small box, marked fragile" |
| 3 | Hub Madrid Centro | Arrives at hub | Hub | **AtHub** | "Received" |
| 4 | Hub Madrid Centro | Discovers damage | Incident | *(no change)* | **Incident reported:** type=Damage, "External box crushed at corner, product condition unknown" |
| 5 | Inspector García | Notified; inspects | Hub | AtHub | "Physical inspection at Hub Madrid" |
| 6 | Inspector García | Resolves incident | Incident resolved | *(no change)* | "Product intact; repackaged in reinforced box; cleared to proceed" |
| 7 | Hub Madrid Centro | Departs hub | Transit | **InTransit** | "Cleared for shipment" |
| 8 | UrbanDeliver S.L. | Last-mile delivery | Delivery | **OutForDelivery** | "Delivered to recipient" |
| 9 | Startup Innovations | Confirms delivery | — | **Delivered** | MetaMask signature |

**Checkpoints:** 5 | **Incidents:** 1 (resolved)  
**Key demonstration:** On-chain audit trail shows full incident lifecycle — reported, investigated, resolved — all immutable and timestamped.

---

### UC-04 — Temperature Violation: Cold Chain Broken

**Shipment ID:** 4  
**Product:** `PKG-FOOD` — Artisan Cheese Assortment  
**Route:** Barcelona → Madrid  
**Sender:** MediSupply S.A. | **Recipient:** Hospital Valle Verde (canteen)  
**Cold Chain:** Yes (4–6°C)

**Step-by-step flow:**

| # | Actor | Action | Type | → Status | Temp | Notes |
|---|---|---|---|---|---|---|
| 1 | MediSupply S.A. | Creates shipment | — | Created | — | requiresColdChain = true |
| 2 | ExpressRide Courier | Picks up | Pickup | **InTransit** | 5°C | "Compliant" |
| 3 | Hub Barcelona Norte | Arrives | Hub | **AtHub** | 6°C | "Compliant" |
| 4 | ExpressRide Courier | Transit checkpoint | Transit | **InTransit** | **12°C** | "Refrigerated unit failure" |
| 5 | ExpressRide Courier | Reports violation | Incident | *(no change)* | — | **IncidentType=TempViolation**, "Refrigeration unit failed on A-2 motorway" |
| 6 | Hub Madrid Centro | Refuses acceptance | Hub | **AtHub** | — | "Awaiting inspection" |
| 7 | Inspector García | Reports second violation | Incident | *(no change)* | — | **IncidentType=TempViolation**, "Confirmed: chain broken at 12°C for ~2 hours" |
| 8 | Admin | Updates status → Returned | — | **Returned** | — | Admin calls `updateShipmentStatus(4, Returned)` via Admin panel |
| 9 | MediSupply S.A. | Receives returned shipment | — | — | — | |

**Checkpoints:** 4 | **Incidents:** 2 (TempViolation × 2, both unresolved)  
**Final Status:** Returned  
**Result:** `verifyTemperatureCompliance(4)` → `false`  
**Key demonstration:** The blockchain record proves exactly where and when the cold chain was broken — useful for insurance claims and regulatory audits.

---

### UC-05 — Express Same-City Delivery (No Hub)

**Shipment ID:** 5  
**Product:** `PKG-DOC` — Legal Document Bundle  
**Route:** Madrid Office A → Madrid Client B  
**Sender:** TechCorp S.L. | **Recipient:** Startup Innovations S.A. (Madrid branch)  
**Cold Chain:** No | **Duration:** 2–4 h

**Step-by-step flow:**

| # | Actor | Action | Checkpoint Type | → Status | Notes |
|---|---|---|---|---|---|
| 1 | TechCorp S.L. | Creates shipment | — | Created | Same-city express |
| 2 | ExpressRide Courier | Picks up documents | Pickup | **InTransit** | "Sealed envelope" |
| 3 | ExpressRide Courier | Delivers | Delivery | **OutForDelivery** | "Signed at reception" |
| 4 | Startup Innovations | Confirms delivery | — | **Delivered** | MetaMask signature |

**Checkpoints:** 2 | **Incidents:** 0  
**Key demonstration:** Shows the system handles simple flows as well as complex multi-hub ones — no mandatory hub step required.

---

## 5. Admin Scenarios

### Admin-01 — Actor Registration & Approval Flow

1. New company visits the DApp, connects MetaMask wallet
2. Fills registration form: name, role (Carrier), location
3. Calls `registerActor()` on-chain → `isActive = false`, event `ActorRegistered` emitted
4. Admin visits `/admin/actors` → sees pending actor in queue
5. Admin clicks "Approve" → calls `approveActor(address)` → `isActive = true`, event `ActorStatusChanged`
6. Actor can now create/interact with shipments
7. If actor behaves badly: admin clicks "Deactivate" → `isActive = false` → actor frozen

### Admin-02 — Incident Oversight & Stalled Resolution

1. Incident reported (damage, temp violation)
2. Original reporter goes offline / unavailable
3. Admin sees open incident on dashboard
4. Admin calls `resolveIncident(incidentId)` with resolution description
5. `IncidentResolved` event emitted; on-chain record complete

---

## 6. Data for Seed Script (`sc/script/Seed.s.sol`)

The seed script sets up the full scenario above for local demo and testing:

```solidity
// After deploying LogisticsTracker:
// 1. Register all 9 actors
// 2. Admin approves all of them
// 3. Create UC-01 through UC-05 shipments
// 4. Record all checkpoints
// 5. Report and resolve incidents per scenarios
// This gives a fully-populated demo environment in one script run.
```

Run with:
```bash
forge script script/Seed.s.sol --rpc-url http://localhost:8545 --private-key 0xac0974... --broadcast
```
