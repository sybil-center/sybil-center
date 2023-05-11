import { createUseStyles } from "react-jss";
import { useAccount, useSignMessage } from "wagmi";
import { useState } from "react";
import { Web3Button } from "@web3modal/react";
import { ScaleLoader } from "react-spinners";
import { VC } from "../common/VC";
import { OldButton } from "../common/OldButton";
import { GitHubAccountVC } from "@sybil-center/sdk";
import { sybil } from "../../service/sybil";
import { useSubjectProof } from "../../hooks/subject-proof";

export function GitHubAccOwnerIssuer() {
  const cls = useStyles();
  const { isConnected: isWalletConnected } = useAccount();
  const { subjectId, signFn } = useSubjectProof()

  const [vcState, setVcState] = useState<{ loading: boolean; error?: string; data?: GitHubAccountVC }>({
    loading: false,
  });

  const handleIssue = () => {
    setVcState({ loading: true });
    sybil
      .credential("github-account", {
        subjectId: subjectId,
        signFn: signFn
      })
      .then((vc) => {
        setVcState({ loading: false, data: vc });
      })
      .catch((error) => {
        setVcState({ loading: false, error: error.message });
      });
  };

  const isErrors = (): boolean => {
    const hasError = Boolean(vcState.error);
    if (hasError) {
      setTimeout(() => {
        handleRefresh();
      }, 1000);
    }
    return hasError;
  };

  const handleRefresh = () => {
    setVcState({ loading: false });
  };

  const renderBody = () => {
    if (!isWalletConnected) return <></>;
    if (vcState.loading) return <ScaleLoader color={"white"} />;
    if (isErrors()) return <div className={cls.gitHubAccOwnIssuer__error}>Some errors</div>;
    if (vcState.data)
      return (
        <>
          <VC vc={vcState.data!} />
          <OldButton theme={{ backgroundColor: "#668bef" }} onClick={handleRefresh}>
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
    <div className={cls.gitHubAccOwnIssuer}>
      <div className={cls.gitHubAccOwnIssuer__title}>GitHub account ownership verifiable credential</div>
      <div className={cls.gitHubAccOwnIssuer__containerWrap}>
        <div className={cls.gitHubAccOwnIssuer__container}>
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
  gitHubAccOwnIssuer: {
    maxWidth: "1000px",
    width: "95%",
    minWidth: "300px",
  },
  gitHubAccOwnIssuer__title: {
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

  gitHubAccOwnIssuer__containerWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    margin: {
      top: "30px",
      bottom: "20px",
    },
  },

  gitHubAccOwnIssuer__container: {
    width: "80%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "25px",
  },

  gitHubAccOwnIssuer__error: {
    color: "#E6E6E6",
    textShadow: "black 0px 0px 5px",
    fontSize: "25px",
  },
});
