import { ContentPage } from "../common/ContentPage";
import { createUseStyles } from "react-jss";
import { container } from "../../styles/classes";
import { Web3Button } from "@web3modal/react";
import { useAccount } from "wagmi";
import { ReactNode, useState } from "react";
import { blackBG, green, red } from "../../styles/colors";
import { Credential } from "@sybil-center/sdk";
import { APIKeys } from "@sybil-center/sdk/types";
import { sybil } from "../../service/sybil";
import { useSubjectProof } from "../../hooks/subject-proof";
import { appConfig } from "../../config/app-config";
import { PuffLoader } from "react-spinners";
import { copyTextToClipBoard } from "../../util/copy-value";
import { Button } from "../common/Button";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { Property } from "../common/Property";


type State = {
  isLoading: boolean;
  isError: boolean;
  error: string;
  apiKeys: APIKeys | null
}

const initState: State = {
  isLoading: false,
  isError: false,
  error: "",
  apiKeys: null
};

const fetchIsCaptchaRequired = async (): Promise<boolean> => {
  const endpoint = new URL("/api/v1/config/captcha-required", appConfig.vcIssuerDomain);
  const resp = await fetch(endpoint);
  if (resp.status !== 200) {
    throw new Error(`Fetch is captcha required error: ${await resp.json()}`);
  }
  const { captchaRequired } = await resp.json();
  return captchaRequired;
};

const fetchAPIkeys = async (credential: Credential, captchaToken?: string): Promise<APIKeys> => {
  const endpoint = new URL("/api/v1/keys", appConfig.vcIssuerDomain);
  const resp = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      credential: credential,
      captchaToken: captchaToken
    })
  });
  const body = await resp.json();
  if (resp.status === 200) {
    return body;
  }
  throw new Error(body.message);
};

const shortKey = (key: string): string => {
  const length = key.length;
  const prefix = key.substring(0, 10);
  const postfix = key.substring(length - 10, length);
  return [prefix, "...", postfix].join("");
};


export function DevContent() {
  const cls = useStyles();
  const [state, setState] = useState<State>(initState);
  const [isCopied, setIsCopied] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();

  const { subjectId, signFn } = useSubjectProof();
  const { address, isConnected: isWalletConnected } = useAccount();
  const onGetKeys = async () => {
    const expirationDate = new Date();
    expirationDate.setMinutes(expirationDate.getMinutes() + 3);
    setState((prev) => {
      return { ...prev, isLoading: true };
    });
    try {
      if (!executeRecaptcha) throw new Error("ReCAPTCHA error");
      const captchaRequired = await fetchIsCaptchaRequired();
      const captchaToken = captchaRequired ? await executeRecaptcha("auth") : undefined;
      const credential = await sybil.credential("ethereum-account", {
        subjectId: subjectId,
        signFn: signFn
      }, { expirationDate: expirationDate });
      const apiKeys = await fetchAPIkeys(credential, captchaToken);
      setState((prev) => {
        return {
          ...prev,
          apiKeys: apiKeys
        };
      });
    } catch (e: any) {
      setState((prev) => {
        return {
          ...prev,
          isError: true,
          error: String(e),
        };
      });
      setTimeout(() => setState(initState), 1000);
    } finally {
      setState((prev) => {
        return { ...prev, isLoading: false };
      });
    }
  };

  const copy = async (text: string) => {
    setIsCopied(false);
    await copyTextToClipBoard(text);
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 1000);

  };

  const renderContent = (): ReactNode => {
    if (state.isLoading) {
      return (
        <div className={cls.loading}>
          <PuffLoader color={blackBG} size={200}/>
        </div>);
    }
    if (state.isError) {
      return (
        <div className={cls.error}>
          something went wrong
        </div>);
    }
    if (!isWalletConnected) return (
      <div className={cls.walletConnect}>
        <div className={cls.walletConnect_text}>
          <p>First, connect to your ethereum wallet</p>
        </div>
        <div className={cls.walletConnect_button}>
          <div>
            <Web3Button/>
          </div>
        </div>
      </div>
    );
    if (isWalletConnected && !state.apiKeys) return (
      <div className={cls.getKeys}>
        <div className={cls.getKeys_text}>
          To get API keys you should proof your ethereum account ownership
        </div>
        <div className={cls.getKeys_button}>
          <Button text={"Get API keys"} onClick={onGetKeys}/>
        </div>
      </div>
    );
    if (state.apiKeys) {
      const apiKey = state.apiKeys.apiKey;
      const secret = state.apiKeys.secretKey;
      return (
        <>
          <div className={cls.keys_text}>
            api key and secret linked to your ethereum address
          </div>
          <div className={cls.keys}>
            <div className={cls.keys_value}
                 onClick={() => copy(apiKey)}
            >
              <Property name={"api key"}
                        value={shortKey(apiKey)}
                        theme={{ nameWidth: "85px", valueWidth: "250px" }}
              />
            </div>
            <div className={cls.keys_value}
                 onClick={() => copy(secret)}
            >
              <Property name={"secret"}
                        value={shortKey(secret)}
                        theme={{ nameWidth: "85px", valueWidth: "250px" }}
              />
            </div>
          </div>
          {!isCopied && <div className={cls.keys_copyText}>
            click to copy
          </div>}
          {isCopied && <div className={cls.keys_copyText__copied}>
            key copied
          </div>}
          <div className={cls.keys_warning}>
            If you lost your ethereum private key <br/>
            you should not use this keys
          </div>
        </>
      );
    }
  };

  return (
    <div className={cls.container}>
      <ContentPage address={address} theme={{ width: "670px" }}>
        <div className={cls.content}>
          {renderContent()}
        </div>
      </ContentPage>
    </div>
  );
}

const useStyles = createUseStyles({
  container: {
    ...container,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: "38px",
  },

  loading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)"
  },

  error: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    color: red
  },

  content: {
    display: "flex",
    justifyContent: "center",
    textAlign: "center"
  },
  walletConnect: {},
  walletConnect_text: {
    marginTop: "214px"
  },
  walletConnect_button: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)"
  },
  getKeys: {},

  getKeys_text: {
    marginTop: "207px"
  },

  getKeys_button: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
  },
  getKeys_buttonText: {
    margin: "0",
    padding: "15px",
    left: "36px"
  },

  keys: {
    display: "flex",
    flexDirection: "column",
    rowGap: "40px",
    position: "absolute",
    top: "269px",
    left: "50%",
    transform: "translate(-50%, 0%)"
  },

  keys_text: {
    position: "absolute",
    top: "191px"
  },

  keys_value: {
    cursor: "pointer",
    "&:active": {
      position: "relative",
      top: "1px"
    }
  },

  keys_copyText: {
    position: "absolute",
    top: "397px"
  },

  keys_copyText__copied: {
    position: "absolute",
    top: "397px",
    color: green
  },

  keys_warning: {
    position: "absolute",
    bottom: "177px",
    maxWidth: "358px",
    color: red
  }
});
