# Easier Project Startup — Local Dev Orchestration

## Problem

Every Anvil restart wipes the blockchain. Getting back to a working state currently requires 4 awkward manual steps across multiple terminals with exported env vars and manual actor registration through MetaMask.

## Solution

Three new files reduce startup to one command from the project root:

```bash
npm run dev
```

---

## Key Insight: Deterministic Contract Address

Because Anvil always starts fresh with the same accounts (nonce 0) and we always deploy with account #0, the contract address is **always**:

```
0x5FbDB2315678afecb367f032d93F642f64180aa3
```

This is already hardcoded in `web/.env.local`. No manual `.env` updates needed for local dev — ever.

---

## Files Created

| File | Purpose |
|---|---|
| `sc/script/Seed.s.sol` | Foundry script — Phase 1: registers and approves all 9 actors. Structured for future phases (shipments, checkpoints, incidents). |
| `init-local.sh` | Root orchestration script — starts Anvil, deploys, seeds, starts frontend, all sequentially with readiness checks. |
| `package.json` (root) | Minimal — exposes `npm run dev` as the single startup command. |

---

## Startup Sequence (what `init-local.sh` does)

```
[1/4] Start Anvil          ← uses sc/anvil-dev.sh (filtered console)
      ↓ waits for RPC to be live (cast block-number probe, no fixed sleep)
[2/4] Deploy contract      ← forge script Deploy.s.sol --broadcast
      ↓ always lands at 0x5FbDB...aa3
[3/4] Seed 9 actors        ← forge script Seed.s.sol --broadcast
      ↓ each actor self-registers, then admin batch-approves all
[4/4] Start frontend       ← npm run dev in web/
      ↓ holds terminal; Ctrl+C cleanly kills Anvil + Next.js
```

Race conditions are avoided by polling (`cast block-number`) instead of fixed sleeps.

---

## Seed Script Phases (Seed.s.sol)

The seed script is split into clearly labelled phases so new phases can be dropped in later:

```
Phase 1 (done): Register & approve 9 actors
Phase 2 (todo): Create 5 UC shipments (UC-01 … UC-05)
Phase 3 (todo): Record all checkpoints with timestamps & temperatures
Phase 4 (todo): Report and resolve incidents per use-case scenarios
```

Each phase is an internal function called from `run()`, commented out until implemented.

---

## Actor Data (Phase 1)

All 9 actors use Anvil's well-known deterministic keys (accounts #1–#9). Admin is account #0.

| Anvil # | Name | Role |
|---|---|---|
| #1 | TechCorp S.L. | Sender |
| #2 | MediSupply S.A. | Sender |
| #3 | ExpressRide Courier | Carrier |
| #4 | UrbanDeliver S.L. | Carrier |
| #5 | Hub Logístico Madrid Centro | Hub |
| #6 | Hub Logístico Barcelona Norte | Hub |
| #7 | Startup Innovations S.A. | Recipient |
| #8 | Hospital Valle Verde | Recipient |
| #9 | Inspector García (QC) | Inspector |

---

## Verification

After `npm run dev` completes the seed step:

1. **Admin panel** (`/admin`) → all 9 in Active Actors table (none pending).
2. Switch MetaMask to Anvil account #1 → home shows dashboard, not registration form.
3. Terminal check:
   ```bash
   cast call 0x5FbDB2315678afecb367f032d93F642f64180aa3 \
     "getActor(address)(address,string,uint8,string,bool)" \
     0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
     --rpc-url http://localhost:8545
   ```
   Last field = `true` (isActive = approved).
