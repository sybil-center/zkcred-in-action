import { GithubAccountIssuer, GitHubAccountOptions, GitHubAccountZKC } from "./issuers/github-account";
import { HttpClient } from "./base/http-client";
import { SubjectProof } from "./types/proof";
import { ZkCredProved } from "./types/credentials";
import { util } from "./base/util";
import { Field, Poseidon, PublicKey, Signature } from "o1js";

export type ZkCredKinds = {
  "github-account": {
    kind: GitHubAccountZKC,
    issuer: GithubAccountIssuer,
    options: GitHubAccountOptions
  }
}

export type ZkcIssuers = {
  [K in keyof ZkCredKinds]: ZkCredKinds[K]["issuer"]
}


export class ZkSybil {
  readonly issuers: ZkcIssuers;
  private readonly httpClient: HttpClient;

  constructor(
    readonly issuerDomain?: URL
  ) {
    this.httpClient = new HttpClient(issuerDomain);
    this.issuers = {
      "github-account": new GithubAccountIssuer(this.httpClient)
    };
  }

  async credential<TName extends keyof ZkCredKinds>(
    name: TName,
    sbjProof: SubjectProof,
    opt?: ZkCredKinds[TName]["options"]
  ): Promise<ZkCredKinds[TName]["kind"]> {
    const issuer = this.issuer(name);
    return issuer.issueZkCred(sbjProof, opt);
  }

  issuer<TName extends keyof ZkcIssuers>(
    name: TName
  ): ZkcIssuers[TName] {
    const issuer = this.issuers[name];
    if (!issuer) throw new Error(`Issuer ${name} not available`);
    return issuer;
  }

  prepare<
    TOut extends any[] = any[]
  >(cred: ZkCredProved): TOut {
    const copy = JSON.parse(JSON.stringify(cred)) as ZkCredProved;
    console.log(copy);
    const proof = copy.proof[0];
    if (!proof) throw new Error(`ZK Credential does not contain Proofs`);
    // @ts-ignore
    copy.proof = undefined;
    return util.preparator.prepare<TOut>(copy, proof.transformSchema);
  }

  async verify(cred: ZkCredProved): Promise<boolean> {
    const prepared = this.prepare<Field[]>(cred);
    const hash = Poseidon.hash(prepared);
    const sign = Signature.fromBase58(cred.proof[0]!.sign);
    const result = sign.verify(PublicKey.fromBase58(cred.proof[0]!.key), [hash]);
    return result.toJSON();
  }
}