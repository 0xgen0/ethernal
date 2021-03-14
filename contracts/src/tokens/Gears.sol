pragma solidity 0.6.5;

import "./ERC721Token.sol";

contract Gears is ERC721Token {
    function postUpgrade(address dungeon) public override {
        super.postUpgrade(dungeon);
    }
}
