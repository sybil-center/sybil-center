import { useAccount } from "wagmi";
import { useState } from "react";
import { OldButton } from "../common/OldButton";
import { VC } from "../common/VC";
import { createUseStyles } from "react-jss";
import { Web3Button } from "@web3modal/react";
import { EthAccountVC } from "@sybil-center/sdk";
import { sybil } from "../../service/sybil";
import { useSubjectProof } from "../../hooks/subject-proof";

export function EthAccOwnerIssuer() {
  const { isConnected: isWalletConnected } = useAccount();
  const { address, signMessage } = useSubjectProof();
  const [state, setState] = useState<{ loading: boolean; error?: string; data?: EthAccountVC }>({
    loading: false
  });

  const cls = useStyles();

  const issueVC = () => {
    setState({ loading: true });
    sybil
      .credential("ethereum-account", {
        publicId: address,
        signFn: signMessage
      })
      .then((vc) => {
        setState({ loading: false, data: vc });
      })
      .catch((error) => {
        setState({ loading: true, error: error.message });
      });
  };

  const renderBody = () => {
    if (!isWalletConnected) return <></>;
    if (state.error) {
      return (
        <OldButton theme={{ backgroundColor: "#CC4141" }} onClick={issueVC}>
          issue error
        </OldButton>
      );
    }
    if (!state.data) {
      return (
        <OldButton theme={{ backgroundColor: "#668bef" }} onClick={issueVC}>
          issue
        </OldButton>
      );
    }

    return (
      <>
        <VC vc={state.data} />
        <OldButton theme={{ backgroundColor: "#668bef" }} onClick={() => setState({ loading: false })}>
          get new
        </OldButton>
      </>
    );
  };

  return (
    <div className={cls.ethAccOwnerIssuer}>
      <div className={cls.ethAccOwnerIssuer__title}>Ethereum account ownership verifiable credential</div>
      <div className={cls.ethAccOwnerIssuer__containerWrap}>
        <div className={cls.ethAccOwnerIssuer__container}>
          {renderBody()}
          <div>
            <Web3Button />
          </div>
        </div>
      </div>
    </div>
  );
}

const useStyles = createUseStyles(() => ({
  ethAccOwnerIssuer: {
    maxWidth: "1000px",
    width: "95%",
    minWidth: "300px"
  },

  ethAccOwnerIssuer__title: {
    borderRadius: "2px 2px 15px 15px",
    color: "#E6E6E6",
    textShadow: "black 0px 0px 5px",
    fontSize: "25px",
    background: `linear-gradient(180deg, #668bef, white 500%)`,
    padding: "5px 0px",
    transition: "all 0.3s",
    boxShadow: "0px 0px 3px grey",
    "&:hover": {
      boxShadow: "0px 0px 7px white"
    }
  },

  ethAccOwnerIssuer__containerWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: {
      top: "30px"
    }
  },

  ethAccOwnerIssuer__container: {
    width: "80%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "25px"
  }
}));
