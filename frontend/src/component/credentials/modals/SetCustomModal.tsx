import { ChangeEvent, Dispatch, ReactNode, SetStateAction, useState } from "react";
import { createUseStyles } from "react-jss";
import { container, modal, overlay, title } from "./styles";
import ReactDom from "react-dom";
import { SButton } from "../../common/SButton";
import { backGrey, green, red } from "../../../styles/colors";
import { CredentialKinds } from "@sybil-center/sdk";

type Props<
  K extends keyof CredentialKinds,
  TOptions = CredentialKinds[K]["options"]
> = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>
  options: TOptions,
  setOptions: Dispatch<SetStateAction<TOptions>>
}

export function SetCustomModal<K extends keyof CredentialKinds>({
  isOpen,
  setIsOpen,
  options,
  setOptions,
}: Props<K>) {
  const cls = useStyle();

  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [custom, setCustom] = useState<{ [key: string]: any } | null>(null);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const strCustom = e.target.value;
    if (strCustom.length === 0) {
      setIsValid(null);
      return;
    }
    if (!strCustom.startsWith("{") && !strCustom.endsWith("}")) {
      setIsValid(false);
      return;
    }
    try {
      const custom = JSON.parse(strCustom);
      setCustom(custom);
      setIsValid(true);
    } catch (e) {
      setIsValid(false);
    }
  };

  const onClickSetCustom = () => {
    if (isValid) {
      setOptions((prev) => ({ ...prev, custom: custom }));
      setIsOpen(false);
    }
  };

  const renderIsValidText = (): ReactNode => {
    if (typeof isValid === "object") return (
      <div className={cls.validText_empty}>
        put custom object
      </div>
    );
    if (isValid) {
      return (
        <div className={cls.validText_valid}>
          valid
        </div>
      );
    } else {
      return (
        <div className={cls.validText_notValid}>
          no valid
        </div>
      );
    }
  };

  if (!isOpen) return (<></>);
  return ReactDom.createPortal(
    <>
      <div className={cls.overlay} onClick={() => setIsOpen(false)}/>
      <div className={cls.modal}>
        <div className={cls.container}>
          <div className={cls.title}>
            <div>Set custom property</div>
          </div>
          <div className={cls.validText}>
            {renderIsValidText()}
          </div>
          <div className={cls.place}>
            <textarea
              className={cls.textarea}
              defaultValue={JSON.stringify(options.custom, null, 1)}
              onChange={(e) => handleChange(e)}
            />
          </div>
        </div>
        <div className={cls.setButton}>
          <SButton text={"set custom"}
                   theme={{ width: "200px" }}
                   onClick={() => onClickSetCustom()}/>
        </div>
      </div>
    </>, document.getElementById("set-custom-modal")!
  );
}

const useStyle = createUseStyles({
  overlay: { ...overlay },
  modal: { ...modal },
  container: { ...container },
  title: { ...title },

  place: {
    position: "absolute",
    width: "430px",
    height: "425px",
    borderRadius: "8px",
    boxShadow: "0px 0px 4px rgba(0, 0, 0, 0.25)",
    top: "90px",
    left: "50%",
    transform: "translate(-50%)",
    padding: "5px",
  },
  validText: {
    position: "absolute",
    left: "50%",
    transform: "translate(-50%)",
    top: "65px"
  },
  validText_empty: {
    color: backGrey
  },
  validText_valid: {
    color: green
  },
  validText_notValid: {
    color: red
  },
  textarea: {
    border: "none",
    minWidth: "425px",
    minHeight: "420px",
    whiteSpace: "nowrap",
    resize: "none",
    "&:focus": {
      outline: "none",
    },
    "&:hover": {
      overflow: "visible"
    }
  },
  setButton: {
    cursor: "pointer",
    position: "absolute",
    left: "50%",
    transform: "translate(-50%)",
    top: "535px"
  }
});
