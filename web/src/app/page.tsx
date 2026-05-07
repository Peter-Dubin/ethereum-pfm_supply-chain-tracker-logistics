'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { getSignerAndContract } from '@/lib/web3';
import { ActorRole, ROLE_LABELS } from '@/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Loader2, Clock, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const REGISTRABLE_ROLES = [
  ActorRole.Sender,
  ActorRole.Carrier,
  ActorRole.Hub,
  ActorRole.Recipient,
  ActorRole.Inspector,
];

export default function HomePage() {
  const { isConnected, isLoading, actorInfo, isAdmin, connect, refreshActorInfo } = useWallet();

  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('');
  const [location, setLocation] = useState('');
  const [registering, setRegistering] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !role || !location.trim()) {
      toast.error('All fields are required');
      return;
    }
    setRegistering(true);
    try {
      const { contract } = await getSignerAndContract();
      const tx = await contract.registerActor(name.trim(), Number(role), location.trim());
      toast.loading('Submitting registration…', { id: 'reg' });
      await tx.wait();
      toast.success('Registration submitted! Waiting for admin approval.', { id: 'reg' });
      await refreshActorInfo();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      toast.error(msg.includes('Already registered') ? 'Already registered' : 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 text-center">
        <Package className="size-16 text-primary mb-6" />
        <h1 className="text-4xl font-bold mb-3">LogistChain</h1>
        <p className="text-muted-foreground text-lg mb-2 max-w-md">
          Blockchain-powered courier tracking — every checkpoint, delivery confirmation, and incident on-chain.
        </p>
        <p className="text-sm text-muted-foreground mb-8 italic">&ldquo;The chain of trust.&rdquo;</p>
        <Button size="lg" onClick={connect} disabled={isLoading}>
          {isLoading ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
          Connect MetaMask
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 text-center">
        <ShieldCheck className="size-12 text-primary mb-4" />
        <h2 className="text-2xl font-bold mb-2">Welcome, Admin</h2>
        <p className="text-muted-foreground mb-6">Manage actors and oversee the LogistChain network.</p>
        <div className="flex gap-3">
          <Link href="/admin" className={cn(buttonVariants())}>Open Admin Panel</Link>
          <Link href="/dashboard" className={cn(buttonVariants({ variant: 'outline' }))}>Dashboard</Link>
        </div>
      </div>
    );
  }

  if (!actorInfo) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Join LogistChain</CardTitle>
            <CardDescription>Register as an actor to start using the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Company / Name</Label>
              <Input
                id="name"
                placeholder="e.g. TechCorp S.L."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v ?? '')}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {REGISTRABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g. Madrid, Spain"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleRegister} disabled={registering}>
              {registering ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Register
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!actorInfo.isActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 text-center">
        <Clock className="size-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Awaiting Approval</h2>
        <p className="text-muted-foreground mb-1">
          Your registration as <strong>{ROLE_LABELS[actorInfo.role]}</strong> is pending admin review.
        </p>
        <p className="text-sm text-muted-foreground">Check back after the admin approves your account.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4 text-center">
      <Package className="size-12 text-primary mb-4" />
      <h2 className="text-2xl font-bold mb-1">Welcome back, {actorInfo.name}</h2>
      <p className="text-muted-foreground mb-6">
        {ROLE_LABELS[actorInfo.role]} · {actorInfo.location}
      </p>
      <Link href="/dashboard" className={cn(buttonVariants({ size: 'lg' }))}>
        <LayoutDashboard className="size-4 mr-2" />
        Go to Dashboard
      </Link>
    </div>
  );
}
