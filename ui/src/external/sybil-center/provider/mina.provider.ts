import { Provider } from "../types/provider.js";
import { SubjectProof } from "../types/proof.js";
import { Field, Scalar, Signature } from "o1js";

interface SignMessageArgs {
  message: string;
}

interface SignedData {
  publicKey: string,
  data: string,
  signature: {
    field: string,
    scalar: string
  }
}

interface VerifyMessageArgs {
  publicKey: string,
  payload: string,
  signature: {
    field: string,
    scalar: string
  }
}

type SendTransactionArgs = {
  transaction: any,
  feePayer?: {
    fee?: number,
    memo?: string
  };
}

export interface IAuroWallet {
  requestAccounts(): Promise<string[]>;
  requestNetwork(): Promise<"Mainnet" | "Devnet" | "Berkeley" | "Unknown">;
  getAccounts(): Promise<string[]>;
  signMessage(args: SignMessageArgs): Promise<SignedData>;
  verifyMessage(args: VerifyMessageArgs): Promise<boolean>;
  sendTransaction(args: SendTransactionArgs): Promise<{ hash: string }>;
}

const supportedNetwork = ["mainnet", "testnet"] as const;
const networkMatch: Record<
  "Mainnet" | "Devnet" | "Berkeley" | "Unknown",
  typeof supportedNetwork[number] | null
> = {
  Mainnet: "mainnet",
  Berkeley: "testnet",
  Devnet: null,
  Unknown: null
};

export class MinaProvider implements Provider {

  constructor(private readonly provider: IAuroWallet) {
    this.sign = this.sign.bind(this);
    this.getNetwork = this.getNetwork.bind(this);
    this.getAddress = this.getAddress.bind(this);
  }

  async getNetwork(): Promise<typeof supportedNetwork[number]> {
    const network = await this.provider.requestNetwork();
    const result = networkMatch[network];
    if (result) return result;
    throw new Error(`${network} is not supported by sybil-center`);
  }

  async sign(args: { message: string }): Promise<string> {
    const {
      signature: { field, scalar }
    } = await this.provider.signMessage(args);
    const sign = Signature.fromObject({
      r: Field.fromJSON(field),
      s: Scalar.fromJSON(scalar)
    });
    return sign.toBase58();
  }

  async getAddress(): Promise<string> {
    const address = (await this.provider.requestAccounts())[0];
    if (address) return address;
    throw new Error(`Enable Mina wallet`);
  }

  async proof(): Promise<SubjectProof> {
    return {
      sbjId: {
        k: await this.getAddress(),
        t: "mina"
      },
      signFn: this.sign,
      opt: {
        network: await this.getNetwork()
      }
    };
  }
}