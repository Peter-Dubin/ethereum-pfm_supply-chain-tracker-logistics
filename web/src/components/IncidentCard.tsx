'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Incident, IncidentType, INCIDENT_LABELS } from '@/types';
import { bigIntToDateStr, shortenAddress } from '@/lib/web3';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Loader2 } from 'lucide-react';

const TYPE_COLORS: Record<IncidentType, string> = {
  [IncidentType.Delay]: 'bg-yellow-100 text-yellow-800',
  [IncidentType.Damage]: 'bg-orange-100 text-orange-800',
  [IncidentType.Lost]: 'bg-red-100 text-red-800',
  [IncidentType.TempViolation]: 'bg-sky-100 text-sky-800',
  [IncidentType.Unauthorized]: 'bg-purple-100 text-purple-800',
};

interface Props {
  incident: Incident;
  currentAddress?: string | null;
  isAdmin?: boolean;
  isInspector?: boolean;
  resolving?: boolean;
  onResolve?: (id: bigint, note: string) => void;
  shipmentLabel?: string;
  reporterName?: string;
  inspectHref?: string;
}

export function IncidentCard({ incident, currentAddress, isAdmin, isInspector, resolving, onResolve, shipmentLabel, reporterName, inspectHref }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [note, setNote] = useState('');

  const canResolve =
    !incident.resolved &&
    onResolve &&
    (isAdmin || isInspector || currentAddress?.toLowerCase() === incident.reporter.toLowerCase());
  const canInspect = !incident.resolved && isInspector && inspectHref;

  const handleConfirmResolve = () => {
    onResolve!(incident.id, note.trim());
    setDialogOpen(false);
    setNote('');
  };

  return (
    <>
      <Card className={incident.resolved ? 'opacity-60' : ''}>
        <CardContent className="py-4 px-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <AlertTriangle
                className={`size-4 mt-0.5 shrink-0 ${incident.resolved ? 'text-muted-foreground' : 'text-destructive'}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={TYPE_COLORS[incident.incidentType]}>
                    {INCIDENT_LABELS[incident.incidentType]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {shipmentLabel ?? `Shipment #${String(incident.shipmentId)}`}
                  </span>
                  {incident.resolved && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Resolved
                    </Badge>
                  )}
                </div>
                <p className="text-sm mt-1">{incident.description}</p>
                {incident.resolved && incident.resolutionNote && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    Resolution: {incident.resolutionNote}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Reported by{' '}
                  {reporterName ? `${reporterName} (${shortenAddress(incident.reporter)})` : shortenAddress(incident.reporter)}
                  {' · '}
                  {bigIntToDateStr(incident.timestamp)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {canInspect && (
                <Link href={inspectHref!} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                  <ClipboardCheck className="size-3 mr-1" />
                  Record Inspection
                </Link>
              )}
              {canResolve && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialogOpen(true)}
                  disabled={resolving}
                >
                  {resolving ? (
                    <Loader2 className="size-3 animate-spin mr-1" />
                  ) : (
                    <CheckCircle2 className="size-3 mr-1" />
                  )}
                  Resolve
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Incident</DialogTitle>
            <DialogDescription>
              Add a resolution note explaining what was found and the action taken.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="resolution-note">Resolution Note</Label>
            <textarea
              id="resolution-note"
              rows={3}
              placeholder="e.g. Product intact; repackaged in reinforced box; cleared to proceed"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); setNote(''); }}>
              Cancel
            </Button>
            <Button onClick={handleConfirmResolve} disabled={resolving}>
              {resolving ? <Loader2 className="size-3 animate-spin mr-1" /> : <CheckCircle2 className="size-3 mr-1" />}
              Confirm Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
