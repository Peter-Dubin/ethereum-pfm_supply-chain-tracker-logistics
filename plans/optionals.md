# Optional Features — Supply Chain Tracker Logistics (TFM 2, Option 5)

> Items marked as optional in the source documents. Implementing them scores points in **Innovation (15%)** and **AI/MCP (5%)** categories. Prioritized by impact vs effort.

---

## HIGH PRIORITY — Implement as part of core build

### O1. Interactive Map Visualization
- Show shipment route on a map using **Leaflet.js** (open source) or Google Maps
- Plot checkpoints as waypoints; each has a popup with timestamp, actor, and notes
- Color-coded by checkpoint type: Pickup=green, Hub=blue, Transit=orange, Delivery=gold
- Library: `leaflet` + `react-leaflet`
- **Why:** Directly relevant to "tracking estilo courier tradicional"; strong visual differentiator; mentioned in TFM2 architecture recommendations
- **Effort:** Medium — 1 component, static coordinates acceptable for demo

### O2. Real-Time Status Notifications
- Listen to contract events (`ShipmentStatusChanged`, `CheckpointRecorded`) via ethers.js WebSocket provider or polling
- Toast notifications on dashboard when a relevant shipment updates
- Pure event-driven, no manual refresh needed
- **Why:** Makes the DApp feel live; aligns with "trazabilidad en tiempo real" goal
- **Effort:** Low — ethers.js event listeners + shadcn/ui toast component

### O3. QR Code for Shipment Tracking
- Generate a QR code per shipment linking to `/shipments/[id]`
- Display on shipment detail page; downloadable
- Library: `qrcode.react`
- **Why:** Adds real-world courier behavior (like DHL QR labels); easy to demo in video
- **Effort:** Very low — one component, one npm package

### O4. Temperature Compliance Chart (Cold Chain)
- Dedicated section in `/shipments/[id]` for cold-chain shipments
- Line chart showing temperature readings across checkpoints
- Red threshold line at max allowed temperature; red dots for violations
- Library: `recharts` (already in install plan)
- **Why:** Implements TFM2's "Sensores IoT (opcional)" conceptually; memorable in demo
- **Effort:** Low — recharts LineChart, data from checkpoints array

### O5. Dark Mode
- Tailwind `darkMode: 'class'` toggle; preference persisted in localStorage
- Toggle button in Header.tsx
- **Why:** Low effort, noticeable UX polish; expected in modern dashboards
- **Effort:** Very low

---

## MEDIUM PRIORITY — Implement if time allows (Week 3)

### O6. Digital Delivery Signature (EIP-712)
- When recipient calls `confirmDelivery`, first prompt for a typed signature via `eth_signTypedData_v4` over shipment data
- Store signature in a `deliverySignatures` mapping in the contract OR include as calldata
- **Why:** Explicitly mentioned in Option 5 — *"Confirmación de entregas con firma digital"*; treat as near-required
- **Effort:** Medium — EIP-712 setup + smart contract mapping + frontend signing flow

### O7. Filterable / Searchable Shipment List
- Filter by status (Created, InTransit, Delivered...), date range, cold chain flag
- Search by shipment ID or product name (client-side filtering of fetched data)
- **Why:** Practical UX improvement for anyone with multiple shipments; no extra contract work
- **Effort:** Low — pure frontend filtering

### O8. REST API / External Integration Endpoint
- Next.js API Route `GET /api/shipments/[id]` returning shipment JSON
- Simulates the "Interoperabilidad — API para consultar estado desde ERP/WMS/CRM" from TFM2
- **Why:** Demonstrates enterprise-thinking; trivial with Next.js API routes
- **Effort:** Very low

### O9. Gas Optimization Report
- Run `forge snapshot` after all tests pass
- Document gas usage per function in README or a `docs/gas-report.md`
- **Why:** Shows technical depth; `forge snapshot` is one command
- **Effort:** Very low

### O10. IoT Sensor Simulation Script
- Small Node.js/bash script that calls `cast send recordCheckpoint(...)` with simulated temperature readings on a timer
- Simulates a real IoT device feeding data on-chain
- **Why:** Brings TFM2's IoT concept to life; dramatic for demo
- **Effort:** Low — shell script + cast send

---

## LOWER PRIORITY — Nice to have

### O11. IPFS Metadata Storage
- Store shipment details JSON on IPFS (Pinata free tier or web3.storage)
- Store IPFS CID in the smart contract instead of full strings
- **Why:** Reduces gas costs; shows knowledge of decentralized storage beyond blockchain
- **Effort:** Medium — Pinata SDK integration + contract change

### O12. Upgradability (UUPS Proxy)
- Use OpenZeppelin's `UUPSUpgradeable` pattern
- **Why:** Shows advanced Solidity knowledge
- **Effort:** High — significant architecture change; only if time is abundant

### O13. Multi-language UI (i18n)
- Spanish / English toggle using `next-intl`
- **Why:** Nice professional touch
- **Effort:** Medium

### O14. Barcode Scan Simulation
- Input field that accepts a "scanned" barcode string and auto-fills shipment ID
- Simulates warehouse scanner (like those used in real courier hubs)
- **Why:** Creative UX touch; pure frontend
- **Effort:** Very low

### O15. Multi-sig Admin Actions
- Require 2-of-3 signatures for actor deactivation
- **Why:** Smart contract security best practice
- **Effort:** High — requires significant contract redesign

---

## AI/MCP OPTIONALS — Directly scores the 5% AI/MCP criterion

### O16. MCP Server — Natural Language Blockchain Queries
- Add `query_shipment(id)` tool to the Foundry MCP server
- Claude can answer: *"What is the current status of shipment 5?"* by calling the contract read via cast
- **Why:** Extends MCP beyond CLI wrapping; strong demo moment ("ask Claude about a shipment")
- **Effort:** Low — one additional tool in the MCP server

### O17. AI-Powered Incident Analysis
- Button "Get AI Analysis" on incident cards
- Next.js API Route `POST /api/analyze-incident` calls Claude API
- Sends: incident type, shipment history, checkpoint notes → Claude returns root cause + suggested resolution
- Displayed as a non-blocking suggestion panel
- **Why:** Scores Innovation (15%) AND AI/MCP (5%); memorable in the demo video
- **Effort:** Medium — Claude API integration + API route + UI panel

### O18. Automated Shipment Report Generation
- Button "Generate Report" on `/shipments/[id]`
- Calls Claude API with full shipment + checkpoint + incident data
- Returns a formatted markdown summary (timeline, compliance status, incident log)
- Displayed in a modal; copyable
- **Why:** Practical "enterprise" use of AI; easy to show in demo
- **Effort:** Low — one API route + modal component

---

## Implementation Priority Summary

| Priority | Items | When |
|---|---|---|
| **Must do** (treat as core) | O1, O2, O3, O4, O5 | Week 2 alongside frontend |
| **Should do** (high score value) | O6, O16, O17 | Week 2-3 |
| **Nice to have** | O7, O8, O9, O10, O18 | Week 3 gaps |
| **Only if abundant time** | O11, O12, O13, O14, O15 | Post-delivery polish |
