'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { getContract } from '@/lib/web3';
import {
  Shipment,
  ShipmentStatus,
  STATUS_LABELS,
  ActorRole,
  ROLE_LABELS,
  parseShipment,
} from '@/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Loader2,
  MapPin,
} from 'lucide-react';

function StatusBadge({ status }: { status: ShipmentStatus }) {
  const classMap: Record<ShipmentStatus, string> = {
    [ShipmentStatus.Created]: 'bg-blue-100 text-blue-800',
    [ShipmentStatus.InTransit]: 'bg-yellow-100 text-yellow-800',
    [ShipmentStatus.AtHub]: 'bg-purple-100 text-purple-800',
    [ShipmentStatus.OutForDelivery]: 'bg-orange-100 text-orange-800',
    [ShipmentStatus.Delivered]: 'bg-green-100 text-green-800',
    [ShipmentStatus.Returned]: 'bg-gray-100 text-gray-800',
    [ShipmentStatus.Cancelled]: 'bg-red-100 text-red-800',
  };
  return (
    <Badge variant="outline" className={classMap[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export default function DashboardPage() {
  const { address, isConnected, actorInfo, isAdmin, isLoading: walletLoading } = useWallet();
  const router = useRouter();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadShipments = useCallback(async () => {
    if (!address || (!actorInfo && !isAdmin)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const contract = await getContract();
      const results: Shipment[] = [];

      if (isAdmin || actorInfo?.role === ActorRole.Carrier || actorInfo?.role === ActorRole.Hub) {
        const filter = contract.filters.ShipmentCreated();
        const events = await contract.queryFilter(filter);
        const seen = new Set<string>();
        for (const event of events) {
          const id = ('args' in event && event.args ? event.args[0] : null) as bigint | null;
          if (!id || seen.has(String(id))) continue;
          seen.add(String(id));
          try {
            const raw = await contract.getShipment(id);
            results.push(parseShipment(raw as Record<string | number, unknown>));
          } catch { /* skip */ }
        }
      } else {
        const ids: bigint[] = await contract.getActorShipments(address);
        for (const id of ids) {
          const raw = await contract.getShipment(id);
          results.push(parseShipment(raw as Record<string | number, unknown>));
        }
      }

      results.sort((a, b) => Number(b.dateCreated - a.dateCreated));
      setShipments(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [address, actorInfo, isAdmin]);

  useEffect(() => {
    if (!walletLoading && !isConnected) router.push('/');
  }, [isConnected, walletLoading, router]);

  useEffect(() => {
    if (isConnected && address) loadShipments();
  }, [isConnected, address, loadShipments]);

  const active = shipments.filter(
    (s) => s.status !== ShipmentStatus.Delivered && s.status !== ShipmentStatus.Cancelled
  ).length;
  const delivered = shipments.filter((s) => s.status === ShipmentStatus.Delivered).length;

  if (walletLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const role = actorInfo?.role;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {actorInfo && (
          <p className="text-sm text-muted-foreground mt-0.5">
            {actorInfo.name} · <Badge variant="secondary">{ROLE_LABELS[actorInfo.role]}</Badge>
          </p>
        )}
        {isAdmin && (
          <p className="text-sm text-muted-foreground mt-0.5">Admin account</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1.5">
              <Package className="size-4" /> Total Shipments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{shipments.length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1.5">
              <Truck className="size-4" /> Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{active}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1.5">
              <CheckCircle2 className="size-4" /> Delivered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{delivered}</span>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        {(role === ActorRole.Sender) && (
          <Link href="/shipments/create" className={cn(buttonVariants())}>
            <Plus className="size-4 mr-1.5" /> Create Shipment
          </Link>
        )}
        {(role === ActorRole.Carrier || role === ActorRole.Hub) && (
          <Link href="/checkpoints/record" className={cn(buttonVariants())}>
            <MapPin className="size-4 mr-1.5" /> Record Checkpoint
          </Link>
        )}
        <Link href="/shipments" className={cn(buttonVariants({ variant: 'outline' }))}>
          <Package className="size-4 mr-1.5" /> All Shipments
        </Link>
        <Link href="/incidents" className={cn(buttonVariants({ variant: 'outline' }))}>
          <AlertTriangle className="size-4 mr-1.5" /> Incidents
        </Link>
        {isAdmin && (
          <Link href="/admin" className={cn(buttonVariants({ variant: 'outline' }))}>Admin Panel</Link>
        )}
      </div>

      {/* Recent shipments */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Recent Shipments</h2>
        {shipments.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No shipments yet.{' '}
              {role === ActorRole.Sender && (
                <Link href="/shipments/create" className="underline">
                  Create your first shipment
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {shipments.slice(0, 8).map((s) => (
              <Link key={String(s.id)} href={`/shipments/${s.id}`}>
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{s.product}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {s.origin} → {s.destination}
                      </p>
                    </div>
                    <StatusBadge status={s.status} />
                  </CardContent>
                </Card>
              </Link>
            ))}
            {shipments.length > 8 && (
              <Link href="/shipments" className={cn(buttonVariants({ variant: 'outline' }), 'w-full text-center')}>
                View all {shipments.length} shipments
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
