import { ReactNode, useState } from "react";
import { createUseStyles } from "react-jss";
import { green, whiteGreyBG } from "../../styles/colors";
import { ValidateCredentialModal } from "../credentials/modals/ValidateCredentialModal";
import { smallFont } from "../../styles/fonts";

type ContentPageProps = {
  verifier?: boolean;
  address?: string;
  theme?: Theme;
  children: ReactNode;
}

type Theme = {
  width?: string;
  maxWidth?: string;
  minWidth?: string;
  height?: string;
}

export function ContentPage(props: ContentPageProps) {
  const cls = useStyles({ theme: props.theme });

  const [showVerifier, setShowVerifier] = useState(false)

  let shortAddress: string | undefined;
  if (props.address) {
    const length = props.address.length;
    const prefix = props.address.substring(0, 6);
    const postfix = props.address.substring(length - 4, length);
    shortAddress = [prefix, "...", postfix].join("");
  }
  return (
    <>
      <ValidateCredentialModal
        isOpen={showVerifier}
        setIsOpen={setShowVerifier}
      />
      <div className={cls.contentPage}>
        {
          props.address &&
          <div className={cls.address}>
            <div className={cls.addressDot}/>
            <div className={cls.addressText}>
              {shortAddress}
            </div>
          </div>
        }
        <div>
          {props.children}
        </div>
        {
          props.verifier &&
          <div className={cls.verifier} onClick={() => setShowVerifier(true)}>
            <div>verify credential</div>
          </div>
        }
      </div>
    </>
  );
}

const useStyles = createUseStyles((theme?: Theme) => ({
  verifier: {
    position: "absolute",
    left: "50%",
    transform: "translate(-50%)",
    bottom: "10px",
    cursor: "pointer",
    width: "170px",
    height: "20px",
    borderRadius: "5px",
    textAlign: "center",
    fontSize: smallFont,
    boxShadow: "0px 0px 4px rgba(0, 0, 0, 0.25)",
  },
  address: {
    position: "absolute",
    left: "50%",
    transform: "translate(-50%)",
    top: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    columnGap: "5px",
    letterSpacing: "0"
  },
  addressDot: {
    borderRadius: "50%",
    backgroundColor: green,
    width: "5px",
    height: "5px"
  },
  addressText: {
    color: green
  },
  contentPage: {
    backgroundColor: whiteGreyBG,
    maxWidth: theme?.maxWidth ? theme.maxWidth : "",
    width: theme?.width ? theme.width : "",
    height: theme?.height ? theme.height : "700px",
    minWidth: theme?.minWidth ? theme.minWidth : "",
    borderRadius: "8px",
    filter: "drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25))",
    position: "relative"
  },
}));
