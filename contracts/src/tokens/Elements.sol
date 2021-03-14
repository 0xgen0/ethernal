pragma solidity 0.6.5;

import "./ERC1155Token.sol";

contract Elements is ERC1155Token {
    function postUpgrade(address dungeon) public override {
        super.postUpgrade(dungeon);
    }
}
