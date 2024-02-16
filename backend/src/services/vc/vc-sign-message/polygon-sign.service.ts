import { EthLikeSignService } from "./signature.service.js";

export class PolygonSignService extends EthLikeSignService {
  readonly didPrefix = "did:pkh:eip155:137";

}
