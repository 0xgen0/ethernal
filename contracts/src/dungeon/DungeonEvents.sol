pragma solidity 0.6.5;

contract DungeonEvents {
    event RoomDiscovered(uint256 indexed location, uint64 blockNumber, uint8 direction);
    event RoomActualised(uint256 indexed location, bytes32 blockHash, uint8 exits, uint8 kind);
    event CharacterMoved(
        uint256 indexed characterId,
        uint256 indexed oldLocation,
        uint256 indexed newLocation,
        uint8 mode,
        uint256 path
    );
    event Enter(uint256 indexed characterId, address indexed player, string name);
    event Death(uint256 indexed characterId, uint256 monsterId);
    event LevelUp(uint256 indexed characterId, uint16 newLevel);
    event Equip(uint256 characterId, uint256 gearId, uint8 slotType);
    event Resurrect(uint256 indexed deadCharacterId, uint256 newCharacterId);
    event Heal(uint256 indexed characterId, uint16 hp);
    event RandomEvent(uint256 indexed areaLocation, uint64 blockNumber);
    event Recycle(uint256 indexed characterId, uint256 gearId);
    event QuestUpdate(uint256 indexed characterId, uint64 indexed id, uint8 indexed status, string data);
    event RoomTaxPay(address indexed owner, uint256 tax, uint256 newDueDate);
    event RoomIncome(uint256 indexed location, address indexed owner, uint256 id, uint256 amount);
    event RoomName(uint256 indexed location, string name, uint256 characterId);
}
