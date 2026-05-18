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
echo "[1/5] Starting Anvil..."
"$ROOT/sc/anvil-dev.sh" &>/tmp/anvil.log &
ANVIL_PID=$!
until cast block-number --rpc-url "$ANVIL_RPC" &>/dev/null; do sleep 0.3; done
echo "      Ready (PID $ANVIL_PID)"

# 2. Deploy contract — address is always deterministic for Anvil account #0
echo "[2/5] Deploying LogisticsTracker..."
cd "$ROOT/sc"
PRIVATE_KEY="$ADMIN_KEY" forge script script/Deploy.s.sol \
  --rpc-url "$ANVIL_RPC" \
  --broadcast 2>&1 | grep -E "(deployed at|Error|FAIL)" || true
echo "      Contract at $CONTRACT_ADDRESS"

# 3. Seed actors + UC-01 + UC-02
echo "[3/5] Seeding actors + UC-01 + UC-02..."
CONTRACT_ADDRESS="$CONTRACT_ADDRESS" PRIVATE_KEY="$ADMIN_KEY" \
  forge script script/Seed.s.sol \
  --rpc-url "$ANVIL_RPC" \
  --broadcast 2>&1 | grep -E "(Phase|Error|FAIL)" || true
echo "      Actors registered + UC-01 seeded (Delivered) + UC-02 seeded (AtHub, mid-journey)"

# 4. Seed UC-03 step by step — each step is a separate forge invocation so every
#    checkpoint lands in a different Anvil block and gets a distinct wall-clock timestamp.
#    sleep 2 between steps guarantees at least 2 s apart in block.timestamp.
echo "[4/5] Seeding UC-03 step by step (7 steps, ~20s)..."
for UC03_STEP in 1 2 3 4 5 6 7; do
  UC03_STEP=$UC03_STEP CONTRACT_ADDRESS="$CONTRACT_ADDRESS" \
    forge script script/SeedUC03.s.sol \
    --rpc-url "$ANVIL_RPC" \
    --broadcast 2>&1 | grep -E "(UC-03 Step|Error|FAIL)" || true
  [ "$UC03_STEP" -lt 7 ] && sleep 2
done
echo "      UC-03 seeded (Limited Edition Watch, 4 checkpoints + 1 resolved incident, InTransit)"

# 5. Start Next.js frontend
echo "[5/5] Starting frontend..."
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
