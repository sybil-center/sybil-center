import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { describe } from "node:test";
import secp256k1 from "secp256k1";

describe("Sybil", () => {

  async function deployContract() {
    const accounts = await hre.ethers.getSigners();
    const [owner, newOwner, account1, account2, account3] = accounts;
    const ownerPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    const Sybil = await hre.ethers.getContractFactory("Sybil");
    const sybilContract = await Sybil.deploy();
    return { owner, newOwner, sybilContract, account1, account2, account3, accounts, ownerPrivateKey };
  }

  describe("deployment", () => {

    it("set right owner", async () => {
      const { owner, sybilContract } = await loadFixture(deployContract);
      const contractOwner = await sybilContract.owner();
      expect(contractOwner).equal(
        owner.address,
        `Sybil contract owner not match. Actual: ${contractOwner}`
      );
    });

  });

  describe("set sybil id", () => {

    it("set sybil id", async () => {
      const { sybilContract, account1, ownerPrivateKey } = await loadFixture(deployContract);
      const sybilId = new Uint8Array(20).fill(4);
      const address = hre.ethers.getBytes(account1.address.toLowerCase());
      const hash = hre.ethers.getBytes(hre.ethers.keccak256(
        Uint8Array.from([...address, ...sybilId])
      ));
      const signature = toECDSASignature(hash, hre.ethers.getBytes(ownerPrivateKey));
      expect(await sybilContract.connect(account1).setSybilId(sybilId, signature)).ok;
      const foundSybilId = await sybilContract.getSybilId(account1.address);
      expect(foundSybilId).equal(hre.ethers.hexlify(sybilId));
    });

    it("throws when invalid sender", async () => {
      const { sybilContract, ownerPrivateKey, account1, account2 } = await loadFixture(deployContract);
      const sybilId = hre.ethers.getBytes(`0x7db87439ef3078f4d61d063a08ae24ddc9e1ae3f`);
      const address = hre.ethers.getBytes(account1.address);
      const hash = hre.ethers.getBytes(hre.ethers.keccak256(
        Uint8Array.from([...address, ...sybilId])
      ));
      const signature = toECDSASignature(hash, hre.ethers.getBytes(ownerPrivateKey));
      await expect(
        sybilContract.connect(account2).setSybilId(sybilId, signature)
      ).revertedWith("invalid signature");
      expect(
        await sybilContract.getSybilId(account1)
      ).equal(hre.ethers.hexlify(new Uint8Array(20).fill(0)));
      expect(
        await sybilContract.getSybilId(account2)
      ).equal(hre.ethers.hexlify(new Uint8Array(20).fill(0)));
    });

    it("throws when invalid signer", async () => {
      const { sybilContract, account1 } = await loadFixture(deployContract);
      const sybilId = hre.ethers.getBytes(`0x7db87439ef3078f4d61d063a08ae24ddc9e1ae3f`);
      const address = hre.ethers.getBytes(account1.address);
      const hash = hre.ethers.getBytes(hre.ethers.keccak256(
        Uint8Array.from([...address, ...sybilId])
      ));
      const signature = toECDSASignature(
        hash,
        hre.ethers.getBytes(hre.ethers.Wallet.createRandom().privateKey)
      );
      await expect(
        sybilContract.connect(account1).setSybilId(sybilId, signature)
      ).revertedWith("invalid signature");
      expect(
        await sybilContract.getSybilId(account1)
      ).equal(hre.ethers.hexlify(new Uint8Array(20).fill(0)));
    });

    it("throws when address has sybil-id", async () => {
      const {
        keccak256, getBytes, hexlify
      } = hre.ethers;
      const { sybilContract, account1, ownerPrivateKey } = await loadFixture(deployContract);
      const sybilId = getBytes(`0x7db87439ef3078f4d61d063a08ae24ddc9e1ae3f`);
      const newSybilId = new Uint8Array(20).fill(3);
      const address = getBytes(account1.address);
      const signature = toECDSASignature(
        getBytes(keccak256(Uint8Array.from([...address, ...sybilId]))),
        getBytes(ownerPrivateKey)
      );
      expect(
        await sybilContract.connect(account1).setSybilId(sybilId, signature)
      ).ok;
      expect(
        await sybilContract.getSybilId(account1.address)
      ).equal(hexlify(sybilId));
      const newSignature = toECDSASignature(
        getBytes(keccak256(Uint8Array.from([...address, ...newSybilId]))),
        getBytes(ownerPrivateKey)
      );
      await expect(
        sybilContract.connect(account1).setSybilId(newSybilId, newSignature)
      ).revertedWith("address has sybil-id");
      expect(
        await sybilContract.getSybilId(account1.address)
      ).equal(hexlify(sybilId));
    });
  });

  describe("change owner", () => {

    it("success change owner", async () => {
      const { owner, newOwner, sybilContract } = await loadFixture(deployContract);
      expect(await sybilContract.owner()).equal(owner.address, "owner address not match");
      await sybilContract.setOwner(newOwner.address);
      expect(await sybilContract.owner()).equal(newOwner.address, "new owner address not match");
    });

    it("not owner request", async () => {
      const { owner, newOwner, sybilContract } = await loadFixture(deployContract);
      expect(await sybilContract.owner()).equal(owner.address, "owner address not match");
      await expect(
        sybilContract.connect(newOwner).setOwner(newOwner.address)
      ).revertedWith("only owner");
    });

  });

});

function toECDSASignature(msg: Uint8Array, privateKey: Uint8Array): Uint8Array {
  const { signature, recid } = secp256k1.ecdsaSign(msg, privateKey);
  const v = recid === 0 ? 27 : 28;
  return Uint8Array.from([...signature, v]);
}