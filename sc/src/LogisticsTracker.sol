// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title LogisticsTracker — LogistChain on-chain shipment tracker
/// @notice Tracks courier-style shipments via checkpoints, incidents, and digital delivery confirmation
contract LogisticsTracker {

    // ─── Enums ───────────────────────────────────────────────────────────────

    enum ShipmentStatus { Created, InTransit, AtHub, OutForDelivery, Delivered, Returned, Cancelled }
    enum ActorRole      { None, Sender, Carrier, Hub, Recipient, Inspector }
    enum IncidentType   { Delay, Damage, Lost, TempViolation, Unauthorized }

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct Actor {
        address actorAddress;
        string  name;
        ActorRole role;
        string  location;
        bool    isActive;
    }

    struct Shipment {
        uint256 id;
        address sender;
        address recipient;
        string  product;
        string  origin;
        string  destination;
        uint256 dateCreated;
        uint256 dateDelivered;
        ShipmentStatus status;
        uint256[] checkpointIds;
        uint256[] incidentIds;
        bool    requiresColdChain;
    }

    struct Checkpoint {
        uint256 id;
        uint256 shipmentId;
        address actor;
        string  location;
        string  checkpointType; // "Pickup" | "Hub" | "Transit" | "Delivery"
        uint256 timestamp;
        string  notes;
        int256  temperature;    // celsius × 10; 0 means not recorded
    }

    struct Incident {
        uint256 id;
        uint256 shipmentId;
        IncidentType incidentType;
        address reporter;
        string  description;
        uint256 timestamp;
        bool    resolved;
    }

    // ─── State ────────────────────────────────────────────────────────────────

    address public admin;
    uint256 public nextShipmentId   = 1;
    uint256 public nextCheckpointId = 1;
    uint256 public nextIncidentId   = 1;

    mapping(uint256 => Shipment)   public shipments;
    mapping(uint256 => Checkpoint) public checkpoints;
    mapping(uint256 => Incident)   public incidents;
    mapping(address => Actor)      public actors;
    mapping(address => uint256[])  internal _actorShipments;

    // ─── Events ───────────────────────────────────────────────────────────────

    event ShipmentCreated(uint256 indexed shipmentId, address indexed sender, address indexed recipient, string product);
    event CheckpointRecorded(uint256 indexed checkpointId, uint256 indexed shipmentId, string location, address actor);
    event ShipmentStatusChanged(uint256 indexed shipmentId, ShipmentStatus newStatus);
    event IncidentReported(uint256 indexed incidentId, uint256 indexed shipmentId, IncidentType incidentType);
    event IncidentResolved(uint256 indexed incidentId);
    event DeliveryConfirmed(uint256 indexed shipmentId, address indexed recipient, uint256 timestamp);
    event ActorRegistered(address indexed actorAddress, string name, ActorRole role);
    event ActorStatusChanged(address indexed actorAddress, bool isActive);

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    modifier onlyActiveActor() {
        require(actors[msg.sender].isActive, "Actor not active");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor() {
        admin = msg.sender;
    }

    // ─── Actor Management ─────────────────────────────────────────────────────

    /// @notice Register as an actor in the system. Awaits admin approval.
    function registerActor(string memory _name, ActorRole _role, string memory _location) external {
        require(_role != ActorRole.None, "Invalid role");
        require(actors[msg.sender].actorAddress == address(0), "Already registered");
        actors[msg.sender] = Actor(msg.sender, _name, _role, _location, false);
        emit ActorRegistered(msg.sender, _name, _role);
    }

    /// @notice Approve an actor (admin only)
    function approveActor(address _actor) external onlyAdmin {
        require(actors[_actor].actorAddress != address(0), "Not registered");
        actors[_actor].isActive = true;
        emit ActorStatusChanged(_actor, true);
    }

    /// @notice Deactivate an actor (admin only)
    function deactivateActor(address _actor) external onlyAdmin {
        actors[_actor].isActive = false;
        emit ActorStatusChanged(_actor, false);
    }

    /// @notice Get actor info
    function getActor(address _actor) external view returns (Actor memory) {
        return actors[_actor];
    }

    // ─── Shipment Management ─────────────────────────────────────────────────

    /// @notice Create a new shipment (Sender role only)
    function createShipment(
        address _recipient,
        string memory _product,
        string memory _origin,
        string memory _destination,
        bool _requiresColdChain
    ) external onlyActiveActor returns (uint256) {
        require(actors[msg.sender].role == ActorRole.Sender, "Must be Sender");
        require(_recipient != address(0), "Invalid recipient");

        uint256 id = nextShipmentId++;
        Shipment storage s = shipments[id];
        s.id = id;
        s.sender = msg.sender;
        s.recipient = _recipient;
        s.product = _product;
        s.origin = _origin;
        s.destination = _destination;
        s.dateCreated = block.timestamp;
        s.status = ShipmentStatus.Created;
        s.requiresColdChain = _requiresColdChain;

        _actorShipments[msg.sender].push(id);
        _actorShipments[_recipient].push(id);

        emit ShipmentCreated(id, msg.sender, _recipient, _product);
        return id;
    }

    /// @notice Get shipment details
    function getShipment(uint256 _shipmentId) external view returns (
        uint256, address, address, string memory, string memory, string memory,
        uint256, uint256, ShipmentStatus, bool
    ) {
        Shipment storage s = shipments[_shipmentId];
        return (s.id, s.sender, s.recipient, s.product, s.origin, s.destination,
                s.dateCreated, s.dateDelivered, s.status, s.requiresColdChain);
    }

    /// @notice Update shipment status
    function updateShipmentStatus(uint256 _shipmentId, ShipmentStatus _newStatus) external onlyActiveActor {
        ShipmentStatus current = shipments[_shipmentId].status;
        require(current != ShipmentStatus.Delivered && current != ShipmentStatus.Cancelled, "Terminal status");
        shipments[_shipmentId].status = _newStatus;
        emit ShipmentStatusChanged(_shipmentId, _newStatus);
    }

    /// @notice Recipient confirms delivery (digital confirmation on-chain)
    function confirmDelivery(uint256 _shipmentId) external onlyActiveActor {
        Shipment storage s = shipments[_shipmentId];
        require(msg.sender == s.recipient, "Not recipient");
        require(s.status != ShipmentStatus.Delivered, "Already delivered");
        s.status = ShipmentStatus.Delivered;
        s.dateDelivered = block.timestamp;
        emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.Delivered);
        emit DeliveryConfirmed(_shipmentId, msg.sender, block.timestamp);
    }

    /// @notice Cancel a shipment (sender only)
    function cancelShipment(uint256 _shipmentId) external onlyActiveActor {
        Shipment storage s = shipments[_shipmentId];
        require(msg.sender == s.sender, "Not sender");
        require(s.status != ShipmentStatus.Delivered, "Already delivered");
        s.status = ShipmentStatus.Cancelled;
        emit ShipmentStatusChanged(_shipmentId, ShipmentStatus.Cancelled);
    }

    // ─── Checkpoint Management ────────────────────────────────────────────────

    /// @notice Record a checkpoint for a shipment
    function recordCheckpoint(
        uint256 _shipmentId,
        string memory _location,
        string memory _checkpointType,
        string memory _notes,
        int256 _temperature
    ) external onlyActiveActor returns (uint256) {
        require(shipments[_shipmentId].id != 0, "Shipment not found");

        uint256 id = nextCheckpointId++;
        checkpoints[id] = Checkpoint(id, _shipmentId, msg.sender, _location, _checkpointType, block.timestamp, _notes, _temperature);
        shipments[_shipmentId].checkpointIds.push(id);

        emit CheckpointRecorded(id, _shipmentId, _location, msg.sender);
        return id;
    }

    /// @notice Get a single checkpoint
    function getCheckpoint(uint256 _checkpointId) external view returns (Checkpoint memory) {
        return checkpoints[_checkpointId];
    }

    /// @notice Get all checkpoints for a shipment
    function getShipmentCheckpoints(uint256 _shipmentId) external view returns (Checkpoint[] memory) {
        uint256[] storage ids = shipments[_shipmentId].checkpointIds;
        Checkpoint[] memory result = new Checkpoint[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = checkpoints[ids[i]];
        }
        return result;
    }

    // ─── Incident Management ──────────────────────────────────────────────────

    /// @notice Report an incident on a shipment
    function reportIncident(
        uint256 _shipmentId,
        IncidentType _incidentType,
        string memory _description
    ) external onlyActiveActor returns (uint256) {
        require(shipments[_shipmentId].id != 0, "Shipment not found");

        uint256 id = nextIncidentId++;
        incidents[id] = Incident(id, _shipmentId, _incidentType, msg.sender, _description, block.timestamp, false);
        shipments[_shipmentId].incidentIds.push(id);

        emit IncidentReported(id, _shipmentId, _incidentType);
        return id;
    }

    /// @notice Resolve an incident (admin or original reporter)
    function resolveIncident(uint256 _incidentId) external {
        Incident storage inc = incidents[_incidentId];
        require(!inc.resolved, "Already resolved");
        require(msg.sender == admin || msg.sender == inc.reporter, "Not authorized");
        inc.resolved = true;
        emit IncidentResolved(_incidentId);
    }

    /// @notice Get a single incident
    function getIncident(uint256 _incidentId) external view returns (Incident memory) {
        return incidents[_incidentId];
    }

    /// @notice Get all incidents for a shipment
    function getShipmentIncidents(uint256 _shipmentId) external view returns (Incident[] memory) {
        uint256[] storage ids = shipments[_shipmentId].incidentIds;
        Incident[] memory result = new Incident[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            result[i] = incidents[ids[i]];
        }
        return result;
    }

    // ─── Auxiliary ────────────────────────────────────────────────────────────

    /// @notice Get all shipment IDs involving an actor (as sender or recipient)
    function getActorShipments(address _actor) external view returns (uint256[] memory) {
        return _actorShipments[_actor];
    }

    /// @notice Returns false if any TempViolation incident exists for this shipment
    function verifyTemperatureCompliance(uint256 _shipmentId) external view returns (bool) {
        uint256[] storage incidentIds = shipments[_shipmentId].incidentIds;
        for (uint256 i = 0; i < incidentIds.length; i++) {
            if (incidents[incidentIds[i]].incidentType == IncidentType.TempViolation) {
                return false;
            }
        }
        return true;
    }
}
