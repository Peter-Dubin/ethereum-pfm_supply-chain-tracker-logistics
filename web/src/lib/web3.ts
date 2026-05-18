import { ethers } from 'ethers';
import { CONTRACT_CONFIG, NETWORK_CONFIG } from '@/contracts/config';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

export function getProvider(): ethers.BrowserProvider {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not found');
  }
  return new ethers.BrowserProvider(window.ethereum);
}

// MetaMask caches eth_call responses by block number and may return stale data after
// Anvil restarts (same chain ID 31337, reset state). All reads bypass MetaMask by
// going directly to the RPC node — only signing (writes) needs MetaMask.
export function getReadProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(NETWORK_CONFIG.anvil.rpcUrl);
}

export async function getContract(signer?: ethers.Signer): Promise<ethers.Contract> {
  if (signer) {
    return new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_CONFIG.abi, signer);
  }
  return new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_CONFIG.abi, getReadProvider());
}

export async function getSignerAndContract(): Promise<{
  signer: ethers.Signer;
  contract: ethers.Contract;
}> {
  const provider = getProvider();
  const signer = await provider.getSigner();
  const contract = await getContract(signer);
  return { signer, contract };
}

export function bigIntToDate(n: bigint): Date {
  return new Date(Number(n) * 1000);
}

export function bigIntToDateStr(n: bigint): string {
  if (n === 0n) return '—';
  return bigIntToDate(n).toLocaleString();
}

export function tempToDisplay(t: bigint): string {
  return (Number(t) / 10).toFixed(1) + '°C';
}

export function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}
