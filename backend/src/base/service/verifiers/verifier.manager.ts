// import { IVerifier, SignEntry } from "../../types/verifier.js";
// import { MinaVerifier } from "./mina-verifier.service.js";
// import { ClientError } from "../../../backbone/errors.js";
// import { ZkcChallengeReq, ZkcIdTypeAlias } from "../../types/zkc.issuer.js";
// import { ZKC } from "../../../util/zk-credentials/index.js";
// import { EthVerifier } from "./eth-verifier.service.js";
//
// /** Manage Signature Verifiers */
// export interface IVerifierManager {
//   /**
//    * Returns verifier by its alias
//    * @param alias
//    */
//   verifier(alias: string | number): IVerifier;
//   /**
//    *  Verify signature by alias and sign entry
//    * @param alias
//    * @param signEntry
//    * @param opt - verify options
//    */
//   verify(
//     alias: string | number,
//     signEntry: SignEntry,
//     options?: ZkcChallengeReq["options"]
//   ): Promise<boolean>;
// }
//
// export class VerifierManager implements IVerifierManager {
//
//   private readonly verifiers: Record<ZkcIdTypeAlias, IVerifier>;
//
//   constructor() {
//     const minaVerifier = new MinaVerifier();
//     const ethVerifier = new EthVerifier();
//     this.verifiers = {
//       "mina": minaVerifier,
//       0: minaVerifier,
//       "eth": ethVerifier,
//       1: ethVerifier
//     };
//   }
//
//   verifier(alias: string | number): IVerifier {
//     const isAlias = ZKC.idType.isAlias(alias);
//     if (!isAlias) throw new ClientError(`Chain namespace ${alias} is not supported`);
//     return this.verifiers[alias];
//   }
//
//   verify(alias: string | number, entry: SignEntry, opt?: Record<string, any>): Promise<boolean> {
//     const verifier = this.verifier(alias);
//     return verifier.verify(entry, opt);
//   }
//
// }
