import { IZkcSigner } from "../../types/zkc.signer.js";
import { Proved, ZkCred } from "../../types/zkc.credential.js";
import { TransCredSchema } from "@sybil-center/zkc-preparator";
import { Config } from "../../../backbone/config.js";
import { tokens } from "typed-inject";
import { ZkcIdTypeAlias } from "../../types/zkc.issuer.js";
import { MinaSigner } from "./mina-signer.service.js";
import { ClientError } from "../../../backbone/errors.js";
import { ZKC } from "../../../util/zk-credentials/index.js";

export interface IZkcSignerManager {
  signer(alias: string): IZkcSigner;
  signZkCred<
    TCred extends ZkCred = ZkCred
  >(
    alias: string | number,
    props: Omit<TCred, "isr">,
    transSchema: TransCredSchema
  ): Promise<Proved<TCred>>;
}

export class ZkcSignerManager implements IZkcSignerManager {

  private readonly signers: Record<ZkcIdTypeAlias, IZkcSigner>;

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
    const isAlias = ZKC.idType.isAlias(alias);
    if (!isAlias) throw new ClientError(`Chain namespace ${alias} is not supported`);
    return this.signers[alias];
  }

  signZkCred<
    TCred extends ZkCred = ZkCred
  >(
    alias: string,
    props: Omit<TCred, "isr">,
    transSchema: TransCredSchema
  ): Promise<Proved<TCred>> {
    const signer = this.signer(alias);
    return signer.signZkCred(props, transSchema);
  }
}
