import { Dispatch, ReactNode, SetStateAction } from "react";
import { SButton } from "../../common/SButton";
import { createUseStyles } from "react-jss";
import { green, whiteGreyBG } from "../../../styles/colors";
import { CredentialKinds } from "@sybil-center/sdk";
import { SubjectProp } from "./Issuer";


type Props<
  K extends keyof CredentialKinds,
  TOptions = CredentialKinds[K]["options"]
> = {
  isClicked: boolean;
  setIsClicked: Dispatch<SetStateAction<boolean>>;
  subjProps: SubjectProp[];
  options: TOptions;
  setOptions: Dispatch<SetStateAction<TOptions>>;
  title: string
}

export function SubjProperties<K extends keyof CredentialKinds>({
  title,
  isClicked,
  setIsClicked,
  options,
  setOptions,
  subjProps
}: Props<K>) {
  const cls = useStyles();

  const renderProps = (): ReactNode => {
    return subjProps.map((prop, ind) => {
      //@ts-ignore
      const includes = options.props?.includes(prop.value);

      const onClick = () => {
        if (includes) {
          setOptions((prev) => {
            //@ts-ignore
            const newProps = options.props?.filter((pr) => pr !== prop.value);
            return { ...prev, props: newProps };
          });
        } else {
          setOptions((prev) => ({
            ...prev,
            props: [...prev.props!, prop.value]
          }));
        }
      };

      const result = () => {
        return (
          <>
            {includes && <div className={cls.dot}></div>}
            <div>{prop.text}</div>
          </>
        );
      };

      return (
        <div className={cls.prop}
             key={ind}
             onClick={() => onClick()}
        >
          <div className={cls.propContainer}>
            {result()}
          </div>
        </div>
      );
    });
  };

  return (
    <>
      <div className={cls.subjProps}>
        <SButton text={`${title} properties`}
                 theme={{ width: "370px", zIndex: "5" }}
                 onClick={() => setIsClicked((prev) => !prev)}
        />
        {isClicked && <div className={cls.propsContainer}>
          <div className={cls.propsList}>
            {renderProps()}
          </div>
        </div>}
      </div>
    </>
  );
}

const useStyles = createUseStyles({
  subjProps: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  propsContainer: {
    width: "300px",
    backgroundColor: whiteGreyBG,
    maxHeight: "110px",
    overflow: "hidden",
    overflowY: "scroll",
    boxShadow: "0px 5px 10px 1px  rgba(0, 0, 0, 0.1)",
    borderRadius: "0px 0px 3px 3px",
  },
  propsList: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  prop: {
    height: "34px",
    width: "100%",
    borderBottom: "1px solid #DDDDDD",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    cursor: "pointer"
  },
  propContainer: {
    display: "flex",
    alignItems: "center",
  },
  dot: {
    backgroundColor: green,
    borderRadius: "50%",
    height: "5px",
    width: "5px",
    marginRight: "10px"
  }
});
