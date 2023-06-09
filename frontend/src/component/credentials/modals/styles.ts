import { blackBG, whiteFont } from "../../../styles/colors";
import { middleFont } from "../../../styles/fonts";

export const overlay = {
  position: "fixed",
  top: "0",
  left: "0",
  right: "0",
  bottom: "0",
  backgroundColor: "rgba(0,0,0,.7)",
  zIndex: 1000
}

export const modal = {
  minWidth: "470px",
  height: "580px",
  borderRadius: "8px",
  backgroundColor: "white",
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  zIndex: 1000
}

export const container = {
  position: "relative",
  height: "100%",
  width: "100%"
}

export const title = {
  height: "40px",
    width: "430px",
    backgroundColor: blackBG,
    position: "absolute",
    top: "15px",
    left: "50%",
    transform: "translate(-50%)",
    borderRadius: "5px",
    fontSize: middleFont,
    color: whiteFont,
    textAlign: "center",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
}
