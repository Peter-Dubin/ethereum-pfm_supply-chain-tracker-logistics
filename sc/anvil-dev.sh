#!/usr/bin/env bash
# Runs Anvil with MetaMask ERC20 token-detection noise suppressed.
#
# MetaMask automatically probes every contract with balanceOf/symbol/decimals
# (ERC20 auto-detection). Since LogisticsTracker is not an ERC20 token these
# calls revert, producing harmless but noisy "RPC request failed" blocks in the
# Anvil log. This script filters those blocks out while keeping all other output.
#
# Usage: ./anvil-dev.sh [anvil flags...]
# Example: ./anvil-dev.sh --block-time 2

anvil "$@" 2>&1 | awk '
  /^RPC request failed:/ { skip=1; next }
  skip && /^[[:space:]]/ { next }
  skip && /^$/ { next }
  { skip=0; print }
'
