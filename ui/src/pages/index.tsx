import { useEffect, useState } from "react";
import "./reactCOIServiceWorker";
import { ZkappAuthWorkerClient } from "@/util/github-auth.worker.client";
import { PublicKey } from "o1js";
import GradientBG from "../components/GradientBG.js";
import styles from "../styles/Home.module.css";
import Head from "next/head";
import { GitHubAccountZKC, IAuroWallet, MinaProvider, ZkSybil } from "@/external/sybil-center";
import { timeout } from "@/util/index";
import { CredModal } from "@/components/CredModal";

type ZkappState = {
  zkappAuthWorker: ZkappAuthWorkerClient | null;
  userAccountExists: boolean;
  txnProcessing: boolean;
  txnLink: string
  error: string;
  authenticated: boolean;
}

const zkappInitState: ZkappState = {
  zkappAuthWorker: null,
  userAccountExists: false,
  txnProcessing: false,
  txnLink: "",
  error: "",
  authenticated: false
};

type WalletState = {
  address: PublicKey | null;
  wallet: IAuroWallet | null;
  provider: MinaProvider | null;
}

const walletInitState: WalletState = {
  address: null,
  wallet: null,
  provider: null
};

type CredState = {
  zkCred: GitHubAccountZKC | null;
  error: string;
  loading: boolean;
  verified: boolean | null
}

const credInitState: CredState = {
  zkCred: null,
  error: "",
  loading: false,
  verified: null
};

function prettyKey(key58: string): string {
  const chars = key58.split("");
  const prefix: string[] = [];
  for (let i = 0; i < 5; i++) {
    prefix.push(chars[i]);
  }
  const postfix: string[] = [];
  for (let i = chars.length - 1; i > chars.length - 6; i--) {
    postfix.push(chars[i]);
  }
  return `${prefix.join("")}...${postfix.join("")}`;
}

const ZkappAddress = PublicKey.fromBase58("B62qr58CukfE5vWc6aW5G7qSMRKkW7tHkHA7E85KV9sNqTbNUk41JFu");

const sybil = new ZkSybil(new URL(`https://api.dev.sybil.center`));

export default function Home() {

  const [zkappState, setZkappState] = useState(zkappInitState);
  const [walletState, setWalletState] = useState(walletInitState);
  const [credState, setCredState] = useState(credInitState);
  const [setup, setSetup] = useState(false);
  const [credModal, setCredModal] = useState(false);

  useEffect(() => {
    (async () => {
      if (!setup) {
        const minaWallet = (window as any).mina as IAuroWallet | null;
        setWalletState((prev) => ({
          ...prev,
          wallet: minaWallet,
          provider: minaWallet ? new MinaProvider(minaWallet) : null
        }));

        console.log(`Loading web worker`);
        const zkappAuthWorker = new ZkappAuthWorkerClient();
        await timeout(8 * 1000);
        console.log(`Done loading web worker`);

        console.log(`Set berkeley network`);
        await zkappAuthWorker.setBerkeleyActive();
        console.log(`Load contract`);
        await zkappAuthWorker.loadContract();
        console.log(`Compile contract`);
        await zkappAuthWorker.compileContract();
        console.log(`Fetch contract account`);
        await zkappAuthWorker.fetchAccount({ publicKey: ZkappAddress });
        console.log(`Init contract`);
        await zkappAuthWorker.initZkapp(ZkappAddress);
        console.log("Init contract finished");
        setZkappState((prev) => ({ ...prev, zkappAuthWorker }));
        setSetup(true);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (setup && !zkappState.userAccountExists && walletState.address) {
        for (; ;) {
          const resp = await zkappState.zkappAuthWorker!.fetchAccount({
            publicKey: walletState.address
          });
          console.log(resp);
          const accountExists = resp.error == null;
          console.log(`check exists`);
          if (accountExists) {
            setZkappState((prev) => ({
              ...prev,
              userAccountExists: true
            }));
            break;
          }
          await timeout(2000);
        }
      }
    })();
  }, [setup, walletState.address]);

  useEffect(() => {
    (async () => {
      if (zkappState.userAccountExists) {
        for (; ;) {
          const isAuth = await zkappState.zkappAuthWorker!.isAuth(walletState.address!);
          setZkappState((prev) => ({
            ...prev,
            authenticated: isAuth
          }));
          if (isAuth) break;
          await timeout(5 * 1000);
        }
      }
    })();
  }, [zkappState.userAccountExists]);

  async function onWalletConnect() {
    const address58 = await walletState.provider!.getAddress();
    const userAddress = PublicKey.fromBase58(address58);
    setWalletState((prev) => ({
      ...prev,
      address: userAddress
    }));
  }

  async function onGetCredential() {
    if (credState.loading) return;
    setCredState((prev) => ({ ...prev, loading: true }));
    try {
      const zkCred = await sybil.credential("github-account", await walletState.provider!.proof());
      const verified = await sybil.verify(zkCred);
      setCredState((prev) => ({ ...prev, zkCred, verified }));
    } catch (e) {
      console.log(e);
      setCredState((prev) => ({
        ...prev,
        error: `Get credential error`
      }));
      setTimeout(() => {
        setCredState((prev) => ({ ...prev, error: "" }));
      }, 2000);
    } finally {
      setCredState((prev) => ({ ...prev, loading: false }));
    }
  }

  function onShowCredential() {
    setCredModal(true);
  }

  async function onZkappAuth() {
    if (!zkappState.userAccountExists) return;
    setZkappState((prev) => ({ ...prev, txnProcessing: true }));
    try {
      await zkappState.zkappAuthWorker!.fetchAccount({
        publicKey: walletState.address!
      });
      await zkappState.zkappAuthWorker!.createAuthTxn({
        zkCred: credState.zkCred!
      });
      await zkappState.zkappAuthWorker!.proofTxn();
      const txnJson = await zkappState.zkappAuthWorker!.getTxnJson();
      const { hash } = await walletState.wallet!.sendTransaction({
        transaction: txnJson,
      });
      const txnLink = `https://berkeley.minaexplorer.com/transaction/${hash}`;
      console.log(`transaction link: ${txnLink}`);
      setZkappState((prev) => ({ ...prev, txnLink }));
    } catch (e) {
      console.log(e);
      setZkappState((prev) => ({
        ...prev,
        error: `Mina transaction error`
      }));
      setTimeout(() => {
        setZkappState((prev) => ({ ...prev, error: "" }));
      }, 2000);
    } finally {
      setZkappState((prev) => ({ ...prev, txnProcessing: false }));
    }
  }

  const walletComponent = () => {
    if (!walletState.wallet) {
      return (
        <a href={"https://www.aurowallet.com/"} target="_blank" rel="noreferrer">
          <div>
            Install Auro Wallet
          </div>
        </a>
      );
    } else if (walletState.wallet && !walletState.address) {
      return (
        <button className={styles.card} onClick={onWalletConnect}>
          Connect your wallet
        </button>
      );
    } else {
      return (
        <div className={styles.card}>
          Connected: {prettyKey(walletState.address!.toBase58())}
        </div>
      );
    }
  };

  const credentialComponent = () => {
    if (credState.loading) {
      return (
        <div>
          Loading ...
        </div>
      );
    }
    if (walletState.address && !credState.zkCred) {
      return (
        <button className={styles.card} onClick={onGetCredential}>
          Get Github ZK credential
        </button>
      );
    }
    if (credState.zkCred) {
      return (
        <button className={styles.card} onClick={onShowCredential}>
          Show Github ZK credential
        </button>
      );
    }
    return (<div onClick={onWalletConnect}>
      connect to the wallet first
    </div>);
  };

  const zkappComponent = () => {
    if (setup) {
      if (zkappState.authenticated) {
        return (
          <div className={styles.card}>
            You proved Github account
          </div>
        );
      }
      if (zkappState.txnLink) {
        return (
          <a href={zkappState.txnLink} target="_blank" rel="noreferrer">
            <div className={styles.card}>
              See transaction result
            </div>
          </a>
        );
      }
      if (walletState.address && !zkappState.userAccountExists) {
        return (
          <a href={"https://faucet.minaprotocol.com/"} target="_blank" rel="noreferrer">
            <div className={styles.card}>
              Get tMINA
            </div>
          </a>
        );
      }
      if (zkappState.txnProcessing) {
        return (
          <div>
            Processing transaction ...
          </div>
        );
      }
      if (walletState.address && !credState.zkCred) {
        return (
          <div>
            Get credential first
          </div>
        );
      }
      if (walletState.address && credState.zkCred) {
        return (
          <button className={styles.card} onClick={onZkappAuth}>
            Prove your Github ZKC in ZK app
          </button>
        );
      }
      return (<></>);
    }
    return (
      <div>
        ZK app compiling, Wait ...
      </div>
    );
  };


  return (
    <>
      <Head>
        <title>ZKC in Action</title>
        <meta name="description" content="authenticate in ZKApp"/>
      </Head>
      <GradientBG>
        <main className={styles.main}>
          <CredModal credential={credState.zkCred}
                     isOpen={credModal}
                     setIsOpen={setCredModal}/>
          <div>
            Prove GitHub ownership using Zero-Knowledge credential
          </div>
          <div className={styles.center}>
            {walletComponent()}
            {credentialComponent()}
          </div>
          {zkappComponent()}

          <a href={"https://www.craft.me/s/fP61xnwdZ9GZmg"} target="_blank" rel="noreferrer">
            <button className={styles.card}>
              What is ZK credentials ?
            </button>
          </a>
        </main>
      </GradientBG>

    </>
  );
}
