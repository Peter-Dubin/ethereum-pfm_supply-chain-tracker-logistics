// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Test.sol";
import "../src/LogisticsTracker.sol";

contract LogisticsTrackingTest is Test {
    LogisticsTracker tracker;

    // Fictional actors from use-cases-definition.md
    address admin     = address(this);
    address sender1   = makeAddr("TechCorp");
    address sender2   = makeAddr("MediSupply");
    address carrier1  = makeAddr("ExpressRide");
    address carrier2  = makeAddr("UrbanDeliver");
    address hub1      = makeAddr("HubMadrid");
    address hub2      = makeAddr("HubBarcelona");
    address recip1    = makeAddr("StartupInnovations");
    address recip2    = makeAddr("HospitalValleVerde");
    address inspector = makeAddr("QCInspectorGarcia");

    function setUp() public {
        tracker = new LogisticsTracker();
        _registerAndApprove(sender1,   LogisticsTracker.ActorRole.Sender,    "TechCorp S.L.",              "Madrid");
        _registerAndApprove(sender2,   LogisticsTracker.ActorRole.Sender,    "MediSupply S.A.",            "Valencia");
        _registerAndApprove(carrier1,  LogisticsTracker.ActorRole.Carrier,   "ExpressRide Courier",        "Madrid");
        _registerAndApprove(carrier2,  LogisticsTracker.ActorRole.Carrier,   "UrbanDeliver S.L.",          "Barcelona");
        _registerAndApprove(hub1,      LogisticsTracker.ActorRole.Hub,       "Hub Logistico Madrid",    "Getafe");
        _registerAndApprove(hub2,      LogisticsTracker.ActorRole.Hub,       "Hub Logistico Barcelona", "Zona Franca");
        _registerAndApprove(recip1,    LogisticsTracker.ActorRole.Recipient, "Startup Innovations S.A.",   "Barcelona");
        _registerAndApprove(recip2,    LogisticsTracker.ActorRole.Recipient, "Hospital Valle Verde",       "Malaga");
        _registerAndApprove(inspector, LogisticsTracker.ActorRole.Inspector, "QC Inspector Garcia",        "Madrid");
    }

    function _registerAndApprove(address actor, LogisticsTracker.ActorRole role, string memory name, string memory loc) internal {
        vm.prank(actor);
        tracker.registerActor(name, role, loc);
        tracker.approveActor(actor);
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    function _createShipment(address from, address to, string memory product) internal returns (uint256) {
        vm.prank(from);
        return tracker.createShipment(to, product, "Madrid", "Barcelona", false);
    }

    function _createColdChainShipment(address from, address to, string memory product) internal returns (uint256) {
        vm.prank(from);
        return tracker.createShipment(to, product, "Valencia", "Malaga", true);
    }

    // ─── Actor Tests ──────────────────────────────────────────────────────────

    function testRegisterSender() public view {
        LogisticsTracker.Actor memory a = tracker.getActor(sender1);
        assertEq(a.actorAddress, sender1);
        assertEq(uint8(a.role), uint8(LogisticsTracker.ActorRole.Sender));
        assertTrue(a.isActive);
    }

    function testRegisterCarrier() public view {
        LogisticsTracker.Actor memory a = tracker.getActor(carrier1);
        assertEq(uint8(a.role), uint8(LogisticsTracker.ActorRole.Carrier));
        assertTrue(a.isActive);
    }

    function testRegisterHub() public view {
        LogisticsTracker.Actor memory a = tracker.getActor(hub1);
        assertEq(uint8(a.role), uint8(LogisticsTracker.ActorRole.Hub));
        assertTrue(a.isActive);
    }

    function testRegisterRecipient() public view {
        LogisticsTracker.Actor memory a = tracker.getActor(recip1);
        assertEq(uint8(a.role), uint8(LogisticsTracker.ActorRole.Recipient));
        assertTrue(a.isActive);
    }

    function testDeactivateActor() public {
        tracker.deactivateActor(carrier1);
        LogisticsTracker.Actor memory a = tracker.getActor(carrier1);
        assertFalse(a.isActive);
    }

    function testRegisterActorPendingApproval() public {
        address newActor = makeAddr("NewActor");
        vm.prank(newActor);
        tracker.registerActor("New Actor", LogisticsTracker.ActorRole.Carrier, "Sevilla");
        LogisticsTracker.Actor memory a = tracker.getActor(newActor);
        assertEq(a.actorAddress, newActor);
        assertFalse(a.isActive); // pending admin approval
        assertEq(uint8(a.role), uint8(LogisticsTracker.ActorRole.Carrier));
    }

    function testCannotRegisterActorTwice() public {
        vm.prank(sender1);
        vm.expectRevert("Already registered");
        tracker.registerActor("TechCorp Again", LogisticsTracker.ActorRole.Sender, "Madrid");
    }

    function testCannotRegisterWithNoneRole() public {
        address newActor = makeAddr("BadActor");
        vm.prank(newActor);
        vm.expectRevert("Invalid role");
        tracker.registerActor("Bad Actor", LogisticsTracker.ActorRole.None, "Nowhere");
    }

    function testApproveActorActivatesActor() public {
        address pending = makeAddr("PendingActor");
        vm.prank(pending);
        tracker.registerActor("Pending", LogisticsTracker.ActorRole.Carrier, "Toledo");
        assertFalse(tracker.getActor(pending).isActive);
        tracker.approveActor(pending);
        assertTrue(tracker.getActor(pending).isActive);
    }

    // ─── Shipment Tests ───────────────────────────────────────────────────────

    function testCreateShipment() public {
        uint256 id = _createShipment(sender1, recip1, "Laptops");
        assertEq(id, 1);
        (, address s, address r, string memory product,,,,,, ) = tracker.getShipment(id);
        assertEq(s, sender1);
        assertEq(r, recip1);
        assertEq(product, "Laptops");
    }

    function testCreateShipmentWithColdChain() public {
        uint256 id = _createColdChainShipment(sender2, recip2, "Insulin");
        (,,,,,,,, LogisticsTracker.ShipmentStatus status, bool cold) = tracker.getShipment(id);
        assertEq(uint8(status), uint8(LogisticsTracker.ShipmentStatus.Created));
        assertTrue(cold);
    }

    function testShipmentIdIncrementation() public {
        uint256 id1 = _createShipment(sender1, recip1, "Package A");
        uint256 id2 = _createShipment(sender1, recip1, "Package B");
        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    function testGetShipment() public {
        uint256 id = _createShipment(sender1, recip1, "Monitors");
        (uint256 sid, address s, address r, string memory product,,,,, LogisticsTracker.ShipmentStatus status,) = tracker.getShipment(id);
        assertEq(sid, id);
        assertEq(s, sender1);
        assertEq(r, recip1);
        assertEq(product, "Monitors");
        assertEq(uint8(status), uint8(LogisticsTracker.ShipmentStatus.Created));
    }

    function testOnlySenderCanCreateShipment() public {
        vm.prank(carrier1);
        vm.expectRevert("Must be Sender");
        tracker.createShipment(recip1, "Laptops", "Madrid", "Barcelona", false);
    }

    function testInactiveActorCannotCreateShipment() public {
        tracker.deactivateActor(sender1);
        vm.prank(sender1);
        vm.expectRevert("Actor not active");
        tracker.createShipment(recip1, "Laptops", "Madrid", "Barcelona", false);
    }

    function testCannotCreateShipmentWithZeroRecipient() public {
        vm.prank(sender1);
        vm.expectRevert("Invalid recipient");
        tracker.createShipment(address(0), "Laptops", "Madrid", "Barcelona", false);
    }

    // ─── Checkpoint Tests ─────────────────────────────────────────────────────

    function testRecordPickupCheckpoint() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        uint256 cpId = tracker.recordCheckpoint(shipId, "TechCorp Warehouse, Madrid", "Pickup", "Sealed and weighed", 0);
        assertEq(cpId, 1);
        LogisticsTracker.Checkpoint memory cp = tracker.getCheckpoint(cpId);
        assertEq(cp.shipmentId, shipId);
        assertEq(keccak256(bytes(cp.checkpointType)), keccak256(bytes("Pickup")));
        assertEq(cp.actor, carrier1);
    }

    function testRecordHubCheckpoint() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(hub1);
        uint256 cpId = tracker.recordCheckpoint(shipId, "Hub Logistico Madrid, Getafe", "Hub", "Sorted for BCN route", 0);
        LogisticsTracker.Checkpoint memory cp = tracker.getCheckpoint(cpId);
        assertEq(keccak256(bytes(cp.checkpointType)), keccak256(bytes("Hub")));
    }

    function testRecordTransitCheckpoint() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        uint256 cpId = tracker.recordCheckpoint(shipId, "A-2 Highway Km 350", "Transit", "On route", 0);
        LogisticsTracker.Checkpoint memory cp = tracker.getCheckpoint(cpId);
        assertEq(keccak256(bytes(cp.checkpointType)), keccak256(bytes("Transit")));
    }

    function testRecordDeliveryCheckpoint() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        uint256 cpId = tracker.recordCheckpoint(shipId, "Startup Innovations HQ, Barcelona", "Delivery", "Left at reception", 0);
        LogisticsTracker.Checkpoint memory cp = tracker.getCheckpoint(cpId);
        assertEq(keccak256(bytes(cp.checkpointType)), keccak256(bytes("Delivery")));
    }

    function testRecordCheckpointWithTemperature() public {
        uint256 shipId = _createColdChainShipment(sender2, recip2, "Insulin");
        vm.prank(carrier1);
        // 4.2°C stored as 42 (celsius × 10)
        uint256 cpId = tracker.recordCheckpoint(shipId, "Refrigerated Van", "Transit", "Cold OK", 42);
        LogisticsTracker.Checkpoint memory cp = tracker.getCheckpoint(cpId);
        assertEq(cp.temperature, 42);
    }

    function testGetShipmentCheckpoints() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        tracker.recordCheckpoint(shipId, "Madrid", "Pickup", "", 0);
        vm.prank(hub1);
        tracker.recordCheckpoint(shipId, "Getafe Hub", "Hub", "", 0);
        vm.prank(carrier1);
        tracker.recordCheckpoint(shipId, "Barcelona", "Delivery", "", 0);

        LogisticsTracker.Checkpoint[] memory cps = tracker.getShipmentCheckpoints(shipId);
        assertEq(cps.length, 3);
        assertEq(keccak256(bytes(cps[0].checkpointType)), keccak256(bytes("Pickup")));
        assertEq(keccak256(bytes(cps[2].checkpointType)), keccak256(bytes("Delivery")));
    }

    function testCheckpointTimeline() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        uint256 t1 = block.timestamp;
        vm.prank(carrier1);
        tracker.recordCheckpoint(shipId, "Madrid", "Pickup", "", 0);

        vm.warp(t1 + 3600);
        vm.prank(hub1);
        tracker.recordCheckpoint(shipId, "Getafe", "Hub", "", 0);

        LogisticsTracker.Checkpoint[] memory cps = tracker.getShipmentCheckpoints(shipId);
        assertGt(cps[1].timestamp, cps[0].timestamp);
    }

    function testCannotRecordCheckpointForNonExistentShipment() public {
        vm.prank(carrier1);
        vm.expectRevert("Shipment not found");
        tracker.recordCheckpoint(999, "Somewhere", "Transit", "", 0);
    }

    function testInactiveActorCannotRecordCheckpoint() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        tracker.deactivateActor(carrier1);
        vm.prank(carrier1);
        vm.expectRevert("Actor not active");
        tracker.recordCheckpoint(shipId, "Madrid", "Pickup", "", 0);
    }

    function testEmptyCheckpointNotes() public {
        uint256 shipId = _createShipment(sender1, recip1, "Documents");
        vm.prank(carrier1);
        uint256 cpId = tracker.recordCheckpoint(shipId, "Madrid", "Pickup", "", 0);
        LogisticsTracker.Checkpoint memory cp = tracker.getCheckpoint(cpId);
        assertEq(bytes(cp.notes).length, 0);
    }

    // ─── Status Tests ─────────────────────────────────────────────────────────

    function testUpdateStatusToInTransit() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        tracker.updateShipmentStatus(shipId, LogisticsTracker.ShipmentStatus.InTransit);
        (,,,,,,,, LogisticsTracker.ShipmentStatus status,) = tracker.getShipment(shipId);
        assertEq(uint8(status), uint8(LogisticsTracker.ShipmentStatus.InTransit));
    }

    function testUpdateStatusToAtHub() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(hub1);
        tracker.updateShipmentStatus(shipId, LogisticsTracker.ShipmentStatus.AtHub);
        (,,,,,,,, LogisticsTracker.ShipmentStatus status,) = tracker.getShipment(shipId);
        assertEq(uint8(status), uint8(LogisticsTracker.ShipmentStatus.AtHub));
    }

    function testUpdateStatusToOutForDelivery() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        tracker.updateShipmentStatus(shipId, LogisticsTracker.ShipmentStatus.OutForDelivery);
        (,,,,,,,, LogisticsTracker.ShipmentStatus status,) = tracker.getShipment(shipId);
        assertEq(uint8(status), uint8(LogisticsTracker.ShipmentStatus.OutForDelivery));
    }

    function testUpdateStatusToDelivered() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        tracker.updateShipmentStatus(shipId, LogisticsTracker.ShipmentStatus.OutForDelivery);
        vm.prank(recip1);
        tracker.confirmDelivery(shipId);
        (,,,,,,,, LogisticsTracker.ShipmentStatus status,) = tracker.getShipment(shipId);
        assertEq(uint8(status), uint8(LogisticsTracker.ShipmentStatus.Delivered));
    }

    function testStatusChangeUpdatesState() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        tracker.updateShipmentStatus(shipId, LogisticsTracker.ShipmentStatus.InTransit);
        (,,,,,,,, LogisticsTracker.ShipmentStatus status,) = tracker.getShipment(shipId);
        assertEq(uint8(status), uint8(LogisticsTracker.ShipmentStatus.InTransit));
    }

    function testCannotUpdateTerminalStatus() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(sender1);
        tracker.cancelShipment(shipId);
        vm.prank(carrier1);
        vm.expectRevert("Terminal status");
        tracker.updateShipmentStatus(shipId, LogisticsTracker.ShipmentStatus.InTransit);
    }

    // ─── Delivery Confirmation Tests ──────────────────────────────────────────

    function testConfirmDeliveryByRecipient() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        tracker.updateShipmentStatus(shipId, LogisticsTracker.ShipmentStatus.OutForDelivery);
        vm.prank(recip1);
        tracker.confirmDelivery(shipId);
        (,,,,,,,, LogisticsTracker.ShipmentStatus status,) = tracker.getShipment(shipId);
        assertEq(uint8(status), uint8(LogisticsTracker.ShipmentStatus.Delivered));
    }

    function testOnlyRecipientCanConfirmDelivery() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(sender1);
        vm.expectRevert("Not recipient");
        tracker.confirmDelivery(shipId);
    }

    function testDeliveryUpdatesTimestamp() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        uint256 deliveryTime = block.timestamp + 86400;
        vm.warp(deliveryTime);
        vm.prank(recip1);
        tracker.confirmDelivery(shipId);
        (,,,,,,, uint256 dateDelivered,,) = tracker.getShipment(shipId);
        assertEq(dateDelivered, deliveryTime);
    }

    function testCannotConfirmDeliveryTwice() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(recip1);
        tracker.confirmDelivery(shipId);
        vm.prank(recip1);
        vm.expectRevert("Already delivered");
        tracker.confirmDelivery(shipId);
    }

    function testDeliveryConfirmedSetsDateDelivered() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        uint256 before = block.timestamp;
        vm.prank(recip1);
        tracker.confirmDelivery(shipId);
        (,,,,,,, uint256 dateDelivered,,) = tracker.getShipment(shipId);
        assertGe(dateDelivered, before);
    }

    // ─── Incident Tests ───────────────────────────────────────────────────────

    function testReportDelayIncident() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        uint256 incId = tracker.reportIncident(shipId, LogisticsTracker.IncidentType.Delay, "Road works on A-2");
        LogisticsTracker.Incident memory inc = tracker.getIncident(incId);
        assertEq(uint8(inc.incidentType), uint8(LogisticsTracker.IncidentType.Delay));
        assertFalse(inc.resolved);
    }

    function testReportDamageIncident() public {
        uint256 shipId = _createShipment(sender1, recip1, "Fragile Screens");
        vm.prank(carrier1);
        uint256 incId = tracker.reportIncident(shipId, LogisticsTracker.IncidentType.Damage, "Box dropped during unloading");
        LogisticsTracker.Incident memory inc = tracker.getIncident(incId);
        assertEq(uint8(inc.incidentType), uint8(LogisticsTracker.IncidentType.Damage));
        assertEq(inc.reporter, carrier1);
    }

    function testReportLostIncident() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptop");
        vm.prank(inspector);
        uint256 incId = tracker.reportIncident(shipId, LogisticsTracker.IncidentType.Lost, "Cannot locate package at hub");
        LogisticsTracker.Incident memory inc = tracker.getIncident(incId);
        assertEq(uint8(inc.incidentType), uint8(LogisticsTracker.IncidentType.Lost));
    }

    function testReportTempViolation() public {
        uint256 shipId = _createColdChainShipment(sender2, recip2, "Vaccine");
        vm.prank(carrier1);
        uint256 incId = tracker.reportIncident(shipId, LogisticsTracker.IncidentType.TempViolation, "Temperature reached 12C");
        LogisticsTracker.Incident memory inc = tracker.getIncident(incId);
        assertEq(uint8(inc.incidentType), uint8(LogisticsTracker.IncidentType.TempViolation));
    }

    function testResolveIncident() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        uint256 incId = tracker.reportIncident(shipId, LogisticsTracker.IncidentType.Delay, "Traffic jam");
        tracker.resolveIncident(incId, ""); // admin resolves
        LogisticsTracker.Incident memory inc = tracker.getIncident(incId);
        assertTrue(inc.resolved);
    }

    function testReporterCanResolveOwnIncident() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        uint256 incId = tracker.reportIncident(shipId, LogisticsTracker.IncidentType.Delay, "Delay");
        vm.prank(carrier1);
        tracker.resolveIncident(incId, "");
        LogisticsTracker.Incident memory inc = tracker.getIncident(incId);
        assertTrue(inc.resolved);
    }

    function testCannotResolveAlreadyResolvedIncident() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        uint256 incId = tracker.reportIncident(shipId, LogisticsTracker.IncidentType.Delay, "Delay");
        tracker.resolveIncident(incId, "");
        vm.expectRevert("Already resolved");
        tracker.resolveIncident(incId, "");
    }

    function testUnauthorizedCannotResolveIncident() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        uint256 incId = tracker.reportIncident(shipId, LogisticsTracker.IncidentType.Delay, "Delay");
        vm.prank(recip1);
        vm.expectRevert("Not authorized");
        tracker.resolveIncident(incId, "");
    }

    function testGetShipmentIncidents() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        tracker.reportIncident(shipId, LogisticsTracker.IncidentType.Delay, "Traffic");
        vm.prank(carrier1);
        tracker.reportIncident(shipId, LogisticsTracker.IncidentType.Damage, "Box dented");
        LogisticsTracker.Incident[] memory incs = tracker.getShipmentIncidents(shipId);
        assertEq(incs.length, 2);
    }

    // ─── Temperature Compliance Tests ─────────────────────────────────────────

    function testVerifyTemperatureComplianceValid() public {
        uint256 shipId = _createColdChainShipment(sender2, recip2, "Insulin");
        vm.prank(carrier1);
        tracker.recordCheckpoint(shipId, "Refrigerated Van", "Transit", "", 42); // 4.2°C
        assertTrue(tracker.verifyTemperatureCompliance(shipId));
    }

    function testVerifyTemperatureComplianceViolation() public {
        uint256 shipId = _createColdChainShipment(sender2, recip2, "Vaccine");
        vm.prank(carrier1);
        tracker.reportIncident(shipId, LogisticsTracker.IncidentType.TempViolation, "Fridge failed");
        assertFalse(tracker.verifyTemperatureCompliance(shipId));
    }

    function testColdChainMonitoring() public {
        uint256 shipId = _createColdChainShipment(sender2, recip2, "Blood Samples");

        vm.prank(carrier1);
        tracker.recordCheckpoint(shipId, "Hospital Lab", "Pickup", "Stored at 4C", 40);
        vm.prank(hub1);
        tracker.recordCheckpoint(shipId, "Hub Cold Storage", "Hub", "OK", 38);
        vm.prank(carrier2);
        tracker.recordCheckpoint(shipId, "Delivery Van", "Transit", "Temp spike!", 120); // 12°C — violation
        vm.prank(inspector);
        tracker.reportIncident(shipId, LogisticsTracker.IncidentType.TempViolation, "Exceeded 10C threshold");

        assertFalse(tracker.verifyTemperatureCompliance(shipId));
        LogisticsTracker.Checkpoint[] memory cps = tracker.getShipmentCheckpoints(shipId);
        assertEq(cps.length, 3);
        assertEq(cps[2].temperature, 120);
    }

    // ─── Cancellation Tests ───────────────────────────────────────────────────

    function testCancelShipment() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(sender1);
        tracker.cancelShipment(shipId);
        (,,,,,,,, LogisticsTracker.ShipmentStatus status,) = tracker.getShipment(shipId);
        assertEq(uint8(status), uint8(LogisticsTracker.ShipmentStatus.Cancelled));
    }

    function testOnlySenderCanCancelShipment() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        vm.expectRevert("Not sender");
        tracker.cancelShipment(shipId);
    }

    function testCannotCancelDeliveredShipment() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(recip1);
        tracker.confirmDelivery(shipId);
        vm.prank(sender1);
        vm.expectRevert("Already delivered");
        tracker.cancelShipment(shipId);
    }

    // ─── Edge Case Tests ──────────────────────────────────────────────────────

    function testMultipleCheckpointsForSameShipment() public {
        uint256 shipId = _createShipment(sender1, recip1, "Laptops");
        vm.prank(carrier1);
        tracker.recordCheckpoint(shipId, "Madrid", "Pickup", "", 0);
        vm.prank(hub1);
        tracker.recordCheckpoint(shipId, "Getafe", "Hub", "", 0);
        vm.prank(hub2);
        tracker.recordCheckpoint(shipId, "Zona Franca", "Hub", "", 0);
        vm.prank(carrier2);
        tracker.recordCheckpoint(shipId, "Barcelona Office", "Delivery", "", 0);

        LogisticsTracker.Checkpoint[] memory cps = tracker.getShipmentCheckpoints(shipId);
        assertEq(cps.length, 4);
        assertEq(cps[0].actor, carrier1);
        assertEq(cps[3].actor, carrier2);
    }

    function testShipmentWithMultipleIncidents() public {
        uint256 shipId = _createShipment(sender1, recip1, "Electronics");
        vm.prank(carrier1);
        tracker.reportIncident(shipId, LogisticsTracker.IncidentType.Delay, "Strike at port");
        vm.prank(inspector);
        tracker.reportIncident(shipId, LogisticsTracker.IncidentType.Damage, "Box corner crushed");
        vm.prank(carrier1);
        tracker.reportIncident(shipId, LogisticsTracker.IncidentType.Unauthorized, "Unknown handler at hub");

        LogisticsTracker.Incident[] memory incs = tracker.getShipmentIncidents(shipId);
        assertEq(incs.length, 3);
    }

    function testGetActorShipments() public {
        _createShipment(sender1, recip1, "Package A");
        _createShipment(sender1, recip1, "Package B");
        uint256[] memory senderShipments = tracker.getActorShipments(sender1);
        uint256[] memory recipShipments  = tracker.getActorShipments(recip1);
        assertEq(senderShipments.length, 2);
        assertEq(recipShipments.length, 2);
    }

    // ─── Full Flow Tests ──────────────────────────────────────────────────────

    /// @dev UC-01: Standard multi-hub delivery — TechCorp → Startup Innovations
    function testCompleteShippingFlow() public {
        // 1. TechCorp creates shipment
        vm.prank(sender1);
        uint256 id = tracker.createShipment(recip1, "10x Laptops Dell XPS", "TechCorp Warehouse, Madrid", "Startup Innovations, Barcelona", false);

        // 2. ExpressRide picks up
        vm.prank(carrier1);
        tracker.recordCheckpoint(id, "TechCorp Warehouse, Madrid", "Pickup", "10 units sealed, signed by TechCorp", 0);
        vm.prank(carrier1);
        tracker.updateShipmentStatus(id, LogisticsTracker.ShipmentStatus.InTransit);

        // 3. Hub Madrid sorts
        vm.prank(hub1);
        tracker.recordCheckpoint(id, "Hub Logistico Madrid, Getafe", "Hub", "Sorted for Barcelona express route", 0);
        vm.prank(hub1);
        tracker.updateShipmentStatus(id, LogisticsTracker.ShipmentStatus.AtHub);

        // 4. Hub Barcelona receives
        vm.prank(hub2);
        tracker.recordCheckpoint(id, "Hub Logistico Barcelona, Zona Franca", "Hub", "Ready for last-mile", 0);
        vm.prank(hub2);
        tracker.updateShipmentStatus(id, LogisticsTracker.ShipmentStatus.InTransit);

        // 5. UrbanDeliver delivers
        vm.prank(carrier2);
        tracker.recordCheckpoint(id, "Startup Innovations HQ, Barcelona", "Delivery", "Delivered to Carlos Ruiz at reception", 0);
        vm.prank(carrier2);
        tracker.updateShipmentStatus(id, LogisticsTracker.ShipmentStatus.OutForDelivery);

        // 6. Startup Innovations confirms
        vm.prank(recip1);
        tracker.confirmDelivery(id);

        // Verify final state
        (,,,,,,, uint256 dateDelivered, LogisticsTracker.ShipmentStatus status,) = tracker.getShipment(id);
        assertEq(uint8(status), uint8(LogisticsTracker.ShipmentStatus.Delivered));
        assertGt(dateDelivered, 0);
        assertTrue(tracker.verifyTemperatureCompliance(id));

        LogisticsTracker.Checkpoint[] memory cps = tracker.getShipmentCheckpoints(id);
        assertEq(cps.length, 4); // Pickup + Hub Madrid + Hub Barcelona + Delivery
    }

    /// @dev UC-02: Pharmaceutical cold chain — MediSupply → Hospital Valle Verde
    function testPharmaceuticalColdChainFlow() public {
        // 1. MediSupply creates cold-chain shipment
        vm.prank(sender2);
        uint256 id = tracker.createShipment(recip2, "Insulin pens - 200 units", "MediSupply Warehouse, Valencia", "Hospital Valle Verde, Malaga", true);

        // 2. ExpressRide picks up in refrigerated van
        vm.prank(carrier1);
        tracker.recordCheckpoint(id, "MediSupply Warehouse, Valencia", "Pickup", "Refrigerated unit confirmed", 40); // 4.0°C
        vm.prank(carrier1);
        tracker.updateShipmentStatus(id, LogisticsTracker.ShipmentStatus.InTransit);

        // 3. Hub Madrid cold storage
        vm.prank(hub1);
        tracker.recordCheckpoint(id, "Hub Madrid - Cold Storage Zone A", "Hub", "Temp stable", 38); // 3.8°C

        // 4. Inspector García verifies
        vm.prank(inspector);
        tracker.recordCheckpoint(id, "Hub Madrid", "Transit", "QC pass - all units intact", 39);

        // 5. Final delivery
        vm.prank(carrier1);
        tracker.recordCheckpoint(id, "Hospital Valle Verde Pharmacy", "Delivery", "Signed by Farmacia jefe", 41);
        vm.prank(recip2);
        tracker.confirmDelivery(id);

        // All temperature readings compliant — no TempViolation incidents
        assertTrue(tracker.verifyTemperatureCompliance(id));
        LogisticsTracker.Checkpoint[] memory cps = tracker.getShipmentCheckpoints(id);
        assertEq(cps.length, 4);
        assertGt(cps[0].temperature, 0);
    }

    /// @dev UC-03: Damaged package — incident reported and resolved
    function testMultiHubLogisticsFlow() public {
        // 1. Create shipment
        vm.prank(sender1);
        uint256 id = tracker.createShipment(recip1, "Fragile screens", "TechCorp, Madrid", "Startup Innovations, Barcelona", false);

        // 2. Carrier picks up
        vm.prank(carrier1);
        tracker.recordCheckpoint(id, "TechCorp Madrid", "Pickup", "Fragile sticker applied", 0);
        vm.prank(carrier1);
        tracker.updateShipmentStatus(id, LogisticsTracker.ShipmentStatus.InTransit);

        // 3. Damage discovered at hub
        vm.prank(hub1);
        tracker.recordCheckpoint(id, "Hub Madrid", "Hub", "Box corner damaged on arrival", 0);
        vm.prank(hub1);
        uint256 incId = tracker.reportIncident(id, LogisticsTracker.IncidentType.Damage, "Outer box crushed at bottom corner - contents may be affected");

        // Incident not yet resolved
        assertFalse(tracker.getIncident(incId).resolved);

        // 4. Inspector inspects and admin resolves
        vm.prank(inspector);
        tracker.recordCheckpoint(id, "Hub Madrid - QC Station", "Hub", "Inspector Garcia: screens OK, packaging replaced", 0);
        tracker.resolveIncident(incId, ""); // admin resolves

        assertTrue(tracker.getIncident(incId).resolved);

        // 5. Continue delivery
        vm.prank(carrier2);
        tracker.recordCheckpoint(id, "Startup Innovations, Barcelona", "Delivery", "Re-packaged. Delivered.", 0);
        vm.prank(recip1);
        tracker.confirmDelivery(id);

        (,,,,,,,, LogisticsTracker.ShipmentStatus status,) = tracker.getShipment(id);
        assertEq(uint8(status), uint8(LogisticsTracker.ShipmentStatus.Delivered));
        assertEq(tracker.getShipmentIncidents(id).length, 1);
    }
}
