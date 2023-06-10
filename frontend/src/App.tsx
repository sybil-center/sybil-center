import { appConfig } from "./config/app-config";
import { wagmiClient, web3modalClient } from "./config/web3config";
import { Web3Modal } from "@web3modal/react";
import { WagmiConfig } from "wagmi";
import { Route, Routes } from "react-router-dom";
import { Popul } from "./component/common/Popul";
import { DevPortal } from "./component/dev-portal/DevPortal";
import { CredentialsPage } from "./component/credentials/CredentialsPage";
import { HomePage } from "./component/home/HomePage";

function App() {

  return (
    <>
      <WagmiConfig client={wagmiClient}>
        <Web3Modal projectId={appConfig.walletConnectProjectId} ethereumClient={web3modalClient}/>
        <Routes>
          <Route path={"/"} element={<HomePage/>}/>
          <Route path={"/popul"} element={<Popul/>}/>
          <Route path={"/devportal"} element={<DevPortal/>}/>
          <Route path={"/credentials"} element={<CredentialsPage/>}/>
        </Routes>
      </WagmiConfig>

    </>
  );
}

export default App;
