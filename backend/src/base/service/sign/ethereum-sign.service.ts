import { EthLikeSignService } from "../sign.service.js";

export class EthereumSignService extends EthLikeSignService {
  readonly didPrefix = "did:pkh:eip155:1";
}
