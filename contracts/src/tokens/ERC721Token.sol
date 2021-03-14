pragma solidity 0.6.5;

import "buidler-deploy/solc_0.6/proxy/Proxied.sol";
import "./ERC721TokenDataLayout.sol";

contract ERC721Token is Proxied, ERC721TokenDataLayout {
    event Transfer(address indexed from, address indexed to, uint256 indexed id);
    event SubTransfer(uint256 indexed from, uint256 indexed to, uint256 indexed id);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event DataUpdate(uint256 indexed id, uint256 indexed data);

    function postUpgrade(address dungeon) public virtual proxied {
        _minter = dungeon;
    }

    function subBalanceOf(uint256 subOwner) external view returns (uint256) {
        return _subNumNFTPerAddress[subOwner];
    }

    function mint(uint256 subOwner, uint256 data) public returns (uint256 id) {
        require(msg.sender == _minter, "NOT_AUTHORIZED_MINT");
        id = ++_lastId;
        _subOwners[id] = subOwner;
        _subNumNFTPerAddress[subOwner]++;
        _owners[id] = _minter;
        _data[id] = data;
        emit DataUpdate(id, data);
        emit Transfer(address(0), _minter, id);
        emit SubTransfer(0, subOwner, id);
    }

    // TODO make sure that data of gear/room in vault cannot be changed
    function setData(uint256 id, uint256 data) external {
        address owner = _owners[id];
        require(owner == msg.sender || _operatorsForAll[owner][msg.sender], "NOT_AUTHORIZED_SET_DATA");
        _data[id] = data;
        emit DataUpdate(id, data);
    }

    function getData(uint256 id) external view returns (uint256) {
        return _data[id];
    }

    function subBurn(uint256 id) external {
        address owner = _owners[id];
        require(owner == msg.sender || _operatorsForAll[owner][msg.sender], "NOT_AUTHORIZED_SUB_BURN");
        uint256 subOwner = _subOwners[id];
        _subOwners[id] = 0;
        _subNumNFTPerAddress[subOwner]--;
        emit SubTransfer(subOwner, 0, id);
    }

    function subOwnerOf(uint256 id) public view returns (uint256) {
        return _subOwners[id];
    }

    function ownerOf(uint256 id) public view returns (address) {
        address owner = _owners[id];
        require(owner != address(0), "token does not exist");
        return owner;
    }

    function subTransferFrom(
        address owner,
        uint256 from,
        uint256 to,
        uint256 id
    ) external {
        require(owner == msg.sender || _operatorsForAll[owner][msg.sender], "NOT_AUTHORIZED_SUB_TRANSFER");
        require(owner == _owners[id], "not owner");
        uint256 subOwner = _subOwners[id];
        require(subOwner == from, "not subOnwer");
        _subOwners[id] = to;
        _subNumNFTPerAddress[subOwner]--;
        _subNumNFTPerAddress[to]++;
        emit SubTransfer(from, to, id);
    }

    function subBatchTransferFrom(
        address owner,
        uint256 from,
        uint256 to,
        uint256[] calldata ids
    ) external {
        require(owner == msg.sender || _operatorsForAll[owner][msg.sender], "NOT_AUTHORIZED_SUB_BATCH_TRANSFER");
        uint256 numIds = ids.length;
        for (uint256 i = 0; i < numIds; i++) {
            uint256 id = ids[i];
            require(owner == _owners[id], "not owner");
            uint256 subOwner = _subOwners[id];
            require(subOwner == from, "not subOnwer");
            _subOwners[id] = to;
            emit SubTransfer(from, to, id);
        }
        _subNumNFTPerAddress[from] -= numIds;
        _subNumNFTPerAddress[to] += numIds;
    }

    function transferFrom(
        address from,
        address to,
        uint256 id
    ) external {
        require(to != address(0), "invalid to");
        require(from == msg.sender || _operatorsForAll[from][msg.sender], "NOT_AUTHORIZED_TRANSFER");
        address owner = _owners[id];
        require(owner == from, "not owner");
        _owners[id] = to;
        uint256 subOwner = _subOwners[id];
        if (_subOwners[id] != 0) {
            _subOwners[id] = 0;
            _subNumNFTPerAddress[subOwner]--;
            emit SubTransfer(subOwner, 0, id);
        }
        emit Transfer(from, to, id);
    }

    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids
    ) external {
        require(to != address(0), "invalid to");
        require(from == msg.sender || _operatorsForAll[from][msg.sender], "NOT_AUTHORIZED_BATCH_TRANSFER");
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            address owner = _owners[id];
            require(owner == from, "not owner");
            _owners[id] = to;
            uint256 subOwner = _subOwners[id];
            if (_subOwners[id] != 0) {
                _subOwners[id] = 0;
                _subNumNFTPerAddress[subOwner]--;
                emit SubTransfer(subOwner, 0, id);
            }
            emit Transfer(from, to, id); // TODO extract function (same as transferFrom)
        }
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorsForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorsForAll[owner][operator];
    }
}
