import { EPs } from "./endpoints.util.js";
import { IdType, Schema } from "./type-adapter.util.js";
import { Proved, ZkCred } from "../type/index.js";
import { CredExtractor } from "./extractor.util.js";


const zkcUtil = {
  EPs: EPs,
  schema: Schema,
  idType: IdType,
  from<TCred extends Proved<ZkCred> = Proved<ZkCred>>(cred: TCred) {
    return new CredExtractor<TCred>(cred);
  }
};

export { zkcUtil };
