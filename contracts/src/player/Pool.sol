pragma solidity 0.6.5;

interface Pool {
    function register() external;

    function recordCharge(
        address account,
        uint256 txCharge,
        uint256 poolFee
    ) external payable;
}
