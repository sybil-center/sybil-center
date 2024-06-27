// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Sybil {

  address public owner;
  mapping(address => bytes20) private sybilMap;

  event SybilAdd(address subjectId, bytes20 sybilId);
  event ChangeOwner(address newOwner);

  modifier onlyOwner() {
    require(owner == msg.sender, "only owner");
    _;
  }

  constructor() {
    owner = msg.sender;
  }

  function setSybilId(bytes20 _sybilId, bytes calldata signature) external {
    (address recovered, ECDSA.RecoverError err,) = ECDSA.tryRecover(
      keccak256(abi.encodePacked(msg.sender, _sybilId)),
      signature
    );
    require(err == ECDSA.RecoverError.NoError && recovered == owner, "invalid signature");
    require(sybilMap[msg.sender] == bytes20(0), "address has sybil-id");
    sybilMap[msg.sender] = _sybilId;
    emit SybilAdd(msg.sender, _sybilId);
  }

  function getSybilId(address _address) external view returns (bytes20) {
    return sybilMap[_address];
  }

  function setOwner(address _newOwner) external onlyOwner {
    owner = _newOwner;
    emit ChangeOwner(_newOwner);
  }

}
