# Technical Architecture — Supply Chain Tracker Logistics (GloboSend Express)

---

## 1. System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        LOCAL MACHINE                             │
│                                                                  │
│  ┌─────────────────────────┐    ┌────────────────────────────┐  │
│  │   sc/  (Foundry)        │    │  web/  (Next.js 14)        │  │
│  │                         │    │                            │  │
│  │  forge build / test     │    │  localhost:3000            │  │
│  │  forge deploy           │◄───│  ethers.js v6              │  │
│  │  LogisticsTracker.sol   │    │  Web3Context + hooks       │  │
│  │                         │    │  MetaMask (window.ethereum)│  │
│  └──────────┬──────────────┘    └──────────────┬─────────────┘  │
│             │ Deploy Script                     │ eth_* / RPC    │
│             ▼                                   ▼                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              ANVIL  (localhost:8545)                     │   │
│  │              Chain ID: 31337                             │   │
│  │              10 pre-funded accounts + private keys       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────┐                      │
│  │  mcp-server/  (TypeScript MCP Server) │                      │
│  │  Wraps: forge | anvil | cast CLI      │                      │
│  │  Transport: stdio → Claude Code       │                      │
│  └───────────────────────────────────────┘                      │
└──────────────────────────────────────────────────────────────────┘

    For final delivery: Anvil → Sepolia Testnet (Chain ID: 11155111)
```

---

## 2. Smart Contract Architecture

**Contract:** `LogisticsTracker`  
**File:** `sc/src/LogisticsTracker.sol`  
**Solidity:** `^0.8.20`  
**Dependencies:** None (pure Solidity, no OpenZeppelin in MVP)

### Data Model Relationships

```
Actor (mapping: address → Actor)
  └─► Sender creates Shipment
        ├─► checkpointIds[] → Checkpoint (mapping: uint256 → Checkpoint)
        └─► incidentIds[]   → Incident   (mapping: uint256 → Incident)
              └─► resolved by Admin or original reporter
```

### Struct Storage Layout

```solidity
mapping(uint256 => Shipment)   public shipments;
mapping(uint256 => Checkpoint) public checkpoints;
mapping(uint256 => Incident)   public incidents;
mapping(address => Actor)      public actors;
mapping(address => uint256[])  internal actorShipments; // for getActorShipments()
```

### Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Domain model | Shipment/Checkpoint/Incident | TFM2 priority; matches Option 5 (Paquetería Express) |
| No token minting | Pure struct tracking | Logistics is event-based, not asset-based |
| IDs in Shipment struct | `checkpointIds[]`, `incidentIds[]` | Enables O(n) retrieval without secondary indices |
| Temperature encoding | `int256` × 10 | No floats in Solidity; supports negative temps |
| Admin approval | `isActive` flag on Actor | Mirrors README pattern; adapted for logistics roles |
| No upgradability proxy | Direct deploy | KISS; noted as optional O12 |
| Solidity version | 0.8.20 | Latest stable; custom errors available |

### Access Control Summary

| Function | Caller |
|---|---|
| `approveActor` / `deactivateActor` | `onlyAdmin` |
| `createShipment` | Active actor with `ActorRole.Sender` |
| `recordCheckpoint` | Any `onlyActiveActor` |
| `reportIncident` | Any `onlyActiveActor` |
| `confirmDelivery` | Active actor who is `shipments[id].recipient` |
| `cancelShipment` | Active actor who is `shipments[id].sender` |
| `resolveIncident` | Admin OR `incidents[id].reporter` |
| `updateShipmentStatus` | Any `onlyActiveActor` (with status transition guards) |
| All `get*` functions | Anyone (view) |

---

## 3. Frontend Architecture

**Framework:** Next.js 14 (App Router)  
**Language:** TypeScript strict  
**Styling:** Tailwind CSS + shadcn/ui  
**Web3:** ethers.js v6  
**State:** React Context (`Web3Context`) + `localStorage` for session

### Directory Structure

```
web/src/
├── app/
│   ├── layout.tsx                    # Root layout — wraps in <Web3Provider>
│   ├── page.tsx                      # Landing: 4 connection states
│   ├── dashboard/page.tsx            # Role-aware stats + quick actions
│   ├── shipments/
│   │   ├── page.tsx                  # Shipment list (filtered by role)
│   │   ├── create/page.tsx           # Create shipment form (Sender only)
│   │   └── [id]/page.tsx             # Tracking timeline (DHL-style)
│   ├── checkpoints/
│   │   └── record/page.tsx           # Record checkpoint (Carrier/Hub only)
│   ├── incidents/page.tsx            # Incident list + report + resolve
│   ├── admin/
│   │   ├── page.tsx                  # Pending actor approvals
│   │   └── actors/page.tsx           # Full actor list
│   ├── profile/page.tsx              # Actor info + shipments
│   └── api/
│       └── analyze-incident/route.ts # Optional: Claude AI analysis
├── components/
│   ├── ui/                           # shadcn/ui components
│   ├── Header.tsx
│   ├── TrackingTimeline.tsx          # Most important: DHL-style visual
│   ├── ShipmentCard.tsx
│   ├── CheckpointForm.tsx
│   ├── IncidentCard.tsx
│   └── ActorTable.tsx
├── contexts/
│   └── Web3Context.tsx
├── hooks/
│   └── useWallet.ts
├── lib/
│   └── web3.ts
└── contracts/
    ├── config.ts
    └── LogisticsTracker.json         # ABI from sc/out/
```

### Page → Role Access Matrix

| Page | Public | Admin | Sender | Carrier | Hub | Recipient | Inspector |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `/` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/dashboard` | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/shipments` | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/shipments/create` | — | — | ✓ | — | — | — | — |
| `/shipments/[id]` | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/checkpoints/record` | — | — | — | ✓ | ✓ | — | — |
| `/incidents` | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/admin/*` | — | ✓ | — | — | — | — | — |
| `/profile` | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### Web3Context State Shape

```typescript
interface Web3State {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  actorInfo: Actor | null;     // from contract getActor()
  isAdmin: boolean;            // address === CONTRACT_CONFIG.adminAddress
  isLoading: boolean;
}
```

---

## 4. MCP Server Architecture

**Location:** `mcp-server/`  
**Language:** TypeScript  
**SDK:** `@modelcontextprotocol/sdk`  
**Transport:** stdio (standard for Claude Code)

### Tools Exposed

| Tool Name | CLI Command | Purpose |
|---|---|---|
| `forge_build` | `forge build` | Compile contracts |
| `forge_test` | `forge test [--match-test X] [-vvv]` | Run tests |
| `forge_coverage` | `forge coverage` | Coverage report |
| `forge_deploy` | `forge script Deploy.s.sol ...` | Deploy to network |
| `anvil_start` | `anvil [--port N]` | Start local blockchain |
| `cast_call` | `cast call <addr> <sig> [args]` | Read contract state |
| `cast_send` | `cast send <addr> <sig> [args] --pk` | Write to contract |
| `cast_balance` | `cast balance <addr>` | ETH balance |

### Integration with Claude Code

`/.mcp.json` in project root:
```json
{
  "mcpServers": {
    "foundry": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"]
    }
  }
}
```

---

## 5. Development Environment

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | `nvm install 20` |
| Foundry | latest | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| MetaMask | latest | Browser extension |
| Next.js | 14+ | `npx create-next-app@latest` |
| ethers.js | v6 | `npm install ethers@6` |

### Local Dev Startup Sequence

```bash
# Terminal 1: Start local blockchain
anvil

# Terminal 2: Compile + deploy contract (after anvil is running)
cd sc
forge build
forge script script/Deploy.s.sol \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
# Copy deployed address → update web/.env.local

# Terminal 3: (optional) Seed demo data
forge script script/Seed.s.sol \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast

# Terminal 4: Start frontend
cd web && npm run dev
# Open http://localhost:3000

# Terminal 5: (optional) MCP server for Claude Code
cd mcp-server && npm run build && npm run start
```

### MetaMask Setup for Local Dev

1. Add network: Name=`Anvil Local`, RPC=`http://localhost:8545`, Chain ID=`31337`, Symbol=`ETH`
2. Import at least 5 Anvil private keys (admin, sender1, carrier1, hub1, recip1)
3. Switch to Anvil Local network before using the DApp

---

## 6. Testnet Deployment (Final Delivery)

**Network:** Sepolia (Chain ID: 11155111)  
**Why Sepolia:** Most active EVM testnet; free faucets; Etherscan support  
**RPC Provider:** Infura or Alchemy (free tier)

### Deployment Steps

```bash
# 1. Get Sepolia ETH
# https://sepoliafaucet.com/ or https://faucets.chain.link/

# 2. Create sc/.env (never commit)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
PRIVATE_KEY=0x_your_deployer_private_key
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY

# 3. Deploy + verify
forge script script/Deploy.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# 4. Update frontend
# web/.env.local:
# NEXT_PUBLIC_CONTRACT_ADDRESS=0x_deployed_address
# NEXT_PUBLIC_ADMIN_ADDRESS=0x_your_deployer_address
# NEXT_PUBLIC_SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_KEY
```

### Network Config in Frontend

```typescript
// web/src/contracts/config.ts
export const NETWORK_CONFIG = {
  anvil:  { chainId: 31337,    name: 'Anvil Local',    rpcUrl: 'http://localhost:8545' },
  sepolia: { chainId: 11155111, name: 'Sepolia Testnet', rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC! },
};
// Frontend accepts both networks; shows warning if on wrong network
```
