import { ZkcId, ZkcIdAlias, ZkCredProved, ZkcSchemaNums } from "./credentials.js";
import { SubjectProof } from "./proof.js";

export type ZkcChallengeReq = {
  exd?: number;
  sbjId: Omit<ZkcId, "t"> & { t: ZkcIdAlias };
  opt?: Record<string, any>
}

export type ZkcChallenge = {
  sessionId: string;
  message: string;
}

export type ZkcCanIssueReq = {
  sessionId: string;
}

export type ZkcCanIssueResp = {
  canIssue: boolean
}

export type ZkcIssueReq = {
  sessionId: string;
  signature: string;
}

export type ZkcOptions = {
  /** Expiration date */
  exd?: number
}

export interface IZkcIssuer<
  TZkCred extends ZkCredProved = ZkCredProved,
  TOptions extends ZkcOptions = ZkcOptions,
  TChallengeReq extends ZkcChallengeReq = ZkcChallengeReq,
  TChallenge extends ZkcChallenge = ZkcChallenge,
  TZkcIssueReq extends ZkcIssueReq = ZkcIssueReq,
  TCanReq extends ZkcCanIssueReq = ZkcCanIssueReq,
> {
  issueZkCred(sbjProof: SubjectProof, opt?: TOptions): Promise<TZkCred>;
  getChallenge(challengeReq: TChallengeReq): Promise<TChallenge>;
  canIssue(entry: TCanReq): Promise<boolean>;
  issue(issueReq: TZkcIssueReq): Promise<TZkCred>;
  providedSchema: ZkcSchemaNums;
}
