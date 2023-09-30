import { PassportIssuer, PassportIT } from "./issuer/index.js";
import { HttpClient } from "./http-client.js";
import { WalletProof } from "./type/index.js";

type ZkCredKinds = {
  passport: {
    Kind: PassportIT["Cred"],
    Issuer: PassportIssuer,
    Options: PassportIT["Options"]
  }
}

type Issuers = {
  [K in keyof ZkCredKinds]: ZkCredKinds[K]["Issuer"]
}

export class ZkSybil {
  readonly issuers: Issuers;

  constructor(
    readonly issuerDomain?: URL,
    httpClient = new HttpClient(issuerDomain)
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
    return this.issuer(name).issueCred(walletProof, options);
  }

}
