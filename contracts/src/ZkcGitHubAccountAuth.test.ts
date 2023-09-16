import { ZkcGitHubAccountAuth } from './ZkcGitHubAccountAuth.js';
import {
  AccountUpdate,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  Signature,
} from 'o1js';

const subjectKey = PrivateKey.fromBase58(
  'EKFaFAx6LmKZvb1LvUiT2m9JVwcnquq8UL8M5N8c1ETY8aKB9F7X'
);

const sbj_id_k = subjectKey.toPublicKey();

let proofsEnabled = false;

describe('ZkGitHubAccountAuth', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: ZkcGitHubAccountAuth,
    Local: ReturnType<typeof Mina.LocalBlockchain>;

  beforeAll(async () => {
    Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    Local.addAccount(sbj_id_k, '100000000000000');
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new ZkcGitHubAccountAuth(zkAppAddress);
    if (proofsEnabled) await ZkcGitHubAccountAuth.compile();
    // deploy
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  });

  it('Authenticate with out expiration date (exd = 0)', async () => {
    const isr_id_t = Field(0n);
    const isr_id_k = PublicKey.fromBase58(
      'B62qmNen3kDN74CJ2NQteNABrEN4AurGTbsLrraPy6ipQgUV9Q73tv2'
    );
    const sch = Field(1n);
    const isd = Field(1694356987608n);
    const exd = Field(0n);
    const sbj_id_t = Field(0n);
    const sbj_id_k = subjectKey.toPublicKey();
    const sbj_git_id = Field(1337n);

    const signature = Signature.fromBase58(
      '7mXHm7MNSCKyc2f7VAMs4NxaWnExcWLC3CZJtRhhDU8CckuNrAbrvmeEz4bbJKnPpAKfAEKhFJgunCv526LNRfeaRA9P7LgP'
    );

    const txn = await Mina.transaction({ sender: sbj_id_k }, () => {
      AccountUpdate.fundNewAccount(sbj_id_k);
      zkApp.auth(
        signature,
        isr_id_t,
        isr_id_k,
        sch,
        isd,
        exd,
        sbj_id_t,
        sbj_id_k,
        sbj_git_id
      );
    });
    await txn.prove();
    // await changeIssuerTx.prove();
    await txn.sign([subjectKey]).send();
    expect(Mina.getBalance(sbj_id_k, zkApp.token.id).value.toBigInt()).toEqual(
      1n
    );
  });

  it('Authenticate with expiration date', async () => {
    const isr_id_t = Field(0n);
    const isr_id_k = PublicKey.fromBase58(
      'B62qmNen3kDN74CJ2NQteNABrEN4AurGTbsLrraPy6ipQgUV9Q73tv2'
    );
    const sch = Field(1n);
    const isd = Field(1694419478658);
    const exd = Field(1704419478635);
    const sbj_id_t = Field(0n);
    const sbj_id_k = subjectKey.toPublicKey();
    const sbj_git_id = Field(1337);

    const sign = Signature.fromBase58(
      '7mX3Un5oBGwvY8eTi6njjwivee5y8gt7p4hQuChhfq1qKDw2BNEPrgzHrica4tz4hhB3gWgrmfDyaVmD9pbXADhr7fMiUmET'
    );

    const txn = await Mina.transaction({ sender: sbj_id_k }, () => {
      AccountUpdate.fundNewAccount(sbj_id_k);
      zkApp.auth(
        sign,
        isr_id_t,
        isr_id_k,
        sch,
        isd,
        exd,
        sbj_id_t,
        sbj_id_k,
        sbj_git_id
      );
    });
    await txn.prove();
    await txn.sign([subjectKey]).prove();

    expect(Mina.getBalance(sbj_id_k, zkApp.token.id).value.toBigInt()).toEqual(
      1n
    );
  });

  it('Change Zk App auth issuer key', async () => {
    const newIssuerKey = PrivateKey.random();
    const newIssuer = newIssuerKey.toPublicKey();
    const txn = await Mina.transaction({ sender: zkAppAddress }, () => {
      zkApp.setIssuer(newIssuer);
      zkApp.sign(zkAppPrivateKey);
    });
    await txn.prove();
    await txn.sign([zkAppPrivateKey]);
    console.log(txn.toPretty());
    console.log('send');
    await txn.send();
    expect(zkApp.issuer.get()).toEqual(newIssuer);
  });
});
