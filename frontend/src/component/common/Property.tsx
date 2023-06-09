import { type ReactNode } from "react";
import { createUseStyles } from "react-jss";
import { smallFont } from "../../styles/fonts";
import { black } from "../../styles/colors";

type Props = {
  name: string;
  value: string | ReactNode;
  theme?: Theme;
}

type Theme = {
  nameWidth?: string;
  valueWidth?: string;
}

export function Property({ name, value, theme }: Props) {

  const nameLength = name.length;
  const valueLength = typeof value === "string" ? value.length : undefined;
  if (typeof value !== "string" && theme?.valueWidth === undefined) {
    throw new Error("If value is ReactNode theme.valueWidth has to be defined");
  }

  const cls = useStyle({
    theme: {
      ...theme,
      nameLength: nameLength,
      valueLength: valueLength
    }
  });

  return (
    <div className={cls.property}>
      <div className={cls.name}>
        {name}
      </div>
      <div className={cls.value}>
        {value}
      </div>
    </div>
  );
}

type InnerTheme = Theme & {
  nameLength: number;
  valueLength?: number;
}

const useStyle = createUseStyles((theme: InnerTheme) => ({
  property: {
    display: "flex",
    alignItems: "center",
    borderRadius: "5px",
    fontSize: smallFont,
    color: black,
    width: "fit-content",
    boxShadow: " 0px 0px 4px rgba(0, 0, 0, 0.25)",
  },
  name: {
    width: theme?.nameWidth ? theme.nameWidth : `${theme.nameLength * 8.6}px`,
    height: "34px",
    display: "flex",
    textAlign: "center",
    flexDirection: "row-reverse",
    justifyContent: "center",
    alignItems: "center"
  },

  value: {
    width: theme?.valueWidth ? theme.valueWidth : `${theme.valueLength! * 10.2}px`,
    height: "34px",
    boxShadow: " 0px 0px 4px rgba(0, 0, 0, 0.25)",
    borderRadius: "0 5px 5px 0",
    justifyContent: "center",
    display: "flex",
    textAlign: "center",
    alignItems: "center",
    cursor: "pointer"
  }
}));
