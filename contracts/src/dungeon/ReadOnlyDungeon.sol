pragma solidity 0.6.5;

import "./PureDungeon.sol";

contract ReadOnlyDungeon {
    function toLocation(
        int64 x,
        int64 y,
        int64 z
    ) external pure returns (uint256) {
        return PureDungeon._location(x, y, z);
    }

    function toCoordinates(uint256 location)
        external
        pure
        returns (
            int64 x,
            int64 y,
            int64 z,
            uint64 a
        )
    {
        return PureDungeon._coordinates(location);
    }

    function generateMonsterIndex(
        uint256 location,
        bytes32 blockHash,
        uint256 numMonsters,
        bool newlyDiscoveredRoom,
        uint8 roomKind
    ) external pure returns (uint256) {
        return PureDungeon._generateMonsterIndex(location, blockHash, numMonsters, newlyDiscoveredRoom, roomKind);
    }

    function getAreaLoc(uint256 location) external pure returns (uint256) {
        return PureDungeon._getAreaLoc(location);
    }

    function generateArea(
        uint256 areaLoc,
        bytes32 blockHash,
        uint64 numElementalAreaInPeriod
    ) external pure returns (uint8 areaType) {
        return PureDungeon._generateArea(areaLoc, blockHash, numElementalAreaInPeriod);
    }

    function computeRoomDiscoveryReward(
        uint256 location,
        bytes32 blockHash,
        uint8 class
    ) external pure returns (uint256 numGold, uint256 numElements) {
        return PureDungeon._computeRoomDiscoveryReward(location, blockHash, class);
    }

    function discoveryCost(uint256 location) external pure returns (uint256 fragments) {
        return PureDungeon._discoveryCost(location);
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
        return PureDungeon._generateRoom(location, blockHash, direction, areaAtDiscovery, lastIndex, index);
    }

    function generateExits(
        uint256 location,
        bytes32 blockHash,
        uint8 direction
    ) external pure returns (uint8) {
        return PureDungeon._generateExits(location, blockHash, direction);
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
        return PureDungeon._decodeCharacterData(data);
    }

    function encodeGearData(
        uint16 level,
        uint8 slot,
        uint8 classBits,
        uint16 durability,
        uint16 maxDurability,
        uint32 template
    ) external pure returns (uint256 data) {
        return PureDungeon._encodeGearData(level, slot, classBits, durability, maxDurability, template);
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
        return PureDungeon._decodeGearData(data);
    }

    function toLevelUp(uint8 level)
        external
        pure
        returns (
            uint16 xpRequired,
            uint256 coinsRequired,
            uint8 hpIncrease
        )
    {
        return PureDungeon._toLevelUp(level);
    }

    function teleportTax(uint256 p1, uint256 p2) external pure returns (uint256) {
        return PureDungeon._teleportTax(p1, p2);
    }

    function hpCost(uint16 hp) external pure returns (uint256) {
        return PureDungeon._hpCost(hp);
    }

    function carrierCost(uint256 location) external pure returns (uint256) {
        return PureDungeon._carrierCost(location);
    }

    function recyclingReward(uint256[] calldata gearData) external pure returns (uint256) {
        uint256 reward = 0;
        for (uint256 i = 0; i < gearData.length; i++) {
            reward += PureDungeon._recyclingReward(gearData[i]);
        }
        return reward;
    }

    function getRing(uint256 p1, uint256 p2) external pure returns (uint256) {
        return PureDungeon._getRing(p1, p2);
    }

    function generateRandomEvent(uint256 areaLoc, bytes32 blockHash)
        external
        pure
        returns (uint256 roomLocation, uint64 randomEvent)
    {
        return PureDungeon._generateRandomEvent(areaLoc, blockHash);
    }

    function roomsTax(uint256 rooms, uint256 periods) external pure returns (uint256) {
        return PureDungeon._roomsTax(rooms, periods);
    }
}
