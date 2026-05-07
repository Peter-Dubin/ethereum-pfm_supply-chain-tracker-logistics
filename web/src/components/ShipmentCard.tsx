'use client';

import Link from 'next/link';
import { Shipment, ShipmentStatus, STATUS_LABELS } from '@/types';
import { bigIntToDateStr, shortenAddress } from '@/lib/web3';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Thermometer, ArrowRight } from 'lucide-react';

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
    <Badge variant="outline" className={classMap[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function ShipmentCard({ shipment }: { shipment: Shipment }) {
  return (
    <Link href={`/shipments/${shipment.id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="py-4 px-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{shipment.product}</span>
                {shipment.requiresColdChain && (
                  <span className="flex items-center gap-1 text-xs text-sky-600">
                    <Thermometer className="size-3" /> Cold Chain
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <span>{shipment.origin}</span>
                <ArrowRight className="size-3.5 shrink-0" />
                <span>{shipment.destination}</span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                <span>#{String(shipment.id)}</span>
                <span>from {shortenAddress(shipment.sender)}</span>
                <span>→ {shortenAddress(shipment.recipient)}</span>
                <span>{bigIntToDateStr(shipment.dateCreated)}</span>
              </div>
            </div>
            <StatusBadge status={shipment.status} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
