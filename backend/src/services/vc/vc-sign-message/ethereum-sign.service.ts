import { EthLikeSignService } from "./signature.service.js";

export class EthereumSignService extends EthLikeSignService {
  readonly didPrefix = "did:pkh:eip155:1";
}
