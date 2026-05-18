'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { ActorRole, ROLE_LABELS } from '@/types';
import { getNetworkName } from '@/contracts/config';
import { shortenAddress } from '@/lib/web3';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from 'next-themes';
import {
  Package,
  Gem,
  LayoutDashboard,
  Truck,
  AlertTriangle,
  User,
  Shield,
  LogOut,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: 'all' },
  { href: '/shipments', label: 'Shipments', icon: Package, roles: 'all' },
  { href: '/checkpoints/record', label: 'Record Checkpoint', icon: Truck, roles: [ActorRole.Carrier, ActorRole.Hub, ActorRole.Inspector] },
  { href: '/incidents', label: 'Incidents', icon: AlertTriangle, roles: 'all' },
  { href: '/profile', label: 'Profile', icon: User, roles: 'all' },
] as const;

export function Header() {
  const { address, isConnected, chainId, actorInfo, isAdmin, isLoading, connect, disconnect } = useWallet();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const visibleLinks = NAV_LINKS.filter((link) => {
    if (!isConnected) return false;
    if (link.roles === 'all') return true;
    return actorInfo && ([...link.roles] as ActorRole[]).includes(actorInfo.role);
  });

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <Gem className="size-5 text-primary" />
          <span>LogistChain</span>
        </Link>

        {/* Nav */}
        {isConnected && (
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith('/admin')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Shield className="size-3.5" />
                Admin
              </Link>
            )}
            {visibleLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname.startsWith(href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {!isConnected ? (
            <Button size="sm" onClick={connect} disabled={isLoading}>
              {isLoading ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
              Connect MetaMask
            </Button>
          ) : (
            <>
              {chainId && (
                <Badge variant="outline" className="hidden sm:flex text-xs">
                  {getNetworkName(chainId)}
                </Badge>
              )}
              {actorInfo && (
                <Badge variant="secondary" className="hidden sm:flex text-xs">
                  {ROLE_LABELS[actorInfo.role]}
                </Badge>
              )}
              {isAdmin && (
                <Badge variant="secondary" className="hidden sm:flex text-xs">
                  Admin
                </Badge>
              )}
              <span className="text-sm text-muted-foreground hidden sm:block font-mono">
                {shortenAddress(address!)}
              </span>
              <Button size="icon" variant="ghost" onClick={disconnect} title="Disconnect">
                <LogOut className="size-4" />
              </Button>
            </>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle dark mode"
          >
            <Sun className="size-4 hidden dark:block" />
            <Moon className="size-4 dark:hidden" />
          </Button>
        </div>
      </div>
    </header>
  );
}
