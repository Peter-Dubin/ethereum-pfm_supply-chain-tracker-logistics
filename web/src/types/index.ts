export enum ActorRole {
  None = 0,
  Sender = 1,
  Carrier = 2,
  Hub = 3,
  Recipient = 4,
  Inspector = 5,
}

export enum ShipmentStatus {
  Created = 0,
  InTransit = 1,
  AtHub = 2,
  OutForDelivery = 3,
  Delivered = 4,
  Returned = 5,
  Cancelled = 6,
}

export enum IncidentType {
  Delay = 0,
  Damage = 1,
  Lost = 2,
  TempViolation = 3,
  Unauthorized = 4,
}

export interface ActorInfo {
  actorAddress: string;
  name: string;
  role: ActorRole;
  location: string;
  isActive: boolean;
}

export interface Shipment {
  id: bigint;
  sender: string;
  recipient: string;
  product: string;
  origin: string;
  destination: string;
  dateCreated: bigint;
  dateDelivered: bigint;
  status: ShipmentStatus;
  requiresColdChain: boolean;
}

export interface Checkpoint {
  id: bigint;
  shipmentId: bigint;
  actor: string;
  location: string;
  checkpointType: string;
  timestamp: bigint;
  notes: string;
  temperature: bigint;
}

export interface Incident {
  id: bigint;
  shipmentId: bigint;
  incidentType: IncidentType;
  reporter: string;
  description: string;
  timestamp: bigint;
  resolved: boolean;
}

export const ROLE_LABELS: Record<ActorRole, string> = {
  [ActorRole.None]: 'None',
  [ActorRole.Sender]: 'Sender',
  [ActorRole.Carrier]: 'Carrier',
  [ActorRole.Hub]: 'Hub',
  [ActorRole.Recipient]: 'Recipient',
  [ActorRole.Inspector]: 'Inspector',
};

export const STATUS_LABELS: Record<ShipmentStatus, string> = {
  [ShipmentStatus.Created]: 'Created',
  [ShipmentStatus.InTransit]: 'In Transit',
  [ShipmentStatus.AtHub]: 'At Hub',
  [ShipmentStatus.OutForDelivery]: 'Out for Delivery',
  [ShipmentStatus.Delivered]: 'Delivered',
  [ShipmentStatus.Returned]: 'Returned',
  [ShipmentStatus.Cancelled]: 'Cancelled',
};

export const INCIDENT_LABELS: Record<IncidentType, string> = {
  [IncidentType.Delay]: 'Delay',
  [IncidentType.Damage]: 'Damage',
  [IncidentType.Lost]: 'Lost',
  [IncidentType.TempViolation]: 'Temperature Violation',
  [IncidentType.Unauthorized]: 'Unauthorized Access',
};

export function parseActorInfo(raw: Record<string, unknown>): ActorInfo {
  return {
    actorAddress: raw.actorAddress as string,
    name: raw.name as string,
    role: Number(raw.role) as ActorRole,
    location: raw.location as string,
    isActive: raw.isActive as boolean,
  };
}

export function parseShipment(r: Record<string | number, unknown>): Shipment {
  return {
    id: r[0] as bigint,
    sender: r[1] as string,
    recipient: r[2] as string,
    product: r[3] as string,
    origin: r[4] as string,
    destination: r[5] as string,
    dateCreated: r[6] as bigint,
    dateDelivered: r[7] as bigint,
    status: Number(r[8]) as ShipmentStatus,
    requiresColdChain: r[9] as boolean,
  };
}

export function parseCheckpoint(raw: Record<string, unknown>): Checkpoint {
  return {
    id: raw.id as bigint,
    shipmentId: raw.shipmentId as bigint,
    actor: raw.actor as string,
    location: raw.location as string,
    checkpointType: raw.checkpointType as string,
    timestamp: raw.timestamp as bigint,
    notes: raw.notes as string,
    temperature: raw.temperature as bigint,
  };
}

export function parseIncident(raw: Record<string, unknown>): Incident {
  return {
    id: raw.id as bigint,
    shipmentId: raw.shipmentId as bigint,
    incidentType: Number(raw.incidentType) as IncidentType,
    reporter: raw.reporter as string,
    description: raw.description as string,
    timestamp: raw.timestamp as bigint,
    resolved: raw.resolved as boolean,
  };
}
