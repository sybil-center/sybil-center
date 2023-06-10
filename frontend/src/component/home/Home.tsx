import { createUseStyles } from "react-jss";
import { container } from "../../styles/classes";
import { ContentPage } from "../common/ContentPage";
import { middleFont, smallFont } from "../../styles/fonts";
import { black, violet } from "../../styles/colors";
import Lottie from "lottie-react";
import animationDate from "../../animation/rotate-round-lines.json";
import { SButton } from "../common/SButton";

export function Home() {
  const cls = useStyles();
  return (
    <>
      <div className={cls.container}>
        <ContentPage theme={{ width: "670px" }}>
          <div className={cls.title}>
            Sybil <span className={cls.title_accent}>Center</span>
          </div>
          <div className={cls.description}>
            WEB 3.0 Identity Provider & Verifiable Credential Issuer
          </div>
          <div className={cls.animation}>
            <Lottie animationData={animationDate}/>
          </div>
          <ul className={cls.options}>
            <li>
              <a href={"https://www.npmjs.com/package/@sybil-center/sdk"} target={"_blank"}>
                <SButton text={"JS library"} theme={{ width: "350px" }}/>
              </a>
            </li>
            <li>
              <a href={`${process.env.PUBLIC_URL}/devportal`}>
                <SButton text={"Developer portal"} theme={{ width: "350px" }}/>
              </a>
            </li>
            <li>
              <a href={`${process.env.PUBLIC_URL}/credentials`}>
                <SButton text={"Supported credentials"} theme={{ width: "350px" }}/>
              </a>
            </li>
          </ul>
        </ContentPage>
      </div>
    </>
  );
}

const useStyles = createUseStyles({
  container: {
    ...container,
    display: "flex",
    marginTop: "36px",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row"
  },
  title: {
    fontSize: middleFont,
    color: black,
    borderBottom: "solid #484848 1px",
    position: "absolute",
    top: "220px",
    left: "50%",
    transform: "translate(-50%)",
    paddingBottom: "2px"
  },
  title_accent: {
    color: violet
  },
  description: {
    position: "absolute",
    width: "500px",
    fontSize: smallFont,
    textAlign: "center",
    top: "270px",
    left: "50%",
    transform: "translate(-50%)",
  },
  "@media(max-width: 500px)": {
    description: {
      width: "300px"
    }
  },
  animation: {
    position: "absolute",
    left: "50%",
    transform: "translate(-50%)",
    height: "490px",
    width: "490px"
  },
  options: {
    position: "absolute",
    top: "475px",
    left: "50%",
    transform: "translate(-50%)",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    padding: "0px",
    margin: "0px"
  }
});
