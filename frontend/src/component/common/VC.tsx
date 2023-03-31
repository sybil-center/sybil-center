import { Credential } from "@sybil-center/sdk";
import { useState } from "react";
import { copyTextToClipBoard } from "../../util/copy-value";
import { ShowVC } from "./ShowVC";
import { createUseStyles } from "react-jss";
import { Button } from "./Button";

interface VCProps {
  vc: Credential;
}

/**
 * Provide base functional on VC. Contains "Show VC" and "Copy VC" bottons
 * @param vc Verifiable Credential
 * @constructor
 */
export function VC({ vc }: VCProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isShowed, setIsShowed] = useState(false);

  const cls = useStyles();

  async function copyVC() {
    setIsCopied(false);
    await copyTextToClipBoard(JSON.stringify(vc));
    setIsCopied(true);
    setTimeout(() => {
      setIsCopied(false);
    }, 700);
  }

  const showButtonColor = (): string => {
    return isShowed ? "#C166EFFF" : "#668bef";
  };

  const copyButtonColor = (): string => {
    return isCopied ? "#58fc87" : "#668bef";
  };

  return (
    <div className={cls.vc}>
      {isShowed && <ShowVC vc={vc} />}

      <div>
        <Button theme={{ backgroundColor: showButtonColor() }} onClick={() => setIsShowed((prev) => !prev)}>
          {isShowed && "Hide VC"}
          {!isShowed && "Show VC"}
        </Button>
      </div>
      <div>
        <Button theme={{ backgroundColor: copyButtonColor() }} onClick={() => copyVC()}>
          {!isCopied && "Copy VC"} {isCopied && "Copied"}
        </Button>
      </div>
    </div>
  );
}

const useStyles = createUseStyles({
  vc: {
    maxWidth: "800px",
    width: "99%",
    minWidth: "300px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  },
});
