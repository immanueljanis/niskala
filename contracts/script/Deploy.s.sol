// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {RfqMarket, IERC20, IHonkVerifier} from "../src/RfqMarket.sol";
import {MockERC20} from "../src/MockERC20.sol";
import {HonkVerifier} from "../src/HonkVerifier.sol";

/// @notice Deploys mocks, the generated Honk verifier, and the market with the maker roster.
///         Env: DEPLOYER_KEY (uint), MAKERS (comma-separated addresses).
///         Writes deployments/<chainId>.json.
contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_KEY");
        address[] memory makers = vm.envAddress("MAKERS", ",");
        require(makers.length == 3, "need 3 makers");

        vm.startBroadcast(pk);
        MockERC20 usdc = new MockERC20("Niskala Mock USDC", "USDC", 6);
        MockERC20 weth = new MockERC20("Niskala Mock WETH", "WETH", 18);
        HonkVerifier verifier = new HonkVerifier();
        RfqMarket market = new RfqMarket(IERC20(address(usdc)), IERC20(address(weth)), IHonkVerifier(address(verifier)), makers);
        vm.stopBroadcast();

        console.log("chainId   ", block.chainid);
        console.log("USDC      ", address(usdc));
        console.log("WETH      ", address(weth));
        console.log("Verifier  ", address(verifier));
        console.log("RfqMarket ", address(market));

        string memory json = "deployment";
        vm.serializeUint(json, "chainId", block.chainid);
        vm.serializeAddress(json, "usdc", address(usdc));
        vm.serializeAddress(json, "weth", address(weth));
        vm.serializeAddress(json, "verifier", address(verifier));
        vm.serializeAddress(json, "market", address(market));
        vm.serializeAddress(json, "makers", makers);
        string memory out = vm.serializeUint(json, "deployedAt", block.timestamp);
        vm.writeJson(out, string.concat("deployments/", vm.toString(block.chainid), ".json"));
    }
}
