pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./DungeonInfoFacet.sol";
import "./DungeonMovementFacet.sol";
import "./PureDungeon.sol";
import "./DungeonTokenTransfererDataLayout.sol";

import "../tokens/Elements.sol";
import "../tokens/Gears.sol";
import "../player/Player.sol";
import "../characters/Characters.sol";

contract DungeonTokenTransferer is Proxied, DungeonTokenTransfererDataLayout {
    uint256 public constant MAX_GEARS = 10;

    struct Offer {
        uint256 characterId;
        uint256[8] amounts;
        uint256[] gears;
    }

    event GearSale(uint256 indexed seller, uint256 indexed buyer, uint256 indexed gearId, uint256 price);
    event Exchange(uint256 indexed seller, uint256 indexed buyer, Offer sale, Offer price);

    function postUpgrade(
        DungeonInfoFacet dungeon,
        Player player,
        Gears gears,
        Elements elements,
        Characters characters
    ) external proxied {
        _dungeon = dungeon;
        _player = player;
        _gears = gears;
        _elements = elements;
        _characters = characters;
    }

    modifier onlyPlayer() {
        require(msg.sender == address(_player), "only players allowed");
        _;
    }

    modifier onlyDungeon() {
        require(msg.sender == address(_dungeon), "only dungeon allowed");
        _;
    }

    modifier useCarrier(uint256 character) {
        uint256 location = _dungeon.getCharacterLocation(character);
        _actualiseRoom(location);
        (, , , , , , , , uint8 kind, , ) = _dungeon.getRoomInfo(location);
        require(
            location == PureDungeon.LOCATION_ZERO || kind == PureDungeon.ROOM_TYPE_CARRIER,
            "can only transfer in special room"
        );
        _elements.subBurnFrom(character, PureDungeon.COINS, PureDungeon._carrierCost(location));
        _;
    }

    function batchTransferGearOut(
        uint256 from,
        address to,
        uint256[] calldata ids
    ) external onlyPlayer useCarrier(from) {
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 subOwner = _gears.subOwnerOf(id);
            require(subOwner == from, "not subOwner");
        }
        _gears.batchTransferFrom(address(_dungeon), to, ids);
    }

    function batchTransferGearIn(uint256 characterId, uint256[] calldata ids) external useCarrier(characterId) {
        address sender = _msgSender();
        require(_characters.getSubOwner(characterId) == uint256(sender), "subOwner is not sender");
        _gears.batchTransferFrom(sender, address(_dungeon), ids);
        _gears.subBatchTransferFrom(address(_dungeon), 0, characterId, ids);
    }

    function batchTransferElementsOut(
        uint256 from,
        address to,
        uint256[] calldata amounts
    ) external onlyPlayer useCarrier(from) {
        for (uint256 i = 0; i < amounts.length; i++) {
            uint256 amount = amounts[i];
            if (amount > 0) {
                uint256 id = i + 1;
                _elements.subTransferFrom(from, 0, id, amount);
                _elements.transferFrom(address(_dungeon), to, id, amount);
            }
        }
    }

    function batchTransferElementsIn(uint256 characterId, uint256[] calldata amounts) external useCarrier(characterId) {
        address sender = _msgSender();
        require(_characters.getSubOwner(characterId) == uint256(sender), "subOwner is not sender");
        for (uint256 i = 0; i < amounts.length; i++) {
            uint256 amount = amounts[i];
            if (amount > 0) {
                uint256 id = i + 1;
                _elements.transferFrom(sender, address(_dungeon), id, amount);
                _elements.subTransferFrom(0, characterId, id, amount);
            }
        }
    }

    function drop(uint256 from, uint256 id) external onlyPlayer {
        uint256 fromLocation = _dungeon.getCharacterLocation(from);
        _gears.subTransferFrom(address(_dungeon), from, fromLocation, id);
    }

    function dropElements(uint256 from, uint256[] calldata amounts) external onlyPlayer {
        uint256 fromLocation = _dungeon.getCharacterLocation(from);
        for (uint256 i = 0; i < amounts.length; i++) {
            uint256 amount = amounts[i];
            if (amount > 0) {
                uint256 id = i + 1;
                _elements.subTransferFrom(from, fromLocation, id, amount);
            }
        }
    }

    function pick(uint256 from, uint256 id) external onlyPlayer {
        uint256 fromLocation = _dungeon.getCharacterLocation(from);
        require(_gears.subBalanceOf(from) < MAX_GEARS, "Too many gears");
        _gears.subTransferFrom(address(_dungeon), fromLocation, from, id);
    }

    function pickElement(
        uint256 from,
        uint256 id,
        uint256 amount
    ) external onlyPlayer {
        uint256 fromLocation = _dungeon.getCharacterLocation(from);
        _elements.subTransferFrom(fromLocation, from, id, amount);
    }

    function subTransferGearFrom(
        uint256 from,
        uint256 to,
        uint256 id
    ) external onlyPlayer {
        uint256 fromLocation = _dungeon.getCharacterLocation(from);
        uint256 toLocation = _dungeon.getCharacterLocation(to);
        require(fromLocation == toLocation, "need to be in same room");
        require(_gears.subBalanceOf(from) < MAX_GEARS, "Too many gears");
        _gears.subTransferFrom(address(_dungeon), from, to, id);
    }

    function subTransferElementsFrom(
        uint256 from,
        uint256 to,
        uint256 id,
        uint256 amount
    ) external onlyPlayer {
        uint256 fromLocation = _dungeon.getCharacterLocation(from);
        uint256 toLocation = _dungeon.getCharacterLocation(to);
        require(fromLocation == toLocation, "need to be in same room");
        _elements.subTransferFrom(from, to, id, amount);
    }

    function scavengeGear(
        uint256 characterId,
        uint256 deadCharacterId,
        uint256 id
    ) external onlyPlayer {
        (uint256 location, , uint256 data, , , , , , , , ) = _dungeon.getCharacterInfo(deadCharacterId);
        _actualiseRoom(location);
        uint256 scavengerLocation = _dungeon.getCharacterLocation(characterId);
        require(location == scavengerLocation, "need to be in same room");
        (, uint16 hp, , , ) = PureDungeon._decodeCharacterData(data);
        require(hp == 0, "character is not dead");
        _gears.subTransferFrom(address(_dungeon), deadCharacterId, characterId, id);
    }

    function scavengeElements(
        uint256 characterId,
        uint256 deadCharacterId,
        uint256 id,
        uint256 amount
    ) external onlyPlayer {
        (uint256 location, , uint256 data, , , , , , , , ) = _dungeon.getCharacterInfo(deadCharacterId);
        _actualiseRoom(location);
        uint256 scavengerLocation = _dungeon.getCharacterLocation(characterId);
        require(location == scavengerLocation, "need to be in same room");
        (, uint16 hp, , , ) = PureDungeon._decodeCharacterData(data);
        require(hp == 0, "character is not dead");
        _elements.subTransferFrom(deadCharacterId, characterId, id, amount);
    }

    function sellGear(
        uint256 seller,
        uint256 buyer,
        uint256 gearId,
        uint256 coins
    ) external onlyDungeon {
        _elements.subTransferFrom(buyer, seller, 6, coins);
        _gears.subTransferFrom(address(_dungeon), seller, buyer, gearId);
        emit GearSale(seller, buyer, gearId, coins);
    }

    function exchange(Offer calldata seller, Offer calldata buyer) external {
        for (uint256 i = 0; i < seller.amounts.length; i++) {
            uint256 id = i + 1;
            if (buyer.amounts[i] > 0) {
                _elements.subTransferFrom(buyer.characterId, seller.characterId, id, buyer.amounts[i]);
            }
            if (seller.amounts[i] > 0) {
                _elements.subTransferFrom(seller.characterId, buyer.characterId, id, seller.amounts[i]);
            }
        }
        for (uint256 i = 0; i < seller.gears.length; i++) {
            _gears.subTransferFrom(address(_dungeon), seller.characterId, buyer.characterId, seller.gears[i]);
        }
        for (uint256 i = 0; i < buyer.gears.length; i++) {
            _gears.subTransferFrom(address(_dungeon), buyer.characterId, seller.characterId, buyer.gears[i]);
        }
        emit Exchange(seller.characterId, buyer.characterId, seller, buyer);
    }

    function _msgSender() internal returns (address) {
        return msg.sender; // TODO ?
    }

    function _actualiseRoom(uint256 location) internal {
        DungeonMovementFacet(address(_dungeon)).actualiseRoom(location); // TODO DungeonTokenTransferer should be a facet amd DungeonMovementFacet should not expose actualiseRoom
    }
}
