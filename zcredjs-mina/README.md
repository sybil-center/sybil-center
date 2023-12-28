# zcred for mina

Library provides zcred implementations for mina

## Provided proofs

Signature proofs: `mina:poseidon-pasta`

ACI proofs: `aci:mina-poseidon`

## Credential Verifiers

### mina:poseidon-pasta

```typescript
const verifier = new MinaCredentialVerifier("mina:poseidon-pasta");
const isVerified = await verifier.verify(cred, reference)
```

### aci:mina-poseidon

```typescript
const verifier = new MinaCredentialVerifier("aci:mina-poseidon");
const isVerified = await verifier.verify(cred, reference)
```

## Wallet Adapter

### Aruo wallet adapter

```typescript
const auro = window.mina;
const adapter = new AuroWalletAdapter(auro);
await adapter.getAddress(); // returns wallet address
await adapter.getChainId() // returns CAIP-2 chain id 
await adapter.getSubjectId() // returns ZCIP-2 subject id
await adapter.sign({message: "hello"}) // returns signature
```
