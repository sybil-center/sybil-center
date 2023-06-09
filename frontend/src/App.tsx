import { ReactNode } from "react";
import { appConfig } from "./config/app-config";
import { Header } from "./component/common/Header";
import { createUseStyles } from "react-jss";
import { Sidebar } from "./component/common/Sidebar";
import { Content } from "./component/common/Content";
import { wagmiClient, web3modalClient } from "./config/web3config";
import { Web3Modal } from "@web3modal/react";
import { WagmiConfig } from "wagmi";
import { EthAccOwnerIssuer } from "./component/eth-account-ownership/EthAccOwnerIssuer";
import { useAppSelector } from "./hooks/app-redux";
import { IssuerType } from "./store/issuerSlice";
import { TwitterAccOwnerIssuer } from "./component/twitter-account-ownership/TwitterAccOwnerIssuer";
import { Route, Routes } from "react-router-dom";
import { Popul } from "./component/common/Popul";
import { GitHubAccOwnerIssuer } from "./component/git-hub-account-ownership/git-hub-acc-owner-issuer";
import { DiscordAccOwnerIssuer } from "./component/discord-accoun-ownership/discord-acc-owner-issuer";
import { DevPortal } from "./component/dev-portal/DevPortal";
import { CredentialsPage } from "./component/credentials/CredentialsPage";

function App() {
  const currentIssuer = useAppSelector(state => state.issuer.currentIssuer);

  const toIssuerComponent = (issuerType: IssuerType): ReactNode => {
    switch (issuerType) {
      case "ETH_ACCOUNT_OWNERSHIP":
        return <EthAccOwnerIssuer/>;
      case "TWITTER_ACCOUNT_OWNERSHIP":
        return <TwitterAccOwnerIssuer/>;
      case "GIT_HUB_ACCOUNT_OWNERSHIP":
        return <GitHubAccOwnerIssuer/>;
      case "DISCORD_ACCOUNT_OWNERSHIP":
        return <DiscordAccOwnerIssuer/>;
    }
  };

  const cls = useStyles();

  return (
    <>
      <WagmiConfig client={wagmiClient}>
        <Web3Modal projectId={appConfig.walletConnectProjectId} ethereumClient={web3modalClient}/>
        <Routes>
          <Route path={"/"}
                 element={
                   <>

                     <Header title={"VC ISSUER"}
                             logo={process.env.PUBLIC_URL + "/icon.png"}
                             theme={{ backgroundColor: "#3D529C" }}/>

                     <div className={cls.app}>
                       <div className={cls.app__container}>
                         <div className={cls.app__sideBar}>
                           <Sidebar title={"Credentials"}/>
                         </div>

                         <div className={cls.app__content}>
                           <Content>
                             {toIssuerComponent(currentIssuer)}
                           </Content>
                         </div>

                       </div>
                     </div>
                   </>
                 }
          />
          <Route path={"/popul"} element={<Popul/>}/>
          <Route path={"/devportal"} element={<DevPortal/>}/>
          <Route path={"/credentials"} element={<CredentialsPage/>}/>
        </Routes>
      </WagmiConfig>

    </>
  );
}

const useStyles = createUseStyles({
  app: {
    display: "flex",
    justifyContent: "center",
    background: "#282c34",
    height: "100vh",
    minHeight: "1000px",
    boxShadow: "0px 0px 13px #E8E8E8",
    fontFamily: "sans-serif",
  },

  app__container: {
    maxWidth: "1300px",
    width: "80%",
    minWidth: "300px",
    background: "white",
    height: "100vh",
    display: "grid",
    gridTemplateColumns: "300px 1fr"
  },

  app__sideBar: {
    boxShadow: "0px 0px 3px grey"
  },

  app__content: {
    boxShadow: "0px 0px 3px grey"
  },

});

export default App;
