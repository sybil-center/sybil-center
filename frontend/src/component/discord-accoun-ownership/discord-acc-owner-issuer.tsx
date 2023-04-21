import { createUseStyles } from "react-jss";
import { useState } from "react";
import { Web3Button } from "@web3modal/react";
import { ScaleLoader } from "react-spinners";
import { VC } from "../common/VC";
import { OldButton } from "../common/OldButton";
import { DiscordAccountVC } from "@sybil-center/sdk";
import { useSubjectProof } from "../../hooks/subject-proof";
import { sybil } from "../../service/sybil";
import { useAccount } from "wagmi";

export function DiscordAccOwnerIssuer() {
  const cls = useStyles();
  const { isConnected: isWalletConnected } = useAccount();
  const { subjectId, signMessage } = useSubjectProof();
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    data?: DiscordAccountVC
  }>({ loading: false });

  const onIssue = () => {
    setState({ loading: true });
    sybil
      .credential("discord-account", {
        subjectId: subjectId,
        signFn: signMessage
      }, {
        expirationDate: new Date(),
        custom: { hello: "from @sybil/sdk"}
      })
      .then((vc) => {
        setState({ loading: false, data: vc });
      })
      .catch((error) => {
        setState({ loading: false, error: error.message });
      });
  };

  const isErrors = (): boolean => {
    const hasError = Boolean(state.error);
    if (hasError) {
      setTimeout(() => {
        onRefresh();
      }, 1000);
    }
    return hasError;
  };

  const onRefresh = () => {
    setState({ loading: false });
  };

  const renderBody = () => {
    if (!isWalletConnected) return <></>;
    if (state.loading) return <ScaleLoader color={"white"}/>;
    if (isErrors()) return <div className={cls.discordAccOwnIssuer__error}>Some errors</div>;
    if (state.data)
      return (
        <>
          <VC vc={state.data}/>
          <OldButton theme={{ backgroundColor: "#668bef" }} onClick={onRefresh}>
            issue new
          </OldButton>
        </>
      );

    return (
      <OldButton theme={{ backgroundColor: "#668bef" }} onClick={onIssue}>
        issue VC
      </OldButton>
    );
  };

  return (
    <div className={cls.discordAccOwnIssuer}>
      <div className={cls.discordAccOwnIssuer__title}>Discord account ownership verifiable credential</div>
      <div className={cls.discordAccOwnIssuer__containerWrap}>
        <div className={cls.discordAccOwnIssuer__container}>
          {renderBody()}
          <div>
            <Web3Button/>
          </div>
        </div>
      </div>
    </div>
  );
}

const useStyles = createUseStyles({
  discordAccOwnIssuer: {
    maxWidth: "1000px",
    width: "95%",
    minWidth: "300px"
  },
  discordAccOwnIssuer__title: {
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

  discordAccOwnIssuer__containerWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: {
      top: "30px",
      bottom: "20px"
    }
  },

  discordAccOwnIssuer__container: {
    width: "80%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "25px"
  },

  discordAccOwnIssuer__error: {
    color: "#E6E6E6",
    textShadow: "black 0px 0px 5px",
    fontSize: "25px"
  }
});
