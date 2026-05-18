'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWallet } from '@/hooks/useWallet';
import { getContract, getSignerAndContract } from '@/lib/web3';
import { Incident, IncidentType, INCIDENT_LABELS, parseIncident, Shipment, ShipmentStatus, parseShipment, ActorInfo, parseActorInfo } from '@/types';
import { IncidentCard } from '@/components/IncidentCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const INCIDENT_TYPE_OPTIONS = Object.values(INCIDENT_LABELS).map((label) => ({
  value: label,
  label,
}));

function IncidentsContent() {
  const { address, isConnected, actorInfo, isAdmin, isLoading: walletLoading } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefilledShipment = searchParams.get('shipment') ?? '';

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'open' | 'resolved'>('open');
  const [resolving, setResolving] = useState<bigint | null>(null);

  const [showForm, setShowForm] = useState(!!prefilledShipment);
  const [formShipmentId, setFormShipmentId] = useState(prefilledShipment);
  const [formType, setFormType] = useState<string>('');
  const [formDesc, setFormDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [activeShipments, setActiveShipments] = useState<Shipment[]>([]);
  const [locationOptions, setLocationOptions] = useState<ActorInfo[]>([]);

  const loadActiveShipments = useCallback(async () => {
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
        } catch { /* skip */ }
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
        } catch { /* skip */ }
      }
      setLocationOptions(actors);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadIncidents = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const contract = await getContract();
      const ids: bigint[] = await contract.getActorShipments(address);
      const allIncidents: Incident[] = [];
      for (const id of ids) {
        const raw = await contract.getShipmentIncidents(id);
        for (const r of raw as Record<string, unknown>[]) {
          allIncidents.push(parseIncident(r));
        }
      }
      allIncidents.sort((a, b) => Number(b.timestamp - a.timestamp));
      setIncidents(allIncidents);
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
    if (isConnected && address) {
      loadIncidents();
      loadActiveShipments();
      loadLocationOptions();
    }
  }, [isConnected, address, loadIncidents, loadActiveShipments, loadLocationOptions]);

  const handleReport = async () => {
    if (!formShipmentId || !formType || !formDesc.trim()) {
      toast.error('All fields are required');
      return;
    }
    setSubmitting(true);
    try {
      const { contract } = await getSignerAndContract();
      const incidentNum = (Object.entries(INCIDENT_LABELS) as [string, string][]).find(([, label]) => label === formType)?.[0];
      const tx = await contract.reportIncident(BigInt(formShipmentId), Number(incidentNum ?? 0), formDesc.trim());
      toast.loading('Reporting incident…', { id: 'report' });
      await tx.wait();
      toast.success('Incident reported', { id: 'report' });
      setFormShipmentId('');
      setFormType('');
      setFormDesc('');
      setShowForm(false);
      await loadIncidents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed';
      toast.error(msg.slice(0, 100), { id: 'report' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (incidentId: bigint) => {
    setResolving(incidentId);
    try {
      const { contract } = await getSignerAndContract();
      const tx = await contract.resolveIncident(incidentId);
      toast.loading('Resolving…', { id: String(incidentId) });
      await tx.wait();
      toast.success('Incident resolved', { id: String(incidentId) });
      await loadIncidents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed';
      toast.error(msg.slice(0, 80), { id: String(incidentId) });
    } finally {
      setResolving(null);
    }
  };

  if (walletLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const open = incidents.filter((i) => !i.resolved);
  const resolved = incidents.filter((i) => i.resolved);
  const displayed = tab === 'open' ? open : resolved;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-6 text-primary" />
          <h1 className="text-2xl font-bold">Incidents</h1>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="size-4 mr-1.5" />
          {showForm ? 'Cancel' : 'Report Incident'}
        </Button>
      </div>

      {/* Report form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report an Incident</CardTitle>
            <CardDescription>Log an issue with an active shipment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const selectedShipment = activeShipments.find((s) => String(s.id) === formShipmentId) ?? null;
              return (
                <div className="space-y-1.5">
                  <Label htmlFor="form-shipment">Shipment</Label>
                  <Select
                    value={formShipmentId}
                    onValueChange={(v) => setFormShipmentId(v ?? '')}
                    disabled={activeShipments.length === 0}
                  >
                    <SelectTrigger id="form-shipment" className="w-full">
                      {selectedShipment ? (
                        <div className="flex flex-col items-start gap-0.5 py-0.5">
                          <span className="text-sm font-medium leading-tight">
                            {locationOptions.find((a) => a.location === selectedShipment.origin)?.name ?? `Shipment #${String(selectedShipment.id)}`}
                            <span className="font-normal text-muted-foreground ml-1.5 text-xs">(#{String(selectedShipment.id)})</span>
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
              );
            })()}
            <div className="space-y-1.5">
              <Label htmlFor="form-type">Incident Type</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v ?? '')}>
                <SelectTrigger id="form-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="form-desc">Description</Label>
              <Input
                id="form-desc"
                placeholder="Describe the issue"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleReport} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Submit Report
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(['open', 'resolved'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t} ({t === 'open' ? open.length : resolved.length})
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No {tab} incidents.
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((inc) => (
            <IncidentCard
              key={String(inc.id)}
              incident={inc}
              currentAddress={address}
              isAdmin={isAdmin}
              resolving={resolving === inc.id}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function IncidentsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]"><Loader2 className="size-8 animate-spin text-muted-foreground" /></div>}>
      <IncidentsContent />
    </Suspense>
  );
}
