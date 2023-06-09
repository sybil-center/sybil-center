import { appConfig } from "../../config/app-config";
import { Navigation } from "../common/Navigation";
import { DevContent } from "./DevContent";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";

export function DevPortal() {
  return (
    <>
      <GoogleReCaptchaProvider reCaptchaKey={appConfig.captchaKeyId}
                               useEnterprise={true}
      >
          <Navigation/>
          <DevContent/>
      </GoogleReCaptchaProvider>
    </>
  );
}
