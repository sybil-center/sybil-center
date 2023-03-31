import { configureChains, createClient } from "wagmi";
import { mainnet, polygon, celo } from "@wagmi/core/chains";
import { EthereumClient, w3mConnectors, w3mProvider } from "@web3modal/ethereum";
import { appConfig } from "./app-config";

const { chains, provider } = configureChains(
  [polygon, celo, mainnet],
  [w3mProvider({ projectId: appConfig.walletConnectProjectId })]
);

export const wagmiClient = createClient({
  autoConnect: true,
  provider,
  connectors: w3mConnectors({
    projectId: appConfig.walletConnectProjectId,
    chains,
    version: 1
  })
});

export const web3modalClient = new EthereumClient(wagmiClient, chains);
