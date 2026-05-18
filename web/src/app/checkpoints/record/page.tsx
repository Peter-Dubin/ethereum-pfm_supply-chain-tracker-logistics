'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { getContract, getSignerAndContract } from '@/lib/web3';
import { ActorInfo, ActorRole, Checkpoint, ROLE_LABELS, Shipment, ShipmentStatus, parseCheckpoint, parseShipment, parseActorInfo } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, MapPin, Thermometer } from 'lucide-react';
import { toast } from 'sonner';
import { Suspense } from 'react';

const CHECKPOINT_TYPES = ['Pickup', 'Hub', 'Transit', 'Delivery'];

const CHECKPOINT_STATUS_MAP: Partial<Record<string, ShipmentStatus>> = {
  Pickup: ShipmentStatus.InTransit,
  Hub: ShipmentStatus.AtHub,
  Transit: ShipmentStatus.InTransit,
  Delivery: ShipmentStatus.OutForDelivery,
};

function RecordCheckpointForm() {
  const { actorInfo, isLoading: walletLoading } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledId = searchParams.get('shipment') ?? '';

  const [shipmentId, setShipmentId] = useState(prefilledId);
  const [activeShipments, setActiveShipments] = useState<Shipment[]>([]);
  const [location, setLocation] = useState('');
  const [locationOptions, setLocationOptions] = useState<ActorInfo[]>([]);
  const [checkpointType, setCheckpointType] = useState('');
  const [notes, setNotes] = useState('');
  const [temp, setTemp] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadShipments = useCallback(async () => {
    try {
      const contract = await getContract();
      const filter = contract.filters.ShipmentCreated();
      const events = await contract.queryFilter(filter);

      const seen = new Set<string>();
      const results: Shipment[] = [];

      for (const event of events) {
        const id = ('args' in event && event.args ? event.args[0] : null) as bigint | null;
        if (!id || seen.has(String(id))) continue;
        seen.add(String(id));

        try {
          const raw = await contract.getShipment(id);
          const s = parseShipment(raw as Record<string | number, unknown>);
          if (
            s.status !== ShipmentStatus.Delivered &&
            s.status !== ShipmentStatus.Cancelled &&
            s.status !== ShipmentStatus.Returned
          ) {
            results.push(s);
          }
        } catch {
          /* skip */
        }
      }

      setActiveShipments(results);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadLocationOptions = useCallback(async () => {
    try {
      const contract = await getContract();
      const filter = contract.filters.ActorRegistered();
      const events = await contract.queryFilter(filter);

      const seen = new Set<string>();
      const seenLocs = new Set<string>();
      const actors: ActorInfo[] = [];

      for (const event of events) {
        const addr = ('args' in event && event.args ? event.args[0] : null) as string | null;
        if (!addr || seen.has(addr.toLowerCase())) continue;
        seen.add(addr.toLowerCase());

        try {
          const raw = await contract.getActor(addr);
          const info = parseActorInfo(raw as Record<string, unknown>);
          if (info.isActive && info.location && !seenLocs.has(info.location)) {
            seenLocs.add(info.location);
            actors.push(info);
          }
        } catch {
          /* skip */
        }
      }

      setLocationOptions(actors);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!walletLoading && actorInfo) {
      if (actorInfo.role !== ActorRole.Carrier && actorInfo.role !== ActorRole.Hub && actorInfo.role !== ActorRole.Inspector) {
        router.push('/dashboard');
        return;
      }
      loadShipments();
      loadLocationOptions();
    }
  }, [walletLoading, actorInfo, loadShipments, loadLocationOptions, router]);

  const fetchLastCheckpoint = useCallback(async (id: bigint): Promise<Checkpoint | null> => {
    try {
      const contract = await getContract();
      const raw = await contract.getShipmentCheckpoints(id);
      if (Array.isArray(raw) && raw.length > 0) {
        return parseCheckpoint(raw[raw.length - 1] as Record<string, unknown>);
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const found = activeShipments.find((s) => String(s.id) === shipmentId);
    setSelectedShipment(found ?? null);

    if (!found) {
      setCheckpointType('');
      setLocation('');
      return;
    }

    if (actorInfo?.role === ActorRole.Hub) {
      setLocation(actorInfo.location);
      // Hub arriving at its own location → Hub; Hub dispatching from its own location → Transit
      setCheckpointType(found.status === ShipmentStatus.InTransit ? 'Hub' : found.status === ShipmentStatus.AtHub ? 'Transit' : '');
    } else if (actorInfo?.role === ActorRole.Carrier) {
      if (found.status === ShipmentStatus.Created) {
        // Initial pickup from sender
        setLocation(found.origin);
        setCheckpointType('Pickup');
      } else if (found.status === ShipmentStatus.OutForDelivery) {
        // Carrier confirmed out-for-delivery externally; record final delivery
        setLocation(found.destination);
        setCheckpointType('Delivery');
      } else {
        // InTransit or AtHub: need last checkpoint to decide
        setCheckpointType('');
        setLocation('');
        (async () => {
          const last = await fetchLastCheckpoint(found.id);
          if (last?.actor.toLowerCase() === actorInfo.actorAddress.toLowerCase()) {
            // Same carrier recorded last checkpoint → already picked up, heading to recipient
            setCheckpointType('Delivery');
            setLocation(found.destination);
          } else if (last?.checkpointType === 'Transit') {
            // Another actor (hub) already dispatched the package with a Transit checkpoint →
            // the carrier's next action is delivery at the destination, not another pickup
            setCheckpointType('Delivery');
            setLocation(found.destination);
          } else {
            // Another actor received the package at this location (Hub checkpoint) →
            // carrier picks it up from there
            setCheckpointType('Transit');
            setLocation(last?.location ?? '');
          }
        })();
      }
    } else if (actorInfo?.role === ActorRole.Inspector) {
      // Inspector always records at the hub where the shipment currently sits
      setCheckpointType('Hub');
      setLocation('');
      (async () => {
        const last = await fetchLastCheckpoint(found.id);
        setLocation(last?.location ?? '');
      })();
    } else {
      setLocation(found.origin);
      setCheckpointType('');
    }
  }, [shipmentId, activeShipments, actorInfo, fetchLastCheckpoint]);

  const handleSubmit = async () => {
    if (!shipmentId || !location.trim() || !checkpointType) {
      toast.error('Shipment, location, and type are required');
      return;
    }

    if (selectedShipment?.requiresColdChain && !temp.trim()) {
      toast.error('Temperature is required for cold chain shipments');
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

      const autoStatus = CHECKPOINT_STATUS_MAP[checkpointType];
      if (autoStatus !== undefined && selectedShipment && autoStatus !== selectedShipment.status) {
        const stx = await contract.updateShipmentStatus(BigInt(shipmentId), autoStatus);
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

  const selectedLocationActor = locationOptions.find((a) => a.location === location) ?? null;

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
            <Select
              value={shipmentId}
              onValueChange={(v) => setShipmentId(v ?? '')}
              disabled={activeShipments.length === 0}
            >
              <SelectTrigger id="shipment" className="w-full">
                {selectedShipment ? (
                  <div className="flex flex-col items-start gap-0.5 py-0.5">
                    <span className="text-sm font-medium leading-tight">
                      {locationOptions.find((a) => a.location === selectedShipment.origin)?.name ?? `Shipment #${String(selectedShipment.id)}`}
                      <span className="font-normal text-muted-foreground ml-1.5 text-xs">
                        (#{String(selectedShipment.id)})
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground leading-tight">{selectedShipment.product}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {activeShipments.length === 0 ? 'No active shipments' : 'Select a shipment'}
                  </span>
                )}
              </SelectTrigger>
              <SelectContent align="start">
                {activeShipments.map((s) => {
                  const senderName = locationOptions.find((a) => a.location === s.origin)?.name ?? `Shipment #${String(s.id)}`;
                  return (
                    <SelectItem key={String(s.id)} value={String(s.id)} className="items-start py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium leading-tight">
                          {senderName}
                          <span className="font-normal text-muted-foreground ml-1.5 text-xs">(#{String(s.id)})</span>
                        </span>
                        <span className="text-xs text-muted-foreground leading-tight">{s.product}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {selectedShipment && (
              <p className="text-xs text-muted-foreground">
                {selectedShipment.origin} → {selectedShipment.destination}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="location">Location</Label>
            <Select
              value={location}
              onValueChange={(v) => setLocation(v ?? '')}
              disabled={locationOptions.length === 0}
            >
              <SelectTrigger id="location" className="w-full">
                {selectedLocationActor ? (
                  <div className="flex flex-col items-start gap-0.5 py-0.5">
                    <span className="text-sm font-medium leading-tight">
                      {selectedLocationActor.name}
                      <span className="font-normal text-muted-foreground ml-1.5 text-xs">
                        ({ROLE_LABELS[selectedLocationActor.role]})
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground leading-tight">
                      {selectedLocationActor.location}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {locationOptions.length === 0 ? 'No registered locations' : 'Select location'}
                  </span>
                )}
              </SelectTrigger>
              <SelectContent align="start">
                {locationOptions.map((actor) => (
                  <SelectItem key={actor.actorAddress} value={actor.location} className="items-start py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium leading-tight">
                        {actor.name}
                        <span className="font-normal text-muted-foreground ml-1.5 text-xs">
                          ({ROLE_LABELS[actor.role]})
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground leading-tight">{actor.location}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Checkpoint type */}
          <div className="space-y-1.5">
            <Label htmlFor="type">Checkpoint Type</Label>
            <Select value={checkpointType} onValueChange={(v) => setCheckpointType(v ?? '')}>
              <SelectTrigger id="type" className="w-full">
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
                Temperature °C {selectedShipment?.requiresColdChain ? '(required)' : '(optional)'}
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
