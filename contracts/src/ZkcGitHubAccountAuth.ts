import {
  Field,
  method,
  Permissions,
  Poseidon,
  PublicKey,
  Signature,
  SmartContract,
  State,
  state,
  UInt64,
} from 'o1js';

export const tokenSymbol = 'GHA';

export class ZkcGitHubAccountAuth extends SmartContract {
  @state(PublicKey) issuer = State<PublicKey>();

  init() {
    super.init();
    this.issuer.set(
      PublicKey.fromBase58(
        'B62qmNen3kDN74CJ2NQteNABrEN4AurGTbsLrraPy6ipQgUV9Q73tv2'
      )
    );
    this.account.permissions.set({
      ...Permissions.default(),
      send: Permissions.proof(),
      editState: Permissions.signature(),
    });
    this.account.tokenSymbol.set(tokenSymbol);
  }

  @method auth(
    sign: Signature,
    isr_id_t: Field,
    isr_id_k: PublicKey,
    sch: Field,
    isd: Field,
    exd: Field,
    sbj_id_t: Field,
    sbj_id_k: PublicKey,
    sbj_git_id: Field
  ) {
    this.issuer.assertEquals(isr_id_k);
    sch.assertEquals(Field(1));
    sbj_id_k.assertEquals(this.sender);
    sbj_git_id.assertGreaterThan(Field(0));
    const hash = Poseidon.hash([
      isr_id_t,
      ...isr_id_k.toFields(),
      sch,
      isd,
      exd,
      sbj_id_t,
      ...sbj_id_k.toFields(),
      sbj_git_id,
    ]);
    sign.verify(isr_id_k, [hash]).assertTrue();
    this.token.mint({
      address: this.sender,
      amount: UInt64.from(1),
    });
  }

  @method setIssuer(newIssuer: PublicKey) {
    const oldIssuer = this.issuer.get();
    this.issuer.assertEquals(oldIssuer);
    this.issuer.set(newIssuer);
  }
}
