import { type InterfaceAbi } from 'ethers';
import LogisticsTrackerABI from './LogisticsTracker.json';

export const CONTRACT_CONFIG = {
  address: (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? '') as `0x${string}`,
  abi: (LogisticsTrackerABI as { abi: InterfaceAbi }).abi,
  adminAddress: (process.env.NEXT_PUBLIC_ADMIN_ADDRESS ?? '') as `0x${string}`,
};

export const NETWORK_CONFIG = {
  anvil: {
    chainId: 31337,
    name: 'Anvil Local',
    rpcUrl: 'http://localhost:8545',
    symbol: 'ETH',
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC ?? '',
    symbol: 'ETH',
  },
};

export const SUPPORTED_CHAIN_IDS = [31337, 11155111];

export function getNetworkName(chainId: number | null): string {
  if (chainId === 31337) return 'Anvil Local';
  if (chainId === 11155111) return 'Sepolia';
  if (chainId) return `Chain ${chainId}`;
  return 'Not connected';
}
