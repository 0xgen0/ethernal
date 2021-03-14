pragma solidity 0.6.5;

import "./DungeonFacetBase.sol";
import "./PureDungeon.sol";
import "../utils/BlockHashRegister.sol";
import "../characters/Characters.sol";
import "../tokens/Elements.sol";
import "../tokens/Gears.sol";
import "../player/Player.sol";

contract DungeonAdminFacet is DungeonFacetBase {
    function postUpgrade(
        address blockHashRegister,
        Player playerContract,
        address payable owner,
        address adminContract
    ) external onlyOwner {
        _playerContract = playerContract;
        playerContract.register();
        _blockHashRegister = BlockHashRegister(blockHashRegister);
        _adminContract = adminContract;
    }

    function forward(address to, bytes memory data) public payable onlyAdmin returns (bool success) {
        uint256 value = msg.value;
        assembly {
            success := call(gas(), to, value, add(data, 0x20), mload(data), 0, 0)
        }
        require(success, "failed to forward");
    }

    function updateCharacter(
        uint256 characterId,
        uint256 monsterId,
        int16 hpChange,
        uint16 xpGained,
        uint256 gearData,
        int64 durabilityChange,
        int16[8] calldata balanceChange // 5 elements, coins, keys, fragments
    ) external onlyAdmin {
        _blockHashRegister.save();
        Character storage character = _characters[characterId];
        _actualiseRoom(character.location);
        if (gearData > 0) {
            require(_gearsContract.subBalanceOf(characterId) < MAX_GEARS, "Too many gears");
            _gearsContract.mint(characterId, gearData);
        }
        for (uint8 i = 0; i < balanceChange.length; i++) {
            int16 change = balanceChange[i];
            if (change > 0) {
                _elementsContract.mint(characterId, i + 1, uint256(change));
            } else if (change < 0) {
                _elementsContract.subBurnFrom(characterId, i + 1, uint256(-change));
            }
        }
        CharacterData memory characterData = _getCharacterData(characterId);
        if (hpChange != 0) {
            characterData.hp = PureDungeon._limitedChange(characterData.hp, characterData.maxHP, hpChange);
            if (characterData.hp == 0) {
                emit Death(characterId, monsterId);
            }
        }
        characterData.xp += xpGained;
        _setCharacterData(characterId, characterData);
        if (durabilityChange != 0) {
            GearData memory attackGear = _getGearData(character.slot_1);
            if (attackGear.maxDurability != 0) {
                attackGear.durability = PureDungeon._limitedChange(
                    attackGear.durability,
                    attackGear.maxDurability,
                    durabilityChange
                );
                _setGearData(character.slot_1, attackGear);
                if (attackGear.durability == 0) {
                    _gearsContract.subBurn(character.slot_1);
                }
            }
            GearData memory defenseGear = _getGearData(character.slot_2);
            if (defenseGear.maxDurability != 0) {
                defenseGear.durability = PureDungeon._limitedChange(
                    defenseGear.durability,
                    defenseGear.maxDurability,
                    durabilityChange
                );
                _setGearData(character.slot_2, defenseGear);
                if (defenseGear.durability == 0) {
                    _gearsContract.subBurn(character.slot_2);
                }
            }
        }
    }

    function claimBounty(uint256 location, uint256 characterId, uint16[8] calldata amounts) external onlyAdmin {
        uint256 bounty = PureDungeon._locationToBounty(location);
        for (uint8 i = 0; i < amounts.length; i++) {
            if (amounts[i] > 0) {
                _elementsContract.subTransferFrom(bounty, characterId, i + 1, amounts[i]);
            }
        }
    }

    function updateRoomData(uint256 characterId, uint256 location, uint256 data, uint256[8] calldata amountsPayed) external onlyAdmin {
        require(_isRoomActive(location), 'room is not active');
        uint256 owner = _roomsContract.subOwnerOf(location);
        uint256 player = _charactersContract.getSubOwner(characterId);
        require(owner == player, "not owner");
        for (uint256 i = 0; i < amountsPayed.length; i++) {
            _elementsContract.transferFrom(address(owner), address(0), i+1, amountsPayed[i]);
        }
        _roomsContract.setData(location, data);
    }

    function teleportCharacter(uint256 characterId, uint256 location) external onlyAdmin {
        _blockHashRegister.save();
        Character storage character = _characters[characterId];
        uint256 oldLocation = character.location;
        _actualiseRoom(oldLocation);
        emit CharacterMoved(characterId, oldLocation, location, 1, PureDungeon.DOWN);
        (, ,int64 floor, ) = PureDungeon._coordinates(location);
        if (character.floors < floor) {
            character.floors = floor;
        }
        _move(characterId, location, PureDungeon.DOWN);
    }

    function monsterDefeated(uint256 location) external onlyAdmin {
        _blockHashRegister.save();
        _actualiseRoom(location);
        Room storage room = _rooms[location];
        if (room.monsterBlockNumber != 0) {
            room.monsterBlockNumber = 0;
        }
        if (room.randomEvent != 0) {
            room.randomEvent = 0;
        }
        if (_roomsContract.getData(location) > 0) {
            _roomsContract.setData(location, 0);
        }
    }

    function characterDefeated(uint256 characterId, uint256 monsterId) external onlyAdmin {
        _blockHashRegister.save();
        Character storage character = _characters[characterId];
        _actualiseRoom(character.location);
        CharacterData memory characterData = _getCharacterData(characterId);
        characterData.hp = 0;
        _setCharacterData(characterId, characterData);
        emit Death(characterId, monsterId);
    }

    function characterEscaped(
        uint256 characterId,
        uint256 monsterId,
        int16 hpChange
    ) external onlyAdmin {
        _blockHashRegister.save();
        Character storage character = _characters[characterId];
        uint256 location = character.location;
        _actualiseRoom(location);
        CharacterData memory characterData = _getCharacterData(characterId);
        int64 newHp = int64(characterData.hp) + int64(hpChange);
        if (newHp > int64(characterData.maxHP)) {
            characterData.hp = characterData.maxHP;
        }
        if (newHp <= 0) {
            emit Death(characterId, monsterId);
            characterData.hp = 0;
        } else {
            characterData.hp = uint16(newHp);
        }
        _setCharacterData(characterId, characterData);
        uint8 reverseDirection = (character.direction + 2) % 4;
        uint256 escapeTo = _moveTo(characterId, location, reverseDirection);
        emit CharacterMoved(characterId, character.location, escapeTo, 0, reverseDirection);
        _actualiseRoom(escapeTo);
        _rooms[character.location].numActiveCharacters--;
        _rooms[escapeTo].numActiveCharacters++;
        character.location = escapeTo;
        character.direction = reverseDirection;
    }

    function updateQuest(uint256 character, uint64 id, uint8 status, string calldata data) external onlyAdmin {
        Quest storage quest = _quests[character][id];
        quest.status = status;
        quest.data = data;
        emit QuestUpdate(character, id, status, data);
    }

    // TODO: remove when not needed
    function batchMineVaultElements(uint256 id, address[] calldata players, uint256[] calldata amounts) external onlyAdmin {
        for (uint256 i = 0; i < players.length; i++) {
            _elementsContract.mintVault(players[i], id, amounts[i]);
        }
    }

    function generateRoomIncome(uint256 location, address benefactor, uint16[8] calldata income) external onlyAdmin {
        for (uint8 i = 0; i < income.length; i++) {
            uint256 id = i + 1;
            uint256 amount = uint256(income[i]);
            if (amount > 0) {
                _elementsContract.mintVault(benefactor, id, amount);
                emit RoomIncome(location, benefactor, id, amount);
            }
        }
    }

    function start(
        Characters characters,
        Elements elements,
        Gears gears,
        Rooms rooms
    ) external onlyOwner {
        _charactersContract = characters;
        _elementsContract = elements;
        _gearsContract = gears;
        _roomsContract = rooms;
        Room storage room = _rooms[PureDungeon.LOCATION_ZERO];
        require(room.kind == 0, "dungeon already started");
        _discoverRoom(PureDungeon.LOCATION_ZERO, 0, PureDungeon.DOWN);
    }
}
