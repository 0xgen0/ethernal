pragma solidity 0.6.5;

import "../utils/BlockHashRegister.sol";
import "../characters/Characters.sol";
import "../tokens/Elements.sol";
import "../tokens/Gears.sol";
import "../tokens/Rooms.sol";
import "../player/Player.sol";

contract DungeonDataLayout {
    struct Room {
        uint64 blockNumber;
        uint64 monsterBlockNumber;
        uint64 numActiveCharacters;
        uint8 direction;
        uint8 exits;
        uint8 kind;
        uint8 areaAtDiscovery;
        uint8 lastRoomIndex;
        uint8 index;
        uint256 discoverer;
        uint64 randomEvent;
    }

    struct Character {
        uint256 location;
        uint8 direction;
        int64 floors;
        uint256 slot_1; // attack // TODO store this on character NFT ?
        uint256 slot_2; // defense // TODO store this on character NFT ?
        uint256 slot_3; // accessory 1 // TODO store this on character NFT ?
        uint256 slot_4; // accessory 2 // TODO store this on character NFT ?5
        uint256 slot_5; // accessory 3 // TODO store this on character NFT ?
    }

    struct Area {
        uint8 areaType;
        uint8 discovered; // record room types already discovered : temple, teleport ...
        uint8 lastRoomIndex; // track what was the index of the room discovered first in last block
        uint8 currentIndex; // track the index of room discovered in the same block
        uint256 lastRoom; // last room disovered in a block, used for area blockHash too
        uint64 eventBlockNumber;
    }

    mapping(uint256 => Character) _characters;
    mapping(uint256 => Room) _rooms;
    mapping(uint256 => Area) _areas;

    struct AreaCounter {
        uint64 lastPeriod;
        uint64 numAreas;
    }
    AreaCounter _areaCounter;

    address _adminContract;
    BlockHashRegister _blockHashRegister;
    Characters _charactersContract;
    Elements _elementsContract;
    Gears _gearsContract;
    Rooms _roomsContract;
    Player _playerContract;

    mapping(uint256 => mapping(uint256 => mapping(uint256 => bool))) _unlockedExits;

    struct Quest {
        uint8 status;
        string data;
    }
    mapping(uint256 => mapping(uint64 => Quest)) _quests; // _quests[character][id]

    mapping(address => uint256) _taxDueDate;

    mapping(uint256 => string) _customRoomNames;
}
