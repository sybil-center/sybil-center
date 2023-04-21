# SybilCenter SDK

In one line you can issue a Verifiable Credential proving that your user owns a social media account.
Supported are Twitter, Discord, and GitHub.

```typescript
import { Sybil, EthRequestSigner, type IEIP1193Provider } from "@sybil-center/sdk";

const sybil = new Sybil()

const injected = "ethereum" in window && (window.ethereum as IEIP1193Provider);
if (!injected) throw new Error(`No window.ethereum available`);
const signer = new EthRequestSigner(injected);

const credential = await sybil.credential('twitter-account', signer.sign) // This returns a Verifiable Credential
```

## Install

```shell
npm install @sybil-center/sdk # Feel free to use pnpm or yarn
```

## Supported credentials

Supported designators for `sybil.credential` call:

- `twitter-account`, available fields:
  - `id: string` - permanent unique Twitter account identifier
  - `username: string` - current Twitter account username
- `github-account`, available fields:
  - `id: number` - permanent unique GitHub account identifier
  - `username: string` - current GitHub account username aka `login`
- `discord-account`, available fields:
  - `id: string` - permanent unique Discord account identifier
  - `username: string` - the user's username, not unique across the Discord platform
  - `discriminator: string` - the user's 4-digit discord-tag

If you call `sybil.credential` method with any of the credential designators, type of a resulting credential is provided for you by TypeScript. To get, for example, Twitter username from `credential` as in excerpt above, you would use `credential.credentialSubject.twitter.username`.

---

## Custom property

You can put `custom` property to Verifiable Credential. 
Property will be placed in `credentialSubject` field of issued credential. It can be the `object` you want.

#### Example:
```typescript
const sybil = new Sybil();

const credential = await sybil
  .credential("discord-account", signer.sign, {
    custom: { hello: "sybil" } // put here what ever object you want
  });

credential = {
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  credentialSubject: {
    custom: { hello: "sybil" }, // custom object you put
    discord: { 
      discriminator: "1111", 
      id: "111111111111111111", 
      username: "Sybil User" 
    },
    id: "did:pkh:eip155:1:0xb9Baa2979F62c806Ca3fE8f6932E82Bb416112aA"
  },
  issuanceDate: "2023-03-14T12:30:44.883Z",
  issuer: {
    id: "did:key:z6Mkeq4TyTdAND6JTMKuCVWtiPi7V4vnLK8LnWSqEQrQz2Gr" 
  },
  type: ["VerifiableCredential", "DiscordAccount"],
  proof: {
    type: "JsonWebSignature2020",
    created: "2023-03-14T12:30:44.887Z",
    proofPurpose: "assertionMethod",
    verificationMethod: "did:key:z6Mkeq4TyTdAND6JTMKuCVWtiPi7V4vnLK8LnWSqEQrQz2Gr#z6Mkeq4TyTdAND6JTMKuCVWtiPi7V4vnLK8LnWSqEQrQz2Gr",
    jws: "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDprZXk6ejZNa2VxNFR5VGRBTkQ2SlRNS3VDVld0aVBpN1Y0dm5MSzhMbldTcUVRclF6MkdyI3o2TWtlcTRUeVRkQU5ENkpUTUt1Q1ZXdGlQaTdWNHZuTEs4TG5XU3FFUXJRejJHciJ9..Oyyo53msJrdV_j8LJeuyUCC81X4s9fr_Ly1g6AQtueQoViXtD0iTMXoGn4SxyoKoLFwZQCEOMcoo_McNjM68AQ"
  }
}
```

---

## Issuing and authorization

During issuing some credentials user have to authorize in other services. 
You have opportunity to set `authorize window` property and `redirect url` 
where user will be redirected after authorization. 
By default `authorized window` open in the middle of the user screen as `popul`
and after authorization user will be redirected to default page that will be closed
automatically after redirection.


#### Example:

```typescript
const sybil = new Sybil();

const credential = await sybil
  .credential("discord-account", signer.sign, {
    redirectUrl: "https://exaple.com",
    windowFeature: `
        popup,
        width=700,
        height=700,
        left=300,
        top=100,
        status=no,
        location=no`,
  });
```

List of the credential types which use authorization process:
- `twitter-account`
- `discord-account`
- `github-account`

---

## Signer and sign function

Sign function is used for sign message by wallet or private key and return `SignResult`.
`Signer` is interface that can invoke `sign function`

Sign function have to satisfy a type bellow

```typescript
import { ChainAlias } from "@sybil-center/sdk"; 

// sing funtion type
type SignFn = (args: { message: string }) => Promise<SignResult>;

type SignResult = {
  signature: string;  // as base64 string
  address: string;    // chain address in human-readable format
  chain?: ChainAlias; //  Bblockchain id according to
                      //   https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md
                      //  it also can be used with "did:pkh:" prefix
}
```

### What in `SignResult` type?

- signature - `Uint8Array` encoded to `base64` string;
- address - address of account in blockchain in human-readable format. For `ethereum` - `0x<hex-number>`, for `solana` - `<base58-string>`;
- chain - is `cahin_id` according to [specification](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-2.md) or `did:pkh<chain_id>`. It also can be simple `network name` e.g. ethereum, solana.

`ChainAlias` represent supported chain aliases for sing message

```typescript
type ChainAlias =
  | "bitcoin"
  | "bip122:000000000019d6689c085ae165831e93"
  | "did:pkh:bip122:000000000019d6689c085ae165831e93"
  | "celo"
  | "eip155:42220"
  | "did:pkh:eip155:42220"
  | "ethereum"
  | "eip155:1"
  | "did:pkh:eip155:1"
  | "polygon"
  | "eip155:137"
  | "did:pkh:eip155:137"
  | "solana"
  | "solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ"
  | "did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ";
```
### Sign function and Signer implementation

If you want to implement your own sing function examples below should be helpful.

#### Example with `React` and `wagmi` hooks:

```typescript
import { useAccount, useNetwork, useSignMessage } from "wagmi";
import { ChainAlias, SignResult } from "@sybil-center/sdk";
import * as uint8array from "uint8arrays";

function useSign() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { chain } = useNetwork();

  // sign function implementaiton
  const signMessage = async (args: { message: string }): Promise<SignResult> => {
    const message = args.message
    const sign = await signMessageAsync({ message: message });
    const signature = uint8array.toString(
      uint8array.fromString(sign.substring(2), "hex"),
      "base64"
    );
    return {
      signature: signature,
      subjectId: address!,
      chain: `did:pkh:eip155:${chain?.id!}` as ChainAlias
    }
  }
  return { signMessage }
}
```

#### Example with JS:

```typescript
import * as uint8arrays from "uint8arrays";

class EthRequestSigner implements ISigner {
  constructor(private readonly provider: IEIP1193Provider) {
    this.sign = this.sign.bind(this);
  }

  // sign function implementaiton
  async sign(args: { message: string }): Promise<SignResult> {
    const message = args.message;
    const address = await this.getAccount();
    const hex = uint8arrays.toString(uint8arrays.fromString(message), "hex");
    const signature = await this.#signMessage(address, hex);
    const chainId = await this.getChainId();
    return {
      subjectId: address,
      signature: signature,
      chain: `did:pkh:eip155:${chainId}` as ChainAlias
    };
  }

  async getAccount(): Promise<string> {
    const accounts = (await this.provider.request<string[]>({
      method: "eth_accounts"
    }));
    const account = accounts[0];
    if (!account) {
      throw new Error(`Enable Ethereum provider`);
    }
    return account;
  }

  async getChainId(): Promise<number> {
    return Number(
      await this.provider.request<string>({
        method: "net_version"
      })
    );
  }

  async #signMessage(address: string, hexMessage: string): Promise<string> {
    try {
      return this.#normalizeSignature(
        await this.provider.request<`0x${string}`>({
          method: "eth_sign",
          params: [address, hexMessage]
        })
      );
    } catch (err) {
      const reason = err as Error;
      if ("code" in reason && (reason.code === -32602 || reason.code === -32601)) {
        return this.#normalizeSignature(
          await this.provider.request<`0x${string}`>({
            method: "personal_sign",
            params: [address, hexMessage]
          })
        );
      }
      throw reason;
    }
  }

  #normalizeSignature(signature: string): string {
    return uint8arrays.toString(
      uint8arrays.fromString(signature.substring(2), "hex"),
      "base64"
    );
  }
}
```

---

# Demo App

The repository also contains demo React/Next.js application, showing how to use the SDK in your application.

Please, consult [demo-app README](./demo-app/README.md) about how to run a demo locally, and where to look for an example of code in React.
