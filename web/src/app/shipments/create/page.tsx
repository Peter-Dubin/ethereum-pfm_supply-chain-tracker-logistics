'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [recipients, setRecipients] = useState<ActorInfo[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);

  const loadRecipients = useCallback(async () => {
    try {
      const contract = await getContract();
      const filter = contract.filters.ActorRegistered();
      const events = await contract.queryFilter(filter);

      const seen = new Set<string>();
      const list: ActorInfo[] = [];

      for (const event of events) {
        const addr = ('args' in event && event.args ? event.args[0] : null) as string | null;
        if (!addr || seen.has(addr.toLowerCase())) continue;
        seen.add(addr.toLowerCase());

        try {
          const raw = await contract.getActor(addr);
          const info = parseActorInfo(raw as Record<string, unknown>);
          if (info.role === ActorRole.Recipient && info.isActive) {
            list.push(info);
          }
        } catch {
          /* skip */
        }
      }

      setRecipients(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  useEffect(() => {
    loadRecipients();
  }, [loadRecipients]);

  if (actorInfo?.role !== ActorRole.Sender) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <p className="text-muted-foreground">Only Senders can create shipments.</p>
      </div>
    );
  }

  const selectedRecipient = recipients.find((r) => r.actorAddress === recipient) ?? null;

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
              disabled={loadingRecipients || recipients.length === 0}
            >
              <SelectTrigger id="recipient" className="w-full">
                {loadingRecipients ? (
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="origin">Origin</Label>
              <Input
                id="origin"
                placeholder="e.g. Madrid"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                placeholder="e.g. Barcelona"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
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

          <Button className="w-full" onClick={handleSubmit} disabled={submitting || loadingRecipients}>
            {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
            Create Shipment
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
