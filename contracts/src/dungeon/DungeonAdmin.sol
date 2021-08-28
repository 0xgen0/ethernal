pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./DungeonAdminFacet.sol";

contract DungeonAdmin {
    struct MonsterReward {
        uint256 characterId;
        int16 hpChange;
        uint16 xpGained;
        uint256 gear;
        int64 durabilityChange;
        int16[8] balanceChange;
    }


    DungeonAdminFacet _dungeon;
    address _backendAddress;

    constructor(address backendAddress) public {
        _backendAddress = backendAddress;
    }

    function forward(address to, bytes memory data) public payable onlyBackend returns (bool success) {
        return _dungeon.forward.value(msg.value)(to, data);
    }

    modifier onlyBackend() {
        require(msg.sender == _backendAddress, "NOT_AUTHORIZED_BACKEND");
        _;
    }

    function getDungeonAndBackendAddress() external view returns (DungeonAdminFacet dungeon, address backendAddress) {
        dungeon = _dungeon;
        backendAddress = _backendAddress;
    }

    function setDungeonAndBackend(DungeonAdminFacet dungeon, address backendAddress) external onlyBackend {
        _dungeon = dungeon;
        _backendAddress = backendAddress;
    }

    function teleportCharacter(uint256 characterId, uint256 location) external onlyBackend {
        _dungeon.teleportCharacter(characterId, location);
    }

    function updateCharacter(
        uint256 characterId,
        uint256 monsterId,
        int16 hpChange,
        uint16 xpGained,
        uint256 gear,
        int64 durabilityChange,
        int16[8] calldata balanceChange
    ) external onlyBackend {
        _dungeon.updateCharacter(characterId, monsterId, hpChange, xpGained, gear, durabilityChange, balanceChange);
    }

    function monsterDefeated(
        uint256 location,
        uint256 monsterId,
        MonsterReward[] calldata rewards
    ) external onlyBackend {
        _dungeon.monsterDefeated(location);
        for (uint256 i = 0; i < rewards.length; i++) {
            _dungeon.updateCharacter(
                rewards[i].characterId,
                monsterId,
                rewards[i].hpChange,
                rewards[i].xpGained,
                rewards[i].gear,
                rewards[i].durabilityChange,
                rewards[i].balanceChange
            );
        }
    }

    function generateRoomIncome(uint256 location, address benefactor, uint16[8] calldata income) external onlyBackend {
        _dungeon.generateRoomIncome(location, benefactor, income);
    }

    function characterDefeated(uint256 characterId, uint256 monsterId) external onlyBackend {
        _dungeon.characterDefeated(characterId, monsterId);
    }

    function characterEscaped(
        uint256 characterId,
        uint256 monsterId,
        int16 hpChange,
        int16 elemChange
    ) external onlyBackend {
        _dungeon.characterEscaped(characterId, monsterId, hpChange);
    }

    function updateQuest(uint256 character, uint64 id, uint8 status, string calldata data) external onlyBackend {
        _dungeon.updateQuest(character, id, status, data);
    }

    function updateRoomData(uint256 character, uint256 location, uint256 data, uint256[8] calldata amountsPayed) external onlyBackend {
        _dungeon.updateRoomData(character, location, data, amountsPayed);
    }

    function batchMineVaultElements(uint256 id, address[] calldata players, uint256[] calldata amounts) external onlyBackend {
        _dungeon.batchMineVaultElements(id, players, amounts);
    }
}
