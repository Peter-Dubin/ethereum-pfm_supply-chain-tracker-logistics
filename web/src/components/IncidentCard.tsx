'use client';

import { Incident, IncidentType, INCIDENT_LABELS } from '@/types';
import { bigIntToDateStr, shortenAddress } from '@/lib/web3';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

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
  resolving?: boolean;
  onResolve?: (id: bigint) => void;
}

export function IncidentCard({ incident, currentAddress, isAdmin, resolving, onResolve }: Props) {
  const canResolve =
    !incident.resolved &&
    onResolve &&
    (isAdmin || currentAddress?.toLowerCase() === incident.reporter.toLowerCase());

  return (
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
                  Shipment #{String(incident.shipmentId)}
                </span>
                {incident.resolved && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Resolved
                  </Badge>
                )}
              </div>
              <p className="text-sm mt-1">{incident.description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Reported by {shortenAddress(incident.reporter)} · {bigIntToDateStr(incident.timestamp)}
              </p>
            </div>
          </div>
          {canResolve && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResolve(incident.id)}
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
      </CardContent>
    </Card>
  );
}
