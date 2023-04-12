import { useState } from "react";
import { VC } from "../common/VC";
import { createUseStyles } from "react-jss";
import { OldButton } from "../common/OldButton";
import { ScaleLoader } from "react-spinners";
import { useAccount } from "wagmi";
import { Web3Button } from "@web3modal/react";
import { TwitterAccountVC } from "@sybil-center/sdk";
import { sybil } from "../../service/sybil";
import { useSubjectProof } from "../../hooks/subject-proof";

export function TwitterAccOwnerIssuer() {
  const { isConnected: isWalletConnected } = useAccount();
  const { address, signMessage } = useSubjectProof();

  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    data?: TwitterAccountVC;
  }>({ loading: false });

  const cls = useStyles();

  const handleIssue = () => {
    setState({ loading: true });
    sybil
      .credential("twitter-account", {
        publicId: address,
        signFn: signMessage
      })
      .then((vc) => {
        setState({ loading: false, data: vc });
      })
      .catch((error) => {
        setState({ loading: false, error: error.message });
      });
  };

  const refreshAll = () => {
    setState({ loading: false });
  };

  const renderBody = () => {
    if (!isWalletConnected) return <></>;
    if (state.loading) return <ScaleLoader color={"white"} />;
    if (state.error)
      return (
        <>
          <div className={cls.twitterAccOwnIssuer__error}>Some errors</div>
          <OldButton theme={{ backgroundColor: "#668bef" }} onClick={refreshAll}>
            issue new
          </OldButton>
        </>
      );
    if (state.data)
      return (
        <>
          <VC vc={state.data} />
          <OldButton theme={{ backgroundColor: "#668bef" }} onClick={refreshAll}>
            issue new
          </OldButton>
        </>
      );

    return (
      <OldButton theme={{ backgroundColor: "#668bef" }} onClick={handleIssue}>
        issue VC
      </OldButton>
    );
  };

  return (
    <div className={cls.twitterAccOwnIssuer}>
      <div className={cls.twitterAccOwnIssuer__title}>Twitter account ownership verifiable credential</div>
      <div className={cls.twitterAccOwnIssuer__containerWrap}>
        <div className={cls.twitterAccOwnIssuer__container}>
          {renderBody()}
          <div>
            <Web3Button />
          </div>
        </div>
      </div>
    </div>
  );
}

const useStyles = createUseStyles({
  twitterAccOwnIssuer: {
    maxWidth: "1000px",
    width: "95%",
    minWidth: "300px",
  },
  twitterAccOwnIssuer__title: {
    borderRadius: "2px 2px 15px 15px",
    color: "#E6E6E6",
    textShadow: "black 0px 0px 5px",
    fontSize: "25px",
    background: `linear-gradient(180deg, #668bef, white 500%)`,
    padding: "5px 0px",
    transition: "all 0.3s",
    boxShadow: "0px 0px 3px grey",
    "&:hover": {
      boxShadow: "0px 0px 7px white",
    },
  },

  twitterAccOwnIssuer__containerWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: {
      top: "30px",
      bottom: "20px",
    },
  },

  twitterAccOwnIssuer__container: {
    width: "80%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "25px",
  },

  twitterAccOwnIssuer__error: {
    color: "#E6E6E6",
    textShadow: "black 0px 0px 5px",
    fontSize: "25px",
  },
});
