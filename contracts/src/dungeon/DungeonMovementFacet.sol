pragma solidity 0.6.5;

import "./DungeonFacetBase.sol";
import "./PureDungeon.sol";
import "../utils/BlockHashRegister.sol";
import "../characters/Characters.sol";
import "../tokens/Elements.sol";
import "../tokens/Gears.sol";
import "../player/Player.sol";

contract DungeonMovementFacet is DungeonFacetBase {
    // TODO set better limit for entry range
    // TODO class is only really useful when entering for 1st time, create separate function for 1st enter?
    function enter(
        address sender,
        uint256 characterId,
        string calldata name,
        uint8 class,
        uint256 location
    ) external onlyPlayer {
        if (_charactersContract.ownerOf(characterId) != address(this)) {
            _charactersContract.transferFrom(sender, address(this), characterId);
        } else {
            require(_charactersContract.getSubOwner(characterId) == 0, "already in dungeon");
        }
        _charactersContract.setSubOwner(characterId, uint256(sender));
        uint256 data = _charactersContract.getData(characterId);
        if (data == 0) {
            _setCharacterData(
                characterId,
                CharacterData({
                    class: class,
                    level: 0,
                    xp: 0,
                    maxHP: PureDungeon.INITIAL_HP,
                    hp: PureDungeon.INITIAL_HP
                })
            );
            _addInitialGears(characterId);
        }
        if (
            location != 0 &&
            _rooms[location].kind == PureDungeon.ROOM_TYPE_TELEPORT &&
            PureDungeon._getRing(PureDungeon.LOCATION_ZERO, location) < 10
        ) {
            _characters[characterId].location = location;
        } else {
            _characters[characterId].location = PureDungeon.LOCATION_ZERO;
        }
        emit Enter(characterId, sender, name);
    }

    function exit(uint256 characterId) external onlyPlayer {
        require(_characters[characterId].location == PureDungeon.LOCATION_ZERO, "need to reach the entrance");
        address subOwner = address(_charactersContract.getSubOwner(characterId));
        _charactersContract.transferFrom(address(this), subOwner, characterId);
    }

    function teleport(uint256 characterId, uint256 teleportLocation) external onlyPlayer {
        _blockHashRegister.save();
        require(_getCharacterData(characterId).hp > 0, "your character is dead");
        uint256 oldLocation = _characters[characterId].location;
        _actualiseRoom(oldLocation);
        uint256 monsterIndex = _checkMonster(oldLocation);
        require(monsterIndex == 0, "monster blocking");
        require(_rooms[oldLocation].kind == PureDungeon.ROOM_TYPE_TELEPORT, "current room not a teleport");
        require(_rooms[teleportLocation].kind == PureDungeon.ROOM_TYPE_TELEPORT, "destination room not a teleport");
        (, ,int64 floor, ) = PureDungeon._coordinates(teleportLocation);
        require(_characters[characterId].floors >= floor, "floor not allowed");
        _rooms[oldLocation].monsterBlockNumber = 0;
        uint256 teleportCoinTax = PureDungeon._teleportTax(oldLocation, teleportLocation);
        _pay(characterId, oldLocation, PureDungeon.COINS, teleportCoinTax);
        emit CharacterMoved(characterId, oldLocation, teleportLocation, 1, PureDungeon.DOWN);
        _move(characterId, teleportLocation, PureDungeon.DOWN);
    }

    function actualiseRoom(uint256 location) external {
        _blockHashRegister.save();
        _actualiseRoom(location);
    }

    function move(uint256 characterId, uint8 direction) external onlyPlayer {
        _blockHashRegister.save();
        Character storage character = _characters[characterId];
        require(_getCharacterData(characterId).hp > 0, "your character is dead");
        uint256 oldLocation = character.location;
        _actualiseRoom(oldLocation);
        uint256 monsterIndex = _checkMonster(oldLocation);
        require(monsterIndex == 0, "monster blocking");
        _rooms[oldLocation].monsterBlockNumber = 0;
        uint256 newLocation = _moveTo(characterId, oldLocation, direction);
        emit CharacterMoved(characterId, oldLocation, newLocation, 0, direction);
        _move(characterId, newLocation, direction);
    }

    function movePath(uint256 characterId, uint8[] calldata directions) external onlyPlayer {
        require(directions.length > 0 && directions.length <= 5, "invalid number of directions");
        _blockHashRegister.save();
        Character storage character = _characters[characterId];
        require(_getCharacterData(characterId).hp > 0, "your character is dead");
        uint256 location = character.location;
        _actualiseRoom(location);
        uint256 monsterIndex = _checkMonster(location);
        require(monsterIndex == 0, "monster blocking");
        _rooms[location].monsterBlockNumber = 0;
        uint256 path = 8;
        uint8 direction;
        for (uint8 i = 0; i < directions.length && monsterIndex == 0; i++) {
            direction = directions[i];
            path = (path << 4) + direction;
            location = _moveTo(characterId, location, direction);
            monsterIndex = _checkMonster(location);
        }
        emit CharacterMoved(characterId, character.location, location, 2, path);
        _move(characterId, location, direction);
    }
}
