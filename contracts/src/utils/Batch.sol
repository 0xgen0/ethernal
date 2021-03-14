pragma solidity 0.6.5;

contract Batch {
    function transfer(address payable[] calldata to) external payable {
        uint256 numAddresses = to.length;
        uint256 v = msg.value / numAddresses;
        require(numAddresses * v == msg.value, "incorrect value");
        for (uint256 i = 0; i < numAddresses; i++) {
            to[i].transfer(v);
        }
    }
}
