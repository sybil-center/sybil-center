import { EthLikeSignService } from "../abstraction/sign.service.js";

export class CeloSignService extends EthLikeSignService {
  readonly didPrefix = "did:pkh:eip155:42220";
}
