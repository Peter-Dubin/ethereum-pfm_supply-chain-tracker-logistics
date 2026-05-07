'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { getContract } from '@/lib/web3';
import { Shipment, ROLE_LABELS, parseShipment } from '@/types';
import { ShipmentCard } from '@/components/ShipmentCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, MapPin, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const { address, isConnected, actorInfo, isAdmin, isLoading: walletLoading } = useWallet();
  const router = useRouter();

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (walletLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-2">
        <User className="size-6 text-primary" />
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      {/* Actor info card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Info</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Wallet</dt>
              <dd className="font-mono text-xs break-all">{address}</dd>
            </div>
            {isAdmin && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Access</dt>
                <dd><Badge variant="secondary">Admin</Badge></dd>
              </div>
            )}
            {actorInfo && (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="font-medium">{actorInfo.name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Role</dt>
                  <dd>
                    <Badge variant="secondary">{ROLE_LABELS[actorInfo.role]}</Badge>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Location</dt>
                  <dd className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {actorInfo.location}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    {actorInfo.isActive ? (
                      <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
                    ) : (
                      <Badge variant="outline">Pending Approval</Badge>
                    )}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Shipment history */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          Shipment History ({shipments.length})
        </h2>
        {shipments.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No shipments associated with this account.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {shipments.map((s) => (
              <ShipmentCard key={String(s.id)} shipment={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
