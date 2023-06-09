import { createUseStyles } from "react-jss";
import { smallFont } from "../../styles/fonts";
import { black } from "../../styles/colors";
import { MouseEventHandler } from "react";

type Theme = {
  width?: string;
  zIndex?: string;
}

type Props = {
  theme?: Theme;
  text: string;
  onClick?: MouseEventHandler<HTMLDivElement>
}

export function SButton(props: Props) {
  const cls = useStyles({ theme: props.theme });
  return (
    <div className={cls.sbutton} onClick={props.onClick}>
      <div>{props.text}</div>
    </div>
  );
}

const useStyles = createUseStyles((theme: Theme) => ({

  sbutton: {
    fontSize: smallFont,
    color: black,
    boxShadow: " 0px 0px 4px rgba(0, 0, 0, 0.25)",
    borderRadius: "5px",
    padding: "8px 0",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    width: theme.width ? theme.width : "fit-content",
    cursor: "pointer",
    zIndex: theme?.zIndex ? theme.zIndex : "",
    "&:active": {
      position: "relative",
      top: "1px"
    }
  }
}));
