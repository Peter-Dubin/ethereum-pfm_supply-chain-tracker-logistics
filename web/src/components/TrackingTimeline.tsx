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

  const incidentsByTime = incidents.reduce<Record<string, Incident[]>>((acc, inc) => {
    const key = String(inc.timestamp);
    if (!acc[key]) acc[key] = [];
    acc[key].push(inc);
    return acc;
  }, {});

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

          const relatedIncidents = Object.entries(incidentsByTime)
            .filter(([ts]) => {
              const t = BigInt(ts);
              const prev = checkpoints[idx - 1]?.timestamp ?? 0n;
              return t >= prev && t <= cp.timestamp;
            })
            .flatMap(([, incs]) => incs);

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
                    className="mt-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2"
                  >
                    <AlertTriangle className="size-3.5 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-medium text-destructive">
                        {INCIDENT_LABELS[inc.incidentType]}
                      </span>
                      <p className="text-xs text-muted-foreground">{inc.description}</p>
                      {inc.resolved && (
                        <Badge variant="secondary" className="mt-1 text-xs">Resolved</Badge>
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
