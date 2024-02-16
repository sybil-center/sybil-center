import { SignatureService } from "./signature.service.js";
import { CeloSignService } from "./celo-sign.service.js";
import { BitcoinSignService } from "./bitcoin-sign.service.js";
import { EthereumSignService } from "./ethereum-sign.service.js";
import { PolygonSignService } from "./polygon-sign.service.js";
import { SolanaSignService } from "./solana-sign.service.js";
import { tokens } from "typed-inject";
import { ClientErr } from "../../../backbone/errors.js";
import { Prefix } from "@sybil-center/sdk/types";

type MultiVerify = {
  subjectId: string,
  message: string,
  signature: string
}

export class VCMultiSignatureService {
  static inject = tokens();

  private readonly signServices: Map<Prefix, SignatureService>;
  readonly ethereum: EthereumSignService;

  constructor() {
    const bitcoin = new BitcoinSignService();
    const celo = new CeloSignService();
    const solana = new SolanaSignService();
    const ethereum = new EthereumSignService();
    this.ethereum = ethereum;
    const polygon = new PolygonSignService();
    this.signServices = new Map<Prefix, SignatureService>([
      ["did:pkh:bip122:000000000019d6689c085ae165831e93", bitcoin],
      ["did:pkh:eip155:42220", celo],
      ["did:pkh:eip155:1", ethereum],
      ["did:pkh:eip155:137", polygon],
      ["did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ", solana]
    ]);
  }

  async verify({ subjectId, message, signature }: MultiVerify): Promise<string> {
    const idEntry = subjectId.split(":");
    const address = idEntry.pop();
    if (!address) throw new ClientErr("Address is undefined");
    const prefix = idEntry.join(":") as Prefix;
    return await this.signService(prefix).did({ signature, message, address });
  }

  /**
   * @param alias - alias/name of sign
   */
  signService(alias: Prefix): SignatureService {
    const signService = this.signServices.get(alias);
    if (signService) {
      return signService;
    }
    throw new ClientErr(`${alias} is not supported`);
  }
}
