import { EthLikeSignService } from "../sign.service.js";

export class PolygonSignService extends EthLikeSignService {
  readonly didPrefix = "did:pkh:eip155:137";

}
