pragma solidity 0.6.5;

contract ERC721TokenDataLayout {
    address internal _minter;
    uint256 internal _lastId;
    mapping(uint256 => address) internal _owners;
    mapping(uint256 => uint256) internal _subOwners;

    mapping(uint256 => uint256) internal _subNumNFTPerAddress;
    mapping(address => uint256) internal _numNFTPerAddress;
    mapping(address => mapping(address => bool)) internal _operatorsForAll;
    mapping(uint256 => address) internal _operators;

    mapping(uint256 => uint256) internal _data;
}
