import { ISignatureVerifier, SignEntry } from "./type.js";
import { EthereumSignatureVerifier } from "./ethereum-verifier.js";
import { EthSignature } from "@zcredjs/ethereum";

export class ZcredEthSignatureVerifier implements ISignatureVerifier {

  private readonly ethSignatureVerifier = new EthereumSignatureVerifier();
  async verify(signEntry: SignEntry): Promise<boolean> {
    const signature = EthSignature.fromBase58(signEntry.signature);
    return await this.ethSignatureVerifier.verify({
      ...signEntry, signature: signature
    });
  }


}
