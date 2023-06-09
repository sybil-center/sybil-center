import { Issuer } from "../Issuer";
import { useState } from "react";
import {CredentialKinds} from "@sybil-center/sdk"
import { GitHubAccountOptions, GitHubAccountProps } from "@sybil-center/sdk/types";

const GITHUB_LOGO_PATH = `${process.env.PUBLIC_URL}/logo/service/GitHub-logo.png`;

const initOptions: GitHubAccountOptions = {
  props: []
};

type GitHubAccountKind = Extract<keyof CredentialKinds, "github-account">

const subjectProps: {
  title: string;
  props: { text: string; value: GitHubAccountProps }[]
} = {
  title: "github",
  props: [
    {
      value: "id",
      text: "id"
    },
    {
      value: "username",
      text: "user name"
    },
    {
      value: "userPage",
      text: "user page"
    }
  ]
};

export function GitHubAccountIssuer() {
  const [options, setOptions] = useState<GitHubAccountOptions>(initOptions);
  return (
    <Issuer<GitHubAccountKind>
      credentialKind={"github-account"}
      title={{
        text: "GitHub account ownership",
        logo: {
          imgPath: GITHUB_LOGO_PATH,
          imgAlt: "Github logo"
        }
      }}
      subjectProps={subjectProps}
      options={{
        state: options,
        setState: setOptions
      }}
    />
  );
}
