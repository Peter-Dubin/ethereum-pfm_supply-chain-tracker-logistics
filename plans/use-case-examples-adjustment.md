# Use Case Examples — Adjustment Record

> This document records all corrections applied to `use-cases-definition.md`.  
> **Root cause:** Checkpoint type → status mapping was misapplied in several steps.

## Checkpoint Type → Status Reference (app behaviour)

| Checkpoint Type | Resulting Status |
|---|---|
| Pickup | InTransit |
| Hub | AtHub |
| Transit | InTransit |
| Delivery | OutForDelivery |
| Recipient confirms (on-chain) | Delivered |
| Admin action | Returned / Cancelled |

---

## UC-01 — Standard Multi-Hub Electronics Delivery

| # | Issue | Fix Applied |
|---|---|---|
| Steps 6 & 8 | Type was "Hub" for hub **departures** → would wrongly keep status at AtHub | Changed to **Transit** (→ InTransit) |
| Step 10 | Said "Status → OutForDelivery" but step 9 (Transit) only sets InTransit | **Removed** — OutForDelivery is the effect of step 11's Delivery checkpoint |
| Steps 3, 5 | "System \| Status → X" rows looked like manual actions | Removed; status effect shown inline in a new "→ Status" column |
| Column layout | No column showing the resulting status | Added **→ Status** column to all checkpoint rows |

Checkpoint count: **7** (unchanged — only types corrected, no rows added/removed).

---

## UC-02 — Medical Cold Chain Delivery

| # | Issue | Fix Applied |
|---|---|---|
| Between steps 4–5 | Package jumped from Hub Barcelona Norte to Hub Madrid Centro with no transit checkpoint — the Barcelona→Madrid leg was invisible | **Added Transit checkpoint** (ExpressRide departs Hub BCN → Hub MAD) with temp reading |
| Step 7 | Said "Status → OutForDelivery" but step 6 (Transit) only sets InTransit | **Removed** — OutForDelivery is the effect of the Delivery checkpoint |
| Steps 3, 7 | "System \| Status → X" rows looked like manual actions | Removed; inline → Status column added |

Checkpoint count: **5 → 6** (one transit checkpoint added between hubs).

---

## UC-03 — Damaged Package: Incident Report & Resolution

| # | Issue | Fix Applied |
|---|---|---|
| Step 5 | Type was "Checkpoint" — **not a valid checkpoint type** in the app | Changed to **Hub** (inspector is at Hub Madrid, package is still AtHub) |
| Step 7 | Type was "Hub" for hub **departure** | Changed to **Transit** (→ InTransit) |
| Step 10 | "System \| Status → Delivered" as a separate row | Removed; Delivered status annotated on the recipient confirmation row |
| Column layout | No status flow visible | Added **→ Status** column |

Checkpoint count: **5** (unchanged).

---

## UC-04 — Temperature Violation: Cold Chain Broken

| # | Issue | Fix Applied |
|---|---|---|
| Step 8 | "Admin updates status → Returned" gave no indication of how this is done in the app | Added note: Admin calls `updateShipmentStatus(4, Returned)` via Admin panel |
| Column layout | No status flow visible | Added **→ Status** column |

Checkpoint count: **4** (unchanged). Flow was otherwise logically accurate.

---

## UC-05 — Express Same-City Delivery (No Hub)

| # | Issue | Fix Applied |
|---|---|---|
| Step 4 | Said "Status → OutForDelivery" **before** the Delivery checkpoint (step 5) that actually triggers it | **Removed** — OutForDelivery annotated directly on the Delivery checkpoint row |
| Steps 3, 7 | "System \| Status → X" rows looked like manual actions | Removed; inline → Status column added |

Checkpoint count: **2** (unchanged — rows removed were system annotations, not real checkpoints).
