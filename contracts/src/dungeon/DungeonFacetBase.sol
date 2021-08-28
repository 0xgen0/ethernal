pragma solidity 0.6.5;

import "buidler-deploy/solc_0.6/proxy/diamond/DiamondStorageContract.sol";
import "./DungeonDataLayout.sol";
import "./DungeonEvents.sol";
import "./PureDungeon.sol";
import "../utils/BlockHashRegister.sol";
import "../characters/Characters.sol";
import "../tokens/Elements.sol";
import "../tokens/Gears.sol";
import "../player/Player.sol";

abstract contract DungeonFacetBase is DungeonDataLayout, DungeonEvents, DiamondStorageContract {
    uint256 internal constant MAX_GEARS = 10;


    modifier onlyOwner() {
        DiamondStorage storage ds = diamondStorage();
        require(msg.sender == ds.contractOwner, "Only owner is allowed to perform this action");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == _adminContract, "NOT_AUTHORIZED_ADMIN");
        _;
    }

    modifier onlyPlayer() {
        require(msg.sender == address(_playerContract), "only players allowed");
        _;
    }

    function _actualiseRoom(uint256 location) internal {
        Room storage room = _rooms[location];
        require(room.blockNumber > 0, "room not created yet");
        if (room.kind == 0) {
            bytes32 blockHash = _blockHashRegister.get(room.blockNumber);
            if (blockHash == 0) {
                // skip as block is not actualised or not in register
                return;
            }
            _actualiseArea(location, blockHash);
            (uint8 exits, uint8 kind, uint8 area_discovered) = PureDungeon._generateRoom(
                location,
                blockHash,
                room.direction,
                room.areaAtDiscovery,
                room.lastRoomIndex,
                room.index
            );
            room.exits = exits;
            room.kind = kind;
            uint256 areaLoc = PureDungeon._getAreaLoc(location);
            Area storage area = _areas[areaLoc];
            if (area.discovered != area_discovered) {
                area.discovered = area_discovered;
            }
            emit RoomActualised(location, blockHash, exits, kind);
            uint8 areaType = _areas[areaLoc].areaType;
            if (room.discoverer != 0) {
                CharacterData memory characterData = _getCharacterData(room.discoverer);
                (uint256 numGold, uint256 numElements) = PureDungeon._computeRoomDiscoveryReward(
                    location,
                    blockHash,
                    characterData.class
                );
                if (areaType <= 5) {
                    _elementsContract.mint(room.discoverer, areaType, numElements);
                }
                _elementsContract.mint(room.discoverer, 6, numGold);
            }
        }
        _actualiseRandomEvent(PureDungeon._getAreaLoc(location)); // room actualisation take precedence // monster
    }

    function _actualiseArea(uint256 location, bytes32 blockHash) internal {
        uint256 areaLoc = PureDungeon._getAreaLoc(location);
        uint8 areaType = _areas[areaLoc].areaType;
        if (areaType == 0) {
            uint64 currentNumAreas = _areaCounter.numAreas;
            areaType = PureDungeon._generateArea(areaLoc, blockHash, currentNumAreas);
            _areas[areaLoc].areaType = areaType;
            if (areaType != 6) {
                uint64 period = uint64(block.timestamp / 23 hours);
                if (_areaCounter.lastPeriod != period) {
                    _areaCounter.lastPeriod = period;
                    _areaCounter.numAreas = 1;
                } else {
                    _areaCounter.numAreas = currentNumAreas + 1;
                }
            }
        }
    }

    struct CharacterData {
        uint8 class;
        uint16 level;
        uint32 xp;
        uint16 maxHP;
        uint16 hp;
    }

    function _setCharacterData(uint256 characterId, CharacterData memory characterData) internal {
        uint256 data = ((uint256(characterData.class) << 248) +
            (uint256(characterData.level) << 232) +
            (uint256(characterData.xp) << 200) +
            (uint256(characterData.maxHP) << 184) +
            (uint256(characterData.hp) << 168));
        _charactersContract.setData(characterId, data);
    }

    function _getCharacterData(uint256 characterId) internal view returns (CharacterData memory) {
        uint256 data = _charactersContract.getData(characterId);
        (uint16 level, uint16 hp, uint16 maxHP, uint32 xp, uint8 class) = PureDungeon._decodeCharacterData(data);
        return CharacterData(class, level, xp, maxHP, hp);
    }

    function _actualiseRandomEvent(uint256 areaLoc) internal {
        Area storage area = _areas[areaLoc];
        uint64 blockNumber = area.eventBlockNumber;
        if (blockNumber != 0) {
            bytes32 blockHash = _blockHashRegister.get(blockNumber);
            if (blockHash == 0) {
                // skip as block is not actualised or not in register
                return;
            }
            (uint256 roomLocation, uint64 randomEvent) = PureDungeon._generateRandomEvent(areaLoc, blockHash);
            uint256 monsterIndex = _checkMonsterBlockNumber(roomLocation);
            Room storage room = _rooms[roomLocation];
            if (room.randomEvent == 0 && room.numActiveCharacters == 0 && monsterIndex == 0 && room.kind != 0) {
                room.randomEvent = randomEvent;
            }
            area.eventBlockNumber = 0;
        }
    }

    /// @dev to be valid it require the room to be actualised first
    function _checkMonster(uint256 location) internal view returns (uint256) {
        uint256 monsterIndex = _checkMonsterBlockNumber(location);
        // if (monsterIndex == 0) {
        //     if (_roomEvents[location] == 1)  { //TODO monster indicator
        //         return 1;
        //     }
        //     return 0;
        // }
        return monsterIndex;
    }

    function _checkMonsterBlockNumber(uint256 location) internal view returns (uint256) {
        uint64 monsterBlockNumber = _rooms[location].monsterBlockNumber;
        if (monsterBlockNumber == 0) {
            // no monsters
            return 0;
        }
        bytes32 monsterBlockHash = _blockHashRegister.get(monsterBlockNumber);
        if (monsterBlockHash == 0) {
            // skip as monster block is not actualised
            return 0;
        }
        bool newlyDiscoveredRoom = monsterBlockNumber == _rooms[location].blockNumber;
        return
            PureDungeon._generateMonsterIndex(
                location,
                monsterBlockHash,
                1,
                newlyDiscoveredRoom,
                _rooms[location].kind
            );
    }

    struct GearData {
        uint16 level;
        uint8 slot;
        uint8 classBits; // bit array of allowed classes indexed by lsb
        uint16 durability;
        uint16 maxDurability; // gear is unbreakable when maxDurablity is 0
        uint32 template;
    }

    function _setGearData(uint256 gearId, GearData memory gear) internal {
        uint256 data = PureDungeon._encodeGearData(
            gear.level,
            gear.slot,
            gear.classBits,
            gear.durability,
            gear.maxDurability,
            gear.template
        );
        _gearsContract.setData(gearId, data);
    }

    function _getGearData(uint256 gearId) internal view returns (GearData memory) {
        uint256 data = _gearsContract.getData(gearId);
        (
            uint16 level,
            uint8 slot,
            uint8 classBits,
            uint16 durability,
            uint16 maxDurability,
            uint32 template
        ) = PureDungeon._decodeGearData(data);
        return GearData(level, slot, classBits, durability, maxDurability, template);
    }

    function _addInitialGears(uint256 characterId) internal {
        uint256 attackGearData = PureDungeon._encodeGearData(0, 0, 15, 10, 10, 1);
        uint256 defenseGearData = PureDungeon._encodeGearData(0, 1, 15, 10, 10, 4);
        uint256 attackGear = _gearsContract.mint(characterId, attackGearData);
        _equip(characterId, 0, 0, attackGear, 0);
        uint256 defenseGear = _gearsContract.mint(characterId, defenseGearData);
        _equip(characterId, 0, 0, defenseGear, 1);
    }

    // TODO restrict transfer of equiped items
    function _equip(
        uint256 characterId,
        uint16 level,
        uint8 class,
        uint256 id,
        uint8 slot
    ) internal {
        GearData memory gear = _getGearData(id);
        require(gear.level <= level, "gear Level too high");
        require((gear.classBits >> class) & 1 != 0, "invalid class");
        if (slot == 0) {
            require(gear.slot == 0, "only attack gear on slot 0");
            _characters[characterId].slot_1 = id;
        } else if (slot == 1) {
            require(gear.slot == 1, "only defense gear on slot 1");
            _characters[characterId].slot_2 = id;
        } else if (slot == 2) {
            require(gear.slot == 2, "only accessories on slot 2");
            _characters[characterId].slot_3 = id;
        } else if (slot == 3) {
            require(gear.slot == 2, "only accessories on slot 3");
            _characters[characterId].slot_4 = id;
        } else if (slot == 4) {
            require(gear.slot == 2, "only accessories on slot 4");
            _characters[characterId].slot_5 = id;
        }
        emit Equip(characterId, id, gear.slot);
    }

    function _handleKey(
        uint256 characterId,
        uint256 location,
        uint256 location2
    ) internal {
        uint256 location1 = location;
        if (location1 > location2) {
            location1 = location2;
            location2 = location;
        }
        if (!_isUnlocked(characterId, location1, location2)) {
            require(_elementsContract.subBalanceOf(characterId, PureDungeon.KEYS) > 0, "no key");
            _elementsContract.subBurnFrom(characterId, PureDungeon.KEYS, 1);
            _unlockedExits[characterId][location1][location2] = true;
        }
    }

    function _isUnlocked(
        uint256 characterId,
        uint256 location1,
        uint256 location2
    ) internal view returns (bool) {
        return _unlockedExits[characterId][location1][location2];
    }

    function _getAreaTypeForRoom(uint256 location) internal view returns (uint8) {
        return _areas[PureDungeon._getAreaLoc(location)].areaType;
    }

    function _moveTo(
        uint256 characterId,
        uint256 oldLocation,
        uint8 direction
    ) internal returns (uint256) {
        (int64 x, int64 y, int64 z, ) = PureDungeon._coordinates(oldLocation);
        if (PureDungeon.NORTH == direction) {
            y--;
        } else if (PureDungeon.EAST == direction) {
            x++;
        } else if (PureDungeon.SOUTH == direction) {
            y++;
        } else if (PureDungeon.WEST == direction) {
            x--;
        } else {
            revert("impossible direction");
        }
        uint256 newLocation = PureDungeon._location(x, y, z);
        Room storage currentRoom = _rooms[oldLocation];
        Room storage nextRoom = _rooms[newLocation];
        uint64 cb = currentRoom.blockNumber;
        uint64 nb = nextRoom.blockNumber;
        uint8 exitMask = uint8(2)**direction;
        uint8 opositeExitMask = uint8(2)**((direction + 2) % 4);
        if (cb < nb || nb == 0) {
            if ((currentRoom.exits & exitMask) == exitMask) {
                if ((currentRoom.exits / 2**4) & exitMask == exitMask) {
                    _handleKey(characterId, oldLocation, newLocation);
                }
                return newLocation;
            }
        } else if (cb > nb) {
            if ((nextRoom.exits & opositeExitMask) == opositeExitMask) {
                if ((nextRoom.exits / 2**4) & opositeExitMask == opositeExitMask) {
                    _handleKey(characterId, oldLocation, newLocation);
                }
                return newLocation;
            }
        } else {
            if ((currentRoom.exits & exitMask) == exitMask || (nextRoom.exits & opositeExitMask) == opositeExitMask) {
                if (oldLocation > newLocation) {
                    if ((nextRoom.exits / 2**4) & opositeExitMask == opositeExitMask) {
                        _handleKey(characterId, oldLocation, newLocation);
                    }
                } else {
                    if ((currentRoom.exits / 2**4) & exitMask == exitMask) {
                        _handleKey(characterId, oldLocation, newLocation);
                    }
                }
                return newLocation;
            }
        }
        revert("cant move this way");
    }

    function _move(
        uint256 characterId,
        uint256 location,
        uint8 direction
    ) internal {
        Character storage character = _characters[characterId];
        Room storage currentRoom = _rooms[character.location];
        Room storage nextRoom = _rooms[location];
        uint64 blockNumber;
        if (nextRoom.blockNumber == 0) {
            _discoverRoom(location, characterId, direction);
        } else {
            // TODO should we actualiseRoom first, before monster ?
            if (nextRoom.monsterBlockNumber == 0 && nextRoom.numActiveCharacters == 0) {
                blockNumber = uint64(block.number);
                _blockHashRegister.request();
                if (nextRoom.monsterBlockNumber == 0) {
                    nextRoom.monsterBlockNumber = blockNumber;
                }
            }
            _actualiseRoom(location);
            address benefactor = _roomBenefactor(location);
            if (benefactor != address(0) && uint256(benefactor) != _charactersContract.getSubOwner(characterId)) {
                _elementsContract.mintVault(benefactor, PureDungeon.FRAGMENTS, 1);
                emit RoomIncome(location, benefactor, PureDungeon.FRAGMENTS, 1);
            }
        }
        uint256 areaLoc = PureDungeon._getAreaLoc(location);
        Area storage area = _areas[areaLoc];
        if (area.eventBlockNumber == 0 && block.number % 3 == 0) {
            if (blockNumber == 0) {
                blockNumber = uint64(block.number);
                _blockHashRegister.request();
            }
            area.eventBlockNumber = blockNumber;
            emit RandomEvent(areaLoc, blockNumber);
        }
        currentRoom.numActiveCharacters--;
        nextRoom.numActiveCharacters++;
        character.location = location;
        character.direction = direction;
        _increaseHPXP(characterId);
    }

    function _increaseHPXP(uint256 characterId) internal {
        CharacterData memory characterData = _getCharacterData(characterId);
        if (characterData.hp < characterData.maxHP) {
            characterData.hp += 1;
            _setCharacterData(characterId, characterData);
        }
    }

    function _isRoomActive(uint256 location) internal view returns (bool) {
        address owner = _roomsContract.ownerOf(location);
        return owner == address(this);
    }

    function _roomBenefactor(uint256 location) internal view returns (address){
        if (_isRoomActive(location)) {
            return address(_roomsContract.subOwnerOf(location));
        } else {
            return address(0);
        }
    }

    function _pay(uint256 characterId, uint256 location, uint256 id, uint256 amount) internal {
        address benefactor = _roomBenefactor(location);
        if (benefactor != address(0)) {
            uint256 share = amount / 5;
            if (share > 0) {
                _elementsContract.subTransferFrom(characterId, 0, id, share);
                _elementsContract.transferFrom(address(this), benefactor, id, share);
                emit RoomIncome(location, benefactor, id, share);
            }
            _elementsContract.subBurnFrom(characterId, id, amount - share);
        } else {
            _elementsContract.subBurnFrom(characterId, id, amount);
        }
    }

    function _discoverRoom(
        uint256 location,
        uint256 discoverer,
        uint8 direction
    ) internal {
        Area storage area = _areas[PureDungeon._getAreaLoc(location)];
        if (area.lastRoom > 0) {
            // area is also actualised with room when necessary
            _actualiseRoom(area.lastRoom);
            area.lastRoomIndex = area.currentIndex;
            area.lastRoom = 0;
        }
        _elementsContract.subBurnFrom(discoverer, PureDungeon.FRAGMENTS, PureDungeon._discoveryCost(location));
        Room storage nextRoom = _rooms[location];
        nextRoom.blockNumber = uint64(block.number);
        nextRoom.monsterBlockNumber = uint64(block.number);
        nextRoom.direction = direction;
        nextRoom.areaAtDiscovery = area.discovered;
        nextRoom.index = area.currentIndex++;
        nextRoom.lastRoomIndex = area.lastRoomIndex;
        nextRoom.discoverer = discoverer;
        area.lastRoom = location;
        _blockHashRegister.request();
        uint256 discovererOwner = _charactersContract.getSubOwner(discoverer);
        _initializeTaxDueDate(discovererOwner);
        _roomsContract.mintId(location, discovererOwner);
        emit RoomDiscovered(location, uint64(block.number), nextRoom.direction);
    }

    function _initializeTaxDueDate(uint256 owner) internal {
        if (owner != 0 && _roomsContract.subBalanceOf(owner) == 0) {
            uint256 dueDate = block.timestamp + 5 days;
            _taxDueDate[address(owner)] = dueDate;
            emit RoomTaxPay(address(owner), 0, dueDate);
        }
    }
}
