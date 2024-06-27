import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("SybilModule", (m) => {
  const sybil = m.contract("Sybil")
  return {sybil}
});