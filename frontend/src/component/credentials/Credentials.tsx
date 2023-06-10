import { createUseStyles } from "react-jss";
import { ReactNode, useState } from "react";
import { container } from "../../styles/classes";
import { ContentPage } from "../common/ContentPage";
import { useAccount } from "wagmi";
import { Web3Button } from "@web3modal/react";
import { blackBG, white } from "../../styles/colors";
import { middleFont, smallFont } from "../../styles/fonts";
import { type CredentialKinds } from "@sybil-center/sdk";
import { type Service, Services } from "./Services";
import "../../styles/calendar.css";
import { GitHubAccountIssuer } from "./issuers/github/GitHubAccountIssuer";
import { EthAccountIssuer } from "./issuers/ethereum/EthAccountIssuer";
import { DiscordAccountIssuer } from "./issuers/discord/DiscordAccountIssuer";
import { TwitterAccountIssuer } from "./issuers/twitter/TwitterAccountIssuer";
import { ChooseIssuer } from "./ChooseIssuer";

export type ServiceTitle =
  | "Ethereum"
  | "Twitter"
  | "Discord"
  | "GitHub"

export type ServiceEntry = {
  currentIssuer: keyof CredentialKinds | null;
  currentService: ServiceTitle | null;
}

const services: Service[] = [
  {
    img: {
      path: `${process.env.PUBLIC_URL}/logo/service/ETH-logo.png`,
      alt: "ETH logo"
    },
    kind: "Ethereum",
    issuers: [
      {
        kind: "ethereum-account",
        text: "account ownership"
      }
    ]
  },
  {
    img: {
      path: `${process.env.PUBLIC_URL}/logo/service/Twitter-logo.png`,
      alt: "Twitter logo"
    },
    kind: "Twitter",
    issuers: [
      {
        kind: "twitter-account",
        text: "account ownership"
      }
    ]
  },
  {
    img: {
      path: `${process.env.PUBLIC_URL}/logo/service/GitHub-logo.png`,
      alt: "GitHub logo"
    },
    kind: "GitHub",
    issuers: [
      {
        kind: "github-account",
        text: "account ownership"
      }
    ]
  },
  {
    img: {
      path: `${process.env.PUBLIC_URL}/logo/service/Discord-logo.png`,
      alt: "Discord logo"
    },
    kind: "Discord",
    issuers: [
      {
        kind: "discord-account",
        text: "account ownership"
      }
    ]
  }
];

const serviceEntryInit: ServiceEntry = {
  currentIssuer: null,
  currentService: null
};

const kindToIssuer = new Map<keyof CredentialKinds, ReactNode>([
  ["discord-account", <DiscordAccountIssuer/>],
  ["ethereum-account", <EthAccountIssuer/>],
  ["github-account", <GitHubAccountIssuer/>],
  ["twitter-account", <TwitterAccountIssuer/>]
]);

function toIssuerComponent(kind: keyof CredentialKinds | null): ReactNode {
  if (!kind) return <ChooseIssuer/>;
  const issuerComp = kindToIssuer.get(kind);
  return issuerComp ? issuerComp : <ChooseIssuer/>
}

export function Credentials() {
  const cls = useStyles();
  const { address, isConnected: isWalletConnected } = useAccount();
  const [serviceEntry, setServiceEntry] = useState<ServiceEntry>(serviceEntryInit);

  const renderSidebar = () => {
    return (
      <>
        <ContentPage theme={{ maxWidth: "auto" }}>
          <div className={cls.sideBar_ContentWrap}>
            <div className={cls.sideBar_Title}>
              <span className={cls.sideBar_TitleText}>
                Credentials
              </span>
            </div>
            <Services
              serviceEntry={serviceEntry}
              setServiceEntry={setServiceEntry}
              services={services}
            />
          </div>
        </ContentPage>
      </>
    );
  };

  const renderContent = () => {
    if (!isWalletConnected) {
      return (
        <ContentPage address={address} theme={{ maxWidth: "auto", minWidth: "400px" }}>
          <div className={cls.walletConnect_button}>
            <Web3Button/>
          </div>
        </ContentPage>
      );
    }
    if (isWalletConnected) {
      return (
        toIssuerComponent(serviceEntry.currentIssuer)
      );
    }
  };
  return (
    <>
      <div className={cls.container}>
        <div className={cls.sideBar}>
          {renderSidebar()}
        </div>
        <div className={cls.content}>
          {renderContent()}
        </div>
      </div>
    </>
  );
}

const useStyles = createUseStyles({
  container: {
    ...container,
    alignItems: "center",
    justifyContent: "center",
    marginTop: "38px",
    display: "grid",
    columnGap: "30px",
    gridTemplateColumns: "3fr 5fr"
  },
  sideBar: {
    height: "700px",
  },

  sideBar_ContentWrap: {
    padding: "0 10px"
  },

  sideBar_Title: {
    maxWidth: "370px",
    height: "60px",
    position: "relative",
    top: "16px",
    left: "50%",
    transform: "translate(-50%)",
    borderRadius: "5px",
    backgroundColor: blackBG,
    textAlign: "center",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  sideBar_TitleText: {
    color: white,
    fontSize: middleFont,
  },

  content: {
    maxWidth: "700px",
  },
  walletConnect_button: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)"
  },
  content_issuerTitle: {
    position: "absolute",
    top: "67px",
    left: "50%",
    transform: "translate(-50%)",
    height: "70px",
    borderRadius: "5px",
    boxShadow: "0px 0px 2px  rgba(0, 0, 0, 0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-evenly",
    minWidth: "500px",
  },
  content_issuerTitleImg: {
    height: "55px",
    width: "55px",
    borderRadius: "50%",
  },
  content_issuerTitleText: {
    fontSize: middleFont,
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  content_expirationDate: {
    position: "absolute",
    zIndex: "100",
    top: "207px",
    left: "50%",
    cursor: "pointer",
    transform: "translate(-50%)",

  },
  content_customProperty: {
    cursor: "pointer",
    position: "absolute",
    top: "261px",
    left: "50%",
    transform: "translate(-50%)"
  },
  content_issueButton: {
    position: "absolute",
    top: "380px",
    left: "50%",
    transform: "translate(-50%)"
  },

  "@media (max-width: 900px)": {
    content_issuerTitle: {
      minWidth: "350px",
      height: "50px",
      top: "80px"
    },
    content_issuerTitleImg: {
      height: "38px",
      width: "38px",
    },
    content_issuerTitleText: {
      fontSize: smallFont
    }
  }
});
