import { SignFn, SubjectProof } from "./proof.js";

export interface Provider {
  sign: SignFn;

  getAddress(): Promise<string>;

  proof(): Promise<SubjectProof>;
}