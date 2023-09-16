import { ZkcId, ZkcIdAlias } from "./credentials.js";

export type SignFn = (args: { message: string }) => Promise<string>

export type SubjectProof = {
  sbjId: Omit<ZkcId, "t"> & { t: ZkcIdAlias };
  signFn: SignFn;
  opt?: Record<string, any>
}