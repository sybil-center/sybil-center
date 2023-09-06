import { IZkcSigner } from "../../types/zkc.signer.js";
import { ZkCredential, ZkCredProofed } from "../../types/zkc.credential.js";
import { TransCredSchema } from "@sybil-center/zkc-preparator";
import { Config } from "../../../backbone/config.js";
import { tokens } from "typed-inject";
import { ZkcIdAlias } from "../../types/zkc.issuer.js";
import { MinaSigner } from "./mina-signer.service.js";
import { zkc } from "../../../util/zk-credentials.util.js";
import { ClientError } from "../../../backbone/errors.js";

export interface IZkcSignerManager {
  signer(alias: string): IZkcSigner;
  signZkCred(
    alias: string | number,
    props: Omit<ZkCredential, "isr">,
    transSchema: TransCredSchema
  ): Promise<ZkCredProofed>;
}

export class ZkcSignerManager implements IZkcSignerManager {

  private readonly signers: Record<ZkcIdAlias, IZkcSigner>;

  static inject = tokens("config");
  constructor(
    config: Config
  ) {
    const minaSigner = new MinaSigner(config);
    this.signers = {
      "mina": minaSigner,
      "0": minaSigner
    };
  }

  signer(alias: string): IZkcSigner {
    const isAlias = zkc.isIdAlias(alias);
    if (!isAlias) throw new ClientError(`Chain namespace ${alias} is not supported`);
    return this.signers[alias];
  }

  signZkCred(
    alias: string,
    props: Omit<ZkCredential, "isr">,
    transSchema: TransCredSchema
  ): Promise<ZkCredProofed> {
    const signer = this.signer(alias);
    return signer.signZkCred(props, transSchema)
  }
}
