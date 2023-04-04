import { EthLikeSignService } from "../sign.service.js";

export class CeloSignService extends EthLikeSignService {
  readonly didPrefix = "did:pkh:eip155:42220";
}
