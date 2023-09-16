import { IZkcIssuer, ZkcCanIssueReq, ZkcChallenge, ZkcChallengeReq, ZkcIssueReq, ZkcOptions } from "../types/issuer";
import { HttpClient } from "../base/http-client";
import { ZkcId, ZkCredProved, ZkcSchemaNums } from "../types/credentials";
import { SubjectProof } from "../types/proof";
import { util } from "../base/util";

export interface GitHubAccountChallengeReq extends ZkcChallengeReq {
  readonly redirectUrl?: string;
}

export interface GitHubAccountChallenge extends ZkcChallenge {
  readonly authUrl: string;
}

export interface GitHubAccountZKC extends ZkCredProved {
  sbj: {
    id: ZkcId,
    git: { id: number }
  };
}

export interface GitHubAccountOptions extends ZkcOptions {
  redirectUrl?: string;
  windowFeature?: string;
}

export class GithubAccountIssuer implements IZkcIssuer<
  GitHubAccountZKC,
  GitHubAccountOptions,
  GitHubAccountChallengeReq,
  GitHubAccountChallenge
> {

  constructor(private readonly httpClient: HttpClient) {}

  async issueZkCred(
    proof: SubjectProof,
    opt?: GitHubAccountOptions
  ): Promise<GitHubAccountZKC> {
    const challenge = await this.getChallenge({
      sbjId: proof.sbjId,
      exd: opt?.exd ? opt.exd : 0,
      redirectUrl: opt?.redirectUrl,
      opt: proof.opt
    });
    const popup = window.open(
      challenge.authUrl,
      "_blank",
      opt?.windowFeature ? opt.windowFeature : util.popupFeatures()
    );
    if (!popup) throw new Error(`Can not open popup window to authenticate in Discord`);
    const result = await util.repeat<boolean>(
      (r) => (r instanceof Error) ? true : r,
      1000,
      () => this.canIssue(challenge)
    );
    if (result instanceof Error) throw result;
    const signature = await proof.signFn({ message: challenge.message });
    return this.issue({
      sessionId: challenge.sessionId,
      signature: signature
    });
  }


  get providedSchema(): ZkcSchemaNums {
    return 1;
  };

  getChallenge(challengeReq: GitHubAccountChallengeReq): Promise<GitHubAccountChallenge> {
    return this.httpClient.challenge(this.providedSchema, challengeReq);
  }

  canIssue({ sessionId }: ZkcCanIssueReq): Promise<boolean> {
    return this.httpClient.canIssue(this.providedSchema, sessionId);
  }

  issue(issueReq: ZkcIssueReq): Promise<GitHubAccountZKC> {
    console.log("Start issuing");
    return this.httpClient.issue(this.providedSchema, issueReq);
  }
}