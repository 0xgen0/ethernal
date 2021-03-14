pragma solidity 0.6.5;

import "./Player.sol";
import "./Pool.sol";
import "buidler-deploy/solc_0.6/proxy/Proxied.sol";
import "./UBFDataLayout.sol";
import "../utils/MetaTransactionReceiver.sol";
import "../utils/Constants.sol";

// TODO MetaTransactionReceiver
contract UBF is Proxied, UBFDataLayout, Pool, Constants {

    uint256 public constant SLOT_INTERVAL = 23 hours;

    event Received(address from, uint256 amount);
    event Claimed(address account, uint256 amount, uint256 slot);

    function postUpgrade(Characters charactersContract) external proxied {
        // TODO _setTrustedForwarder(...);
        _charactersContract = charactersContract;
    }

    function register() external override {
        if (msg.sender != address(_playerContract)) {
            require(address(_playerContract) == address(0), "ALREADY_REGISTERED");
            _playerContract = Player(msg.sender);
        }
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function recordCharge(
        address account,
        uint256 txCharge,
        uint256 poolFee
    ) external override payable {
        require(msg.sender == address(_playerContract), "NOT_AUTHORIZED");
        uint256 slot = block.timestamp / SLOT_INTERVAL;
        _timeSlots[account][slot] += txCharge; // keep track if we decided later to use it
    }

    function claimUBF() external {
        _claimUBF(msg.sender);
    }

    function claimUBFAsCharacter(uint256 characterId) external {
        require(msg.sender == address(_playerContract), "NOT_AUTHORIZED");
        address account = address(_charactersContract.getSubOwner(characterId));
        _claimUBF(account);
    }

    function getInfo(address account) external view returns (uint256 amount, uint256 ubfBalance, uint256 slot, uint256 nextSlotTime, bool claimed) {
        amount = _getClaimAmount(account);
        ubfBalance = address(this).balance;
        slot = block.timestamp / SLOT_INTERVAL;
        nextSlotTime = 2 * SLOT_INTERVAL + block.timestamp - block.timestamp % SLOT_INTERVAL;
        claimed = _claimedSlots[account][slot - 1];
    }

    function getClaimAmount(address account) external view returns (uint256 amount) {
        return _getClaimAmount(account);
    }

    function _claimUBF(address account) internal {
        uint256 slot = block.timestamp / SLOT_INTERVAL;
        require(slot != 0, "WAIT_NEXT_SLOT");
        require(!_claimedSlots[account][slot - 1], "ALREADY_CLAIMED");

        uint256 amount = _getClaimAmount(account);
        require(amount > 0, "NOTHING_TO_CLAIM");
        _claimedSlots[account][slot - 1] = true; // only record as claimed if there was something to get
        _playerContract.refillAccount{value: amount}(account);
        emit Claimed(account, amount, slot - 1);
    }

    function _getClaimAmount(address account) internal view returns (uint256 amount) {
        uint256 ubfBalance = address(this).balance;
        (uint256 energy, ) = _playerContract.getEnergy(account);
        if (energy > MAX_FOOD) {
            amount = 0;
        } else {
            amount = (_linear(1000, ubfBalance, 0) * (((MAX_FOOD - energy) * 10000) / MAX_FOOD)) / 10000;
            if (amount > ubfBalance) {
                amount = ubfBalance; // cap so that it works
            }
            if (energy + amount > MAX_FOOD) {
                amount = MAX_FOOD - energy;
            }
        }
    }

    function _linear(
        uint56 a10000th,
        uint256 x,
        uint256 b
    ) internal pure returns (uint256 y) {
        y = ((a10000th * x) / 10000) + b;
    }
}
