pragma solidity 0.6.5;

import "buidler-deploy/solc_0.6/proxy/Proxied.sol";
import "./ERC1155TokenDataLayout.sol";

contract ERC1155Token is Proxied, ERC1155TokenDataLayout {
    event TransferSingle(address indexed from, address indexed to, uint256 indexed id, uint256 amount);
    event TransferBatch(address indexed from, address indexed to, uint256[] indexed ids, uint256[] amounts);
    event SubTransferSingle(uint256 indexed from, uint256 indexed to, uint256 indexed id, uint256 amount);
    event SubTransferBatch(uint256 indexed from, uint256 indexed to, uint256[] indexed ids, uint256[] amounts);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    function postUpgrade(address tokenOwner) public virtual proxied {
        _tokenOwner = tokenOwner;
    }

    function mintVault(
        address owner,
        uint256 id,
        uint256 amount
    ) public {
        require(msg.sender == _tokenOwner, "NOT_AUTHORIZED_MINT");
        _balances[owner][id] += amount;
        _subBalances[0][id] += amount;
        emit TransferSingle(address(0), owner, id, amount);
        emit SubTransferSingle(0, 0, id, amount);
    }

    // TODO remove after fix
    function mintTo(
        address owner,
        uint256 id,
        uint256 amount
    ) public {
        require(msg.sender == _tokenOwner, "NOT_AUTHORIZED_MINT");
        _balances[owner][id] += amount;
        emit TransferSingle(address(0), owner, id, amount);
    }

    // TODO remove after fix
    function subMint(uint256 id, uint256 amount) public {
        require(msg.sender == _tokenOwner, "NOT_AUTHORIZED_MINT");
        _subBalances[0][id] += amount;
        emit SubTransferSingle(0, 0, id, amount);
    }

    function mint(
        uint256 subOwner,
        uint256 id,
        uint256 amount
    ) public {
        require(msg.sender == _tokenOwner, "NOT_AUTHORIZED_MINT");
        _subBalances[subOwner][id] += amount;
        _balances[_tokenOwner][id] += amount;
        emit TransferSingle(address(0), _tokenOwner, id, amount);
        emit SubTransferSingle(0, subOwner, id, amount);
    }

    function subBurnFrom(
        uint256 from,
        uint256 id,
        uint256 amount
    ) external {
        // cannot do any sender like in ERC721 because we would need to keep track of which owner is the balance coming from
        require(_tokenOwner == msg.sender || _operatorsForAll[_tokenOwner][msg.sender], "NOT_AUTHORIZED_SUB_BURN");
        uint256 currentBalance = _subBalances[from][id];
        require(currentBalance >= amount, "does not own enough");
        _subBalances[from][id] = currentBalance - amount;
        _balances[_tokenOwner][id] -= amount;
        emit TransferSingle(_tokenOwner, address(0), id, amount);
        emit SubTransferSingle(from, 0, id, amount);
    }

    function batchSubBurnFrom(
        uint256 from,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external {
        // cannot do any sender like in ERC721 because we would need to keep track of which owner is the balance coming from
        require(ids.length == amounts.length, "Inconsistent length");
        require(
            _tokenOwner == msg.sender || _operatorsForAll[_tokenOwner][msg.sender],
            "NOT_AUTHORIZED_BATCH_SUB_BURN"
        );
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];
            uint256 currentBalance = _subBalances[from][id];
            require(currentBalance >= amount, "does not own enough");
            _subBalances[from][id] = currentBalance - amount;
            _balances[_tokenOwner][id] -= amount;
        }
        emit TransferBatch(_tokenOwner, address(0), ids, amounts);
        emit SubTransferBatch(from, 0, ids, amounts);
    }

    function subBalanceOf(uint256 who, uint256 id) public view returns (uint256) {
        return _subBalances[who][id];
    }

    function subBalanceOfBatch(uint256[] calldata owners, uint256[] calldata ids)
        external
        view
        returns (uint256[] memory)
    {
        require(owners.length == ids.length, "Inconsistent array length between args");
        uint256[] memory balances = new uint256[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            balances[i] = subBalanceOf(owners[i], ids[i]);
        }
        return balances;
    }

    function subTransferFrom(
        uint256 from,
        uint256 to,
        uint256 id,
        uint256 amount
    ) external {
        // cannot do any sender like in ERC721 because we would need to keep track of which owner is the balance coming from
        require(_tokenOwner == msg.sender || _operatorsForAll[_tokenOwner][msg.sender], "NOT_AUTHORIZED_SUB_TRANSFER");
        uint256 currentBalance = _subBalances[from][id];
        require(currentBalance >= amount, "does not own enough");
        _subBalances[from][id] = currentBalance - amount;
        _subBalances[to][id] += amount;
        emit SubTransferSingle(from, to, id, amount);
    }

    function balanceOf(address who, uint256 id) public view returns (uint256) {
        require(who != address(0), "zero address");
        return _balances[who][id];
    }

    function balanceOfBatch(address[] calldata owners, uint256[] calldata ids)
        external
        view
        returns (uint256[] memory)
    {
        require(owners.length == ids.length, "Inconsistent array length between args");
        uint256[] memory balances = new uint256[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            balances[i] = balanceOf(owners[i], ids[i]);
        }
        return balances;
    }

    // TODO ERC1155 use safe version only

    // onwer need to take responsibility to subBurn before transfering out
    function transferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount
    ) external {
        require(from == msg.sender || _operatorsForAll[from][msg.sender], "NOT_AUTHORIZED_TRANSFER");
        uint256 currentBalance = _balances[from][id];
        require(currentBalance >= amount, "does not own enough");
        _balances[from][id] = currentBalance - amount;
        _balances[to][id] += amount;
        emit TransferSingle(from, to, id, amount);
    }

    // onwer need to take responsibility to subBurn before transfering out
    function batchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external {
        require(ids.length == amounts.length, "Inconsistent length");
        require(to != address(0), "invalid to");
        require(from == msg.sender || _operatorsForAll[from][msg.sender], "NOT_AUTHORIZED_BATCH_TRANSFER");
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];
            uint256 currentBalance = _balances[from][id];
            require(currentBalance >= amount, "does not own enough");
            _balances[from][id] = currentBalance - amount;
            _balances[to][id] += amount;
        }
        emit TransferBatch(from, to, ids, amounts);
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorsForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorsForAll[owner][operator];
    }
}
