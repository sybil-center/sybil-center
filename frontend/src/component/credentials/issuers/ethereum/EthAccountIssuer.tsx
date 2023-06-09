import { EthAccountOptions, EthAccountProps } from "@sybil-center/sdk/types";
import { CredentialKinds } from "@sybil-center/sdk";
import { useState } from "react";
import { Issuer } from "../Issuer";

const ETH_LOGO_PATH = `${process.env.PUBLIC_URL}/logo/service/ETH-logo.png`;

const initOptions: EthAccountOptions = {
  props: []
};

type EthAccountKind = Extract<keyof CredentialKinds, "ethereum-account">

const subjectProps: {
  title: string;
  props: { value: EthAccountProps; text: string }[]
} = {
  title: "ethereum",
  props: [
    {
      value: "address",
      text: "address"
    },
    {
      value: "chainId",
      text: "chain id"
    }
  ]
};

export function EthAccountIssuer() {
  const [options, setOptions] = useState(initOptions);

  return (
    <Issuer<EthAccountKind>
      credentialKind={"ethereum-account"}
      title={{
        text: "Ethereum account ownership",
        logo: { imgPath: ETH_LOGO_PATH, imgAlt: "ETH logo" }
      }}
      subjectProps={subjectProps}
      options={{ state: options, setState: setOptions }}
    />
  );
}
