'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { getContract, getSignerAndContract, shortenAddress } from '@/lib/web3';
import { ActorInfo, ActorRole, ROLE_LABELS, parseActorInfo } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { toast } from 'sonner';

interface ActorRow extends ActorInfo {
  pendingApproval: boolean;
}

export default function AdminPage() {
  const { isConnected, isAdmin, isLoading: walletLoading } = useWallet();
  const router = useRouter();

  const [actors, setActors] = useState<ActorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadActors = useCallback(async () => {
    setLoading(true);
    try {
      const contract = await getContract();
      const filter = contract.filters.ActorRegistered();
      const events = await contract.queryFilter(filter);

      const seen = new Set<string>();
      const rows: ActorRow[] = [];

      for (const event of events) {
        const addr = ('args' in event && event.args ? event.args[0] : null) as string | null;
        if (!addr || seen.has(addr.toLowerCase())) continue;
        seen.add(addr.toLowerCase());

        try {
          const raw = await contract.getActor(addr);
          rows.push({
            ...parseActorInfo(raw as Record<string, unknown>),
            pendingApproval: !raw.isActive,
          });
        } catch {
          /* skip */
        }
      }

      rows.sort((a, b) => (a.isActive === b.isActive ? 0 : a.isActive ? 1 : -1));
      setActors(rows);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load actors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!walletLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, walletLoading, router]);

  useEffect(() => {
    if (isAdmin) loadActors();
  }, [isAdmin, loadActors]);

  const handleApprove = async (actorAddress: string) => {
    setActionInProgress(actorAddress);
    try {
      const { contract } = await getSignerAndContract();
      const tx = await contract.approveActor(actorAddress);
      toast.loading('Approving…', { id: actorAddress });
      await tx.wait();
      toast.success('Actor approved', { id: actorAddress });
      await loadActors();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed';
      toast.error(msg.slice(0, 80), { id: actorAddress });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeactivate = async (actorAddress: string) => {
    setActionInProgress(actorAddress);
    try {
      const { contract } = await getSignerAndContract();
      const tx = await contract.deactivateActor(actorAddress);
      toast.loading('Deactivating…', { id: actorAddress });
      await tx.wait();
      toast.success('Actor deactivated', { id: actorAddress });
      await loadActors();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed';
      toast.error(msg.slice(0, 80), { id: actorAddress });
    } finally {
      setActionInProgress(null);
    }
  };

  if (walletLoading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pending = actors.filter((a) => !a.isActive);
  const active = actors.filter((a) => a.isActive);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">Manage actor registrations and permissions</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Pending actors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Pending Approval</span>
                {pending.length > 0 && (
                  <Badge variant="destructive">{pending.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>Actors awaiting activation</CardDescription>
            </CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No pending registrations.</p>
              ) : (
                <ActorTable
                  actors={pending}
                  actionInProgress={actionInProgress}
                  onApprove={handleApprove}
                  onDeactivate={handleDeactivate}
                />
              )}
            </CardContent>
          </Card>

          {/* Active actors */}
          <Card>
            <CardHeader>
              <CardTitle>Active Actors</CardTitle>
              <CardDescription>{active.length} approved participants</CardDescription>
            </CardHeader>
            <CardContent>
              {active.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No active actors yet.</p>
              ) : (
                <ActorTable
                  actors={active}
                  actionInProgress={actionInProgress}
                  onApprove={handleApprove}
                  onDeactivate={handleDeactivate}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ActorTable({
  actors,
  actionInProgress,
  onApprove,
  onDeactivate,
}: {
  actors: ActorRow[];
  actionInProgress: string | null;
  onApprove: (addr: string) => void;
  onDeactivate: (addr: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Address</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {actors.map((actor) => {
          const busy = actionInProgress === actor.actorAddress;
          return (
            <TableRow key={actor.actorAddress}>
              <TableCell className="font-medium">{actor.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{ROLE_LABELS[actor.role as ActorRole]}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{actor.location}</TableCell>
              <TableCell className="font-mono text-xs">{shortenAddress(actor.actorAddress)}</TableCell>
              <TableCell>
                {actor.isActive ? (
                  <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                ) : (
                  <Badge variant="outline">Pending</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                  {!actor.isActive && (
                    <Button
                      size="sm"
                      onClick={() => onApprove(actor.actorAddress)}
                      disabled={busy}
                    >
                      {busy ? <Loader2 className="size-3 animate-spin mr-1" /> : <UserCheck className="size-3 mr-1" />}
                      Approve
                    </Button>
                  )}
                  {actor.isActive && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDeactivate(actor.actorAddress)}
                      disabled={busy}
                    >
                      {busy ? <Loader2 className="size-3 animate-spin mr-1" /> : <UserX className="size-3 mr-1" />}
                      Deactivate
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
