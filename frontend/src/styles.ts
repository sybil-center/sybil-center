import { createUseStyles } from "react-jss";

const backgroundColor = "#282c34";

/**
 * Styles for {@link App}
 */
export const useAppStyles = createUseStyles({
  it: {
    margin: "0px",
  },

  base: {
    backgroundColor: backgroundColor,
    margin: {
      top: "100px",
    },
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "calc(10px + 2vmin)",
    color: "white",
  },
});
