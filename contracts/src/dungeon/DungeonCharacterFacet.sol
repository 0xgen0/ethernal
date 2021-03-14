pragma solidity 0.6.5;

import "./DungeonFacetBase.sol";
import "./PureDungeon.sol";
import "../utils/BlockHashRegister.sol";
import "../characters/Characters.sol";
import "../tokens/Elements.sol";
import "../tokens/Gears.sol";
import "../player/Player.sol";

contract DungeonCharacterFacet is DungeonFacetBase {
    function heal(uint256 characterId, uint16 hp) external onlyPlayer {
        require(hp > 0, "you have to heal something");
        _blockHashRegister.save();
        CharacterData memory data = _getCharacterData(characterId);
        require(data.hp > 0, "your character is dead");
        uint256 location = _characters[characterId].location;
        _actualiseRoom(location);
        require(_rooms[location].kind == PureDungeon.ROOM_TYPE_TEMPLE, "current room not temple");
        uint16 newHp = PureDungeon._limitedChange(data.hp, data.maxHP, hp);
        uint256 hpCost = PureDungeon._hpCost(newHp - data.hp);
        _pay(characterId, location, PureDungeon.COINS, hpCost);
        data.hp = newHp;
        _setCharacterData(characterId, data);
        emit Heal(characterId, newHp - data.hp);
    }

    function levelUp(uint256 characterId) external onlyPlayer {
        _blockHashRegister.save();
        Character storage character = _characters[characterId];
        _actualiseRoom(character.location);
        CharacterData memory characterData = _getCharacterData(characterId);
        require(characterData.level < 9, "only 9 levels for now");
        require(characterData.hp > 0, "your character is dead");
        characterData.level++;
        (uint16 xpRequired, uint256 coinsRequired, uint8 hpIncrease) = PureDungeon._toLevelUp(characterData.level);
        characterData.maxHP += hpIncrease;
        characterData.hp = characterData.maxHP;
        require(characterData.xp >= xpRequired, "not enough xp");
        _elementsContract.subBurnFrom(characterId, PureDungeon.COINS, coinsRequired);
        _setCharacterData(characterId, characterData);
        emit LevelUp(characterId, characterData.level);
    }

    function resurrectFrom(uint256 characterId) external onlyPlayer {
        _blockHashRegister.save();
        Character storage character = _characters[characterId];
        uint256 location = character.location;
        _actualiseRoom(location);

        CharacterData memory stats = _getCharacterData(characterId);
        require(stats.hp == 0, "character is not dead");

        uint256 subOwner = _charactersContract.getSubOwner(characterId);
        _charactersContract.setSubOwner(characterId, 0);

        uint256 newCharId = _charactersContract.mint(0);
        // no subOwner as we transfer it to player right away (see below)
        (uint16 characterXP, , ) = PureDungeon._toLevelUp(stats.level);
        stats.xp = characterXP;
        stats.hp = stats.maxHP;

        _setCharacterData(newCharId, stats);
        _addInitialGears(newCharId);
        _characters[newCharId].floors = character.floors;
        _charactersContract.transferFrom(address(this), address(subOwner), newCharId);
        // start outside of dungeon

        emit Resurrect(characterId, newCharId);
    }

    function multiEquip(
        uint256 characterId,
        uint256[] calldata gearIds,
        uint8[] calldata slots
    ) external onlyPlayer {
        // TODO once this will depend on result of combat:
        // _blockHashRegister.save();
        // _actualiseRoom
        CharacterData memory characterData = _getCharacterData(characterId);
        require(characterData.hp > 0, "your character is dead");
        for (uint256 i = 0; i < gearIds.length; i++) {
            _equip(characterId, characterData.level, characterData.class, gearIds[i], slots[i]);
        }
    }
}
