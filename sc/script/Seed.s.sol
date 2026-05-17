// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";
import "../src/LogisticsTracker.sol";

contract Seed is Script {

    // Anvil deterministic private keys — accounts #0–#9
    uint256 constant ADMIN_KEY     = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 constant SENDER1_KEY   = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    uint256 constant SENDER2_KEY   = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;
    uint256 constant CARRIER1_KEY  = 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6;
    uint256 constant CARRIER2_KEY  = 0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a;
    uint256 constant HUB1_KEY      = 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba;
    uint256 constant HUB2_KEY      = 0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e;
    uint256 constant RECIP1_KEY    = 0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356;
    uint256 constant RECIP2_KEY    = 0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97;
    uint256 constant INSPECTOR_KEY = 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6;

    // UC-01 base timestamp: May 15, 2026 08:00 UTC (two days before test date)
    // Realistic spacing: pickup at ~10 min, inter-hub transit ~1.5 h, last-mile ~1.5 h
    uint256 constant UC01_BASE = 1778832000;

    // UC-02 base timestamp: May 17, 2026 08:00 UTC (same day as test — in-progress scenario)
    // Seeded up to step 5 (AtHub, Hub Madrid Centro) to simulate an active mid-journey cold chain shipment
    uint256 constant UC02_BASE = 1779004800;

    function run() external {
        LogisticsTracker tracker = LogisticsTracker(vm.envAddress("CONTRACT_ADDRESS"));

        // ── PHASE 1: Register & Approve All 9 Actors ──────────────────────────
        _registerActors(tracker);
        _approveActors(tracker);
        console.log("Phase 1 complete: 9 actors registered and approved.");

        // ── PHASE 2: UC-01 — Standard Multi-Hub Electronics Delivery ──────────
        _seedUC01(tracker);
        console.log("Phase 2 complete: UC-01 seeded (Laptop Components x10, 7 checkpoints, Delivered).");

        // ── PHASE 3: UC-02 — Medical Cold Chain Delivery (in-progress at mid-point) ──
        _seedUC02(tracker);
        console.log("Phase 3 complete: UC-02 seeded (COVID Vaccine Batch #V2024, 4 checkpoints, AtHub Madrid).");
    }

    // ─── Phase 1 helpers ──────────────────────────────────────────────────────

    function _registerActors(LogisticsTracker tracker) internal {
        vm.startBroadcast(SENDER1_KEY);
        tracker.registerActor(
            "TechCorp S.L.",
            LogisticsTracker.ActorRole.Sender,
            "Parque Empresarial Las Rozas, Madrid"
        );
        vm.stopBroadcast();

        vm.startBroadcast(SENDER2_KEY);
        tracker.registerActor(
            "MediSupply S.A.",
            LogisticsTracker.ActorRole.Sender,
            "Zona Industrial Badalona, Barcelona"
        );
        vm.stopBroadcast();

        vm.startBroadcast(CARRIER1_KEY);
        tracker.registerActor(
            "ExpressRide Courier",
            LogisticsTracker.ActorRole.Carrier,
            "Hub Central Madrid"
        );
        vm.stopBroadcast();

        vm.startBroadcast(CARRIER2_KEY);
        tracker.registerActor(
            "UrbanDeliver S.L.",
            LogisticsTracker.ActorRole.Carrier,
            "Area Metropolitana Barcelona"
        );
        vm.stopBroadcast();

        vm.startBroadcast(HUB1_KEY);
        tracker.registerActor(
            "Hub Logistico Madrid Centro",
            LogisticsTracker.ActorRole.Hub,
            "Calle Logistica 12, Getafe, Madrid"
        );
        vm.stopBroadcast();

        vm.startBroadcast(HUB2_KEY);
        tracker.registerActor(
            "Hub Logistico Barcelona Norte",
            LogisticsTracker.ActorRole.Hub,
            "Av. Industrial 88, Montcada i Reixac, Barcelona"
        );
        vm.stopBroadcast();

        vm.startBroadcast(RECIP1_KEY);
        tracker.registerActor(
            "Startup Innovations S.A.",
            LogisticsTracker.ActorRole.Recipient,
            "Barcelona Tech Campus, 22@ District"
        );
        vm.stopBroadcast();

        vm.startBroadcast(RECIP2_KEY);
        tracker.registerActor(
            "Hospital Valle Verde",
            LogisticsTracker.ActorRole.Recipient,
            "Calle Salud 3, Alcorcon, Madrid"
        );
        vm.stopBroadcast();

        vm.startBroadcast(INSPECTOR_KEY);
        tracker.registerActor(
            "Inspector Garcia (QC)",
            LogisticsTracker.ActorRole.Inspector,
            "LogistChain HQ, Madrid"
        );
        vm.stopBroadcast();
    }

    function _approveActors(LogisticsTracker tracker) internal {
        vm.startBroadcast(ADMIN_KEY);
        tracker.approveActor(vm.addr(SENDER1_KEY));
        tracker.approveActor(vm.addr(SENDER2_KEY));
        tracker.approveActor(vm.addr(CARRIER1_KEY));
        tracker.approveActor(vm.addr(CARRIER2_KEY));
        tracker.approveActor(vm.addr(HUB1_KEY));
        tracker.approveActor(vm.addr(HUB2_KEY));
        tracker.approveActor(vm.addr(RECIP1_KEY));
        tracker.approveActor(vm.addr(RECIP2_KEY));
        tracker.approveActor(vm.addr(INSPECTOR_KEY));
        vm.stopBroadcast();
    }

    // ─── Phase 2: UC-01 ───────────────────────────────────────────────────────

    function _seedUC01(LogisticsTracker tracker) internal {
        address recip1 = vm.addr(RECIP1_KEY);

        // Step 1 — TechCorp S.L.: creates shipment (10:00)
        vm.warp(UC01_BASE);
        vm.startBroadcast(SENDER1_KEY);
        tracker.createShipment(
            recip1,
            "Laptop Components (x10)",
            "Parque Empresarial Las Rozas, Madrid",
            "Barcelona Tech Campus, 22@ District",
            false
        );
        vm.stopBroadcast();

        // Step 2 — ExpressRide Courier: pickup at sender origin (10:10)
        vm.warp(UC01_BASE + 630);
        vm.startBroadcast(CARRIER1_KEY);
        tracker.recordCheckpoint(1, "Parque Empresarial Las Rozas, Madrid", "Pickup", "Sealed box, 5 kg", 0);
        tracker.updateShipmentStatus(1, LogisticsTracker.ShipmentStatus.InTransit);
        vm.stopBroadcast();

        // Step 3 — Hub Madrid Centro: package arrives (10:21)
        vm.warp(UC01_BASE + 1255);
        vm.startBroadcast(HUB1_KEY);
        tracker.recordCheckpoint(1, "Calle Logistica 12, Getafe, Madrid", "Hub", "Sorted and ready", 0);
        tracker.updateShipmentStatus(1, LogisticsTracker.ShipmentStatus.AtHub);
        vm.stopBroadcast();

        // Step 4 — Hub Madrid Centro: package departs (10:30)
        vm.warp(UC01_BASE + 1800);
        vm.startBroadcast(HUB1_KEY);
        tracker.recordCheckpoint(1, "Calle Logistica 12, Getafe, Madrid", "Transit", "Loaded on Barcelona truck", 0);
        tracker.updateShipmentStatus(1, LogisticsTracker.ShipmentStatus.InTransit);
        vm.stopBroadcast();

        // Step 5 — Hub Barcelona Norte: package arrives after ~1.5 h road transit (11:32)
        vm.warp(UC01_BASE + 5526);
        vm.startBroadcast(HUB2_KEY);
        tracker.recordCheckpoint(1, "Av. Industrial 88, Montcada i Reixac, Barcelona", "Hub", "Received, forwarding to last-mile", 0);
        tracker.updateShipmentStatus(1, LogisticsTracker.ShipmentStatus.AtHub);
        vm.stopBroadcast();

        // Step 6 — Hub Barcelona Norte: package departs to last-mile carrier (11:44)
        vm.warp(UC01_BASE + 6288);
        vm.startBroadcast(HUB2_KEY);
        tracker.recordCheckpoint(1, "Av. Industrial 88, Montcada i Reixac, Barcelona", "Transit", "Handed to UrbanDeliver", 0);
        tracker.updateShipmentStatus(1, LogisticsTracker.ShipmentStatus.InTransit);
        vm.stopBroadcast();

        // Step 7 — UrbanDeliver S.L.: last-mile pickup at hub (12:05)
        vm.warp(UC01_BASE + 7548);
        vm.startBroadcast(CARRIER2_KEY);
        tracker.recordCheckpoint(1, "Av. Industrial 88, Montcada i Reixac, Barcelona", "Transit", "Picked up for last-mile delivery", 0);
        // Status remains InTransit — Transit type does not advance the status
        vm.stopBroadcast();

        // Step 8 — UrbanDeliver S.L.: arrives and hands over at recipient (13:20)
        vm.warp(UC01_BASE + 12057);
        vm.startBroadcast(CARRIER2_KEY);
        tracker.recordCheckpoint(1, "Barcelona Tech Campus, 22@ District", "Delivery", "Delivered to reception", 0);
        tracker.updateShipmentStatus(1, LogisticsTracker.ShipmentStatus.OutForDelivery);
        vm.stopBroadcast();

        // Step 9 — Startup Innovations S.A.: digital delivery confirmation (13:30)
        vm.warp(UC01_BASE + 12600);
        vm.startBroadcast(RECIP1_KEY);
        tracker.confirmDelivery(1);
        vm.stopBroadcast();
    }

    // ─── Phase 3: UC-02 ───────────────────────────────────────────────────────

    function _seedUC02(LogisticsTracker tracker) internal {
        address recip2 = vm.addr(RECIP2_KEY);

        // Step 1 — MediSupply S.A.: creates cold chain shipment (08:00)
        vm.warp(UC02_BASE);
        vm.startBroadcast(SENDER2_KEY);
        tracker.createShipment(
            recip2,
            "COVID Vaccine Batch #V2024",
            "Zona Industrial Badalona, Barcelona",
            "Calle Salud 3, Alcorcon, Madrid",
            true
        );
        vm.stopBroadcast();

        // Step 2 — ExpressRide Courier: pickup at sender (08:10)
        vm.warp(UC02_BASE + 600);
        vm.startBroadcast(CARRIER1_KEY);
        tracker.recordCheckpoint(2, "Zona Industrial Badalona, Barcelona", "Pickup", "Insulated packaging verified", 40);
        tracker.updateShipmentStatus(2, LogisticsTracker.ShipmentStatus.InTransit);
        vm.stopBroadcast();

        // Step 3 — Hub Barcelona Norte: package arrives, cold storage (09:00)
        vm.warp(UC02_BASE + 3600);
        vm.startBroadcast(HUB2_KEY);
        tracker.recordCheckpoint(2, "Av. Industrial 88, Montcada i Reixac, Barcelona", "Hub", "Cold storage dock #3", 50);
        tracker.updateShipmentStatus(2, LogisticsTracker.ShipmentStatus.AtHub);
        vm.stopBroadcast();

        // Step 4 — ExpressRide Courier: departs BCN hub toward MAD (09:30)
        vm.warp(UC02_BASE + 5400);
        vm.startBroadcast(CARRIER1_KEY);
        tracker.recordCheckpoint(2, "Av. Industrial 88, Montcada i Reixac, Barcelona", "Transit", "In transit to Madrid", 55);
        tracker.updateShipmentStatus(2, LogisticsTracker.ShipmentStatus.InTransit);
        vm.stopBroadcast();

        // Step 5 — Hub Madrid Centro: package arrives (12:30) — seed stops here (in-progress at mid-point)
        vm.warp(UC02_BASE + 16200);
        vm.startBroadcast(HUB1_KEY);
        tracker.recordCheckpoint(2, "Calle Logistica 12, Getafe, Madrid", "Hub", "Transferred to refrigerated van", 60);
        tracker.updateShipmentStatus(2, LogisticsTracker.ShipmentStatus.AtHub);
        vm.stopBroadcast();
    }
}
