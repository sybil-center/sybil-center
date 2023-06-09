import { createUseStyles } from "react-jss";
import { blackBG, violet, whiteFont } from "../../styles/colors";
import { middleFont, smallFont } from "../../styles/fonts";
import { container } from "../../styles/classes";
import { cn } from "../../util/styles";

export function Navigation() {
  const cls = useStyles();
  const currentPath = window.location.pathname;
  const isDevPortal = currentPath === "/devportal";
  const isCredentials = currentPath === "/credentials";

  const devPortalClass = isDevPortal
    ? cn(cls.navigation_link, cls.accent)
    : cls.navigation_link;

  const credentialsClass = isCredentials
    ? cn(cls.navigation_link, cls.accent)
    : cls.navigation_link;

  return (
    <nav className={cls.navigation}>
      <div className={cls.container}>
        <div className={cls.navigation_row}>
          <div className={cls.logo}>
            Sybil
          </div>
          <ul className={cls.navigation_list}>
            <li>
              <a href={`${process.env.PUBLIC_URL}/devportal`}>
                <div className={devPortalClass}>
                  Dev Portal
                </div>
              </a>
            </li>
            <li>
              <a href={`${process.env.PUBLIC_URL}/demo`}>
                <div className={credentialsClass}>
                  Credentials
                </div>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

const useStyles = createUseStyles({
  navigation: {
    backgroundColor: blackBG,
    color: whiteFont,
    padding: "8px"
  },

  container: {
    ...container
  },

  navigation_row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: "30px",
    rawGap: "20px"
  },

  logo: {
    fontSize: middleFont,
  },

  navigation_list: {
    display: "flex",
    alignItems: "center",
    fontSize: smallFont,
    columnGap: "20px",
    margin: "0px",
    padding: "0px"
  },

  navigation_link: {
    color: whiteFont,
    position: "relative",
    "&:hover": {
      opacity: 0.8
    },
    transition: "opacity 0.2s ease-in",
  },

  accent: {
    borderBottom: `${violet} solid 1px`
  }
});
