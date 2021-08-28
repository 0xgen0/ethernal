pragma solidity 0.6.5;

import "./DungeonFacetBase.sol";
import "./PureDungeon.sol";
import "../utils/BlockHashRegister.sol";
import "../characters/Characters.sol";
import "../tokens/Elements.sol";
import "../tokens/Gears.sol";
import "../player/Player.sol";

contract DungeonActionsFacet is DungeonFacetBase {
    function recycle(uint256 characterId, uint256[] calldata gearIds) external onlyPlayer {
        CharacterData memory data = _getCharacterData(characterId);
        require(data.hp > 0, "your character is dead");
        uint256 reward = 0;
        for (uint256 i = 0; i < gearIds.length; i++) {
            uint256 id = gearIds[i];
            require(characterId == _gearsContract.subOwnerOf(id), "has to be owner of gear");
            reward += PureDungeon._recyclingReward(_gearsContract.getData(id));
            _gearsContract.subBurn(id);
            emit Recycle(characterId, id);
        }
        _elementsContract.mint(characterId, PureDungeon.FRAGMENTS, reward);
    }

    function buyRoom(uint256 characterId) external onlyPlayer {
        uint256 location = _characters[characterId].location;
        uint256 owner = _roomsContract.subOwnerOf(location);
        require(_taxDueDate[address(owner)] < block.timestamp, "not foreclosed");
        _elementsContract.subBurnFrom(characterId, PureDungeon.COINS, 2);
        uint256 buyer = _charactersContract.getSubOwner(characterId);
        _initializeTaxDueDate(buyer);
        _roomsContract.subTransferFrom(address(this), owner, buyer, location);
    }

    function abandonRoom(uint256 characterId, uint256 location) external onlyPlayer {
        uint256 owner = _roomsContract.subOwnerOf(location);
        uint256 player = _charactersContract.getSubOwner(characterId);
        require(owner == player, "not owner");
        _roomsContract.subTransferFrom(address(this), owner, uint256(address(this)), location);
    }

    function deactivateRoom(uint256 characterId, uint256 location) external onlyPlayer {
        uint256 owner = _roomsContract.subOwnerOf(location);
        uint256 player = _charactersContract.getSubOwner(characterId);
        require(owner == player, "not owner");
        _elementsContract.transferFrom(address(owner), address(0), PureDungeon.COINS, 100);
        _roomsContract.transferFrom(address(this), address(owner), location);
    }

    function activateRoom(uint256 characterId, uint256 location) external onlyPlayer {
        uint256 player = _charactersContract.getSubOwner(characterId);
        uint256 owner = uint256(_roomsContract.ownerOf(location));
        require(owner != uint256(address(this)), "not deactivated");
        require(owner == player, "not owner");
        _roomsContract.transferFrom(address(owner), address(this), location);
        _initializeTaxDueDate(owner);
        _roomsContract.subTransferFrom(address(this), 0, owner, location);
    }

    function nameRoom(uint256 characterId, uint256 location, string calldata name) external onlyPlayer {
        uint256 owner = _roomsContract.subOwnerOf(location);
        uint256 player = _charactersContract.getSubOwner(characterId);
        require(owner == player, "not owner");
        _elementsContract.transferFrom(address(owner), address(0), PureDungeon.COINS, 20);
        _customRoomNames[location] = name;
        emit RoomName(location, name, characterId);
    }

    uint256 public constant TAX_PERIOD = 5 days;

    function payRoomsTax(uint256 characterId, uint256 periods) external onlyPlayer {
        require(periods > 0, "one period atleast");
        address owner = address(_charactersContract.getSubOwner(characterId));
        uint256 rooms = _roomsContract.subBalanceOf(uint256(owner));
        require(rooms > 0, "not dungeon keeper");
        uint256 tax = PureDungeon._roomsTax(rooms, periods);
        _elementsContract.transferFrom(owner, address(0), PureDungeon.COINS, tax);
        _taxDueDate[owner] += TAX_PERIOD * periods;
        require(_taxDueDate[owner] < block.timestamp + TAX_PERIOD * 2, "cannot prepay more");
        emit RoomTaxPay(owner, tax, _taxDueDate[owner]);
    }
}
