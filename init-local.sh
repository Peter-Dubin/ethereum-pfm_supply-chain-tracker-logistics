#!/bin/bash
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANVIL_RPC="http://localhost:8545"
ADMIN_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
CONTRACT_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"

cleanup() {
  echo ""
  echo "Stopping services..."
  kill "$ANVIL_PID" "$NEXT_PID" 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT INT TERM

echo "=== LogistChain Local Environment ==="
echo ""

# 1. Start Anvil (filtered console via anvil-dev.sh)
echo "[1/4] Starting Anvil..."
"$ROOT/sc/anvil-dev.sh" &>/tmp/anvil.log &
ANVIL_PID=$!
until cast block-number --rpc-url "$ANVIL_RPC" &>/dev/null; do sleep 0.3; done
echo "      Ready (PID $ANVIL_PID)"

# 2. Deploy contract — address is always deterministic for Anvil account #0
echo "[2/4] Deploying LogisticsTracker..."
cd "$ROOT/sc"
PRIVATE_KEY="$ADMIN_KEY" forge script script/Deploy.s.sol \
  --rpc-url "$ANVIL_RPC" \
  --broadcast 2>&1 | grep -E "(deployed at|Error|FAIL)" || true
echo "      Contract at $CONTRACT_ADDRESS"

# 3. Seed actors (Phase 1)
echo "[3/4] Seeding 9 actors..."
CONTRACT_ADDRESS="$CONTRACT_ADDRESS" PRIVATE_KEY="$ADMIN_KEY" \
  forge script script/Seed.s.sol \
  --rpc-url "$ANVIL_RPC" \
  --broadcast 2>&1 | grep -E "(Phase|Error|FAIL)" || true
echo "      Actors registered + UC-01 seeded (Delivered) + UC-02 seeded (AtHub, mid-journey)"

# 4. Start Next.js frontend
echo "[4/4] Starting frontend..."
cd "$ROOT/web"
npm run dev &>/tmp/next.log &
NEXT_PID=$!

echo ""
echo "LogistChain is running:"
echo "  Frontend : http://localhost:3000"
echo "  Anvil RPC: $ANVIL_RPC"
echo "  Anvil log: /tmp/anvil.log"
echo "  Next log : /tmp/next.log"
echo ""
echo "Ctrl+C to stop all services"
wait "$NEXT_PID"
