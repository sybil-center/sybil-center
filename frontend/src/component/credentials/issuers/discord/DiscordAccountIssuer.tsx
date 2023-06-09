import { DiscordAccountOptions, DiscordAccountProps } from "@sybil-center/sdk/types";
import { CredentialKinds } from "@sybil-center/sdk";
import { useState } from "react";
import { Issuer } from "../Issuer";

const DISCORD_LOGO_PATH = `${process.env.PUBLIC_URL}/logo/service/Discord-logo.png`;

const initOptions: DiscordAccountOptions = {
  props: []
};

type DiscordAccountKind = Extract<keyof CredentialKinds, "discord-account">

const subjectProps: {
  title: string;
  props: { value: DiscordAccountProps; text: string }[]
} = {
  title: "discord",
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
      value: "discriminator",
      text: "discriminator"
    },
  ]
};


export function DiscordAccountIssuer() {
  const [options, setOptions] = useState(initOptions);
  return (
    <Issuer<DiscordAccountKind>
      credentialKind={"discord-account"}
      title={{
        text: "Discord account ownership",
        logo: { imgPath: DISCORD_LOGO_PATH, imgAlt: "Discord logo" }
      }}
      subjectProps={subjectProps}
      options={{
        state: options,
        setState: setOptions
      }}
    />
  );
}
