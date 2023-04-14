import { SignService } from "./sign.service.js";
import { CeloSignService } from "./sign/celo-sign.service.js";
import { BitcoinSignService } from "./sign/bitcoin-sign.service.js";
import { EthereumSignService } from "./sign/ethereum-sign.service.js";
import { PolygonSignService } from "./sign/polygon-sign.service.js";
import { SolanaSignService } from "./sign/solana-sign.service.js";
import { tokens } from "typed-inject";
import { ClientError } from "../../backbone/errors.js";
import { SignType } from "@sybil-center/sdk/types";

export interface IMultiSignService {
  signAlg(alias?: SignType): SignService;
}

export class MultiSignService implements IMultiSignService {
  static inject = tokens();

  private readonly signServices: Map<SignType, SignService>;
  readonly ethereum: EthereumSignService;

  constructor() {
    const bitcoin = new BitcoinSignService();
    const celo = new CeloSignService();
    const solana = new SolanaSignService();
    const ethereum = new EthereumSignService();
    this.ethereum = ethereum;
    const polygon = new PolygonSignService();
    this.signServices = new Map<SignType, SignService>([
      ["bitcoin", bitcoin],
      ["bip122:000000000019d6689c085ae165831e93", bitcoin],

      ["celo", celo],
      ["eip155:42220", celo],

      ["ethereum", ethereum],
      ["eip155:1", ethereum],

      ["polygon", polygon],
      ["eip155:137", polygon],

      ["solana", solana],
      ["solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ", solana],
    ]);
  }

  /**
   * @param alias - alias/name of sign
   */
  signAlg(alias?: SignType): SignService {
    if (!alias) return this.ethereum;
    const signService = this.signServices.get(alias);
    if (signService) {
      return signService;
    }
    throw new ClientError(`${alias} is not supported`);
  }
}
