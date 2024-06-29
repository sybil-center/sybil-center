import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SybilModule", (m) => {
  const sybil = m.contract("Sybil", [20000000000000000n]);
  return { sybil };
});