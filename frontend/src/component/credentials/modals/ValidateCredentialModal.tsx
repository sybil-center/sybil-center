import ReactDom from "react-dom";
import { ChangeEvent, Dispatch, ReactNode, SetStateAction, useState } from "react";
import { createUseStyles } from "react-jss";
import { container, modal, overlay, title } from "./styles";
import { validateVC } from "../../../service/vc-validator/validate";
import { backGrey, green, red } from "../../../styles/colors";
import { sybil } from "../../../service/sybil";

type Props = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>
}

export function ValidateCredentialModal({ isOpen, setIsOpen }: Props) {
  const cls = useStyles();

  const [isVerified, setIsVerified] = useState<boolean | null>(null);

  const handleChange = async (e: ChangeEvent<HTMLTextAreaElement>) => {
    const strCredential = e.target.value;
    if (strCredential.length === 0) {
      setIsVerified(null);
      return;
    }
    try {
      const credential = JSON.parse(strCredential);
      const verified = await validateVC(strCredential) && (await sybil.verify(credential)).isVerified;
      setIsVerified(verified);
    } catch (e) {
      setIsVerified(false);
    }
  };

  const renderVerifiedText = (): ReactNode => {
    if (isVerified === null) {
      return (
        <div className={cls.validText_empty}>
          put credential
        </div>
      );
    }
    if (isVerified) {
      return (
        <div className={cls.validText_verified}>
          verified
        </div>
      );
    } else {
      return (
        <div className={cls.validText_notVerified}>
          not verified
        </div>
      );
    }
  };

  if (!isOpen) return (<></>);
  return ReactDom.createPortal(
    <>
      <div
        className={cls.overlay}
        onClick={() => setIsOpen(false)}
      />
      <div className={cls.modal}>
        <div className={cls.container}>
          <div className={cls.title}>
            Verify credential
          </div>
          <div className={cls.validText}>
            {renderVerifiedText()}
          </div>
          <div className={cls.place}>
            <textarea
              className={cls.textarea}
              onChange={(e) => handleChange(e)}
            />
          </div>
        </div>

      </div>
    </>, document.getElementById("validate-credential-modal")!
  );
}

const useStyles = createUseStyles({
  overlay: { ...overlay },
  modal: { ...modal },
  container: { ...container },
  title: { ...title },

  validText: {
    position: "absolute",
    left: "50%",
    transform: "translate(-50%)",
    top: "65px"
  },

  validText_empty: {
    color: backGrey
  },

  validText_verified: {
    color: green
  },

  validText_notVerified: {
    color: red
  },

  place: {
    position: "absolute",
    width: "430px",
    height: "470px",
    borderRadius: "8px",
    boxShadow: "0px 0px 4px rgba(0, 0, 0, 0.25)",
    top: "90px",
    left: "50%",
    transform: "translate(-50%)",
    padding: "5px",
  },
  textarea: {
    border: "none",
    minWidth: "425px",
    minHeight: "465px",
    resize: "none",
    "&:focus": {
      outline: "none",
    },
    "&:hover": {
      overflow: "visible"
    }
  },
});
