'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { getContract, getSignerAndContract, bigIntToDateStr, shortenAddress } from '@/lib/web3';
import {
  Shipment,
  Checkpoint,
  Incident,
  ShipmentStatus,
  STATUS_LABELS,
  parseShipment,
  parseCheckpoint,
  parseIncident,
  parseActorInfo,
} from '@/types';
import { TrackingTimeline } from '@/components/TrackingTimeline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  ArrowRight,
  Thermometer,
  CheckCircle2,
  Loader2,
  Package,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

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
    <Badge variant="outline" className={`text-sm ${classMap[status]}`}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export default function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { address, actorInfo } = useWallet();
  const router = useRouter();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [actorsMap, setActorsMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const contract = await getContract();
      const [rawShipment, rawCheckpoints, rawIncidents] = await Promise.all([
        contract.getShipment(BigInt(id)),
        contract.getShipmentCheckpoints(BigInt(id)),
        contract.getShipmentIncidents(BigInt(id)),
      ]);

      const parsedShipment = parseShipment(rawShipment as Record<string | number, unknown>);
      const parsedCheckpoints = (rawCheckpoints as Record<string, unknown>[]).map(parseCheckpoint);

      setShipment(parsedShipment);
      setCheckpoints(parsedCheckpoints);
      setIncidents((rawIncidents as Record<string, unknown>[]).map(parseIncident));

      const addresses = new Set<string>([
        parsedShipment.sender.toLowerCase(),
        parsedShipment.recipient.toLowerCase(),
        ...parsedCheckpoints.map((cp) => cp.actor.toLowerCase()),
      ]);
      const map = new Map<string, string>();
      for (const addr of addresses) {
        try {
          const raw = await contract.getActor(addr);
          const info = parseActorInfo(raw as Record<string, unknown>);
          if (info.name) map.set(addr, info.name);
        } catch { /* skip */ }
      }
      setActorsMap(map);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load shipment');
      router.push('/shipments');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleConfirmDelivery = async () => {
    setConfirming(true);
    try {
      const { contract } = await getSignerAndContract();
      const tx = await contract.confirmDelivery(BigInt(id));
      toast.loading('Confirming delivery…', { id: 'confirm' });
      await tx.wait();
      toast.success('Delivery confirmed on-chain!', { id: 'confirm' });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed';
      toast.error(msg.slice(0, 100), { id: 'confirm' });
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!shipment) return null;

  const isRecipient = address?.toLowerCase() === shipment.recipient.toLowerCase();
  const canConfirm =
    isRecipient && shipment.status === ShipmentStatus.OutForDelivery;
  const openIncidents = incidents.filter((i) => !i.resolved);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Package className="size-5 text-primary" />
            <h1 className="text-2xl font-bold">{shipment.product}</h1>
            {shipment.requiresColdChain && (
              <span className="flex items-center gap-1 text-xs text-sky-600">
                <Thermometer className="size-3.5" /> Cold Chain
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
            <span>{shipment.origin}</span>
            <ArrowRight className="size-4 shrink-0" />
            <span>{shipment.destination}</span>
          </div>
        </div>
        <StatusBadge status={shipment.status} />
      </div>

      {/* Confirm delivery CTA */}
      {canConfirm && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-green-800">Package out for delivery</p>
              <p className="text-sm text-green-700">Confirm receipt to complete the on-chain record.</p>
            </div>
            <Button onClick={handleConfirmDelivery} disabled={confirming}>
              {confirming ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="size-4 mr-2" />
              )}
              Confirm Delivery
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Incidents banner */}
      {openIncidents.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="py-3 flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive shrink-0" />
            <span className="text-sm text-destructive font-medium">
              {openIncidents.length} open incident{openIncidents.length > 1 ? 's' : ''} on this shipment
            </span>
          </CardContent>
        </Card>
      )}

      {/* Shipment details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Shipment ID</dt>
              <dd className="font-mono">#{String(shipment.id)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd>{STATUS_LABELS[shipment.status]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Sender</dt>
              <dd>
                {actorsMap.get(shipment.sender.toLowerCase()) && (
                  <span className="font-medium">{actorsMap.get(shipment.sender.toLowerCase())} </span>
                )}
                <span className="font-mono text-muted-foreground">{shortenAddress(shipment.sender)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Recipient</dt>
              <dd>
                {actorsMap.get(shipment.recipient.toLowerCase()) && (
                  <span className="font-medium">{actorsMap.get(shipment.recipient.toLowerCase())} </span>
                )}
                <span className="font-mono text-muted-foreground">{shortenAddress(shipment.recipient)}</span>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{bigIntToDateStr(shipment.dateCreated)}</dd>
            </div>
            {shipment.dateDelivered > 0n && (
              <div>
                <dt className="text-muted-foreground">Delivered</dt>
                <dd>{bigIntToDateStr(shipment.dateDelivered)}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Tracking Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tracking Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <TrackingTimeline
            checkpoints={checkpoints}
            incidents={incidents}
            currentStatus={shipment.status}
            actorsMap={actorsMap}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      {actorInfo && (
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => router.push('/shipments')}>
            Back to Shipments
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/incidents?shipment=${id}`)}
          >
            <AlertTriangle className="size-4 mr-1.5" />
            Report Incident
          </Button>
        </div>
      )}

      <Separator />
      <p className="text-xs text-muted-foreground">
        {checkpoints.length} checkpoint{checkpoints.length !== 1 ? 's' : ''} ·{' '}
        {incidents.length} incident{incidents.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
