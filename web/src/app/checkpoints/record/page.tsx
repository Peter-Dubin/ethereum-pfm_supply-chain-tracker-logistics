'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { getContract, getSignerAndContract } from '@/lib/web3';
import { ActorRole, Shipment, ShipmentStatus, STATUS_LABELS, parseShipment } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, Thermometer } from 'lucide-react';
import { toast } from 'sonner';
import { Suspense } from 'react';

const CHECKPOINT_TYPES = ['Pickup', 'Hub', 'Transit', 'Delivery'];

const STATUS_OPTIONS = [
  { value: 'none', label: 'Keep current status' },
  { value: STATUS_LABELS[ShipmentStatus.InTransit], label: 'Mark In Transit' },
  { value: STATUS_LABELS[ShipmentStatus.AtHub], label: 'Mark At Hub' },
  { value: STATUS_LABELS[ShipmentStatus.OutForDelivery], label: 'Mark Out for Delivery' },
  { value: STATUS_LABELS[ShipmentStatus.Returned], label: 'Mark Returned' },
];

function RecordCheckpointForm() {
  const { address, actorInfo, isLoading: walletLoading } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledId = searchParams.get('shipment') ?? '';

  const [shipmentId, setShipmentId] = useState(prefilledId);
  const [activeShipments, setActiveShipments] = useState<Shipment[]>([]);
  const [location, setLocation] = useState('');
  const [checkpointType, setCheckpointType] = useState('');
  const [notes, setNotes] = useState('');
  const [temp, setTemp] = useState('');
  const [newStatus, setNewStatus] = useState('none');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadShipments = useCallback(async () => {
    if (!address) return;
    try {
      const contract = await getContract();
      const ids: bigint[] = await contract.getActorShipments(address);
      const results: Shipment[] = [];
      for (const id of ids) {
        const raw = await contract.getShipment(id);
        const s = parseShipment(raw as Record<string | number, unknown>);
        if (
          s.status !== ShipmentStatus.Delivered &&
          s.status !== ShipmentStatus.Cancelled &&
          s.status !== ShipmentStatus.Returned
        ) {
          results.push(s);
        }
      }
      setActiveShipments(results);
    } catch (err) {
      console.error(err);
    }
  }, [address]);

  useEffect(() => {
    if (!walletLoading && actorInfo) {
      if (actorInfo.role !== ActorRole.Carrier && actorInfo.role !== ActorRole.Hub) {
        router.push('/dashboard');
        return;
      }
      loadShipments();
    }
  }, [walletLoading, actorInfo, loadShipments, router]);

  useEffect(() => {
    const found = activeShipments.find((s) => String(s.id) === shipmentId);
    setSelectedShipment(found ?? null);
  }, [shipmentId, activeShipments]);

  const handleSubmit = async () => {
    if (!shipmentId || !location.trim() || !checkpointType) {
      toast.error('Shipment, location, and type are required');
      return;
    }

    const tempValue = temp.trim() ? Math.round(parseFloat(temp) * 10) : 0;
    if (temp.trim() && isNaN(tempValue)) {
      toast.error('Invalid temperature value');
      return;
    }

    setSubmitting(true);
    try {
      const { contract } = await getSignerAndContract();

      const tx = await contract.recordCheckpoint(
        BigInt(shipmentId),
        location.trim(),
        checkpointType,
        notes.trim(),
        BigInt(tempValue)
      );
      toast.loading('Recording checkpoint…', { id: 'cp' });
      await tx.wait();

      if (newStatus !== 'none') {
        const statusNum = (Object.entries(STATUS_LABELS) as [string, string][]).find(([, label]) => label === newStatus)?.[0];
        const stx = await contract.updateShipmentStatus(BigInt(shipmentId), Number(statusNum ?? 0));
        await stx.wait();
      }

      toast.success('Checkpoint recorded!', { id: 'cp' });
      router.push(`/shipments/${shipmentId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      toast.error(msg.slice(0, 100), { id: 'cp' });
    } finally {
      setSubmitting(false);
    }
  };

  if (walletLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="size-5 text-primary" />
            <CardTitle>Record Checkpoint</CardTitle>
          </div>
          <CardDescription>Log a physical checkpoint for an active shipment.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Shipment selector */}
          <div className="space-y-1.5">
            <Label htmlFor="shipment">Shipment</Label>
            {activeShipments.length > 0 ? (
              <Select value={shipmentId} onValueChange={(v) => setShipmentId(v ?? '')}>
                <SelectTrigger id="shipment">
                  <SelectValue placeholder="Select a shipment" />
                </SelectTrigger>
                <SelectContent>
                  {activeShipments.map((s) => (
                    <SelectItem key={String(s.id)} value={String(s.id)}>
                      #{String(s.id)} — {s.product} ({STATUS_LABELS[s.status]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="shipment"
                placeholder="Enter Shipment ID"
                value={shipmentId}
                onChange={(e) => setShipmentId(e.target.value)}
              />
            )}
            {selectedShipment && (
              <p className="text-xs text-muted-foreground">
                {selectedShipment.origin} → {selectedShipment.destination}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g. Hub Logístico Madrid, Getafe"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Checkpoint type */}
          <div className="space-y-1.5">
            <Label htmlFor="type">Checkpoint Type</Label>
            <Select value={checkpointType} onValueChange={(v) => setCheckpointType(v ?? '')}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CHECKPOINT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="e.g. Package sealed and intact"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Temperature (conditional on cold chain) */}
          {(selectedShipment?.requiresColdChain || !selectedShipment) && (
            <div className="space-y-1.5">
              <Label htmlFor="temp" className="flex items-center gap-1.5">
                <Thermometer className="size-4 text-sky-500" />
                Temperature °C (optional)
              </Label>
              <Input
                id="temp"
                type="number"
                step="0.1"
                placeholder="e.g. 4.5"
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
              />
            </div>
          )}

          {/* Update status */}
          <div className="space-y-1.5">
            <Label htmlFor="status">Update Shipment Status</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v ?? 'none')}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Record Checkpoint
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RecordCheckpointPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>}>
      <RecordCheckpointForm />
    </Suspense>
  );
}
