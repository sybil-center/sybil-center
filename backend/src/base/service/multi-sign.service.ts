import { SignService } from "./sign.service.js";
import { CeloSignService } from "./sign/celo-sign.service.js";
import { BitcoinSignService } from "./sign/bitcoin-sign.service.js";
import { EthereumSignService } from "./sign/ethereum-sign.service.js";
import { PolygonSignService } from "./sign/polygon-sign.service.js";
import { SolanaSignService } from "./sign/solana-sign.service.js";
import { tokens } from "typed-inject";
import { ClientError } from "../../backbone/errors.js";

export type SignAlgAlias =
  | "bitcoin"
  | "bip122:000000000019d6689c085ae165831e93"
  | "did:pkh:bip122:000000000019d6689c085ae165831e93"
  | "celo"
  | "eip155:42220"
  | "did:pkh:eip155:42220"
  | "ethereum"
  | "eip155:1"
  | "did:pkh:eip155:1"
  | "polygon"
  | "eip155:137"
  | "did:pkh:eip155:137"
  | "solana"
  | "solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ"
  | "did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ";

export interface IMultiSignService {
  signAlg(alias?: SignAlgAlias): SignService;
}

export class MultiSignService implements IMultiSignService {
  static inject = tokens();

  private readonly signServices: Map<SignAlgAlias, SignService>;
  readonly ethereum: EthereumSignService;

  constructor() {
    const bitcoin = new BitcoinSignService();
    const celo = new CeloSignService();
    const solana = new SolanaSignService();
    const ethereum = new EthereumSignService();
    this.ethereum = ethereum;
    const polygon = new PolygonSignService();
    this.signServices = new Map<SignAlgAlias, SignService>([
      ["bitcoin", bitcoin],
      ["bip122:000000000019d6689c085ae165831e93", bitcoin],
      ["did:pkh:bip122:000000000019d6689c085ae165831e93", bitcoin],

      ["celo", celo],
      ["eip155:42220", celo],
      ["did:pkh:eip155:42220", celo],

      ["ethereum", ethereum],
      ["eip155:1", ethereum],
      ["did:pkh:eip155:1", ethereum],

      ["polygon", polygon],
      ["eip155:137", polygon],
      ["did:pkh:eip155:137", polygon],

      ["solana", solana],
      ["solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ", solana],
      ["did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ", solana],
    ]);
  }

  /**
   * Get sign from alias/name {@link SignAlgAlias}
   * @param alias - alias/name of sign
   */
  signAlg(alias?: SignAlgAlias): SignService {
    if (!alias) return this.ethereum;
    const signService = this.signServices.get(alias);
    if (signService) {
      return signService;
    }
    throw new ClientError(`${alias} is not supported`);
  }
}
