pragma solidity 0.6.5;

import "./Player.sol";
import "../characters/Characters.sol";

contract UBFDataLayout {
    Player _playerContract;
    Characters _charactersContract;
    mapping(address => mapping(uint256 => uint256)) _timeSlots;
    mapping(address => mapping(uint256 => bool)) _claimedSlots;
}
