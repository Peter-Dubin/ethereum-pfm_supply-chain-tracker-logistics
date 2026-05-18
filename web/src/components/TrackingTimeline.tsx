'use client';

import { Checkpoint, Incident, ShipmentStatus, STATUS_LABELS, IncidentType, INCIDENT_LABELS } from '@/types';
import { bigIntToDateStr, tempToDisplay, shortenAddress } from '@/lib/web3';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Thermometer, MapPin, CheckCircle2, Package, Truck, Building2 } from 'lucide-react';

const TYPE_ICONS: Record<string, React.ElementType> = {
  Pickup: Package,
  Hub: Building2,
  Transit: Truck,
  Delivery: CheckCircle2,
};

function CheckpointIcon({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type] ?? MapPin;
  return <Icon className="size-3.5" />;
}

interface Props {
  checkpoints: Checkpoint[];
  incidents: Incident[];
  currentStatus: ShipmentStatus;
  actorsMap?: Map<string, string>;
}

export function TrackingTimeline({ checkpoints, incidents, currentStatus, actorsMap }: Props) {
  if (checkpoints.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-6 text-center">
        No checkpoints recorded yet.
      </div>
    );
  }

  // Pre-assign each incident to exactly one checkpoint index so it never appears twice.
  // Primary rule: first checkpoint whose timestamp strictly exceeds the incident timestamp
  // (i.e. the incident happened before that checkpoint was recorded).
  // Tie-break when all timestamps are equal (seeded same-second data): last Hub-type
  // checkpoint, which is semantically where incidents are discovered/inspected.
  const incidentAssignment = new Map<string, number>();
  incidents.forEach((inc) => {
    let assignIdx = checkpoints.findIndex((cp) => cp.timestamp > inc.timestamp);
    if (assignIdx === -1) {
      const lastHubIdx = checkpoints.reduce<number>(
        (best, cp, i) => (cp.checkpointType === 'Hub' ? i : best),
        -1
      );
      assignIdx = lastHubIdx !== -1 ? lastHubIdx : checkpoints.length - 1;
    }
    incidentAssignment.set(String(inc.id), assignIdx);
  });

  const isTerminal =
    currentStatus === ShipmentStatus.Delivered ||
    currentStatus === ShipmentStatus.Cancelled ||
    currentStatus === ShipmentStatus.Returned;

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />

      <div className="space-y-6">
        {checkpoints.map((cp, idx) => {
          const isCurrent = !isTerminal && idx === checkpoints.length - 1;
          const hasTemp = cp.temperature !== 0n;
          const isTempViolation = incidents.some(
            (inc) =>
              inc.incidentType === IncidentType.TempViolation &&
              inc.shipmentId === cp.shipmentId
          );

          const relatedIncidents = incidents.filter(
            (inc) => incidentAssignment.get(String(inc.id)) === idx
          );

          return (
            <div key={String(cp.id)} className="relative flex gap-4 pl-8">
              {/* Dot */}
              <div
                className={`absolute left-2 top-1 size-4 rounded-full border-2 flex items-center justify-center ${
                  isCurrent
                    ? 'border-primary bg-primary animate-pulse'
                    : isTempViolation && hasTemp
                    ? 'border-destructive bg-destructive/10'
                    : 'border-border bg-background'
                }`}
              >
                <span
                  className={`${
                    isCurrent ? 'text-primary-foreground' : isTempViolation ? 'text-destructive' : 'text-muted-foreground'
                  } scale-75`}
                >
                  <CheckpointIcon type={cp.checkpointType} />
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <span className="font-medium text-sm">{cp.location}</span>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {cp.checkpointType}
                    </Badge>
                    {isCurrent && (
                      <Badge variant="default" className="ml-1 text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{bigIntToDateStr(cp.timestamp)}</span>
                </div>

                {cp.notes && (
                  <p className="text-sm text-muted-foreground mt-1">{cp.notes}</p>
                )}

                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {hasTemp && (
                    <span
                      className={`flex items-center gap-1 text-xs ${
                        isTempViolation ? 'text-destructive font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      <Thermometer className="size-3" />
                      {tempToDisplay(cp.temperature)}
                      {isTempViolation && ' ⚠ violation'}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    by {actorsMap?.get(cp.actor.toLowerCase()) ?? shortenAddress(cp.actor)}
                    {actorsMap?.get(cp.actor.toLowerCase()) && (
                      <span className="font-mono ml-1">({shortenAddress(cp.actor)})</span>
                    )}
                  </span>
                </div>

                {/* Incidents near this checkpoint */}
                {relatedIncidents.map((inc) => (
                  <div
                    key={String(inc.id)}
                    className={`mt-2 flex items-start gap-2 rounded-md border px-3 py-2 ${
                      inc.resolved
                        ? 'border-green-200 bg-green-50'
                        : 'border-destructive/30 bg-destructive/5'
                    }`}
                  >
                    <AlertTriangle className={`size-3.5 mt-0.5 shrink-0 ${inc.resolved ? 'text-green-600' : 'text-destructive'}`} />
                    <div>
                      <span className={`text-xs font-medium ${inc.resolved ? 'text-green-700' : 'text-destructive'}`}>
                        {INCIDENT_LABELS[inc.incidentType]}
                      </span>
                      <p className="text-xs text-muted-foreground">{inc.description}</p>
                      {inc.resolved && (
                        <>
                          <Badge variant="secondary" className="mt-1 text-xs">Resolved</Badge>
                          {inc.resolutionNote && (
                            <p className="text-xs text-green-700 mt-1 italic">{inc.resolutionNote}</p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Terminal node */}
        {isTerminal && (
          <div className="relative flex gap-4 pl-8">
            <div
              className={`absolute left-2 top-1 size-4 rounded-full border-2 flex items-center justify-center ${
                currentStatus === ShipmentStatus.Delivered
                  ? 'border-green-500 bg-green-100'
                  : 'border-muted bg-muted'
              }`}
            >
              <CheckCircle2 className="size-3 text-green-700 scale-75" />
            </div>
            <div className="flex-1 pb-2">
              <span
                className={`font-medium text-sm ${
                  currentStatus === ShipmentStatus.Delivered ? 'text-green-700' : 'text-muted-foreground'
                }`}
              >
                {STATUS_LABELS[currentStatus]}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
