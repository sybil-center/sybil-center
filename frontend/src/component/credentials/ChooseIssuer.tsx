import { ContentPage } from "../common/ContentPage";
import { useAccount } from "wagmi";
import { createUseStyles } from "react-jss";
import { black, violet } from "../../styles/colors";
import { middleFont, smallFont } from "../../styles/fonts";
import animationDate from "../../animation/rotate-round-lines.json"
import Lottie from "lottie-react";


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
        Sybil <span className={cls.title_accent}>Center</span>
      </div>
      <div className={cls.animation}>
        <Lottie animationData={animationDate}/>
      </div>
      {/*<div className={cls.description}>*/}
      {/*  WEB 3.0 Identity Provider & Verifiable Credential Issuer*/}
      {/*</div>*/}
      {/*<div className={cls.title}>*/}
      {/*  <img*/}
      {/*    className={cls.title_img}*/}
      {/*    src={SYBIL_LOGO}*/}
      {/*    alt={"sybil logo"}*/}
      {/*  />*/}
      {/*  <div className={cls.title_text}>*/}
      {/*    Sybil <span className={cls.title_emph}>Center</span>*/}
      {/*  </div>*/}
      {/*</div>*/}
      {/*<div className={cls.w3idp}>*/}
      {/*  WEB 3.0 Identity Provider*/}
      {/*</div>*/}
      <div className={cls.text}>
        Choose verifiable credential you want
      </div>
    </ContentPage>
  );
}

const useStyles = createUseStyles({
  title: {
    fontSize: middleFont,
    color: black,
    borderBottom: "solid #484848 1px",
    position: "absolute",
    top: "47px",
    left: "50%",
    transform: "translate(-50%)",
    paddingBottom: "2px"
  },
  title_accent: {
    color: violet
  },
  // description: {
  //   position: "absolute",
  //   width: "500px",
  //   fontSize: smallFont,
  //   textAlign: "center",
  //   top: "87px",
  //   left: "50%",
  //   transform: "translate(-50%)",
  // },
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

  animation: {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: "translate(-50%,-50%)",
    height: "500px",
    width: "500px"
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
