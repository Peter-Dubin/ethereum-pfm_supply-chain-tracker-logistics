# Requirements Checklist — Supply Chain Tracker Logistics (TFM 2, Option 5)

> **Source priority (highest → lowest):** TFM2 doc → README.md → Instrucciones Generales
>
> **Conflict resolution:** TFM2's logistics domain model (`Shipment`/`Checkpoint`/`Incident`) supersedes README's token manufacturing model (`Producer`→`Factory`→`Retailer`→`Consumer`). README's technical stack (Foundry + Next.js + MetaMask) and admin approval pattern are adopted unchanged. Option 5 — *Paquetería Express* — grounds all domain specifics.

---

## PART A — Smart Contract Requirements

### A.1 Domain Model (from TFM2 — highest priority)

- [ ] Enum `ShipmentStatus`: `Created`, `InTransit`, `AtHub`, `OutForDelivery`, `Delivered`, `Returned`, `Cancelled`
- [ ] Enum `ActorRole`: `None`, `Sender`, `Carrier`, `Hub`, `Recipient`, `Inspector`
- [ ] Enum `IncidentType`: `Delay`, `Damage`, `Lost`, `TempViolation`, `Unauthorized`
- [ ] Struct `Shipment`: `id`, `sender`, `recipient`, `product`, `origin`, `destination`, `dateCreated`, `dateDelivered`, `status`, `checkpointIds[]`, `incidentIds[]`, `requiresColdChain`
- [ ] Struct `Checkpoint`: `id`, `shipmentId`, `actor`, `location`, `checkpointType` (Pickup/Hub/Transit/Delivery), `timestamp`, `notes`, `temperature` (int256, celsius×10)
- [ ] Struct `Incident`: `id`, `shipmentId`, `incidentType`, `reporter`, `description`, `timestamp`, `resolved`
- [ ] Struct `Actor`: `actorAddress`, `name`, `role`, `location`, `isActive`
- [ ] State vars: `admin`, `nextShipmentId`, `nextCheckpointId`, `nextIncidentId` (all start at 1)
- [ ] Mappings: `shipments`, `checkpoints`, `incidents`, `actors` (address → Actor)

### A.2 Actor Management Functions

- [ ] `registerActor(name, role, location)` — self-register; sets `isActive = false` until admin approves
- [ ] `approveActor(address)` — admin only; sets `isActive = true`; emits `ActorStatusChanged`
- [ ] `deactivateActor(address)` — admin only; sets `isActive = false`
- [ ] `getActor(address)` — view

### A.3 Shipment Functions

- [ ] `createShipment(recipient, product, origin, destination, requiresColdChain)` — sender role only, `isActive = true`; returns shipmentId
- [ ] `getShipment(shipmentId)` — view
- [ ] `updateShipmentStatus(shipmentId, newStatus)` — authorized active actor; guard: cannot update Delivered or Cancelled shipment
- [ ] `confirmDelivery(shipmentId)` — recipient only; sets `dateDelivered = block.timestamp`; status → Delivered; emits `DeliveryConfirmed`
- [ ] `cancelShipment(shipmentId)` — sender only; status must not be Delivered

### A.4 Checkpoint Functions

- [ ] `recordCheckpoint(shipmentId, location, checkpointType, notes, temperature)` — any active actor; returns checkpointId
- [ ] `getCheckpoint(checkpointId)` — view
- [ ] `getShipmentCheckpoints(shipmentId)` — view; returns `Checkpoint[] memory`

### A.5 Incident Functions

- [ ] `reportIncident(shipmentId, incidentType, description)` — any active actor; returns incidentId
- [ ] `resolveIncident(incidentId)` — admin or original reporter
- [ ] `getIncident(incidentId)` — view
- [ ] `getShipmentIncidents(shipmentId)` — view; returns `Incident[] memory`

### A.6 Auxiliary Functions

- [ ] `getActorShipments(actorAddress)` — returns `uint256[] memory`
- [ ] `verifyTemperatureCompliance(shipmentId)` — returns `bool`; checks no checkpoint had `IncidentType.TempViolation`

### A.7 Events (minimum 5 required by Instrucciones — we have 8)

- [ ] `ShipmentCreated(uint256 indexed shipmentId, address indexed sender, address indexed recipient, string product)`
- [ ] `CheckpointRecorded(uint256 indexed checkpointId, uint256 indexed shipmentId, string location, address actor)`
- [ ] `ShipmentStatusChanged(uint256 indexed shipmentId, ShipmentStatus newStatus)`
- [ ] `IncidentReported(uint256 indexed incidentId, uint256 indexed shipmentId, IncidentType incidentType)`
- [ ] `IncidentResolved(uint256 indexed incidentId)`
- [ ] `DeliveryConfirmed(uint256 indexed shipmentId, address indexed recipient, uint256 timestamp)`
- [ ] `ActorRegistered(address indexed actorAddress, string name, ActorRole role)`
- [ ] `ActorStatusChanged(address indexed actorAddress, bool isActive)`

### A.8 Security & Access Control

- [ ] `admin` set to `msg.sender` in constructor; unique, non-transferable in MVP
- [ ] `modifier onlyAdmin()`
- [ ] `modifier onlyActiveActor()`
- [ ] Guard: sender cannot confirm their own delivery
- [ ] Guard: cannot update status of a `Delivered` or `Cancelled` shipment
- [ ] Guard: `getShipmentCheckpoints` / `getShipmentIncidents` handle empty arrays cleanly
- [ ] NatSpec `@notice` / `@param` / `@return` on all `public` and `external` functions (required by Instrucciones)

### A.9 Foundry Tests (`sc/test/LogisticsTracker.t.sol`)

**Actor tests:**
- [ ] `testRegisterSender` / `testRegisterCarrier` / `testRegisterHub` / `testRegisterRecipient`
- [ ] `testDeactivateActor`

**Shipment tests:**
- [ ] `testCreateShipment` / `testCreateShipmentWithColdChain` / `testShipmentIdIncrementation`
- [ ] `testGetShipment` / `testOnlySenderCanCreateShipment`

**Checkpoint tests:**
- [ ] `testRecordPickupCheckpoint` / `testRecordHubCheckpoint` / `testRecordTransitCheckpoint` / `testRecordDeliveryCheckpoint`
- [ ] `testRecordCheckpointWithTemperature` / `testGetShipmentCheckpoints` / `testCheckpointTimeline`

**Status tests:**
- [ ] `testUpdateStatusToInTransit` / `testUpdateStatusToAtHub` / `testUpdateStatusToOutForDelivery` / `testUpdateStatusToDelivered`
- [ ] `testStatusChangeEmitsEvent`

**Delivery confirmation tests:**
- [ ] `testConfirmDeliveryByRecipient` / `testOnlyRecipientCanConfirmDelivery`
- [ ] `testDeliveryUpdatesTimestamp` / `testCannotConfirmDeliveryTwice`

**Incident tests:**
- [ ] `testReportDelayIncident` / `testReportDamageIncident` / `testReportLostIncident` / `testReportTempViolation`
- [ ] `testResolveIncident` / `testGetShipmentIncidents`

**Temperature tests:**
- [ ] `testVerifyTemperatureComplianceValid` / `testVerifyTemperatureComplianceViolation` / `testColdChainMonitoring`

**Cancellation tests:**
- [ ] `testCancelShipment` / `testOnlySenderCanCancelShipment` / `testCannotCancelDeliveredShipment`

**Validation tests:**
- [ ] `testCannotRecordCheckpointForNonExistentShipment` / `testInactiveActorCannotRecordCheckpoint`

**Edge-case tests:**
- [ ] `testMultipleCheckpointsForSameShipment` / `testShipmentWithMultipleIncidents` / `testEmptyCheckpointNotes`

**Full-flow tests:**
- [ ] `testCompleteShippingFlow` — UC-01 (multi-hub, no incidents)
- [ ] `testPharmaceuticalColdChainFlow` — UC-02 (cold chain, compliant)
- [ ] `testMultiHubLogisticsFlow` — UC-03 (incident reported + resolved)

---

## PART B — Frontend Requirements

### B.1 Pages (`web/src/app/`)

- [ ] `/` — Landing: 4 states: not connected / connected not registered / pending approval / approved
- [ ] `/dashboard` — role-aware panel: stats (my shipments, pending incidents, active shipments) + quick actions
- [ ] `/shipments` — list of actor's shipments with status badges, filtered by role
- [ ] `/shipments/create` — create shipment form (Sender role only)
- [ ] `/shipments/[id]` — DHL-style tracking timeline: checkpoints, incidents, confirm delivery button
- [ ] `/checkpoints/record` — record checkpoint form (Carrier and Hub roles only)
- [ ] `/incidents` — list + report new incident + resolve
- [ ] `/admin` — admin panel: pending actor approval queue
- [ ] `/admin/actors` — full actor list with approve / deactivate actions
- [ ] `/profile` — actor info (name, role, location) + shipments list

### B.2 Web3 Infrastructure

- [ ] `contexts/Web3Context.tsx` — global state: `{ address, isConnected, chainId, actorInfo, isAdmin }`; localStorage persistence; `accountsChanged` / `chainChanged` handlers; auto-reconnect on mount
- [ ] `hooks/useWallet.ts` — thin wrapper; exposes `{ address, isConnected, actorInfo, isAdmin, connect, disconnect }`
- [ ] `lib/web3.ts` — `getProvider()`, `getContract(signer?)`, `bigIntToDate()`, `tempToDisplay()`
- [ ] `contracts/config.ts` — `CONTRACT_CONFIG` (address, ABI, adminAddress), `NETWORK_CONFIG` (Anvil chainId 31337 + Sepolia 11155111)
- [ ] `contracts/LogisticsTracker.json` — ABI copied from `sc/out/LogisticsTracker.sol/LogisticsTracker.json`

### B.3 Components

- [ ] `Header.tsx` — logo, role-aware nav links, wallet address (shortened), disconnect button, network badge
- [ ] `TrackingTimeline.tsx` — vertical step-by-step timeline; current step animated; temperature violations marked red
- [ ] `ShipmentCard.tsx` — compact card: shipment ID, product, route, status badge, date
- [ ] `CheckpointForm.tsx` — form: shipmentId, location, checkpointType select, notes, conditional temperature input
- [ ] `IncidentCard.tsx` — incident details + resolve button (for admin/reporter)
- [ ] `ActorTable.tsx` — admin table with approve / deactivate action buttons
- [ ] `ui/` — shadcn/ui components: `button`, `card`, `select`, `label`, `badge`, `input`, `table`, `dialog`, `toast`

### B.4 Tech Stack

- [ ] Next.js 14+ App Router, TypeScript strict mode
- [ ] Tailwind CSS + shadcn/ui
- [ ] ethers.js v6 for all blockchain interaction
- [ ] MetaMask via `window.ethereum`
- [ ] localStorage for wallet session persistence
- [ ] No separate backend — blockchain is the source of truth

---

## PART C — MCP Server Requirements (REQUIRED — from README.md)

> README: *"Construccion de un MCP que envuelva los cli de foundry anvil, cast, forge"*

- [ ] `mcp-server/` TypeScript package using `@modelcontextprotocol/sdk`
- [ ] Tool: `forge_build` — runs `forge build`; returns compilation output
- [ ] Tool: `forge_test` — runs `forge test [--match-test X] [-vvv]`; returns test results
- [ ] Tool: `forge_coverage` — runs `forge coverage`
- [ ] Tool: `forge_deploy` — runs `forge script Deploy.s.sol --rpc-url ... --private-key ... --broadcast`
- [ ] Tool: `anvil_start` — spawns Anvil; returns pre-funded accounts + private keys
- [ ] Tool: `cast_call` — read-only contract call via `cast call`
- [ ] Tool: `cast_send` — state-changing call via `cast send`
- [ ] Tool: `cast_balance` — ETH balance via `cast balance`
- [ ] `.mcp.json` in project root wiring server to Claude Code
- [ ] `mcp-server/README.md` explaining usage

---

## PART D — AI Documentation Requirements (REQUIRED — from README.md)

- [ ] `IA.md` in project root with:
  - D.1 AI tools used (Claude Code, ChatGPT, Copilot, etc.)
  - D.2 Time breakdown: smart contract vs frontend (hours with AI vs estimated without)
  - D.3 Most common errors found in AI chat logs (analysis section)
  - D.4 Links or references to AI chat transcripts / session exports

---

## PART E — Delivery Requirements (from Instrucciones Generales)

### E.1 Repository

- [ ] Public GitHub repository (not private)
- [ ] Clean `.gitignore`: no private keys, no `node_modules`, no `.env` with secrets
- [ ] `.env.example` with placeholder values (committed)
- [ ] MIT `LICENSE` file
- [ ] Frequent, descriptive commits: `feat:`, `fix:`, `test:`, `docs:` prefixes

### E.2 README.md (project root)

- [ ] Project title and 2-3 paragraph description
- [ ] Problem it solves (sector context)
- [ ] Technologies used (blockchain, smart contracts, frontend, AI/MCP)
- [ ] System architecture diagram (Mermaid)
- [ ] Prerequisites and installation steps
- [ ] Smart contract addresses (testnet) with Etherscan/explorer links
- [ ] Use cases section (min 4 scenarios)
- [ ] Screenshots section (`/screenshots` folder reference)
- [ ] Data flow diagrams
- [ ] Demo video link (Loom/YouTube)
- [ ] Innovations section (what was added beyond the skeleton)
- [ ] AI/MCP usage section
- [ ] Author info + license

### E.3 Documentation (`docs/`)

- [ ] `docs/diagramas.md` — Mermaid diagrams:
  - Architecture (frontend → blockchain → MetaMask layers)
  - Shipment lifecycle state machine (`stateDiagram-v2`)
  - Checkpoint recording sequence diagram
  - Actor registration + approval flow
  - Data model class diagram

### E.4 Screenshots (`screenshots/`)

- [ ] `01-dashboard-principal.png` — main dashboard
- [ ] `02-crear-envio.png` — create shipment form
- [ ] `03-tracking-timeline.png` — DHL-style tracking view
- [ ] `04-gestion-incidencias.png` — incident management
- [ ] `05-panel-admin.png` — admin actor approval
- [ ] `06-confirmacion-entrega.png` — delivery confirmation
- [ ] `07-transaccion-explorer.png` — transaction on blockchain explorer

### E.5 Demo Video

- [ ] Max 5 minutes (strictly enforced)
- [ ] Minimum 720p resolution, clear audio
- [ ] Structure: Intro (0:00–0:30) → Technical (0:30–1:30) → Live demo (1:30–4:00) → Conclusions (4:00–5:00)
- [ ] Must mention innovations vs base skeleton
- [ ] Hosted on Loom/YouTube/Vimeo; link in README and delivery app

### E.6 Smart Contracts

- [ ] `forge build` — compiles without errors
- [ ] `forge test` — all tests pass
- [ ] Deployed on testnet (Sepolia recommended)
- [ ] Contract address in README with explorer link
- [ ] Publicly visible transactions on explorer

### E.7 Final Submission

- [ ] Submit via [App Proyectos](https://proyectos.codecrypto.jvh.kfs.es/)
- [ ] All links verified and functional before submitting
- [ ] Checklist complete

---

## Evaluation Weights (keep in mind throughout development)

| Criterion | Weight | Notes |
|---|---|---|
| Code (functionality, quality, docs) | 30% | Highest weight — full MVP required |
| Smart contracts (design, security, events) | 25% | NatSpec, 8 events, access control |
| Innovation & originality | 15% | Differ from skeleton; extra features |
| Demo video | 15% | Practical demo + mention innovations |
| Documentation | 10% | Mermaid diagrams, README, screenshots |
| AI/MCP usage | 5% | IA.md + MCP server + documented use |
