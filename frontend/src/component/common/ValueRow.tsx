import { createUseStyles } from "react-jss";
import { smallFont } from "../../styles/fonts";
import { black } from "../../styles/colors";
import { ReactNode } from "react";

type Props = {
  name?: string;
  value: string;
}

export function ValueRow(props: Props) {
  const theme = {valueLength: props.value.length}
  const cls = useStyles({theme});

  const render = (): ReactNode => {
    if (!props.name) {
      return (
        <div className={cls.row_value__noKey}>
          {props.value}
        </div>
      );
    }
    return (
      <>
        <div className={cls.row_key}>
          {props.name}
        </div>
        <div className={cls.row_value}>
          {props.value}
        </div>
      </>
    );
  };
  return (
    <div className={cls.row}>
      {render()}
    </div>
  );
}

type Theme = {
  valueLength: number;
}
const useStyles = createUseStyles(({ valueLength }: Theme) => ({
  row: {
    fontSize: smallFont,
    color: black,
    boxShadow: " 0px 0px 4px rgba(0, 0, 0, 0.25)",
    borderRadius: "5px",
    padding: "0",
    display: "flex",
    alignItems: "center",
    width: "fit-content",
    columnGap: "7px"
  },
  row_key: {
    padding: "8px 0",
    marginLeft: "13px",
    minWidth: "60px"
  },

  row_value: {
    padding: "8px",
    width: "auto",
    boxShadow: " 0px 0px 4px rgba(0, 0, 0, 0.25)",
    borderRadius: "0 5px 5px 0",
    minWidth: `${valueLength * 10.2}px`,
    fontSize: smallFont
  },

  row_value__noKey: {
    padding: "8px 15px",
    fontSize: smallFont,
  }
}));
