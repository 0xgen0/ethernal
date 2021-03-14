pragma solidity 0.6.5;

abstract contract MetaTransactionReceiver {
    bytes32 constant FORWARDER_STORAGE_POSITION = 0xbda473cae6459373242ba82cd14b3b8493956b600be62b2478f52616c8a283de;

    function isTrustedForwarder(address forwarder) external returns (bool) {
        return _isTrustedForwarder(forwarder);
    }

    function _msgSender() internal view returns (address payable sender) {
        sender = msg.sender;
        if (_isTrustedForwarder(sender)) {
            bytes memory data = msg.data;
            uint256 length = msg.data.length;
            assembly {
                sender := mload(add(data, length))
            }
        }
    }

    function _isTrustedForwarder(address trustedForwarder) internal view returns(bool isTrustedForwarder) {
        address currentForwarder;
        // solhint-disable-next-line security/no-inline-assembly
        assembly {
            currentForwarder := sload(
                FORWARDER_STORAGE_POSITION
            )
        }
        return currentForwarder == trustedForwarder;
    }

    function _setTrustedForwarder(address trustedForwarder) internal {
        // solhint-disable-next-line security/no-inline-assembly
        assembly {
            sstore(
                FORWARDER_STORAGE_POSITION,
                trustedForwarder
            )
        }
    }
}
