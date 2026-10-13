// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {HonkVerifier} from "../src/HonkVerifier.sol";

/// @notice Deploys the generated HonkVerifier (and its linked libraries) and records the address.
///         Env: DEPLOYER_KEY. Writes deployments/<chainId>-verifier.json.
contract DeployVerifier is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_KEY");
        vm.startBroadcast(pk);
        HonkVerifier verifier = new HonkVerifier();
        vm.stopBroadcast();
        console.log("HonkVerifier", address(verifier));
        string memory json = "verifier";
        vm.serializeUint(json, "chainId", block.chainid);
        string memory out = vm.serializeAddress(json, "verifier", address(verifier));
        vm.writeJson(out, string.concat("deployments/", vm.toString(block.chainid), "-verifier.json"));
    }
}
