# zcred-core

ZCred protocol core library. Contains basic interfaces, types, and implementations. For more details see [ZCIPs](https://github.com/zcred-org/ZCIPs)

## Http Credential

The HTTP-based `zk-credential` MUST contain a property named `meta`, which is an object including the field `httpIssuerURL` representing the URL of the `issuer endpoint`.

Credential type:

```typescript
export type Attributes = {
  type: string;
  issuanceDate: string;
  validFrom: string;
  validUntil: string;
  subject: {
    id: Identifier
  }
}

export type HttpCredential<TAttr extends Attributes = Attributes> = {
 meta: {
    issuer: {
      type: MetaIssuerType;
      uri: string;
    }
  };
  attributes: TAttr,
  proofs: { [key: string]: Record<string, Proof> }
}
```

## Proofs

Library supports signature proofs and ACI (attributes content identifier) proofs

Signature proof type:

```typescript
export type SignatureProof = {
  /** Proof type */
  type: string;
  /** Issuer identifier according to ZCIP-2 */
  issuer: {
    id: Identifier;
  }
  /** Signature */
  signature: string;
  schema: {
    type: string[],
    issuer: {
      id: IdentifierSchema
    },
    signature: string[]
    attributes: AttributesSchema
  }
}
```

ACI (Attributes Content Identifier) proof type:

```typescript
export type ACIProof = {
  /** Proof type */
  type: string;
  /** ACI */
  aci: string;
  schema: {
    attributes: AttributesSchema;
    type: string[];
    aci: string[];
  }
}
```

## Http issuer

### Issuer URI

Each http issuer MUST have a unique URI, e.g. "[https://zcred.issuer/api/passport](https://zcred.issuer/api/passport)",

### Info method

The Info method MUST have the URL `<issuerURI>/info`, for instance, "[https://zcred.issuer/api/passport/info](https://zcred.issuer/api/passport/info)", and support the GET method. If the response status code is 200 (OK), the body MUST contain JSON according to the type.

```typescript
export type Info = {
  /** Credential type */
  credentialType: string;
  /** If true Issuer MUST provide update proofs method */
  updatableProofs: boolean;
  /** ISO date when new proof types was added to credential */
  proofsUpdated: string;
  /** Proofs information */
  proofsInfo: {
    /** Proof type */
    type: string;
    /** References to proof */
    references: string[]
  }[]
}
```

Example of implementation

```typescript
const resp = await fetch(new URL("./info", this.endpoint));
const body = await resp.json();
if (resp.ok) return body;
throw new Error(body);
```

### Challenge method

The Challenge method MUST have the URL `<issuerURI>/challenge`, for example, "[https://zcred.issuer/api/passport/challenge](https://zcred.issuer/api/passport/challenge)", and support the POST method. It should include HTTP headers such as `content-type: application/json` and `authorization: Bearer <accessToken>` (the authorization header is optional).

The request body MUST conform to the type `ChallengeReq`:

```typescript
export type ChallengeOptions = {
  /** Chain id according CAIP-2 */
  chainId?: string;
  /** Redirect URL after issuing or authorization */
  redirectURL?: string;
}

export type ChallengeReq = {
  subject: {
    /** Credential subject identifier */
    id: Identifier;
  }
  /** Date when credential becomes valid */
  validFrom?: string;
  /** Date when credential becomes not valid */
  validUntil?: string;
  options?: ChallengeOptions
}
```

Response body MUST conform to the type:

```typescript
export type Challenge = {
  /** Issuing session unique identifier */
  sessionId: string;
  /** Message for signing */
  message: string;
  /** Verification URL */
  verifyURL?: string;
}
```

### Can issue method

The Challenge method MUST have the URL `<issuerURI>/can-issue`, for example, "[https://zcred.issuer/api/passport/can-issue](https://zcred.issuer/api/passport/challenge)", and support the POST method. It should include HTTP headers such as `content-type: application/json` and `authorization: Bearer <accessToken>` (the authorization header is optional).

The request body MUST conform to the type `CanIssueReq`:

```typescript
export type CanIssueReq = {
  /** Issuing session unique identifier */
  sessionId: string;
}
```

Response body MUST conform to the type:

```typescript
export type CanIssue = {
  /** If true you can execute Issue Method */
  canIssue: boolean
}
```

### Issue method

Issue method MUST has URL `<issuerURI>/issue`, e.g. "[https://zcred.issuer/api/passport/issue](https://zcred.issuer/api/passport)", and supports POST method with http headers `content-type: application/json` & `authorization: Bearer <accessToken>` (authorization header is optional).

Request body MUST match type `IssueReq`:

```typescript
export type IssueReq = {
  /** Issuing session unique identifier */
  sessionId: string;
  /** Signature from Challenge message */
  signature: string;
}
```

Response body MUST be `zk-credential` according ZCIP-2

### Update proofs method

If `info method` result object `updatableProofs` value is `true` issuer MUST provides `update proofs method`, else `update proofs method` is optional.

Update method MUST has URL `<issuerURI>/update-proofs`, e.g. "[https://zcred.issuer/api/passport/update-proofs](https://zcred.issuer/api/passport)", and supports POST method with http headers `content-type: application/json` & `authorization: Bearer <accessToken>` (authorization header is optional).

Update proofs method does not update `zk-credential attributes` value, it only MUST add new proof types and references to `zk-credentialproofs` property.

Request body MUST be zk-credential.

Response body  MUST be zk-credential

### Interface

```typescript
/** Http issuer interface */
export interface IHttpIssuer {
  /** Issuer endpoint */
  uri: URL;
  /** Info method */
  getInfo(): Promise<Info>;
  /** Challenge method */
  getChallenge(challengeReq: ChallengeReq): Promise<Challenge>;
  /** Can issue method */
  canIssue(canIssueReq: CanIssueReq): Promise<CanIssue>;
  /** Issue method */
  issue<
    TCred extends HttpCredential = HttpCredential
  >(issueReq: IssueReq): Promise<TCred>;
  /** Update proofs method */
  updateProofs?<
    TCred extends HttpCredential = HttpCredential
  >(cred: TCred): Promise<TCred>;
  /** Change subject id method */
  browserIssue?<
    TCred extends HttpCredential = HttpCredential
  >(args: BrowserIssueParams): Promise<TCred>;
}
```

### Implementation

```typescript
import {
  BrowserIssueParams,
  CanIssue,
  CanIssueReq,
  Challenge,
  ChallengeReq,
  IHttpIssuer,
  Info,
  IssueReq,
} from "./types/issuer.js";
import { HttpCredential } from "./types/index.js";
import { repeatUtil } from "./utils/repeat.js";

export class HttpIssuer implements IHttpIssuer {
  readonly uri: URL;

  constructor(
    issuerURI: string,
    private readonly accessToken?: string
  ) {
    this.uri = new URL(issuerURI);
    const paths = this.uri.pathname;
    const type = paths[paths.length - 1];
    if (!type) {
      throw new Error(`Http issuer initialization error: issuer endpoint pathname is undefined, endpoint: ${issuerURI}`);
    }
  }

  static init(endpoint: string, accessToken?: string): IHttpIssuer {
    return new HttpIssuer(endpoint, accessToken);
  }

  async getInfo(): Promise<Info> {
    const resp = await fetch(new URL("./info", this.uri));
    const body = await resp.json();
    if (resp.ok) return body;
    throw new Error(body);
  }

  async getChallenge(challengeReq: ChallengeReq): Promise<Challenge> {
    const resp = await fetch(new URL("./challenge", this.uri), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(challengeReq)
    });
    const body = await resp.json();
    if (resp.ok) return body;
    throw new Error(body);
  }

  async canIssue(canIssueReq: CanIssueReq): Promise<CanIssue> {
    const resp = await fetch(new URL("./can-issue", this.uri), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(canIssueReq)
    });
    const body = await resp.json();
    if (resp.ok) return body;
    throw new Error(body);
  }

  async issue<
    TCred extends HttpCredential = HttpCredential
  >(issueReq: IssueReq): Promise<TCred> {
    const resp = await fetch(new URL("./issue", this.uri), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(issueReq)
    });
    const body = await resp.json();
    if (resp.ok) return body;
    throw new Error(body);
  }

  async updateProofs?<
    TCred extends HttpCredential = HttpCredential
  >(cred: TCred): Promise<TCred> {
    const resp = await fetch(new URL("./update-proofs", this.uri), {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(cred)
    });
    const body = await resp.json();
    if (resp.ok) return body;
    throw new Error(body);
  }

  async browserIssue?<
    TCred extends HttpCredential = HttpCredential
  >({
    challengeReq,
    sign,
    windowOptions,
  }: BrowserIssueParams): Promise<TCred> {
    const challenge = await this.getChallenge(challengeReq);
    if (challenge.verifyURL) {
      const popup = window.open(
        challenge.verifyURL,
        windowOptions?.target,
        windowOptions?.feature
      );
      if (!popup) {
        throw new Error(`Can not open popup window to issue credential, popup URL: ${challenge.verifyURL}`);
      }
      const result = repeatUtil<boolean>(
        (r) => (r instanceof Error) ? true : r,
        1000,
        async () => {
          return (await this.canIssue({ sessionId: challenge.sessionId })).canIssue;
        }
      );
      if (result instanceof Error) throw result;
    }
    const signature = await sign({ message: challenge.message });
    return this.issue({
      sessionId: challenge.sessionId,
      signature: signature
    });
  }


  private get headers(): HeadersInit {
    if (this.accessToken) return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.accessToken}`
    };
    return { "Content-Type": "application/json" };
  }
}
```

## Wallet adapter

The wallet adapter facilitates adaptability between cryptocurrency wallets and the necessary zcred properties required for the issuing process.

### Interface

```typescript
export type SignFn = (args: { message: string }) => Promise<string>;

export interface IWalletAdapter {
  /** ZCIP-2 Identifier */
  getSubjectId(): Promise<{type: string; type: string}>;

  /** Blockchain address*/
  getAddress(): Promise<string>;

  /** CAIP-2 chain identifier */
  getChainId(): Promise<string>;

  /** Sign function */
  sign: SignFn;
}
```

### Implementation

Auro wallet implementation example:

```typescript
export class AuraWalletAdapter implements IWalletAdapter {
  constructor(private readonly provider: IAuroWallet) {
    this.getAddress = this.getAddress.bind(this);
    this.getSubjectId = this.getSubjectId.bind(this);
    this.getChainId = this.getChainId.bind(this);
    this.sign = this.sign.bind(this);
  }

  async getAddress(): Promise<string> {
    const result = (await this.provider.requestAccounts());
    const address = result[0];
    if (address) return address;
    throw new Error(`Mina address is not found`);
  }

  async getSubjectId(): Promise<Identifier> {
    const idType: IdType = "mina:publickey";
    return {
      type: idType,
      key: await this.getAddress()
    };
  }

  async getChainId(): Promise<MinaChainId> {
    const { chainId: chainName } = await this.provider.requestNetwork();
    if (isChainIdName(chainName)) {
      return `mina:${chainName}`;
    }
    await this.switchToMain();
    return "mina:mainnet";
  }

  private async switchToMain(): Promise<ChainName> {
    await this.provider.switchChain({ chainId: "mainnet" });
    return "mainnet";
  }

  async sign(args: { message: string }) {
    const {
      signature: {
        field,
        scalar
      }
    } = await this.provider.signMessage(args);
    return Signature.fromObject({
      r: Field.fromJSON(field),
      s: Scalar.fromJSON(scalar)
    }).toBase58();
  };
}
```

## Credential Verifier

Verify zk-credentials proofs

### Interface

```typescript
export interface ICredentialVerifier {
  /** proof type which verifier provides */
  proofType: string;

  /**
   * Verify zk-credential
   * @param cred zk-credential
   * @param reference proof reference string
   */
  verify<
    TCred extends ZkCredential = ZkCredential
  >(cred: TCred, reference?: string): Promise<boolean>;
}
```
