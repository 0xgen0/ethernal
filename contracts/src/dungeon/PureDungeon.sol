pragma solidity 0.6.5;

library PureDungeon {
    uint256 internal constant LOCATION_ZERO = 2**255;

    uint8 internal constant ROOM_TYPE_NORMAL = 1;
    uint8 internal constant ROOM_TYPE_TELEPORT = 2;
    uint8 internal constant ROOM_TYPE_TEMPLE = 3;
    uint8 internal constant ROOM_TYPE_LORE = 4;
    uint8 internal constant ROOM_TYPE_CARRIER = 5;

    uint8 internal constant EXITS_INERTIA = 87;
    uint8 internal constant EXITS_BIFURCATION = 40;
    uint8 internal constant EXITS_BOTH_BIFURCATION = 25;

    uint8 internal constant NORTH = 0;
    uint8 internal constant EAST = 1;
    uint8 internal constant SOUTH = 2;
    uint8 internal constant WEST = 3;
    uint8 internal constant DOWN = 4;

    uint8 internal constant COINS = 6;
    uint8 internal constant KEYS = 7;
    uint8 internal constant FRAGMENTS = 8;

    uint8 internal constant WARRIOR = 0;
    uint8 internal constant EXPLORER = 1;
    uint8 internal constant MAGE = 2;
    uint8 internal constant BARBARIAN = 3;

    uint8 internal constant CLASS_BONUS = 4; // 100/4 = 25%

    uint8 internal constant LEVEL_RING_WIDTH = 25;
    uint16 internal constant ELEMENT_AREA_10000_PROBA = 100; // 1%
    uint8 internal constant NUM_ELEMENT_AREA_PER_PERIOD = 10;

    uint8 internal constant LOCK_PROBABILITY = 40;
    uint8 internal constant TWO_LOCK_PROBABILITY = 10;

    uint8 internal constant MONSTER_SPAWN = 15;

    uint8 internal constant INITIAL_HP = 16;
    uint8 internal constant HP_INCREASE = 10;

    function coordinates(uint256 location)
        external
        pure
        returns (
            int64 x,
            int64 y,
            int64 z,
            uint64 a
        )
    {
        return _coordinates(location);
    }

    function _coordinates(uint256 location)
        internal
        pure
        returns (
            int64 x,
            int64 y,
            int64 z,
            uint64 a
        )
    {
        x = int64(location);
        y = int64(location / 2**64);
        z = int64(location / 2**128);
        a = uint64(location / 2**255); // = 1 for valid location
    }

    function location(
        int64 x,
        int64 y,
        int64 z
    ) external pure returns (uint256 location) {
        return _location(x, y, z);
    }

    function _location(
        int64 x,
        int64 y,
        int64 z
    ) internal pure returns (uint256 location) {
        return 2**255 + uint256(uint64(z)) * 2**128 + uint256(uint64(y)) * 2**64 + uint64(x);
    }

    function generateMonsterIndex(
        uint256 location,
        bytes32 blockHash,
        uint256 numMonsters,
        bool newlyDiscoveredRoom,
        uint8 roomKind
    ) external pure returns (uint256) {
        return _generateMonsterIndex(location, blockHash, numMonsters, newlyDiscoveredRoom, roomKind);
    }

    function _generateMonsterIndex(
        uint256 location,
        bytes32 blockHash,
        uint256 numMonsters,
        bool newlyDiscoveredRoom,
        uint8 roomKind
    ) internal pure returns (uint256) {
        if (roomKind != ROOM_TYPE_NORMAL) {
            return 0;
        }
        uint8 spawnRate = MONSTER_SPAWN;
        if (newlyDiscoveredRoom) {
            spawnRate += 10;
        }
        bool hasMonster = uint256(keccak256(abi.encodePacked(location, blockHash, uint8(6)))) % 100 < spawnRate;
        if (hasMonster) {
            return (uint256(keccak256(abi.encodePacked(location, blockHash, uint8(7)))) % numMonsters) + 1;
        }
        return 0;
    }

    function computeRoomDiscoveryReward(
        uint256 location,
        bytes32 blockHash,
        uint8 class
    ) external pure returns (uint256 numGold, uint256 numElements) {
        return _computeRoomDiscoveryReward(location, blockHash, class);
    }

    function _computeRoomDiscoveryReward(
        uint256 location,
        bytes32 blockHash,
        uint8 class
    ) internal pure returns (uint256 numGold, uint256 numElements) {
        uint256 ring = _getRing(location, 0);
        uint256 target = ring / LEVEL_RING_WIDTH;
        if (target == 0) {
            target = 1;
        }
        numElements = (target / 2) + (uint256(keccak256(abi.encodePacked(location, blockHash, uint8(100)))) % target);
        if (numElements == 0) {
            numElements = 1;
        }
        if (MAGE == class) {
            numElements = numElements + numElements / CLASS_BONUS;
        }
        if (target > 8) {
            target = 8;
        }
        numGold = (target / 2) + (uint256(keccak256(abi.encodePacked(location, blockHash, uint8(101)))) % target);
        if (numGold == 0) {
            numGold = 1;
        }
        if (EXPLORER == class) {
            numGold = numGold + numGold / CLASS_BONUS;
        }
    }

    function discoveryCost(uint256 location) external pure returns (uint256 fragments) {
        return _discoveryCost(location);
    }

    function _discoveryCost(uint256 location) internal pure returns (uint256 fragments) {
        if (location == LOCATION_ZERO) {
            return 0;
        } else {
            uint256 ring = _getRing(location, 0);
            return 1 + ring / LEVEL_RING_WIDTH;
        }
    }

    function generateRandomEvent(uint256 areaLoc, bytes32 blockHash)
        external
        pure
        returns (uint256 roomLocation, uint64 randomEvent)
    {
        return _generateRandomEvent(areaLoc, blockHash);
    }

    function _generateRandomEvent(uint256 areaLoc, bytes32 blockHash)
        internal
        pure
        returns (uint256 roomLocation, uint64 randomEvent)
    {
        roomLocation = _getRoomLoc(
            areaLoc,
            uint8(uint256(keccak256(abi.encodePacked(areaLoc, blockHash, uint8(102)))) % 9),
            uint8(uint256(keccak256(abi.encodePacked(areaLoc, blockHash, uint8(103)))) % 9)
        );
        randomEvent = 1; // for now always monster TODO :uint64(uint256(keccak256(abi.encodePacked(areaLoc, blockHash, uint8(104)))));
    }

    function generateRoom(
        uint256 location,
        bytes32 blockHash,
        uint8 direction,
        uint8 areaAtDiscovery,
        uint8 lastIndex,
        uint8 index
    )
        external
        pure
        returns (
            uint8 exits,
            uint8 kind,
            uint8 area_discovered
        )
    {
        return _generateRoom(location, blockHash, direction, areaAtDiscovery, lastIndex, index);
    }

    function _generateRoom(
        uint256 location,
        bytes32 blockHash,
        uint8 direction,
        uint8 areaAtDiscovery,
        uint8 lastIndex,
        uint8 index
    )
        internal
        pure
        returns (
            uint8 exits,
            uint8 kind,
            uint8 area_discovered
        )
    {
        exits = _generateExits(location, blockHash, direction);
        (kind, area_discovered) = _getRoomKind(location, blockHash, areaAtDiscovery, lastIndex, index);
    }

    function _getRoomKind(
        uint256 location,
        bytes32 blockHash,
        uint8 areaAtDiscovery,
        uint8 lastIndex,
        uint8 index
    ) internal pure returns (uint8 kind, uint8 area_discovered) {
        uint256 areaLoc = _getAreaLoc(location);
        uint8 currentIndex = lastIndex;
        area_discovered = areaAtDiscovery;
        (int64 x, int64 y, , ) = _coordinates(location);
        if (x == 0 && y == 0) {
            // special case // cannot be discovered in batch in one block
            kind = ROOM_TYPE_TELEPORT;
            area_discovered = area_discovered | 1;
        } else {
            while (currentIndex <= index) {
                uint8 roll = uint8(
                    uint256(keccak256(abi.encodePacked(areaLoc, currentIndex, blockHash, uint8(3)))) % 20
                );
                if (!(area_discovered & 1 == 1) && (roll == 0 || currentIndex == 80)) {
                    // if roll or last room
                    kind = ROOM_TYPE_TELEPORT;
                    area_discovered = area_discovered | 1;
                } else if (
                    !(area_discovered & 2 == 2) &&
                    (roll == 1 ||
                        (currentIndex == 80) || // last room
                        (currentIndex == 79 && !(area_discovered & 1 == 1))) // second last room and teleport not found yet
                ) {
                    kind = ROOM_TYPE_TEMPLE;
                    area_discovered = area_discovered | 2;
                } else if (
                    !(area_discovered & 4 == 4) &&
                    (roll == 2 ||
                        (currentIndex == 80) || // last room
                        (currentIndex == 79 && !(area_discovered & 1 == 1)) || // second last room and teleport not found yet
                        (currentIndex == 79 && !(area_discovered & 2 == 2)) || // second last room and temple not found yet
                        (currentIndex == 78 && !(area_discovered & 1 == 1) && !(area_discovered & 2 == 2))) // third last room and neither teleport nor temple found yet
                ) {
                    kind = ROOM_TYPE_LORE;
                    area_discovered = area_discovered | 4;
                } else if (
                    !(area_discovered & 8 == 8) &&
                    (roll == 3 ||
                        (currentIndex == 80) || // last room
                        (currentIndex == 79 && !(area_discovered & 1 == 1)) || // second last room and teleport not found yet
                        (currentIndex == 79 && !(area_discovered & 2 == 2)) || // second last room and temple not found yet
                        (currentIndex == 79 && !(area_discovered & 4 == 4)) || // second last room and lore not found yet
                        (currentIndex == 78 && !(area_discovered & 1 == 1) && !(area_discovered & 2 == 2)) || // third last room and neither teleport nor temple found yet
                        (currentIndex == 78 && !(area_discovered & 1 == 1) && !(area_discovered & 4 == 4)) || // third last room and neither teleport nor lore found yet
                        (currentIndex == 78 && !(area_discovered & 4 == 4) && !(area_discovered & 2 == 2)) || // third last room and neither lore nor temple found yet
                        (currentIndex == 77 &&
                            !(area_discovered & 4 == 4) &&
                            !(area_discovered & 2 == 2) &&
                            !(area_discovered & 1 == 1))) // fourth last room and neither telport, temple nor lore found yet
                ) {
                    kind = ROOM_TYPE_CARRIER;
                    area_discovered = area_discovered | 8;
                } else {
                    kind = ROOM_TYPE_NORMAL;
                }
                currentIndex++;
            }
        }
    }

    function toLevelUp(uint16 level)
        external
        pure
        returns (
            uint16 xpRequired,
            uint256 coinsRequired,
            uint8 hpIncrease
        )
    {
        return _toLevelUp(level);
    }

    function _toLevelUp(uint16 level)
        internal
        pure
        returns (
            uint16 xpRequired,
            uint256 coinsRequired,
            uint8 hpIncrease
        )
    {
        uint16[11] memory xpRequirements = [0, 10, 49, 119, 208, 328, 524, 826, 1269, 3654, 6894];
        xpRequired = xpRequirements[level];
        if (level > 8) {
            coinsRequired = 492;
        } else {
            coinsRequired = (((1 + level) ** 3) / 5) + 8;
        }
        hpIncrease = HP_INCREASE;
    }

    function generateArea(
        uint256 areaLoc,
        bytes32 blockHash,
        uint64 numElementalAreaInPeriod
    ) external pure returns (uint8 areaType) {
        _generateArea(areaLoc, blockHash, numElementalAreaInPeriod);
    }

    function _generateArea(
        uint256 areaLoc,
        bytes32 blockHash,
        uint64 numElementalAreaInPeriod
    ) internal pure returns (uint8 areaType) {
        if (_isCentreArea(areaLoc) || numElementalAreaInPeriod >= NUM_ELEMENT_AREA_PER_PERIOD) {
            areaType = 6;
        } else {
            uint256 roomRing = (_getAreaRing(areaLoc) * 9);
            if (roomRing > 0) {
                roomRing -= 4; // this set the value to be the one of the corner room nearest to the center
            }
            if (roomRing >= LEVEL_RING_WIDTH) {
                bool elementArea = uint8(uint256(keccak256(abi.encodePacked(areaLoc, blockHash, uint8(12)))) % 10000) <=
                    ELEMENT_AREA_10000_PROBA;
                if (elementArea) {
                    (, ,int64 z, ) = _coordinates(areaLoc);
                    areaType = 1 + uint8(z % 5);
                } else {
                    areaType = 6;
                }
            } else {
                areaType = 6;
            }
        }
    }

    // distance between 2 location * 0.4
    function teleportTax(uint256 p1, uint256 p2) external pure returns (uint256) {
        return _teleportTax(p1, p2);
    }

    function _teleportTax(uint256 p1, uint256 p2) internal pure returns (uint256) {
        uint256 cost = (2 * _getRing(p1, p2)) / 5;
        if (cost == 0) {
            return 1;
        } else {
            return cost;
        }
    }

    function carrierCost(uint256 location) external pure returns (uint256) {
        return _carrierCost(location);
    }

    function _carrierCost(uint256 location) internal pure returns (uint256) {
        uint256 cost = (2 * _getRing(location, LOCATION_ZERO)) / 6;
        if (cost == 0) {
            return 1;
        } else {
            return cost;
        }
    }

    function recyclingReward(uint256 gearData) external pure returns (uint256) {
        return _recyclingReward(gearData);
    }

    function _recyclingReward(uint256 gearData) internal pure returns (uint256) {
        (uint16 level, , , uint16 durability, uint16 maxDurability, ) = _decodeGearData(gearData);
        uint256 reward = 1 + level / 2;
        if (durability == maxDurability) {
            reward += 1 + reward / 2;
        }
        return reward;
    }

    function hpCost(uint16 hp) external pure returns (uint256) {
        return _hpCost(hp);
    }

    function _hpCost(uint16 hp) internal pure returns (uint256) {
        return hp;
    }

    function getRing(uint256 p1, uint256 p2) external pure returns (uint256) {
        return _getRing(p1, p2);
    }

    function _getRing(uint256 p1, uint256 p2) internal pure returns (uint256) {
        (int64 x1, int64 y1, , ) = _coordinates(p1);
        (int64 x2, int64 y2, , ) = _coordinates(p2);
        int256 dx = x1 - x2;
        if (dx < 0) {
            dx = -dx;
        }
        int256 dy = y1 - y2;
        if (dy < 0) {
            dy = -dy;
        }
        if (dx > 2**64 / 2) {
            dx = 2**64 - dx;
        }
        if (dy > 2**64 / 2) {
            dy = 2**64 - dy;
        }
        if (dx > dy) {
            return uint256(dx);
        } else {
            return uint256(dy);
        }
    }

    function _getAreaRing(uint256 areaLoc) internal pure returns (uint64) {
        (int64 x, int64 y, , ) = _coordinates(areaLoc);
        if (x < 0) {
            x = -x;
        }
        if (y < 0) {
            y = -y;
        }
        if (x > y) {
            return uint64(x);
        } else {
            return uint64(y);
        }
    }

    // centre area is currently defined as the first 9 area (first area + 8 surrounding it)
    function _isCentreArea(uint256 areaLoc) internal pure returns (bool) {
        (int64 areaX, int64 areaY, , ) = _coordinates(areaLoc);
        return areaX >= -1 && areaY >= -1 && areaX <= 1 && areaY <= 1;
    }

    function getAreaLoc(uint256 location) external pure returns (uint256) {
        return _getAreaLoc(location);
    }

    function _getAreaLoc(uint256 location) internal pure returns (uint256) {
        (int64 x, int64 y, int64 z, ) = _coordinates(location);
        int64 areaX;
        if (x >= 0) {
            areaX = (x + 4) / 9;
        } else {
            areaX = -((-x + 4) / 9);
        }

        int64 areaY;
        if (y >= 0) {
            areaY = (y + 4) / 9;
        } else {
            areaY = -((-y + 4) / 9);
        }
        return _location(areaX, areaY, z);
    }

    function _getRoomLoc(
        uint256 areaLoc,
        uint8 x,
        uint8 y
    ) internal pure returns (uint256) {
        (int64 areaX, int64 areaY, int64 floor, ) = _coordinates(areaLoc);
        return _location(areaX * 9 - 4 + x, areaY * 9 - 4 + y, floor);
    }

    // direction based exit generation
    // both exits and locks are generated
    // return value is encoded (uint4 locksBits, uint4 exitBits)
    function _generateExits(
        uint256 location,
        bytes32 blockHash,
        uint8 direction
    ) internal pure returns (uint8) {
        uint8 exits = 0;
        if (DOWN == direction) {
            exits = 0xF;
        } else {
            if (EXITS_INERTIA > uint8(uint256(keccak256(abi.encodePacked(location, blockHash, uint8(1)))) % 100)) {
                exits = 2**direction;
            }
            if (EXITS_BIFURCATION > uint8(uint256(keccak256(abi.encodePacked(location, blockHash, uint8(2)))) % 100)) {
                if (
                    EXITS_BOTH_BIFURCATION >
                    uint8(uint256(keccak256(abi.encodePacked(location, blockHash, uint8(3)))) % 100)
                ) {
                    if (NORTH == direction || SOUTH == direction) {
                        exits = (exits | 8) | 2;
                    } else if (EAST == direction || WEST == direction) {
                        exits = (exits | 1) | 4;
                    }
                } else {
                    if (50 > uint8(uint256(keccak256(abi.encodePacked(location, blockHash, uint8(3)))) % 100)) {
                        if (NORTH == direction) {
                            exits |= 8;
                        } else if (EAST == direction) {
                            exits |= 1;
                        } else if (SOUTH == direction) {
                            exits |= 2;
                        } else if (WEST == direction) {
                            exits |= 4;
                        }
                    } else {
                        if (NORTH == direction) {
                            exits |= 2;
                        } else if (EAST == direction) {
                            exits |= 4;
                        } else if (SOUTH == direction) {
                            exits |= 8;
                        } else if (WEST == direction) {
                            exits |= 1;
                        }
                    }
                }
            }
        }
        uint8 randLock = uint8(uint256(keccak256(abi.encodePacked(location, blockHash, uint8(111)))) % 100);
        uint8 numLocks = randLock < (100 - LOCK_PROBABILITY) ? 0 : (randLock < (100 - TWO_LOCK_PROBABILITY) ? 1 : 2);
        if (numLocks >= 4) {
            exits = exits | (15 * 2**4);
        } else if (numLocks == 3) {
            uint8 chosenLocks = uint8(uint256(keccak256(abi.encodePacked(location, blockHash, uint8(112)))) % 4);
            uint8 locks = (chosenLocks + 1) * 7;
            if (locks == 21) {
                exits = exits | (13 * 2**4);
            } else if (locks == 28) {
                exits = exits | (11 * 2**4);
            }
            // 4 possibilities : 7 // 14 // 13 // 11
        } else if (numLocks == 2) {
            uint8 chosenLocks = uint8(uint256(keccak256(abi.encodePacked(location, blockHash, uint8(112)))) % 6);
            uint8 locks = (chosenLocks + 1) * 3;
            if (locks == 15) {
                exits = exits | (5 * 2**4);
            } else if (locks == 18) {
                exits = exits | (10 * 2**4);
            }
            // 3 // 6 // 9 // 12 // 5 // 10
        } else if (numLocks == 1) {
            uint8 chosenLocks = uint8(uint256(keccak256(abi.encodePacked(location, blockHash, uint8(112)))) % 4);
            exits = exits | (2**chosenLocks * 2**4);
        }
        return exits;
    }

    function decodeCharacterData(uint256 data)
        external
        pure
        returns (
            uint16 level,
            uint16 hp,
            uint16 maxHP,
            uint32 xp,
            uint8 class
        )
    {
        return _decodeCharacterData(data);
    }

    function _decodeCharacterData(uint256 data)
        internal
        pure
        returns (
            uint16 level,
            uint16 hp,
            uint16 maxHP,
            uint32 xp,
            uint8 class
        )
    {
        class = uint8(data >> 248);
        level = uint16((data >> 232) % 2**16);
        xp = uint32((data >> 200) % 2**32);
        maxHP = uint16((data >> 184) % 2**16);
        hp = uint16((data >> 168) % 2**16);
    }

    function encodeGearData(
        uint16 level,
        uint8 slot,
        uint8 classBits,
        uint16 durability,
        uint16 maxDurability,
        uint32 template
    ) external pure returns (uint256 data) {
        return _encodeGearData(level, slot, classBits, durability, maxDurability, template);
    }

    function _encodeGearData(
        uint16 level,
        uint8 slot,
        uint8 classBits,
        uint16 durability,
        uint16 maxDurability,
        uint32 template
    ) internal pure returns (uint256 data) {
        return ((uint256(classBits) << 248) +
            (uint256(level) << 232) +
            (uint256(slot) << 224) +
            (uint256(durability) << 208) +
            (uint256(maxDurability) << 192) +
            template);
    }

    function decodeGearData(uint256 data)
        external
        pure
        returns (
            uint16 level,
            uint8 slot,
            uint8 classBits,
            uint16 durability,
            uint16 maxDurability,
            uint32 template
        )
    {
        return _decodeGearData(data);
    }

    function _decodeGearData(uint256 data)
        internal
        pure
        returns (
            uint16 level,
            uint8 slot,
            uint8 classBits,
            uint16 durability,
            uint16 maxDurability,
            uint32 template
        )
    {
        classBits = uint8(data >> 248);
        level = uint16((data >> 232) % 2**16);
        slot = uint8((data >> 224) % 2**8);
        durability = uint16((data >> 208) % 2**16);
        maxDurability = uint16((data >> 192) % 2**16);
        template = uint32(data % 2**32);
    }

    function limitedChange(
        uint16 value,
        uint16 max,
        int64 change
    ) external pure returns (uint16) {
        return _limitedChange(value, max, change);
    }

    function _limitedChange(
        uint16 value,
        uint16 max,
        int64 change
    ) internal pure returns (uint16) {
        int64 updated = int64(value) + int64(change);
        if (updated > int64(max)) {
            return max;
        }
        if (updated <= 0) {
            return 0;
        } else {
            return uint16(updated);
        }
    }

    function roomsTax(uint256 rooms, uint256 periods) external pure returns (uint256) {
        return _roomsTax(rooms, periods);
    }
    function _roomsTax(uint256 rooms, uint256 periods) internal pure returns (uint256) {
        return (1 + rooms / 10) * periods;
    }
}
