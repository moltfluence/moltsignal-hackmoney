// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IERC20Like {
    function balanceOf(address account) external view returns (uint256);
}

contract StakeGate is Ownable {
    address public token;
    uint256 public minStake;

    event StakeRulesUpdated(address token, uint256 minStake);

    constructor(address owner_, address token_, uint256 minStake_) Ownable(owner_) {
        token = token_;
        minStake = minStake_;
    }

    function setStakeRules(address token_, uint256 minStake_) external onlyOwner {
        token = token_;
        minStake = minStake_;
        emit StakeRulesUpdated(token_, minStake_);
    }

    function hasRequiredStake(address agent) public view returns (bool) {
        if (token == address(0) || minStake == 0) {
            return true;
        }
        return IERC20Like(token).balanceOf(agent) >= minStake;
    }
}
