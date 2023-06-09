import { type CredentialKinds } from "@sybil-center/sdk";
import { Dispatch, ReactNode, SetStateAction, useState } from "react";
import { createUseStyles } from "react-jss";
import { useAccount } from "wagmi";
import { useSubjectProof } from "../../../hooks/subject-proof";
import { Moment } from "moment";
import { sybil } from "../../../service/sybil";
import { copyTextToClipBoard } from "../../../util/copy-value";
import { middleFont, smallFont } from "../../../styles/fonts";
import { blackBG, green, red } from "../../../styles/colors";
import { SetCustomModal } from "../modals/SetCustomModal";
import { Property } from "../../common/Property";
import { SButton } from "../../common/SButton";
import { SubjProperties } from "./SubjProperties";
import { Button } from "../../common/Button";
import { CredentialModal } from "../modals/CredentialModal";
import { ContentPage } from "../../common/ContentPage";
import { PuffLoader } from "react-spinners";
import Datetime from "react-datetime";

export type SubjectProp = {
  value: string
  text: string
}
type Props<
  K extends keyof CredentialKinds,
  TCredential = CredentialKinds[K]["kind"]
> = {
  credentialKind: K;
  title: {
    text: string,
    logo: { imgPath: string, imgAlt: string }
  };
  subjectProps: { title: string; props: SubjectProp[] };
  options: {
    state: CredentialKinds[K]["options"]
    setState: Dispatch<SetStateAction<CredentialKinds[K]["options"]>>
  },
  children?: ReactNode;
  modals?: ReactNode;
}

type State<K extends keyof CredentialKinds> = {
  isLoading: boolean;
  isError: boolean;
  credential: CredentialKinds[K]["kind"] | null
}

const initState = {
  isLoading: false,
  isError: false,
  credential: null
};

export function Issuer<K extends keyof CredentialKinds>(props: Props<K>) {
  const cls = useStyles();

  const { address } = useAccount();
  const proof = useSubjectProof();
  const [state, setState] = useState<State<K>>(initState);
  const [showCredential, setShowCredential] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [credentialCopied, setCredentialCopied] = useState(false);
  const [propsClicked, setPropsClicked] = useState(false);

  const onExpDateChange = (moment: Moment | string) => {
    if (typeof moment === "string") props.options.setState((prev) => ({
      ...prev, expirationDate: undefined
    }));
    else props.options.setState((prev) => ({
      ...prev, expirationDate: moment.toDate()
    }));
  };

  const onIssueClick = () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    sybil.credential(props.credentialKind, proof, { ...props.options.state })
      .then((credential) => setState((prev) => (
        { ...prev, credential: credential }
      )))
      .catch(() => {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isError: true
        }));
        setTimeout(() => {
          setState(initState);
        }, 1000);
      })
      .finally(() => setState((prev) => (
        { ...prev, isLoading: false }
      )));
  };

  const copyCredential = async () => {
    setCredentialCopied(true);
    setTimeout(() => {
      setCredentialCopied(false);
    }, 500);
    const credential = state.credential;
    const strCredential = credential ? JSON.stringify(credential) : "";
    await copyTextToClipBoard(strCredential);
  };

  const reset = () => {
    setState(initState);
    //@ts-ignore
    props.options.setState({ props: [] });
  };

  const renderTitle = (): ReactNode => {
    return (
      <div className={cls.issuerTitle}>
        <img className={cls.issuerTitleImg}
             src={props.title.logo.imgPath}
             alt={props.title.logo.imgAlt}
        />
        <div className={cls.issuerTitleText}>
          <div>{props.title.text}</div>
        </div>
      </div>
    );
  };

  const render = (): ReactNode => {
    if (state.isError) {
      return (
        <div className={cls.error}>
          something went wrong
        </div>
      );
    }
    if (state.isLoading) {
      return (
        <div className={cls.loading}>
          <PuffLoader color={blackBG} size={200}/>
        </div>
      );
    }
    if (!state.credential) {
      return (
        <>
          <SetCustomModal<K>
            isOpen={showCustom}
            setIsOpen={setShowCustom}
            options={props.options.state}
            setOptions={props.options.setState}
          />
          {props.modals}
          {renderTitle()}
          <div className={cls.issuerOptions}>
            <div className={cls.issuerOptions_containerWrap}>
              <div className={cls.issuerOptions_container}>
                <Property
                  name={"expiration date"}
                  value={<Datetime onChange={onExpDateChange}/>}
                  theme={{ nameWidth: "150px", valueWidth: "220px" }}
                />
                <SButton
                  text={"set custom property"}
                  theme={{ width: "370px" }}
                  onClick={() => setShowCustom(true)}
                />
                <SubjProperties<K>
                  isClicked={propsClicked}
                  setIsClicked={setPropsClicked}
                  options={props.options.state}
                  setOptions={props.options.setState}
                  title={props.subjectProps.title}
                  subjProps={props.subjectProps.props}
                />
                {props.children}
              </div>
              <div className={cls.issuerOptions_stub}></div>
            </div>
          </div>
          <div className={cls.issueButton} onClick={onIssueClick}>
            <Button text={"Issue"}/>
          </div>
        </>
      );
    } else {
      return (
        <>
          <CredentialModal
            credential={state.credential}
            isOpen={showCredential}
            setIsOpen={setShowCredential}
          />
          {renderTitle()}
          <div className={cls.issuedText}>
            Github account ownership credential issued
          </div>
          <div className={cls.showCredential}>
            <SButton
              text={"show credential"}
              theme={{ width: "240px" }}
              onClick={() => setShowCredential(true)}
            />
          </div>
          <div className={cls.copyCredential}>
            <SButton
              text={credentialCopied ? "copied" : "copy credential"}
              theme={{ width: "240px" }}
              onClick={() => copyCredential()}
            />
          </div>
          <div>
          </div>
          <div className={cls.getNewButton}>
            <Button text={"Get new"} onClick={() => reset()}/>
          </div>
        </>
      );
    }
  };

  return (
    <ContentPage address={address} theme={{ maxWidth: "auto", minWidth: "400px" }}>
      {render()}
    </ContentPage>
  );
}

const useStyles = createUseStyles({
  issuerTitle: {
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

  issuerTitleImg: {
    height: "55px",
    width: "55px",
    borderRadius: "50%",
  },

  issuerTitleText: {
    fontSize: middleFont,
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },

  issuerOptions: {
    position: "absolute",
    top: "200px",
    left: "50%",
    transform: "translate(-50%)",
    overflow: "hidden",
    overflowY: "scroll",
    width: "400px",
    height: "340px",
    display: "flex",
    justifyContent: "center",
  },

  issuerOptions_containerWrap: {
    display: "flex",
    alignItems: "center",
    flexDirection: "column",
    gap: "12px",
    padding: "5px 0"
  },

  issuerOptions_stub: {
    width: "5px",
    height: "10px",
    border: "solid rgba(0, 0, 0, 0) 1px"
  },

  issuerOptions_container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px"
  },

  issueButton: {
    position: "absolute",
    top: "570px",
    left: "50%",
    transform: "translate(-50%)",
  },

  issuedText: {
    position: "absolute",
    fontSize: smallFont,
    top: "180px",
    left: "50%",
    transform: "translate(-50%)",
    color: green,
    minWidth: "400px",
    padding: "0 5px",
    textAlign: "center"
  },

  showCredential: {
    position: "absolute",
    cursor: "pointer",
    top: "237px",
    left: "50%",
    transform: "translate(-50%)"
  },

  copyCredential: {
    position: "absolute",
    cursor: "pointer",
    top: "291px",
    left: "50%",
    transform: "translate(-50%)"
  },

  getNewButton: {
    position: "absolute",
    top: "380px",
    left: "50%",
    transform: "translate(-50%)"
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

  "@media (max-width: 900px)": {
    issuerTitle: {
      minWidth: "350px",
      height: "50px",
      top: "80px"
    },
    issuerTitleImg: {
      height: "38px",
      width: "38px",
    },
    issuerTitleText: {
      fontSize: smallFont
    }
  }
});
