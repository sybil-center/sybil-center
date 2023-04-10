import type { DIDService } from "./did.service.js";
import { tokens } from "typed-inject";
import { Credential, ProofType } from "@sybil-center/sdk/types";
import { ClientError } from "../../backbone/errors.js";
import { toFullJWT } from "../../util/jwt.util.js";
import { ThrowDecoder } from "../../util/throw-decoder.util.js";
import { jwsAsDecodedJWS } from "../types/io-ts-extra.js";

type ProofSigner = (credential: Credential) => Promise<Credential>

type ProofVerifier = (credential: Credential) => Promise<boolean>

type ProofHandler = {
  sign: ProofSigner;
  verify: ProofVerifier
}

/** Service for sign and verify credentials */
export class ProofService {

  private readonly proofs: Map<ProofType, ProofHandler>;

  static inject = tokens("didService");
  constructor(private readonly didService: DIDService) {
    this.proofs = new Map<ProofType, ProofHandler>([
      [
        "JsonWebSignature2020",
        { sign: this.#jwsSing.bind(this), verify: this.#jwsVerify.bind(this) }
      ]
    ]);
  }

  async sign(proofType: ProofType, credential: Credential): Promise<Credential> {
    const proofHandler = this.proofs.get(proofType);
    if (!proofHandler) {
      throw new ClientError(`Proof type - ${proofHandler} is not supporter`);
    }
    return proofHandler.sign(credential);
  }

  async verify(credential: Credential): Promise<boolean> {
    const proof = credential.proof;
    if (!proof) throw new ClientError("Credential proof is empty");
    if (!proof.type) throw new ClientError("Credential proof type is empty");
    const proofHandler = this.proofs.get(proof.type)
    if (!proofHandler) {
      throw new Error(`Proof type - ${proof.type} verification is not supported`);
    }
    return proofHandler.verify(credential)
  }

  /**
   * Sign VC by JWS
   * @see https://www.w3.org/TR/vc-jws-2020/#ref-for-dfn-jsonwebsignature2020-3
   * @param credential
   */
  async #jwsSing(credential: Credential): Promise<Credential> {
    const dagJWS = await this.didService.createJWS(credential);
    const [jwsSignature] = dagJWS.signatures;
    //convert to detached JWS
    const jws = jwsSignature?.protected + ".." + jwsSignature?.signature;

    credential.proof = {
      type: "JsonWebSignature2020",
      created: new Date(),
      proofPurpose: "assertionMethod",
      verificationMethod: this.didService.verificationMethod,
      jws: jws,
    };
    return credential;
  }

  async #jwsVerify(credential: Credential): Promise<boolean> {
    try {
      const jwsProof = credential.proof;
      if (!jwsProof || !jwsProof.jws) return false;
      const copy = JSON.parse(JSON.stringify(credential)) as Credential;
      copy.proof = undefined;
      const jws = toFullJWT(jwsProof.jws, copy);
      await this.didService.verifyJWS(jws);
      const decodedJWS = ThrowDecoder.decode(jwsAsDecodedJWS, jws);
      if (!decodedJWS.header.kid) return false;
      return decodedJWS.header.kid === this.didService.verificationMethod;
    } catch (e) {
      return false;
    }
  }
}
