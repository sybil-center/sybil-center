import {
  Raw,
  ZkcCanIssueReq,
  ZkcCanIssueResp,
  ZkcChallenge,
  ZkcChallengeReq,
  ZkcIssueReq
} from "./type/index.js";
import { Proved, ZkCred, ZkcSchemaNames, ZkcSchemaNums } from "./type/index.js";
import { ZkcUtil } from "./util/index.js";

const DEFAULT_DOMAIN = new URL("https://api.sybil.center");

export class HttpClient {

  constructor(readonly issuerDomain = DEFAULT_DOMAIN) {}

  async challenge<
    TResp extends ZkcChallenge = ZkcChallenge,
    TParams extends Raw<ZkcChallengeReq> = Raw<ZkcChallengeReq>
  >(
    schema: ZkcSchemaNames | ZkcSchemaNums,
    params: TParams
  ): Promise<TResp> {
    const schemaName = typeof schema === "number"
      ? ZkcUtil.schema.toName(schema)
      : schema;
    const endpoint = new URL(ZkcUtil.EPs.v1(schemaName).challenge, this.issuerDomain);
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(params)
    });
    const body = await resp.json();
    if (resp.ok) return body;
    throw new Error(body.message);
  }

  async canIssue<
    TResp extends ZkcCanIssueResp,
    TReq extends ZkcCanIssueReq,
  >(
    schema: ZkcSchemaNames | ZkcSchemaNums,
    params: TReq
  ): Promise<TResp> {
    const schemaName = typeof schema === "number"
      ? ZkcUtil.schema.toName(schema)
      : schema;
    const endpoint = new URL(ZkcUtil.EPs.v1(schemaName).canIssue, this.issuerDomain);
    endpoint.searchParams.set("sessionId", params.sessionId);
    const resp = await fetch(endpoint, { method: "GET", });
    const body = await resp.json();
    if (resp.ok) return body;
    throw new Error(body.message);
  }

  async issue<
    TCred extends ZkCred = ZkCred,
    TReq extends ZkcIssueReq = ZkcIssueReq
  >(
    schema: ZkcSchemaNames | ZkcSchemaNums,
    params: TReq
  ): Promise<Proved<TCred>> {
    const schemaName = typeof schema === "number"
      ? ZkcUtil.schema.toName(schema)
      : schema;
    const endpoint = new URL(ZkcUtil.EPs.v1(schemaName).issue, this.issuerDomain);
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params)
    });
    const body = await resp.json();
    if (resp.ok) return body;
    throw new Error(body.message);
  }
}
