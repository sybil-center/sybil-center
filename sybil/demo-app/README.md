# Sybil SDK demo app

## Getting Started

After installing all the dependencies using `pnpm install` command, run the development server:

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to use the demo application.

## What's included

The application is a pretty vanilla Next.js app. The only meaningful change is [TwitterPos](./src/components/twitter-pos.tsx) React component.

You could see we add SybilCenter SDK at the top:

```typescript
import { Sybil, ITwitterAccountOwnershipVC, EthRequestSigner, IEIP1193Provider } from "@sybil-center/sdk";

const sybil = new Sybil();
```

As a pre-requisite, we wrap an injected Ethereum provider (`window.ethereum`) from MetaMask or Tokenary:

```typescript
const signer = () => {
  const injected = "ethereum" in window && (window.ethereum as IEIP1193Provider);
  if (!injected) throw new Error(`Only injected provider is supported`);
  return new EthRequestSigner(injected);
};
```

When a user clicks a button, we handle that by issuing a Verifiable Credential of the user's Twitter account:

```typescript
const onSubmit = (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  if (state.loading) return;
  setState({ loading: true, vc: null });
  sybil
    .credential("twitter-account", signer().sign) // Acquire the credential
    .then((credential) => {
      // Use it
      console.log("Credential:", credential);
      setState({ loading: false, vc: credential });
    })
    .catch((error) => {
      console.error(error);
      setState({ loading: false, vc: null });
    });
};
```

When called, `sybil.credential` would open a popup window asking for the user's permission to share her Twitter account. After the user gave the permission, SybilCenter backend would issue the credential, that is available as a return value from `sybil.credential` call.

The library is strongly typed. If your application is in TypeScript, IDE would suggest how to get Twitter account details from the credential. Assuming the credential is available in `state.vc` variable, here in the application we show Twitter's username, for example:

```
state.vc.credentialSubject.twitter.username
```
