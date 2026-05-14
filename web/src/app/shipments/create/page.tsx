'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { getContract, getSignerAndContract, shortenAddress } from '@/lib/web3';
import { ActorInfo, ActorRole, parseActorInfo } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2, Package, Thermometer } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateShipmentPage() {
  const { actorInfo } = useWallet();
  const router = useRouter();

  const [recipient, setRecipient] = useState('');
  const [product, setProduct] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [coldChain, setColdChain] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [senders, setSenders] = useState<ActorInfo[]>([]);
  const [recipients, setRecipients] = useState<ActorInfo[]>([]);
  const [loadingActors, setLoadingActors] = useState(true);
  const originDefaultApplied = useRef(false);

  const loadActors = useCallback(async () => {
    try {
      const contract = await getContract();
      const filter = contract.filters.ActorRegistered();
      const events = await contract.queryFilter(filter);

      const seen = new Set<string>();
      const senderList: ActorInfo[] = [];
      const recipientList: ActorInfo[] = [];

      for (const event of events) {
        const addr = ('args' in event && event.args ? event.args[0] : null) as string | null;
        if (!addr || seen.has(addr.toLowerCase())) continue;
        seen.add(addr.toLowerCase());

        try {
          const raw = await contract.getActor(addr);
          const info = parseActorInfo(raw as Record<string, unknown>);
          if (!info.isActive) continue;
          if (info.role === ActorRole.Sender) senderList.push(info);
          else if (info.role === ActorRole.Recipient) recipientList.push(info);
        } catch {
          /* skip */
        }
      }

      setSenders(senderList);
      setRecipients(recipientList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingActors(false);
    }
  }, []);

  useEffect(() => {
    loadActors();
  }, [loadActors]);

  // Pre-populate origin with current sender's location once actors finish loading
  useEffect(() => {
    if (!originDefaultApplied.current && !loadingActors && actorInfo?.location) {
      setOrigin(actorInfo.location);
      originDefaultApplied.current = true;
    }
  }, [loadingActors, actorInfo]);

  // Pre-populate destination when recipient selection changes
  useEffect(() => {
    const found = recipients.find((r) => r.actorAddress === recipient);
    setDestination(found?.location ?? '');
  }, [recipient, recipients]);

  if (actorInfo?.role !== ActorRole.Sender) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <p className="text-muted-foreground">Only Senders can create shipments.</p>
      </div>
    );
  }

  const selectedRecipient = recipients.find((r) => r.actorAddress === recipient) ?? null;
  const selectedOriginActor = senders.find((s) => s.location === origin) ?? null;
  const selectedDestinationActor = recipients.find((r) => r.location === destination) ?? null;

  const handleSubmit = async () => {
    if (!recipient || !product.trim() || !origin.trim() || !destination.trim()) {
      toast.error('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      const { contract } = await getSignerAndContract();
      const tx = await contract.createShipment(
        recipient,
        product.trim(),
        origin.trim(),
        destination.trim(),
        coldChain
      );
      toast.loading('Creating shipment…', { id: 'create' });
      const receipt = await tx.wait();

      let shipmentId: string | null = null;
      if (receipt?.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog(log);
            if (parsed?.name === 'ShipmentCreated') {
              shipmentId = String(parsed.args[0]);
              break;
            }
          } catch {
            /* skip non-matching logs */
          }
        }
      }

      toast.success('Shipment created!', { id: 'create' });
      router.push(shipmentId ? `/shipments/${shipmentId}` : '/shipments');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction failed';
      toast.error(msg.slice(0, 100), { id: 'create' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="size-5 text-primary" />
            <CardTitle>Create Shipment</CardTitle>
          </div>
          <CardDescription>Create a new on-chain shipment record. The shipment ID is assigned automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="product">Product Description</Label>
            <Input
              id="product"
              placeholder="e.g. Laptop computers × 10"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="recipient">Recipient</Label>
            <Select
              value={recipient}
              onValueChange={(v) => setRecipient(v ?? '')}
              disabled={loadingActors || recipients.length === 0}
            >
              <SelectTrigger id="recipient" className="w-full">
                {loadingActors ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading recipients…
                  </div>
                ) : selectedRecipient ? (
                  <div className="flex flex-col items-start gap-0.5 py-0.5">
                    <span className="text-sm font-medium leading-tight">{selectedRecipient.name}</span>
                    <span className="text-xs text-muted-foreground font-mono leading-tight">
                      {shortenAddress(selectedRecipient.actorAddress)}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {recipients.length === 0 ? 'No registered recipients' : 'Select recipient'}
                  </span>
                )}
              </SelectTrigger>
              <SelectContent align="start">
                {recipients.map((r) => (
                  <SelectItem key={r.actorAddress} value={r.actorAddress} className="items-start py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium leading-tight">{r.name}</span>
                      <span className="text-xs text-muted-foreground font-mono leading-tight">
                        {shortenAddress(r.actorAddress)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-4">
            {/* Origin — sender locations only */}
            <div className="space-y-1.5">
              <Label htmlFor="origin">Origin</Label>
              <Select
                value={origin}
                onValueChange={(v) => setOrigin(v ?? '')}
                disabled={loadingActors || senders.length === 0}
              >
                <SelectTrigger id="origin" className="w-full">
                  {loadingActors ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                    </div>
                  ) : selectedOriginActor ? (
                    <div className="flex flex-col items-start gap-0.5 py-0.5">
                      <span className="text-sm font-medium leading-tight">{selectedOriginActor.name}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{selectedOriginActor.location}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {senders.length === 0 ? 'No registered senders' : 'Select origin'}
                    </span>
                  )}
                </SelectTrigger>
                <SelectContent align="start">
                  {senders.map((s) => (
                    <SelectItem key={s.actorAddress} value={s.location} className="items-start py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium leading-tight">{s.name}</span>
                        <span className="text-xs text-muted-foreground leading-tight">{s.location}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Destination — recipient locations only */}
            <div className="space-y-1.5">
              <Label htmlFor="destination">Destination</Label>
              <Select
                value={destination}
                onValueChange={(v) => setDestination(v ?? '')}
                disabled={loadingActors || recipients.length === 0}
              >
                <SelectTrigger id="destination" className="w-full">
                  {loadingActors ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                    </div>
                  ) : selectedDestinationActor ? (
                    <div className="flex flex-col items-start gap-0.5 py-0.5">
                      <span className="text-sm font-medium leading-tight">{selectedDestinationActor.name}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{selectedDestinationActor.location}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {recipients.length === 0 ? 'No registered recipients' : 'Select destination'}
                    </span>
                  )}
                </SelectTrigger>
                <SelectContent align="start">
                  {recipients.map((r) => (
                    <SelectItem key={r.actorAddress} value={r.location} className="items-start py-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium leading-tight">{r.name}</span>
                        <span className="text-xs text-muted-foreground leading-tight">{r.location}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-md border border-border">
            <input
              type="checkbox"
              id="cold-chain"
              checked={coldChain}
              onChange={(e) => setColdChain(e.target.checked)}
              className="size-4"
            />
            <Label htmlFor="cold-chain" className="flex items-center gap-1.5 cursor-pointer">
              <Thermometer className="size-4 text-sky-500" />
              Requires Cold Chain monitoring
            </Label>
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={submitting || loadingActors}>
            {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Create Shipment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
