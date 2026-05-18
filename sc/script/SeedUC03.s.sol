// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";
import "../src/LogisticsTracker.sol";

// UC-03 — Damaged Package: Incident Report & Resolution
// Seeded step-by-step from init-local.sh with `sleep 2` between invocations so
// each broadcast lands in a different Anvil block and gets a distinct wall-clock
// timestamp. vm.warp is intentionally omitted: it only affects local simulation,
// not the actual block.timestamp that Anvil assigns when broadcasting.
//
// Stopped at step 7 (InTransit) to leave the shipment in-progress.
// Incident ID = 1 (UC-01 and UC-02 have no incidents, so this is the first ever).
contract SeedUC03 is Script {

    uint256 constant SENDER1_KEY   = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    uint256 constant CARRIER1_KEY  = 0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6;
    uint256 constant HUB1_KEY      = 0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba;
    uint256 constant RECIP1_KEY    = 0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356;
    uint256 constant INSPECTOR_KEY = 0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6;

    function run() external {
        LogisticsTracker tracker = LogisticsTracker(vm.envAddress("CONTRACT_ADDRESS"));
        uint256 step = vm.envUint("UC03_STEP");
        address recip1 = vm.addr(RECIP1_KEY);

        if (step == 1) {
            // TechCorp S.L.: creates shipment (#3)
            vm.startBroadcast(SENDER1_KEY);
            tracker.createShipment(
                recip1,
                "Limited Edition Watch",
                "Parque Empresarial Las Rozas, Madrid",
                "Barcelona Tech Campus, 22@ District",
                false
            );
            vm.stopBroadcast();
            console.log("UC-03 Step 1 done: shipment #3 created.");

        } else if (step == 2) {
            // ExpressRide Courier: pickup at sender origin
            vm.startBroadcast(CARRIER1_KEY);
            tracker.recordCheckpoint(3, "Parque Empresarial Las Rozas, Madrid", "Pickup", "Small box, marked fragile", 0);
            tracker.updateShipmentStatus(3, LogisticsTracker.ShipmentStatus.InTransit);
            vm.stopBroadcast();
            console.log("UC-03 Step 2 done: pickup, InTransit.");

        } else if (step == 3) {
            // Hub Madrid Centro: package arrives
            vm.startBroadcast(HUB1_KEY);
            tracker.recordCheckpoint(3, "Calle Logistica 12, Getafe, Madrid", "Hub", "Received", 0);
            tracker.updateShipmentStatus(3, LogisticsTracker.ShipmentStatus.AtHub);
            vm.stopBroadcast();
            console.log("UC-03 Step 3 done: hub receive, AtHub.");

        } else if (step == 4) {
            // Hub Madrid Centro: discovers damage, reports incident (will get ID=1)
            vm.startBroadcast(HUB1_KEY);
            tracker.reportIncident(3, LogisticsTracker.IncidentType.Damage, "External box crushed at corner, product condition unknown");
            vm.stopBroadcast();
            console.log("UC-03 Step 4 done: Damage incident reported (ID=1).");

        } else if (step == 5) {
            // Inspector Garcia: physical inspection checkpoint
            vm.startBroadcast(INSPECTOR_KEY);
            tracker.recordCheckpoint(3, "Calle Logistica 12, Getafe, Madrid", "Hub", "Physical inspection at Hub Madrid", 0);
            vm.stopBroadcast();
            console.log("UC-03 Step 5 done: inspection checkpoint recorded.");

        } else if (step == 6) {
            // Inspector Garcia: resolves incident ID=1
            vm.startBroadcast(INSPECTOR_KEY);
            tracker.resolveIncident(1, "Product intact; repackaged in reinforced box; cleared to proceed");
            vm.stopBroadcast();
            console.log("UC-03 Step 6 done: incident resolved.");

        } else if (step == 7) {
            // Hub Madrid Centro: departs hub — seed stops here (shipment left InTransit)
            vm.startBroadcast(HUB1_KEY);
            tracker.recordCheckpoint(3, "Calle Logistica 12, Getafe, Madrid", "Transit", "Cleared for shipment", 0);
            tracker.updateShipmentStatus(3, LogisticsTracker.ShipmentStatus.InTransit);
            vm.stopBroadcast();
            console.log("UC-03 Step 7 done: transit checkpoint, InTransit -- UC-03 seed complete.");
        }
    }
}
