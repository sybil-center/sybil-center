import { ContentPage } from "../common/ContentPage";
import { useAccount } from "wagmi";
import { createUseStyles } from "react-jss";
import { violet } from "../../styles/colors";
import { middleFont, smallFont } from "../../styles/fonts";

const SYBIL_LOGO = `${process.env.PUBLIC_URL}/icon.png`;

export function ChooseIssuer() {

  const { address } = useAccount();
  const cls = useStyles();
  return (
    <ContentPage
      address={address}
      theme={{ maxWidth: "auto", minWidth: "400px" }}
      verifier={true}
    >
      <div className={cls.title}>
        <img
          className={cls.title_img}
          src={SYBIL_LOGO}
          alt={"sybil logo"}
        />
        <div className={cls.title_text}>
          Sybil <span className={cls.title_emph}>Center</span>
        </div>
      </div>
      <div className={cls.w3idp}>
        WEB 3.0 Identity Provider
      </div>
      <div className={cls.text}>
        Choose verifiable credential you want
      </div>
    </ContentPage>
  );
}

const useStyles = createUseStyles({
  title: {
    position: "absolute",
    top: "70px",
    left: "50%",
    transform: "translate(-50%)",
    height: "70px",
    width: "300px",
    borderRadius: "5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-evenly",
    boxShadow: "0px 0px 2px  rgba(0, 0, 0, 0.25)"
  },
  title_img: {
    height: "50px",
    width: "60px"
  },
  title_text: {
    fontSize: middleFont,
  },
  title_emph: {
    color: violet
  },
  w3idp: {
    textAlign: "center",
    position: "absolute",
    top: "150px",
    left: "50%",
    transform: "translate(-50%)",
    fontSize: smallFont,
    minWidth: "300px"
  },
  text: {
    textAlign: "center",
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: smallFont,
  }
});
