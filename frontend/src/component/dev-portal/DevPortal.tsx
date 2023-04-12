import { wagmiClient, web3modalClient } from "../../config/web3config";
import { appConfig } from "../../config/app-config";
import { Web3Modal } from "@web3modal/react";
import { WagmiConfig } from "wagmi";
import { Navigation } from "../common/Navigation";
import { DevContent } from "./DevContent";

export function DevPortal() {
  return (
    <>
      <WagmiConfig client={ wagmiClient }>
        <Web3Modal projectId={ appConfig.walletConnectProjectId }
                   ethereumClient={ web3modalClient }
        />
        <Navigation/>
        <DevContent/>
      </WagmiConfig>
    </>
  )
}
