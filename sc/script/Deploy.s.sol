// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "forge-std/Script.sol";
import "../src/LogisticsTracker.sol";

contract Deploy is Script {
    function run() external returns (address) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);
        LogisticsTracker tracker = new LogisticsTracker();
        console.log("LogisticsTracker deployed at:", address(tracker));
        vm.stopBroadcast();
        return address(tracker);
    }
}
