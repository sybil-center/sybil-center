# SybilCenter SDK

In one line you can issue a [`Verifiable Credential`](https://www.w3.org/TR/vc-data-model/)
proving that your user owns a social media or blockchain account.
Supported are Twitter, Discord, GitHub and Ethereum.

```typescript
import { EthProofProvider, type IEIP1193Provider, Sybil } from "@sybil-center/sdk";

const sybil = new Sybil({ apiKey: "APIkey from https://app.sybil.center/devportal" });

const injected = "ethereum" in window && (window.ethereum as IEIP1193Provider);
if (!injected) throw new Error(`No window.ethereum available`);
const proofProvider = new EthProofProvider(injected);

const credential = await sybil.credential("twitter-account", await proofProvider.proof()); // This returns a Verifiable
                                                                                          // Credential
```

## Install

```shell
npm install @sybil-center/sdk # Feel free to use pnpm or yarn
```

---

## Content

- [API keys](#api-keys)
- [Issuer id (did:key)](#issuer-id--didkey-)
- [Supported Verifiable Credentials](#supported-verifiable-credentials)
  - [Discord Account](#u-discord-account-u)
  - [Ethereum Account](#u-ethereum-account-u)
  - [GitHub Account](#u-github-account-u)
  - [Twitter Account](#u-twitter-account-u)
- [Set credential expiration date](#set-credential-expiration-date)
- [Choose subject props](#choose-subject-props)
- [Your custom property](#your-custom-property)
- [Verify credential](#verify-credential)
- [What is ProofProvider?](#what-is-proofprovider-)
- [What is subjectId?](#what-is-subjectid-)
- [What is SignFn?](#what-is-signfn-)
- [What is SubjectProof?](#what-is-subjectproof-)
- [What is SDK Issuer?](#what-is-sdk-issuer-)
- [Control under issuing process](#control-under-issuing-process)
- [Use SDK on Frontend-Backend](#use-sdk-on-frontend---backend)
- [Raw HTTP API](#raw-http-api)
- [How to get type and const?](#how-to-get-type-and-const-)
- [Demo app](#demo-app)

---

## API keys

`API keys` allow you to communicate with the `sybil.center` server app.
`API keys` includes two keys `api key` and `secret key`.
You should use `api key` on the Frontend application, and do not show 
your `secret key` to third parties. You should use `secret key` if
You have Backend application and want to integrate with `sybil.center` server app.
How to implement `credential` issue process with Fronted-Backend applications 
see in [Use SDK on Frontend-Backend](#use-sdk-on-frontend---backend) section.


You can get`API keys` from [developer portal](https://app.sybil.center/devportal).
Cool fact: developer portal use sybil SDK to issue `EthereumAccount` credential 
and generate `API keys`. 

In SDK you should use `API keys` as shown in the code below:
```typescript
// On frontend applicatoin
const sybil = new Sybil({
  apiKey: "API key from https://app.sybil.center/devportal",
  // DO NOT USE secret key on frontend !!!
});

// On backend application
const sybil = new Sybil({
  apiKey: "API key from https://app.sybil.center/devportal",
  secretKey: "Secret key from https://app.sybil.center/devportal"
});
```

Note: If you  put both `API keys` when initialize `sybil` instance
from `new Sybil`, in SDK `secret key` has priority 
under `api key`, therefore when SDK execute request 
to `sybil.center` server app it uses `secret key` to authorize request 
([`Issuer.canIssue`](#what-is-sdk-issuer-) request is exception).
For that reason **DO NOT USE** `secret key` on frontend app!!!

If you want to integrate with the `sybil.center` server app without SDK, you should 
put `api key` or `api secret` into `Authorization` header as
`Bearer <Your API key or SercetKey>`

Note: `API keys` will be linked to your ethereum address,
therefore if your `API keys` will be compromised you should create new `API keys`
for new ethereum account.

---

## Issuer id ([`did:key`](https://w3c-ccg.github.io/did-method-key/))

Sybil center `issuer id`: `did:key:z6MkvHAzbMgT1dCUutMCxaAUTuQUfhWyn9bDBL43nrmsybiL`

This identifier presents in issued credentials in `credential.issuer.id` field.

---

## Supported Verifiable Credentials

### <u>Discord Account</u>

`Description`: prove that user is the owner of the Discord account

`Credential type`: DiscordAccount

`Designator in sybil instane`: discord-account

`Authorization`: `true` ([what it means?](#issuing-and-authorization))

`Props` (represents in `credential.credentialSubject.discord`):

- `id`:
  - `type`: string
  - `description`: permanent unique Discord account identifier

- `username`:
  - `type`: string
  - `description`: the user's username, not unique across the Discord platform

- `discriminator`:
  - `type`: string
  - `descripton`: the user's 4-digit discord-tag

`Example`:

```typescript
// Issue credential by sybil.credential
const credential = await sybil.credential(
  "discord-account",
  await proofProvider.proof()
);


// Issue credential by issuer
const ethAddress = await proofProvider.getAddress();
const issuer = sybil.issuer("discord-account");
const challenge = await issuer.getChallenge({
  subjectId: `did:pkh:eip155:1${ethAddress}`
});
provideAuthPopupToUser(challenge.authUrl);
await waitUntilTrue(await issuer.canIssue(challenge.sessionId));
const signature = await proofProvider.sign({
  message: challenge.issueMessage
});
const credential = await issuer.issue({
  sessionId: challenge.sessionId,
  signature: signature
});

credential = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1"
  ],
  "credentialSubject": {
    "discord": {
      "discriminator": "0001",
      "id": "711603072933036111",
      "username": "Cool exmaple"
    },
    "id": "did:pkh:eip155:1:<address>"
  },
  "issuanceDate": "2023-05-07T09:59:01.806Z",
  "issuer": {
    "id": "did:key:<public key>"
  },
  "type": [
    "VerifiableCredential",
    "DiscordAccount"
  ],
  "proof": {
    "type": "JsonWebSignature2020",
    "created": "2023-05-07T09:59:01.818Z",
    "proofPurpose": "assertionMethod",
    "verificationMethod": "...",
    "jws": "..."
  }
};
```

### <u>Ethereum Account</u>

`Description`: prove that user is the owner of the Ethereum account

`Credential type`: EthereumAccount

`Designator in sybil instane`: ethereum-account

`Authorization`: `false` ([what it means?](#issuing-and-authorization))

`Props` (represents in `credential.credentialSubject.ethereum`):

- `chainId`:
  - `type`: string
  - `description`: chain id according to [spec](https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-10.md)

- `address`:
  - `type`: string
  - `description`: user ethereum account address

`Example`:

```typescript
// Issue credential by sybil instance
const credential = await sybil.credential(
  "ethereum-account",
  await proofProvider.proof()
);


// Issue credential by Issuer
const ethAddress = await proofProvider.getAddress();
const issuer = sybil.issuer("ethereum-account");
const challenge = await issuer.getChallenge({
  subjectId: `did:pkh:eip155:1${ethAddress}`
});
const signature = await proofProvider.sign({
  message: challenge.issueMessage
});
const credential = await issuer.issue({
  sessionId: challenge.sessionId,
  signature: signature
});

// Result credential
credential = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1"
  ],
  "credentialSubject": {
    "ethereum": {
      "address": "<address>",
      "chainId": "eip155:1"
    },
    "id": "did:pkh:eip155:1:<address>"
  },
  "issuanceDate": "2023-05-07T10:06:51.950Z",
  "issuer": {
    "id": "did:key:<public key>"
  },
  "type": [
    "VerifiableCredential",
    "EthereumAccount"
  ],
  "proof": {
    "type": "JsonWebSignature2020",
    "created": "2023-05-07T10:06:51.961Z",
    "proofPurpose": "assertionMethod",
    "verificationMethod": "...",
    "jws": "..."
  }
};
```

### <u>GitHub Account</u>

`Description`: prove that user is the owner of the GitHub account

`Credential type`: GitHubAccount

`Designator in sybil instane`: github-account

`Authorization`: `true` ([what it means?](#issuing-and-authorization))

`Props` (represents in `credential.credentialSubject.github`):

- `id`:
  - `type`: number
  - `description`: permanent unique GitHub account identifier

- `username`:
  - `type`: string
  - `description`: current GitHub account username aka `login`

- `userPage`:
  - `type`: string
  - `descripton`: url to current GitHub user profile

`Example`:

```typescript
// Issue credential by sybil instance
const credential = await sybil.credential(
  "github-account",
  await proofProvider.proof()
);


// Issue credential by Issuer
const ethAddress = await proofProvider.getAddress();
const issuer = sybil.issuer("github-account");
const challenge = await issuer.getChallenge({
  subjectId: `did:pkh:eip155:1${ethAddress}`
});
provideAuthPopupToUser(challenge.authUrl);
await waitUntilTrue(await issuer.canIssue(challenge.sessionId));
const signature = await proofProvider.sign({
  message: challenge.issueMessage
});
const credential = await issuer.issue({
  sessionId: challenge.sessionId,
  signature: signature
});

// Result credential
credential = {
  "@context": [
    "https://www.w3.org/2018/credentials/v1"
  ],
  "credentialSubject": {
    "github": {
      "id": 00000001,
      "userPage": "https://github.com/example",
      "username": "example"
    },
    "id": "did:pkh:eip155:1:<address>"
  },
  "issuanceDate": "2023-05-07T09:46:39.726Z",
  "issuer": {
    "id": "did:key:<public key>"
  },
  "type": [
    "VerifiableCredential",
    "GitHubAccount"
  ],
  "proof": {
    "type": "JsonWebSignature2020",
    "created": "2023-05-07T09:46:39.739Z",
    "proofPurpose": "assertionMethod",
    "verificationMethod": "...",
    "jws": "..."
  }
};
```

### <u>Twitter Account</u>

`Description`: prove that user is the owner of the Twitter account

`Credential type`: TwitterAccount

`Designator in sybil instane`: twitter-account

`Authorization`: `true` ([what it means?](#issuing-and-authorization))

`Props` (represents in `credential.credentialSubject.twitter`):

- `id`:
  - `type`: string
  - `description`: permanent unique Twitter account identifier

- `username`:
  - `type`: string
  - `description`: current Twitter account username

`Examples`:

```typescript
// Issue credential by sybil instance
const credential = await sybil.credential(
  "twitter-account",
  await proofProvider.proof()
);


// Issue credential by Issuer
const ethAddress = await proofProvider.getAddress();
const issuer = sybil.issuer("twitter-account");
const challenge = await issuer.getChallenge({
  subjectId: `did:pkh:eip155:1${ethAddress}`
});
provideAuthPopupToUser(challenge.authUrl);
await waitUntilTrue(await issuer.canIssue(challenge.sessionId));
const signature = await proofProvider.sign({
  message: challenge.issueMessage
});
const credential = await issuer.issue({
  sessionId: challenge.sessionId,
  signature: signature
});

// Result credential
credential = {
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  "credentialSubject": {
    "id": "did:pkh:eip155:1:<address>",
    "twitter": {
      "id": "1111111111",
      "username": "example-username"
    }
  },
  "issuanceDate": "2023-05-07T09:20:12.899Z",
  "issuer": {
    "id": "did:key:<public key>"
  },
  "type": ["VerifiableCredential", "TwitterAccount"],
  "proof": {
    "type": "JsonWebSignature2020",
    "created": "2023-05-07T09:20:12.909Z",
    "proofPurpose": "assertionMethod",
    "verificationMethod": "...",
    "jws": "..."
  }
};
```

### Note

If you call `sybil.credential` method with any of the credential designators, type of resulting credential is provided
for you by TypeScript. To get, for example, Twitter username from `credential` as in excerpt above, you would
use `credential.credentialSubject.twitter.username`.

---

## Set credential expiration date

You can set `credential expiration date`.
In code below you can see how to set `expiration date`

```typescript
const expirationDate = new Date(2015, 7, 30, 12, 0, 0);

// Issue credential by sybil.credential
const credential = await sybil
  .credential("discord-account", await proofProvider.proof(), {
    expirationDate: expirationDate
  });

credential?.expirationDate === expirationDate;

// Issue credential by issuer
const solanaAddress = await proofProvider.getAddress();
const issuer = sybil.issuer("discord-account");
const challenge = await issuer.getChallenge({
  subjectId: `solana:${solanaAddress}`,
  expirationDate: expirationDate
});
provideAuthPopupToUser(challenge.authUrl);
await waitUntilTrue(await issuer.canIssue(challenge.sessionId));
const signature = await proofProvider.sign({
  message: challenge.issueMessage
});
const credential = await issuer.issue({
  sessionId: challenge.sessionId,
  signature: signature
});
credential?.expirationDate === expirationDate;
```

---

## Choose subject `props`

In section [Supported credentials](#supported-credentials)
in each supported credential you can see `Props` field.
You can give your users the opportunity to choose which `props`
will be in `credential`.
In the example below you can see how to achieve this goal.

Example:

```typescript
// Issue credential by sybil.credential
const credential = await sybil
  .credential("github-account", await proofProvider.proof(), {
    props: ["id"]
  });

// Issue credential by issuer
const address = await getEthAddress();
const issuer = sybil.issuer("github-account");
const challenge = await issuer.getChallenge({
  subjectId: `did:pkh:eip155:1:${address}`,
  props: ["id"]
});
provideAuthPopupToUser(challenge.authUrl);
await waitUntilTrue(await issuer.canIssue(challenge.sessionId));
const signature = await sign(challenge.issueMessage);

const credential = await issuer.issue({
  sessionId: challenge.sessionId,
  signature: signature
});

// Credential result
credential.credentialSubject.github?.id !== undefined;
credential.credentialSubject.github?.username === undefined;
credential.credentialSubject.github?.userPage === undefined;
```

Note: If you do not define `props` in `sybil.credential` or `Issuer.getChallenge`
methods in the final `credential` all supported `props` will be present (e.g
if you do not define `props` in `sybil.credential` for `github-account`
`credential.credentialSubject.github` object will contain `id`, `username`,
`userPage` fields). If you put into `props` an empty list `[]`,
subject will NOT contain any `props` (e.g `credential.credentialSubject.github`
will NOT contain `id`, `username`, `userPage`).

---

## Your `custom` property

You can put `custom` property to Verifiable Credential.
Property will be placed in `credentialSubject` field of issued credential. It can be the `object` you want.

Example:

```typescript
// Issue credential by sybil.credential
const credential = await sybil
  .credential("discord-account", await proofProvider.proof(), {
    custom: { hello: "sybil" } // put here what ever object you want
  });

// Issue credential by issuer
const address = await getEthAddress()
const issuer = sybil.issuer("discord-account");
const challenge = await issuer.getChallenge({
  subjectId: `polygon:${address}`,
  custom: { hello: "sybil" }
});
provideAuthPopupToUser(challenge.authUrl);
await waitUntilTrue(await issuer.canIssue(challenge.sessionId));
const signature = await sign(challenge.issueMessage);
const credential = await issuer.issue({
  sessionId: challenge.sessionId,
  signature: signature
});

// credential
credential = {
  "@context": ["https://www.w3.org/2018/credentials/v1"],
  credentialSubject: {
    custom: { hello: "sybil" }, // custom object you put
    discord: {
      discriminator: "1111",
      id: "111111111111111111",
      username: "Sybil User"
    },
    id: "did:pkh:eip155:137:0xb9Baa2979F62c806Ca3fE8f6932E82Bb416112aA"
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
By default, if you use the `sybil.credential` method, `authorized window`
open in the middle of the user screen as `popul`
and after authorization user will be redirected to default page that will be closed
automatically after redirection.

Example:

```typescript
// Issue credential by sybil.credential
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

// Issue credential by issuer
const ethAddress = await proofProvider.getAddress();
const issuer = sybil.issuer("discord-account");
const challenge = await issuer.getChallenge({
  subjectId: `ethereum:${ethAddress}`,
  redirectUrl: "https://exmaple.com" // redirectUrl is optional
});
provideAuthPopupToUser(challenge.authUrl);  // implement it on your own
await waitUntilTrue(await issuer.canIssue(challenge.sessionId)); 
const signature = await proofProvider.sign({
  message: challenge.issueMessage
});

const credential = await issuer.issue({
  sessionId: challenge.sessionId,
  signature: signature
});

```

`Credentials` that use an authorization process
have the `Authorization` flag set to `true` value
in [Supported credentials](#supported-credentials)
section

---

## Verify credential

You can verify credentials using SDK as shown in the example below:

```typescript
const { isVerified } = await sybil.verify(credential);

// if credential verified `isVerified` === true
```

---

## What is `ProofProvider`?

Main purpose of `proof providers` is to create compatibility between `wallet providers` and our SDK.

Proof provider is an object that implements `SubjectProofProvider` interface as shown below:

```typescript
type SubjectProof = {
  subjectId: string;
  signFn: SignFn;
}

interface SubjectProofProvider {
  /** Sign message function */
  sign: SignFn;
  /** Returns signer address */
  getAddress(): Promise<string>
  /** creates Subject proof to issue verifiable credential */
  proof(): Promise<SubjectProof>
}
```

As you can see in example above, `SubjectProofProvider.proof` method
returns `SubjectProof`. To understand what is `SubjectProof` 
see [What is SubjectProof?](#what-is-subjectproof-),
[What is subjectId?](#what-is-subjectid-) and
[What is SignFn?](#what-is-signfn-).

In this version of SDK you can use next implementations of `SubjectProofProvider` interface:

- `EthProofProvider` - for Ethereum wallets. Usage example shown below:
```typescript
import { EthProofProvider, type IEIP1193Provider } from "@sybil-center/sdk";

const proofProvider = () => {
  const injected = "ethereum" in window && (window.ethereum as IEIP1193Provider);
  if (!injected) throw new Error(`Only injected provider is supported`);
  return new EthProofProvider(injected);
};
const credential = await sybil
  .credential("twitter-account", await proofProvider().proof())
```
- `SolanaProofProvider` - for Solana wallets (specifically for `Phantom`). Usage example shown below:
```typescript
import { SolanaProofProvider, SolanaProvider } from "@sybil-center/sdk";

const proofProvider = (): SolanaProofProvider => {
  const injected = "phantom" in window && (window.phantom as any);
  if (injected) {
    return new SolanaProofProvider(injected.solana as SolanaProvider);
  }
  window.open("https://phantom.app/", "_blank");
  throw new Error(`Only injected provider is supported`);
};

const credential = await sybil
  .credential("discord-account", await proofProvider().proof());
```

Also see [What is subjectId?](#what-is-subjectid-) and [What is SignFn?](#what-is-signfn-)

---

## What is `subjectId`?

`subject id` in SDK similar to `did` ([did spec](https://www.w3.org/TR/did-core/)) which refers to a credential subject,
but SDK `subject id` has got aliases to improve development experience. 
For example, `ethereum:<address>` & `eip155:1:<address>` are 
`did:pkh:eip155:1:<address>` aliases. All aliases have `prefix` and `adress` parts, therefore 
`subject id` can be represented as `prefix:<address>`. 
In example above, `ethereum`, `eip155:1` and `did:pkh:eip155:1` are prefixes.

Any SDK `subject id` will be transformed to `did:pkh` representation ([did-pkh spec](https://github.com/w3c-ccg/did-pkh/blob/main/did-pkh-method-draft.md))
on server side, e.g`ethereum:<address>` will be transformed 
to `did:pkh:eip155:1:<address>`. The transformed `subject id` will be
used as `credentialSubject.id` in issued credential.

Prefix (`subject id`) transform matching are shown in code below 
(left side `prefix`, will be transformed to right side `prefix`):

```typescript
const mapPrefix = new Map<Prefix, Prefix>([
  
  ["bitcoin", "did:pkh:bip122:000000000019d6689c085ae165831e93"],
  ["bip122:000000000019d6689c085ae165831e93", "did:pkh:bip122:000000000019d6689c085ae165831e93"],
  ["did:pkh:bip122:000000000019d6689c085ae165831e93", "did:pkh:bip122:000000000019d6689c085ae165831e93"],

  ["celo", "did:pkh:eip155:42220"],
  ["eip155:42220", "did:pkh:eip155:42220"],
  ["did:pkh:eip155:42220", "did:pkh:eip155:42220"],

  ["ethereum", "did:pkh:eip155:1"],
  ["eip155:1", "did:pkh:eip155:1"],
  ["did:pkh:eip155:1", "did:pkh:eip155:1"],

  ["polygon", "did:pkh:eip155:137"],
  ["eip155:137", "did:pkh:eip155:137"],
  ["did:pkh:eip155:137", "did:pkh:eip155:137"],

  ["solana", "did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ"],
  ["solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ", "did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ"],
  ["did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ", "did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ"]
]);

/*
 * For example:
 * 'solana:<address>', 'solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ:<address>'
 * and 'did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ:<address>'
 * will be transformed to 'did:pkh:solana:4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ:<address>'
 */
```

---

## What is `SignFn`?

`signFn` is function to sign `issue message` and returns `base64` encoded signature.
It's got the next type:

```typescript
/** Sign func take message as input, returns base64 encoded signature */
export type SignFn = (args: { message: string }) => Promise<string>;
```

Implementation example: 
```typescript
async function solanaSign(args: { message: string }): Promise<string> {
  const encodedMessage = new TextEncoder().encode(args.message);
  const { signature } = await solanaProvider.request({
    method: "signMessage",
    params: {
      message: encodedMessage,
      display: "utf8"
    }
  });
  return u8a.toString(u8a.fromString(signature, "base58btc"), "base64");
}

async function ethereumSign(args: { message: string }): Promise<string> {
  const message = args.message;
  const address = await getEthAddress();
  const hex = u8a.toString(u8a.fromString(message), "hex");
  const rawSignature = await ethProvider.request<`0x${string}`>({
    method: "eth_sign",
    params: [address, hexMessage]
  });
  const hexSign = signature.substring(2).toLowerCase();
  const bytesSign = u8a.fromString(hexSign, "hex");
  return u8a.toString(bytesSign, "base64");
}
```

### Note

As you can see in examples above, all signatures are transformed to `base64` 
representation

---

## What is `SubjectProof`?

`SubjectProof` is object which contains `subject id` ([What is SubjectId?](#what-is-subjectid-))
and `signFn` ([What is SignFn](#what-is-signfn-)).
`signFn` has to provide signature associated with `subject id`. 

`SignProof` type represented in code below: 

```typescript
type SubjectProof = {
  subjectId: string;
  signFn: SignFn;
}
```

`SubjectProof` uses to provide `credential` issuing from `sybil.credential` method:

You can use `ProofProvider` to create `SubjectProof` or create `SubjectProof` on your own.
How to create your own `SubjectProof` shown in examples below.

`React` and [`wagmi`](https://wagmi.sh/) example:

```typescript
import { useAccount, useNetwork, useSignMessage } from "wagmi";
import * as u8a from "uint8arrays";

export function useSubjectProof() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { chain } = useNetwork();

  const signMessage = async (args: { message: string }): Promise<string> => {
    const message = args.message;
    const sign = await signMessageAsync({ message: message });
    return u8a.toString(u8a.fromString(sign.substring(2), "hex"), "base64");

  };

  return { subjectId: `eip155:${chain?.id}:${address}`, signFn: signMessage };
}
/* ============================================================================= */
import { useSubjectProof } from "hooks";

const { subjectId, signFn } = useSubjectProof();

const credential = await sybil.credential("discord-account", {
  subjectId: subjectId,
  signFn: signFn
});
```

`JavaScript` example:

```typescript
// This is 'EthProofProvider' implementation.
// Here you can see how to provide 'SubjectProof' object
// in 'EthProofProvider.proof' method

export interface IEIP1193Provider {
  enable?: () => Promise<void>;
  request<T = unknown>(args: RequestArguments): Promise<T>;
}

export class EthProofProvider implements SubjectProofProvider {
  constructor(private readonly provider: IEIP1193Provider) {
    this.sign = this.sign.bind(this);
    this.getAddress = this.getAddress.bind(this);
  }
  async proof(): Promise<SubjectProof> {
    const chainId = await this.getChainId();
    const address = await this.getAddress();
    return {
      subjectId: `did:pkh:eip155:${chainId}:${address}`,
      signFn: this.sign
    }
  }

  async sign(args: { message: string }): Promise<string> {
    const message = args.message;
    const address = await this.getAddress();
    const hex = u8a.toString(u8a.fromString(message), "hex");
    return await this.#signMessage(address, hex)
  }

  async getAddress(): Promise<string> {
    const accounts = (await this.provider.request<string[]>({
      method: "eth_accounts",
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

  /**
   * Return signature as base64 string
   * @param address - ethereum 0x<address>
   * @param hexMessage - message as hex string
   */
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
            params: [address, hexMessage],
          })
        );
      }
      throw reason;
    }
  }

  #normalizeSignature(signature: string): string {
    const hexSign = signature.substring(2).toLowerCase();
    const bytesSign = u8a.fromString(hexSign, "hex");
    return u8a.toString(bytesSign, "base64");
  }
}
```

---

## What is SDK `Issuer` ?

SDK `Issuer` is interface that provide communication process to issue `credential`.
`Issuer` interface represented in code blow:

```typescript
import type { 
  Challenge,
  ChallengeReq,
  Credential,
  IssueReq,
  Options,
  SubjectProof 
} from "../types/index.js";

export interface Issuer<
  TCredential = Credential,
  TOptions = Options,
  TChallengeReq = ChallengeReq,
  TChallenge = Challenge,
  TIssueReq = IssueReq
> {
  /**
   * Aggregates {@link getChallenge},  {@link canIssue}, {@link issue},
   * to provides issue credential process and returns `credential`.
   * @param subjectProof - object contains `subjectId` and `signFn`
   * @param options - influence on result `credential` and/or issue process 
   */
  issueCredential(subjectProof: SubjectProof, options?: TOptions): Promise<TCredential>;
  /**
   * Sends challengeReq to receive appropriate challenge request.
   * Challenge contains `sessionId` and `issueMessage` fields, which are required
   * @param challengeReq - entity that contains data to receive appropriate challenge
   */
  getChallenge(challengeReq: TChallengeReq): Promise<TChallenge>;
  /**
   * Method used to check the status of the application to issue credential
   * @param sessionId - session identifier
   */
  canIssue(sessionId: string): Promise<boolean>;
  /**
   * Sends issueReq and receive credential
   * @param issueReq - contains `sessionId` and `signature`.
   *                   `signature` creates from `challenge.issueMessage`
   */
  issue(issueReq: TIssueReq): Promise<TCredential>;
}
```

Each time when you invoke `sybil.credential` method SDK chooses appropriate `Issuer` 
(e.g `sybil.credential("twitter-account", subjectProof)` will choose `TwitterAccountIssuer`
implementation) and uses `Issuer.issueCredential`method under the hood,
which aggregates `getChallenge`, `canIssue`, `issue` methods to issue appropriate `credential`.

You can get specific SDK `Issuer` from `subil` instance as shown in code below:

```typescript
const issuer = sybil.issuer("twitter-account"); // get TwitterAccountIssuer
```

How can it be helpful see in
[Control under issuing process](#control-under-issuing-process) section.

---

## Control under issuing process

`sybil.credential` method does some work under the hood, and help 
you issue `credentials` in one line. But you can't manage the issuing process
of `credentials`. If you need more control under the issuing process, you should use 
specific SDK `Issuer` implementation ([What is SDK Issuer ?](#what-is-sdk-issuer-))

In code below you can see how to get and use `Issuer` implementation: 
```typescript
// 1-st example 
// (more flexible, but part of the logic you should implement on your own)
const issuer = sybil.issuer("twitter-account");
const address = await getAddress();
const challenge = await issuer.getChallenge({
  subjectId: `ethereum:${address}`
});
provideAuthPopupToUser(challenge.authUrl);
await waitUntilTrue(await issuer.canIssue(challenge.sessionId));
const signature = await sign(challenge.issueMessage);
const credential = await issuer.issue({
  sessionId: challenge.sessionId,
  signature: signature
});

// 2-nd exmaple
// (simple implimentation but less flexible)
const addres = await getAddress();
const issuer = sybil.issuer("twitter-account");
const credential = await issuer.issueCredential({
  subjectId: `ethereum:${address}`,
  signFn: sign
});

// 3-rd exmaple
// using sybil instance
const address = await getAddress();
const credential = sybil.credential("twitter-account", {
  subjectId: `eip155:1:${address}`,
  signFn: sign
});

// All these example lead to the same result
```

---

## Use SDK on Frontend - Backend

You can use SDK on backend additionally with frontend to reach more security 
during the `credential` issuing process. Note that `sybil.credential` 
and `Issuer.issueCredential` ([What is SDK Issuer?](#what-is-sdk-issuer-)) methods are
valid only for frontend application. 
On backend, you should use `Issuer` implementations to provide 
`credential` issue process. 

In code below you can see example of implementation `credential` issuing process
with backend and frontend:

```typescript
/* Frontend (get challenge phase) */
const frontendSybil = new Sybil({
  // Note: on frontend use ONLY `apiKey`!!!
  apiKey: "API key from https://app.sybil.center/devportal"
});
const address = await getEthAddress();
const challenge = await fetch(new URL("https://backend/github-account/challenge"), {
  method: "POST",
  body: JSON.stringify({
    subjectId: `ethereum:${address}`
  })
}).then((resp) => resp.json());

/* Backend (get challenge phase) */
const backendSybil = new Sybil({
  // Note: on backend you can use `secretKey`
  apiKey: "API key from https://app.sybil.center/devportal",
  secretKey: "Secret key from https://app.sybil.center/devportal"
});

server.post("/github-account/challenge", async (req) => {
  const subjectId = req.body.subjectId;
  const issuer = backendSybil.issuer("github-account");
  const challenge = await issuer.getChallenge({
    subjectId: subjectId
  });
  return challenge;
});

/* Fronend (prepare issue credential request phase) */
const issuer = frontendSybil.issuer("github-account");
provideAuthPopupToUser(challenge.authUrl);
await waitUntilTrue(await issuer.canIssue(challenge.sessionId));
const signature = await sign(challenge.issueMessage);
await fetch(new URL("https://backend/github-account/issue"), {
  method: "POST",
  body: JSON.stringify({
    signature: signature,
    sessionId: challenge.sessionId
  })
});

/* Backend (issue credential phase) */
server.post("/github-account/issue", async (req) => {
  const issueReq = req.body;
  const issuer = backendSybil.issuer("github-account");
  const credential = await issuer.issue({
    signature: issueReq.signature,
    sessionId: issueReq.sessionId
  });
  return credential;
});
```

As you can see in the example above, Backend-Frontend implementation is more complicated
than only Frontend implementation, but this alternative is more secure and 
gives you opportunity to use `secretKey` on Backend and do not worry that third party
can steal your `API key` (see [API keys](#api-keys) section).

Now you can use SDK only on `Node.js`, but we are going 
to extend our SDK for other programming languages. 
If you really want to use our `issuer` service on other programming language,
this [`swagger API docs`](https://api.sybil.center/documentation) can help you

---

## Raw HTTP API

You can integrate with our `sybil.centre` service to issue `verifiable credentials` 
for the programming language you want,
using these [`swagger API docs`](https://api.sybil.center/documentation)

---

## How to get `type` and `const`?

If you need any `type` or `const` from SDK you can easy 
to get it from `@sybil-center/sdk/types` module

---

# Demo App

The repository also contains demo React/Next.js application, showing how to use the SDK in your application.

Please, consult [demo-app README](./demo-app/README.md) about how to run a demo locally, and where to look for an
example of code in React.
