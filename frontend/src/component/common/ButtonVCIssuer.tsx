import React from "react";
import { createUseStyles } from "react-jss";

export interface ButtonVCIssuerProps {
  /**
   * Service name that integrate with vc issuer
   */
  serviceTitle: string;

  /**
   * path to logo service
   */
  logo: string;

  theme: ButtonVCIssuerTheme;

  /**
   * Button content
   */
  children: React.ReactNode;

  onClick?: React.MouseEventHandler;
}

export function ButtonVCIssuer({ serviceTitle, logo, theme, children, onClick }: ButtonVCIssuerProps) {
  const cls = useStyles({ theme });

  return (
    <div>
      <div className={cls.buttonVCIssuer}>
        <div className={cls.buttonVCIssuer__serviceTitle}>{serviceTitle}</div>

        <div className={cls.buttonVCIssuer__containerWrap}>
          <div className={cls.buttonVCIssuer__container} onClick={onClick}>
            <div className={cls.buttonVCIssuer__serviceLogoContainer}>
              <img className={cls.buttonVCIssuer__serviceLogo} src={logo} alt={`${serviceTitle} logo`} />
            </div>

            <div className={cls.buttonVCIssuer__content}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ButtonVCIssuerTheme {
  backgroundColor: string;
}
const useStyles = createUseStyles((theme: ButtonVCIssuerTheme) => ({
  buttonVCIssuer: {
    background: `linear-gradient(180deg, ${theme.backgroundColor}, white)`,
    borderRadius: "15px",
    color: "#EBEBEB",
    textShadow: "#434343 0px 0px 1px",
    maxWidth: "230px",
    width: "90vw",
    minWidth: "150px",
    textAlign: "center",
    transition: "all 0.3s",
    boxShadow: `0px 0px 2px ${theme.backgroundColor}`,
    "&:hover": {
      boxShadow: `0px 0px 10px ${theme.backgroundColor}`,
      textShadow: "black 0px 0px 1px",
      cursor: "pointer",
    },
  },

  buttonVCIssuer__serviceTitle: {
    padding: {
      top: "2px",
      bottom: "2px",
    },
  },

  buttonVCIssuer__containerWrap: {
    background: "linear-gradient(180deg, white 0%, black 100%)",
    padding: "1px",
    borderRadius: "15px",
  },

  buttonVCIssuer__container: {
    display: "flex",
    alignItems: "center",
    borderRadius: "15px",
    background: "#FFFFFF",
  },

  buttonVCIssuer__serviceLogoContainer: {
    padding: "5px 0px 1px 5px",
  },

  buttonVCIssuer__serviceLogo: {
    height: "30px",
    width: "30px",
    borderRadius: "50%",
    transition: "all 0.8s",
    boxShadow: `0px 0px 1px black`,
    "&:hover": {
      boxShadow: `0px 0px 3px ${theme.backgroundColor}`,
    },
  },

  buttonVCIssuer__content: {
    textAlign: "center",
    flexGrow: 1,
    fontSize: "14px",
    color: "black",
    textShadow: "none",
    alignSelf: "2px",
    padding: {
      bottom: "2px",
    },
  },
}));
