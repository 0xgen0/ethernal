pragma solidity 0.6.5;

contract BlockHashRegister {
    mapping(uint256 => bytes32) _blockHashes;
    uint256 _blockToActualise;

    event HashRequest(uint256 blockNumber);

    function get(uint256 blockNumber) external view returns (bytes32) {
        return _blockHashes[blockNumber];
    }

    function getOrCompute(uint256 blockNumber) external view returns (bytes32) {
        bytes32 blockHash = _blockHashes[blockNumber];
        if (uint256(blockHash) == 0) {
            return _computeBlockHash(blockNumber);
        }
        return blockHash;
    }

    function getBlockToActualise() external view returns (uint256) {
        return _blockToActualise;
    }

    function request() external {
        uint256 blockNumber = _blockToActualise;
        if (blockNumber < block.number) {
            _save(blockNumber);
            _blockToActualise = block.number;
            emit HashRequest(block.number);
        }
    }

    function save() external {
        uint256 blockNumber = _blockToActualise;
        if (blockNumber < block.number) {
            _save(blockNumber);
            _blockToActualise = 0;
        }
    }

    function _computeBlockHash(uint256 blockNumber) internal view returns (bytes32) {
        if (blockNumber < 256 || blockNumber > block.number - 256) {
            return blockhash(blockNumber);
        } else {
            uint256 moduloBlockNumber = block.number - ((block.number - blockNumber - 1) % 256) + 1;
            return blockhash(moduloBlockNumber);
        }
    }

    function _save(uint256 blockNumber) internal returns (bytes32) {
        bytes32 blockHash = _computeBlockHash(blockNumber);
        _blockHashes[blockNumber] = blockHash;
        return blockHash;
    }
}
