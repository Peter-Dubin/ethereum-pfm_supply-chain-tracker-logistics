'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/hooks/useWallet';
import { getContract } from '@/lib/web3';
import { Shipment, ShipmentStatus, ActorRole, parseShipment } from '@/types';
import { ShipmentCard } from '@/components/ShipmentCard';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Plus, Loader2 } from 'lucide-react';

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: String(ShipmentStatus.Created), label: 'Created' },
  { value: String(ShipmentStatus.InTransit), label: 'In Transit' },
  { value: String(ShipmentStatus.AtHub), label: 'At Hub' },
  { value: String(ShipmentStatus.OutForDelivery), label: 'Out for Delivery' },
  { value: String(ShipmentStatus.Delivered), label: 'Delivered' },
  { value: String(ShipmentStatus.Returned), label: 'Returned' },
  { value: String(ShipmentStatus.Cancelled), label: 'Cancelled' },
];

export default function ShipmentsPage() {
  const { address, isConnected, actorInfo, isLoading: walletLoading } = useWallet();
  const router = useRouter();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const loadShipments = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const contract = await getContract();
      const ids: bigint[] = await contract.getActorShipments(address);
      const results: Shipment[] = [];
      for (const id of ids) {
        const raw = await contract.getShipment(id);
        results.push(parseShipment(raw as Record<string | number, unknown>));
      }
      results.sort((a, b) => Number(b.dateCreated - a.dateCreated));
      setShipments(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (!walletLoading && !isConnected) router.push('/');
  }, [isConnected, walletLoading, router]);

  useEffect(() => {
    if (isConnected && address) loadShipments();
  }, [isConnected, address, loadShipments]);

  const filtered =
    statusFilter === 'all'
      ? shipments
      : shipments.filter((s) => s.status === Number(statusFilter));

  if (walletLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Package className="size-6 text-primary" />
          <h1 className="text-2xl font-bold">Shipments</h1>
          <span className="text-muted-foreground text-sm">({shipments.length})</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {actorInfo?.role === ActorRole.Sender && (
            <Link href="/shipments/create" className={cn(buttonVariants())}>
              <Plus className="size-4 mr-1.5" /> Create
            </Link>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {shipments.length === 0 ? 'No shipments yet.' : 'No shipments match the filter.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <ShipmentCard key={String(s.id)} shipment={s} />
          ))}
        </div>
      )}
    </div>
  );
}
