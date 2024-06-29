// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Sybil {

  address payable public owner;
  mapping(address => bytes20) private sybilMap;
  uint public requireWei;

  event SybilAdd(address subjectId, bytes20 sybilId);
  event ChangeOwner(address newOwner);
  event ChangeRequireWei(uint newRequireWei);

  modifier onlyOwner() {
    require(owner == msg.sender, "only owner");
    _;
  }

  constructor(uint _requireWei) {
    owner = payable(msg.sender);
    requireWei = _requireWei;
  }

  function setSybilId(bytes20 _sybilId, bytes calldata signature) external payable {
    require(msg.value >= requireWei, "msg.value is not correct");
    require(sybilMap[msg.sender] == bytes20(0), "address has sybil-id");
    (address recovered, ECDSA.RecoverError err,) = ECDSA.tryRecover(
      keccak256(abi.encodePacked(msg.sender, _sybilId)),
      signature
    );
    require(err == ECDSA.RecoverError.NoError && recovered == owner, "invalid signature");
    (bool success,) = owner.call{value: msg.value}("");
    require(success, "fail to send ETH");
    sybilMap[msg.sender] = _sybilId;
    emit SybilAdd(msg.sender, _sybilId);
  }

  function getSybilId(address _address) external view returns (bytes20) {
    return sybilMap[_address];
  }

  function setOwner(address _newOwner) external onlyOwner {
    owner = payable(_newOwner);
    emit ChangeOwner(_newOwner);
  }

  function setRequireWei(uint _requireWei) external onlyOwner {
    requireWei = _requireWei;
    emit ChangeRequireWei(_requireWei);
  }
}
