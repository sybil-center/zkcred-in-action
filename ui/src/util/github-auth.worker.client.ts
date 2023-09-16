import { fetchAccount, PublicKey } from "o1js";
import { GitHubAccountZKC } from "@/external/sybil-center/index.js";
import { WorkerFunctions, ZkappWorkerReponse, ZkappWorkerRequest } from "@/util/github-auth.worker.js";

export class ZkappAuthWorkerClient {

  setBerkeleyActive() {
    return this._call("setBerkeleyActive", {});
  }

  loadContract() {
    return this._call("loadContract", {});
  }

  async compileContract() {
    return await this._call("compileContract", {});
  }

  fetchAccount({ publicKey }: { publicKey: PublicKey }): ReturnType<typeof fetchAccount> {
    const result = this._call("fetchAccount", {
      publicKey58: publicKey.toBase58(),
    });
    return result as ReturnType<typeof fetchAccount>;
  }

  initZkapp(publicKey: PublicKey) {
    return this._call("initZkapp", {
      publicKey58: publicKey.toBase58(),
    });
  }

  async createAuthTxn({ zkCred }: { zkCred: GitHubAccountZKC }) {
    const result = await this._call("createAuthTxn", {
      zkCred: JSON.stringify(zkCred)
    });
  }

  proofTxn() {
    return this._call("proofTxn", {});
  }

  async getTxnJson(): Promise<string> {
    const result = await this._call("getTxnJson", {});
    return result as string;
  }

  async isAuth(publicKey: PublicKey): Promise<boolean> {
    const result = await this._call("isAuth", {
      publicKey58: publicKey.toBase58()
    });
    return result as boolean;
  }

  // ---------------------------------------------------------------------------------------

  worker: Worker;

  promises: {
    [id: number]: { resolve: (res: any) => void; reject: (err: any) => void };
  };

  nextId: number;

  constructor() {
    this.worker = new Worker(new URL("./github-auth.worker.ts", import.meta.url));
    this.promises = {};
    this.nextId = 0;

    this.worker.onmessage = (event: MessageEvent<ZkappWorkerReponse>) => {
      this.promises[event.data.id].resolve(event.data.data);
      delete this.promises[event.data.id];
    };
  }

  _call(fn: WorkerFunctions, args: any) {
    return new Promise((resolve, reject) => {
      this.promises[this.nextId] = { resolve, reject };

      const message: ZkappWorkerRequest = {
        id: this.nextId,
        fn,
        args,
      };

      this.worker.postMessage(message);

      this.nextId++;
    });
  }
}