import { useEffect } from "react";
import { createUseStyles } from "react-jss";

export function Popul() {
  const cls = useStyles();

  useEffect(() => {
      window.close();
  }, []);

  return (
    <div className={cls.popul}>
      <div className={cls.pupul__text}>Thank you for your authorization.</div>
      <div className={cls.pupul__text}>You may close the window now.</div>
    </div>
  );
}

const useStyles = createUseStyles({
  popul: {
    margin: "0px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  pupul__text: {
    margin: "30px 0px",
  },
});
