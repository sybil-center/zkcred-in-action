import { ZkCredProved, ZkcSchemaNames, ZkcSchemaNums } from "../types/credentials";
import { ZkcChallenge, ZkcChallengeReq, ZkcIssueReq } from "../types/issuer";
import { util } from "./util";

const DEFAULT_DOMAIN = new URL("https://api.sybil.center");

export class HttpClient {

  constructor(readonly domain = DEFAULT_DOMAIN) {}

  async challenge<
    TResp extends ZkcChallenge = ZkcChallenge,
    TParams extends ZkcChallengeReq = ZkcChallengeReq
  >(
    type: ZkcSchemaNums | ZkcSchemaNames,
    params?: TParams
  ): Promise<TResp> {

    const schema = typeof type === "number" ? util.toSchemaName(type) : type;
    const endpoint = new URL(util.EPs.v1(schema).challenge, this.domain);
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params)
    });
    const body = await resp.json();
    if (resp.status === 200) {
      return body;
    }
    throw new Error(body.message);
  }

  async canIssue(
    type: ZkcSchemaNums | ZkcSchemaNames,
    sessionId: string
  ): Promise<boolean> {
    const schema = typeof type === "number" ? util.toSchemaName(type) : type;
    const endpoint = new URL(util.EPs.v1(schema).canIssue, this.domain);
    endpoint.searchParams.set("sessionId", sessionId);
    const resp = await fetch(endpoint, {
      method: "GET",
    });
    const body = await resp.json();
    if (resp.status === 200) {
      return Boolean(body.canIssue);
    }
    throw new Error(body.message);
  }

  async issue<
    TResp extends ZkCredProved = ZkCredProved,
    TIssueReq extends ZkcIssueReq = ZkcIssueReq
  >(
    type: ZkcSchemaNums | ZkcSchemaNames,
    issueReq: TIssueReq
  ): Promise<TResp> {
    const schema = typeof type === "number" ? util.toSchemaName(type) : type;
    const endpoint = new URL(util.EPs.v1(schema).issue, this.domain);
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(issueReq)
    });
    const body = await resp.json();
    if (resp.status === 200) {
      return body;
    }
    throw new Error(body.message);
  }
}