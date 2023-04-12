import { ReactNode } from "react";
import { createUseStyles } from "react-jss";
import { green, whiteGreyBG } from "../../styles/colors";

type ContentPageProps = {
  verifier?: boolean;
  address?: string;
  children: ReactNode;
}

export function ContentPage(props: ContentPageProps) {
  const cls = useStyles();
  let shortAddress: string | undefined
  if (props.address) {
    const length = props.address.length;
    const prefix = props.address.substring(0,6)
    const postfix = props.address.substring(length-4, length)
    shortAddress = [prefix, "...", postfix].join("")
  }
  return (
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
        <div className={cls.verifier}>
          <div>verify credential</div>
        </div>
      }
    </div>
  );
}

const useStyles = createUseStyles({
  verifier: {
    position: "absolute",
    left: "50%",
    transform: "translate(-50%)",
    bottom: "10px"
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
    width: "670px",
    height: "700px",
    borderRadius: "8px",
    filter: "drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25))",
    position: "relative"
  },
});
