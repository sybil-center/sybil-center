import { createUseStyles } from "react-jss";
import ReactDom from "react-dom";
import { Dispatch, SetStateAction } from "react";
import { container, modal, overlay, title } from "./styles";

type Props = {
  credential: any;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>
}

export function CredentialModal({ credential, isOpen, setIsOpen }: Props) {
  const cls = useStyle();

  const onOverlayClick = () => {
    setIsOpen(false);
  };

  if (!isOpen) return <></>;
  return ReactDom.createPortal(
    <>
      <div className={cls.overlay} onClick={onOverlayClick}/>
      <div className={cls.modal}>
        <div className={cls.container}>
          <div className={cls.title}>
            <div>Credential</div>
          </div>
          <div className={cls.place}>
            <div className={cls.credential}>
              <pre className={cls.pre}>
                {JSON.stringify(credential, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </>, document.getElementById("show-credential-modal")!
  );
}

const useStyle = createUseStyles({
  overlay: { ...overlay },

  modal: { ...modal },

  container: { ...container },

  title: { ...title },

  place: {
    borderRadius: "8px",
    boxShadow: "0px 0px 4px rgba(0, 0, 0, 0.25)",
    width: "430px",
    height: "480px",
    top: "75px",
    left: "50%",
    position: "absolute",
    transform: "translate(-50%)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px"
  },

  credential: {
    height: "465px",
    width: "425px",
    padding: "5px",
    overflow: "hidden",
    overflowY: "scroll",
    overflowX: "scroll",
  },

  pre: {
    margin: "0"
  }
});
