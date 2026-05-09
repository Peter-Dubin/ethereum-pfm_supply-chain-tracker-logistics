'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getProvider, getContract } from '@/lib/web3';
import { CONTRACT_CONFIG } from '@/contracts/config';
import { ActorInfo, ActorRole } from '@/types';

interface Web3ContextType {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  actorInfo: ActorInfo | null;
  isAdmin: boolean;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshActorInfo: () => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | null>(null);

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [actorInfo, setActorInfo] = useState<ActorInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isConnected = !!address;
  const isAdmin = !!(
    address &&
    CONTRACT_CONFIG.adminAddress &&
    address.toLowerCase() === CONTRACT_CONFIG.adminAddress.toLowerCase()
  );

  const fetchActorInfo = useCallback(async (addr: string) => {
    try {
      const contract = await getContract();
      const raw = await contract.getActor(addr);
      if (!raw || raw.actorAddress === ethers.ZeroAddress) {
        setActorInfo(null);
      } else {
        setActorInfo({
          actorAddress: raw.actorAddress as string,
          name: raw.name as string,
          role: Number(raw.role) as ActorRole,
          location: raw.location as string,
          isActive: raw.isActive as boolean,
        });
      }
    } catch {
      setActorInfo(null);
    }
  }, []);

  const connect = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('MetaMask not found. Please install MetaMask to use LogistChain.');
      return;
    }
    setIsLoading(true);
    try {
      const provider = getProvider();
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      const network = await provider.getNetwork();
      setAddress(addr);
      setChainId(Number(network.chainId));
      localStorage.setItem('lastConnectedAddress', addr);
      await fetchActorInfo(addr);
    } catch (err) {
      console.error('Connect failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = useCallback(() => {
    setAddress(null);
    setChainId(null);
    setActorInfo(null);
    localStorage.removeItem('lastConnectedAddress');
  }, []);

  const refreshActorInfo = useCallback(async () => {
    if (address) await fetchActorInfo(address);
  }, [address, fetchActorInfo]);

  // Auto-reconnect on mount
  useEffect(() => {
    const lastAddr = localStorage.getItem('lastConnectedAddress');
    if (!lastAddr || typeof window === 'undefined' || !window.ethereum) return;

    setIsLoading(true);
    (window.ethereum.request({ method: 'eth_accounts' }) as Promise<string[]>)
      .then(async (accounts: string[]) => {
        if (accounts.length > 0 && accounts[0].toLowerCase() === lastAddr.toLowerCase()) {
          const provider = getProvider();
          const network = await provider.getNetwork();
          setAddress(accounts[0]);
          setChainId(Number(network.chainId));
          await fetchActorInfo(accounts[0]);
        } else {
          localStorage.removeItem('lastConnectedAddress');
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [fetchActorInfo]);

  // MetaMask event listeners
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    const handleAccountsChanged = async (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        disconnect();
      } else {
        const addr = accounts[0];
        setAddress(addr);
        localStorage.setItem('lastConnectedAddress', addr);
        try {
          const provider = getProvider();
          const network = await provider.getNetwork();
          setChainId(Number(network.chainId));
        } catch { /* keep existing chainId */ }
        await fetchActorInfo(addr);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnect, fetchActorInfo]);

  return (
    <Web3Context.Provider
      value={{ address, isConnected, chainId, actorInfo, isAdmin, isLoading, connect, disconnect, refreshActorInfo }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3(): Web3ContextType {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error('useWeb3 must be used inside Web3Provider');
  return ctx;
}
