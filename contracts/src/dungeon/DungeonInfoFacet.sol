pragma solidity 0.6.5;

import "./DungeonFacetBase.sol";
import "./PureDungeon.sol";
import "../utils/BlockHashRegister.sol";
import "../characters/Characters.sol";
import "../tokens/Elements.sol";
import "../tokens/Gears.sol";
import "../player/Player.sol";

contract DungeonInfoFacet is DungeonFacetBase {
    function isUnlocked(
        uint256 characterId,
        uint256 location1,
        uint256 location2
    ) external view returns (bool) {
        return _isUnlocked(characterId, location1, location2);
    }

    function getAreaTypeForRoom(uint256 location) external view returns (uint8) {
        return _getAreaTypeForRoom(location);
    }

    function getCharacterLocation(uint256 characterId) external view returns (uint256 location) {
        location = _characters[characterId].location;
    }

    function getCharacterInfo(uint256 characterId)
        external
        view
        returns (
            uint256 location,
            uint8 direction,
            uint256 data,
            uint256 attackGear,
            uint256 defenseGear,
            uint256 accessory1,
            uint256 accessory2,
            uint256 accessory3,
            int64 floors,
            uint256 taxDueDate,
            address player
        )
    {
        Character storage character = _characters[characterId];
        location = character.location;
        direction = character.direction;
        data = _charactersContract.getData(characterId);
        attackGear = character.slot_1;
        defenseGear = character.slot_2;
        accessory1 = character.slot_3;
        accessory2 = character.slot_4;
        accessory3 = character.slot_5;
        floors = character.floors;
        player = address(_charactersContract.getSubOwner(characterId));
        taxDueDate = _taxDueDate[player];
    }

    function getRoomInfo(uint256 location)
        external
        view
        returns (
            uint256 blockNumber,
            uint256 monsterBlockNumber,
            uint8 direction,
            uint8 areaAtDiscovery,
            uint8 lastRoomIndex,
            uint8 index,
            bool actualised,
            uint64 numActiveCharacters,
            uint8 kind,
            uint64 randomEvent,
            uint256 discoverer
        )
    {
        Room storage room = _rooms[location];
        blockNumber = room.blockNumber;
        monsterBlockNumber = room.monsterBlockNumber;
        direction = room.direction;
        areaAtDiscovery = room.areaAtDiscovery;
        lastRoomIndex = room.lastRoomIndex;
        index = room.index;
        numActiveCharacters = room.numActiveCharacters;
        kind = room.kind;
        actualised = kind != 0;
        randomEvent = room.randomEvent;
        discoverer = room.discoverer;
    }

    function getCustomRoomName(uint256 location) external view returns (string memory name) {
        name = _customRoomNames[location];
    }

    function getQuest(uint256 characterId, uint64 id) external view returns (uint8 status, string memory data) {
        Quest storage quest = _quests[characterId][id];
        status = quest.status;
        data = quest.data;
    }
}
