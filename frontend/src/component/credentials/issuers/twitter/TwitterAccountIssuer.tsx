import { TwitterAccountOptions, TwitterAccountProps } from "@sybil-center/sdk/types";
import { CredentialKinds } from "@sybil-center/sdk";
import { useState } from "react";
import { Issuer } from "../Issuer";

const TWITTER_LOGO_PATH = `${process.env.PUBLIC_URL}/logo/service/Twitter-logo.png`;

const initOptions: TwitterAccountOptions = {
  props: []
};

type TwitterAccountKind = Extract<keyof CredentialKinds, "twitter-account">

const subjectProps: {
  title: string;
  props: { value: TwitterAccountProps; text: string }[]
} = {
  title: "twitter",
  props: [
    {
      value: "id",
      text: "id"
    },
    {
      value: "username",
      text: "user name"
    },
  ]
};

export function TwitterAccountIssuer() {
  const [options, setOptions] = useState(initOptions);
  return (
    <Issuer<TwitterAccountKind>
      credentialKind={"twitter-account"}
      title={{
        text: "Twitter account ownership",
        logo: { imgPath: TWITTER_LOGO_PATH, imgAlt: "twitter logo" }
      }}
      subjectProps={subjectProps}
      options={{
        state: options,
        setState: setOptions
      }}
    />
  );
}
