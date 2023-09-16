import type { ZkcGitHubAccountAuth } from "../../../contracts/src/ZkcGitHubAccountAuth.js";
import { AccountUpdate, fetchAccount, Field, Mina, PublicKey, Signature } from "o1js";
import * as zkc from "@/external/sybil-center";

type State = {
  ZkcGitHubAccountAuth: typeof ZkcGitHubAccountAuth | null;
  authZkApp: ZkcGitHubAccountAuth | null;
  txn: Awaited<ReturnType<typeof Mina.transaction>> | null;
}

const state: State = {
  ZkcGitHubAccountAuth: null,
  authZkApp: null,
  txn: null
};

type Prepared = [Field, PublicKey, Field, Field, Field, Field, PublicKey, Field];

const functions = {
  setBerkeleyActive: async ({}) => {
    const Berkeley = Mina.Network("https://proxy.berkeley.minaexplorer.com/graphql");
    Mina.setActiveInstance(Berkeley);
    console.log(`Worker: Berkeley network active now`);
  },

  loadContract: async ({}) => {
    console.log("Worker: load smart contract");
    const { ZkcGitHubAccountAuth } = await import("../../../contracts/build/src/ZkcGitHubAccountAuth.js");
    state.ZkcGitHubAccountAuth = ZkcGitHubAccountAuth;
    console.log("Worker: smart contract loaded");
  },

  compileContract: async ({}) => {
    const contract = state.ZkcGitHubAccountAuth;
    if (!contract) throw new Error(`First load smart contract`);
    console.log("Worker: start compiling smart contract");
    await contract.compile();
    console.log("Worker: compiled smart contract");
  },

  fetchAccount: async ({ publicKey58 }: { publicKey58: string }) => {
    console.log(`Worker: fetch account ${publicKey58}`);
    const publicKey = PublicKey.fromBase58(publicKey58);
    return await fetchAccount({ publicKey });
  },

  initZkapp: async ({ publicKey58 }: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(publicKey58);
    const contract = state.ZkcGitHubAccountAuth;
    if (!contract) throw new Error(`load and compile contract first`);
    console.log(`Worker: initialize smart contract`);
    state.authZkApp = new contract(publicKey);
    console.log(`Worker: smart contract initialized`);
  },

  createAuthTxn: async ({ zkCred, }: { zkCred: string; }) => {
    const copy: zkc.GitHubAccountZKC = JSON.parse(zkCred);
    const proof = copy.proof[0];
    if (!proof) throw new Error(`ZKC Github account does not have proof`);
    // @ts-ignore
    copy.proof = undefined;
    const trSchema = proof.transformSchema;
    trSchema.sbj.id.k.pop();
    trSchema.isr.id.k.pop();
    const input = zkc.util.preparator.prepare<Prepared>(copy, proof.transformSchema);
    const authZkApp = state.authZkApp;
    if (!authZkApp) throw new Error(`init contract first`);
    const sign = Signature.fromBase58(proof.sign);
    console.log("Worker: create transaction");
    try {
      state.txn = await Mina.transaction({
        sender: PublicKey.fromBase58(copy.sbj.id.k)
      }, () => {
        AccountUpdate.fundNewAccount(PublicKey.fromBase58(copy.sbj.id.k));
        authZkApp.auth(sign, ...input);
      });
      console.log("Worker: transaction created");
    } catch (e) {
      console.log(e);
    }
  },

  proofTxn: async ({}) => {
    const txn = state.txn;
    if (!txn) throw new Error(`Create transaction first`);
    console.log("Worker: create transaction proof");
    await txn.prove();
    console.log("Worker: transaction proof created");
  },

  getTxnJson: async ({}) => {
    const txn = state.txn;
    if (txn) return txn.toJSON();
    throw new Error(`Create transaction first`);
  },

  isAuth: async ({ publicKey58 }: { publicKey58: string }): Promise<boolean> => {
    const authZkApp = state.authZkApp;
    if (!authZkApp) throw new Error(`Init auth zkapp first`);
    let isAuth = false;
    try {
      const publicKey = PublicKey.fromBase58(publicKey58);
      console.log(`Worker: get zkapp github auth token for ${publicKey58}`);
      await fetchAccount({ publicKey, tokenId: authZkApp.token.id });
      const tokens = Mina.getBalance(publicKey, authZkApp.token.id).value.toBigInt();
      console.log(`Worker: ${publicKey58} has ${tokens} ${authZkApp.account.tokenSymbol}`);
      if (tokens > 0) isAuth = true;
    } catch (ignore) {
      console.log(`Worker: ${publicKey58} has not tokens`);
    }
    return isAuth;
  }

};

export type WorkerFunctions = keyof typeof functions;

export type ZkappWorkerRequest = {
  id: number;
  fn: WorkerFunctions;
  args: any;
};

export type ZkappWorkerReponse = {
  id: number;
  data: any;
};

if (typeof window !== "undefined") {
  addEventListener(
    "message",
    async (event: MessageEvent<ZkappWorkerRequest>) => {
      const returnData = await functions[event.data.fn](event.data.args);

      const message: ZkappWorkerReponse = {
        id: event.data.id,
        data: returnData,
      };
      postMessage(message);
    }
  );
}

console.log("Web Worker Successfully Initialized.");
