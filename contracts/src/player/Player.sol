pragma solidity 0.6.5;

import "buidler-deploy/solc_0.6/proxy/Proxied.sol";
import "./PlayerDataLayout.sol";
import "../utils/MetaTransactionReceiver.sol";
import "./Pool.sol";
import "../utils/Constants.sol";

contract Player is Proxied, PlayerDataLayout, MetaTransactionReceiver, Constants {
    event Call(bool success, bytes returnData);
    event Refill(address indexed playerAddress, uint256 newEnergy);

    function postUpgrade(
        Characters charactersContract,
        address payable feeRecipient,
        uint256 minBalance,
        Pool pool
    ) external proxied {
        // TODO _setTrustedForwarder(...);
        _charactersContract = charactersContract;
        _feeRecipient = feeRecipient;
        MIN_BALANCE = minBalance;
        _pool = pool;
        pool.register();
    }

    function register() external {
        if (msg.sender != address(_holder)) {
            require(address(_holder) == address(0), "holder already set");
            _holder = Enterable(msg.sender);
        }
    }

    function getLastCharacterId(address playerAddress) external view returns (uint256) {
        return _lastCharacterIds[playerAddress];
    }

    function getEnergy(address playerAddress) external view returns (uint256 energy, uint256 freeEnergy) {
        Player storage player = _players[playerAddress];
        energy = player.energy;
        freeEnergy = player.freeEnergy;
    }

    // TODO remove ?
    function getPlayerInfo(address playerAddress, uint256 characterId)
        external
        view
        returns (uint256 energy, uint256 freeEnergy)
    {
        Player storage player = _players[playerAddress];
        energy = player.energy;
        freeEnergy = player.freeEnergy;
    }

    function createAndEnter(
        address payable newDelegate,
        uint256 value,
        string calldata name,
        uint8 class,
        uint256 location
    ) external payable {
        address payable sender = _msgSender();
        uint256 characterId = _charactersContract.mintTo(address(_holder));
        _enter(sender, newDelegate, characterId, value, name, class, location);
    }

    function enter(
        address payable newDelegate,
        uint256 characterId,
        uint256 value,
        string calldata name,
        uint8 class,
        uint256 location
    ) external payable {
        address payable sender = _msgSender();
        _charactersContract.transferFrom(sender, address(_holder), characterId);
        _enter(sender, newDelegate, characterId, value, name, class, location);
    }

    function _enter(
        address payable sender,
        address payable newDelegate,
        uint256 characterId,
        uint256 value,
        string memory name,
        uint8 class,
        uint256 location
    ) internal {
        require(msg.value >= value, "msg.value < value");
        if (msg.value > value) {
            _refill(sender, sender, msg.value - value);
        }
        if (newDelegate != address(0)) {
            _addDelegate(sender, newDelegate);
        }
        _holder.enter.value(value)(sender, characterId, name, class, location);
        _lastCharacterIds[sender] = characterId;
    }

    function callAsCharacter(
        address destination,
        uint256 gasLimit,
        bytes calldata data
    ) external returns (bool success, bytes memory returnData) {
        address sender = _msgSender();
        // TODO check death ?
        require(destination != address(this), "cannot call itself");
        // TODO block data if == `enter(address sender, uint256 characterId, bytes data)`
        uint256 initialGas = gasleft();
        uint256 characterId = _getFirstParam(data);
        require(_charactersContract.ownerOf(characterId) == address(_holder), "_holder does not own character");
        uint256 playerAddress = _charactersContract.getSubOwner(characterId);
        if (uint256(sender) != playerAddress) {
            require(uint256(_delegates[sender]) == playerAddress, "sender is not delegate of character's player");
        }

        (success, returnData) = _executeWithSpecificGas(destination, gasLimit, data);

        Player storage player = _players[address(playerAddress)];
        uint256 energy = player.energy;
        uint256 txCharge = ((initialGas - gasleft()) + 10000) * tx.gasprice;
        uint256 freeEnergyFee = (txCharge * 10) / 100; // 10% extra is used for free energy

        uint256 poolFee = txCharge * 10; // 1000% is used for UBF

        require(energy >= freeEnergyFee + poolFee, "not enough energy");
        energy -= (freeEnergyFee + poolFee);
        _pool.recordCharge{value: poolFee}(sender, txCharge, poolFee);

        if (msg.sender == sender) {
            // not metatx : use local private key so need to recharge local balance // TODO remove (once metatx is enabled)
            if (msg.sender.balance < MIN_BALANCE) {
                uint256 balanceToGive = MIN_BALANCE - msg.sender.balance;
                if (balanceToGive >= energy) {
                    balanceToGive = energy;
                    energy = 0;
                } else {
                    energy -= balanceToGive;
                }

                if (balanceToGive > 0) {
                    msg.sender.transfer(balanceToGive);
                }
            }
        }
        player.freeEnergy += uint128(freeEnergyFee);
        player.energy = uint128(energy);

        emit Call(success, returnData);
    }

    function isDelegateFor(address delegate, address playerAddress) external view returns (bool) {
        return _delegates[delegate] == playerAddress;
    }

    function refillAccount(address account) public payable {
        address payable sender = _msgSender();
        _refill(sender, account, msg.value);
    }

    function refill() public payable {
        address payable sender = _msgSender();
        _refill(sender, sender, msg.value);
    }

    function _refill(
        address payable sender,
        address account,
        uint256 value
    ) internal returns (uint256 refund) {
        uint128 energy = _players[account].energy;
        energy += uint128(value);
        if (energy > uint128(MAX_FOOD)) {
            energy = uint128(MAX_FOOD);
            refund = energy - MAX_FOOD;
        }
        _players[account].energy = energy;
        emit Refill(account, energy);
        if (refund > 0) {
            sender.transfer(refund);
        }
    }

    // TODO add Events for Delegates
    function addDelegate(address payable _delegate) public payable {
        address payable sender = _msgSender();
        if (msg.value > 0) {
            _refill(sender, sender, msg.value);
        }
        _addDelegate(sender, _delegate);
    }

    function _addDelegate(address sender, address payable _delegate) internal {
        require(_delegate != address(0), "no zero address delegate");
        require(_players[sender].energy >= uint128(MIN_BALANCE), "not enough energy");
        _players[sender].energy -= uint128(MIN_BALANCE);
        _delegate.transfer(MIN_BALANCE);
        _delegates[_delegate] = sender;
    }

    function _getFirstParam(bytes memory data) internal pure returns (uint256) {
        if (data.length < 36) {
            return 0;
        }
        uint256 value;
        // solhint-disable-next-line security/no-inline-assembly
        assembly {
            value := mload(add(data, 36))
        }
        return value;
    }

    function _executeWithSpecificGas(
        address to,
        uint256 gasLimit,
        bytes memory data
    ) internal returns (bool success, bytes memory returnData) {
        (success, returnData) = to.call.gas(gasLimit)(data);
        assert(gasleft() > gasLimit / 63);
        // not enough gas provided, assert to throw all gas // TODO use EIP-1930
    }
}
