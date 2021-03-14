pragma solidity 0.6.5;

import "buidler-deploy/solc_0.6/proxy/Proxied.sol";
import "./CharactersDataLayout.sol";

contract Characters is Proxied, CharactersDataLayout {
    event CharacterUpdate(uint256 indexed id, address indexed owner, uint256 data);
    event Transfer(address indexed from, address indexed to, uint256 indexed id);

    function postUpgrade() external proxied {
        if (nextId == 0) {
            nextId = 1;
        }
    }

    function getSubOwner(uint256 id) external view returns (uint256) {
        return _subOwner[id][_owners[id]];
    }

    function setSubOwner(uint256 id, uint256 subOwner) external {
        require(msg.sender == _owners[id], "only owner is able to set sub owner");
        _setSubOwnerFor(id, msg.sender, subOwner);
    }

    function _setSubOwnerFor(
        uint256 id,
        address owner,
        uint256 subOwner
    ) internal {
        // TODO emit SubOwnerTransferEvent
        _subOwner[id][owner] = subOwner;
    }

    function mintTo(address to) external returns (uint256) {
        return _mint(to);
    }

    // subowner is uint(address) of player currently
    // when subowner == 0 character is considered not in the dungeon
    function mint(uint256 subOwner) external returns (uint256) {
        uint256 id = _mint(msg.sender);
        _setSubOwnerFor(id, msg.sender, subOwner);
        return id;
    }

    function _mint(address to) internal returns (uint256) {
        uint256 id = nextId++;
        _owners[id] = to;
        _numPerOwners[to]++;
        emit Transfer(address(0), to, id);
        return id;
    }

    function getData(uint256 id) external view returns (uint256) {
        return _data[id][msg.sender];
    }

    function getDataFor(uint256 id, address owner) external view returns (uint256) {
        return _data[id][owner];
    }

    // TODO only dungeon should be able to set data
    // currently this can be called by the player when characters is outside of dungeon
    function setData(uint256 id, uint256 data) external {
        require(msg.sender == _ownerOf(id), "only owner is allowed to set data");
        _setDataFor(id, msg.sender, data);
    }

    function _setDataFor(
        uint256 id,
        address owner,
        uint256 data
    ) internal {
        _data[id][owner] = data;
        emit CharacterUpdate(id, owner, data);
    }

    function _ownerOf(uint256 id) internal view returns (address) {
        return _owners[id];
    }

    function fullOwnerOf(uint256 id) external view returns (address owner, uint256 subOwner) {
        owner = _ownerOf(id);
        subOwner = _subOwner[id][owner];
    }

    // EIP-721 Standard
    function ownerOf(uint256 id) external view returns (address tokenOwner) {
        tokenOwner = _ownerOf(id);
        require(tokenOwner != address(0), "token does not exist");
    }

    function balanceOf(address who) external view returns (uint256) {
        require(who != address(0), "zero address");
        return _numPerOwners[who];
    }

    function transferFrom(
        address from,
        address to,
        uint256 id
    ) external {
        require(from != address(0), "from is zero address");
        require(to != address(0), "from is zero address");
        address owner = _owners[id];
        require(owner == from, "from is not owner");
        _subOwner[id][owner] = 0;
        _owners[id] = to;
        _numPerOwners[from]--;
        _numPerOwners[to]++;
    }

    function supportsInterface(bytes4 id) external pure returns (bool) {
        // TODO metadata || id == 0x5b5e139f;
        return id == 0x01ffc9a7 || id == 0x80ac58cd;
    }
}
