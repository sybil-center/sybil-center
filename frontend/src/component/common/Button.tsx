import { createUseStyles } from "react-jss";
import { blackBG, white } from "../../styles/colors";
import { defaultFF, middleFont } from "../../styles/fonts";
import { MouseEventHandler} from "react";

type Props = {
  text: string;
  theme?: Theme;
  onClick?: MouseEventHandler;
}

type Theme = {
  color?: string;
  borderRadius?: string;
  fontFamily?: string;
  backgroundColor?: string;
  fontSize?: string;
  padding?: string;
  minWidth: string;
}

export function Button(props: Props) {
  const theme = props.theme;
  const cls = useStyles({ theme });

  return (
    <div className={cls.button} onClick={ props.onClick }>
        {props.text}
    </div>
  );
}

const useStyles = createUseStyles((theme?: Theme) => ({
  button: {
    color: theme?.color ? theme.color : white,
    borderColor: "none",
    borderRadius: theme?.borderRadius ? theme.borderRadius : "5px",
    backgroundColor: theme?.backgroundColor ? theme.backgroundColor : blackBG,
    fontSize: theme?.fontSize ? theme.fontSize : middleFont,
    fontFamily: theme?.fontFamily ? theme.fontFamily : defaultFF,
    cursor: "pointer",
    textAlign: "center",
    display: "inline-block",
    minWidth: theme?.minWidth ? theme.minWidth : "220px",
    padding: theme?.padding ? theme.padding : "15px 0",
    "&:active": {
      position: "relative",
      top: "1px"
    }
  },
}));
