import { PassportIssuer, PassportIT } from "./issuer/index.js";
import { HttpClient, WalletProof } from "zkc-core";

export * from "zkc-core";

type ZkCredKinds = {
  passport: {
    Kind: PassportIT["Cred"],
    Issuer: PassportIssuer,
    Options: PassportIT["Options"] | undefined
  }
}

type Issuers = {
  [K in keyof ZkCredKinds]: ZkCredKinds[K]["Issuer"]
}

const DEFAULT_DOMAIN = new URL(`https://api.sybil.center`);

export class ZkSybil {
  readonly issuers: Issuers;

  constructor(
    readonly issuerDomain?: URL,
    httpClient = new HttpClient(issuerDomain ? issuerDomain : DEFAULT_DOMAIN)
  ) {
    this.issuers = {
      passport: new PassportIssuer(httpClient)
    };
  }

  issuer<TName extends keyof Issuers>(
    name: TName
  ): Issuers[TName] {
    const issuer = this.issuers[name];
    if (issuer) return issuer;
    throw new Error(`ZK Credential with alias ${name} is not supported`);
  }

  async credential<
    TName extends keyof ZkCredKinds
  >(
    name: TName,
    walletProof: WalletProof,
    options: ZkCredKinds[TName]["Options"]
  ): Promise<ZkCredKinds[TName]["Kind"]> {
    return this.issuer(name).issueCred({ proof: walletProof, options });
  }

}
