import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";

const infuraKey = vars.get("INFURA_API_KEY");
const testPrivateKey = vars.get("TEST_PRIVATE_KEY");
const etherscanApiKey = vars.get("ETHERSCAN_API_KEY");

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${infuraKey}`,
      accounts: [`0x${testPrivateKey}`]
    },
    hardhat: {}
  },
  etherscan: {
    apiKey: etherscanApiKey
  }
};

export default config;
