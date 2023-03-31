import { EthLikeSignService } from "../abstraction/sign.service.js";

export class EthereumSignService extends EthLikeSignService {
  readonly didPrefix = "did:pkh:eip155:1";
}
