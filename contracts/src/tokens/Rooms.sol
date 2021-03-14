pragma solidity 0.6.5;

import "./ERC721Token.sol";

contract Rooms is ERC721Token {
    function postUpgrade(address dungeon) public override {
        super.postUpgrade(dungeon);
    }

    function mintId(uint256 id, uint256 subOwner) public {
        require(msg.sender == _minter, "NOT_AUTHORIZED_MINT");
        _subOwners[id] = subOwner;
        _subNumNFTPerAddress[subOwner]++;
        _owners[id] = _minter;
        emit Transfer(address(0), _minter, id);
        emit SubTransfer(0, subOwner, id);
    }
}
