pragma solidity 0.6.5;

contract CharactersDataLayout {
    uint256 nextId;
    mapping(uint256 => address) _owners;
    mapping(address => uint256) _numPerOwners;
    mapping(uint256 => mapping(address => uint256)) _subOwner;
    mapping(uint256 => mapping(address => uint256)) _data;
}
