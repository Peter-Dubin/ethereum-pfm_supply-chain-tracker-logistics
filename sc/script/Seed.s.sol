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

    function run() external {
        LogisticsTracker tracker = LogisticsTracker(vm.envAddress("CONTRACT_ADDRESS"));

        // ── PHASE 1: Register & Approve All 9 Actors ──────────────────────────
        _registerActors(tracker);
        _approveActors(tracker);
        console.log("Phase 1 complete: 9 actors registered and approved.");

        // ── PHASE 2 (future): _createShipments(tracker); ──────────────────────
        // ── PHASE 3 (future): _recordCheckpoints(tracker); ────────────────────
        // ── PHASE 4 (future): _reportIncidents(tracker); ──────────────────────
    }

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
}
