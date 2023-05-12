import { FormEvent, useState } from "react";
import styles from "@/styles/twitter-pos.module.css";
import { TwitterAccountVC, EthProofProvider, type IEIP1193Provider, Sybil } from "@sybil-center/sdk";

export const sybil = new Sybil(
  { apiKey: "get API keys from Dev Portal - https://app.sybil.center/devportal" });

export function TwitterPos() {
  const [state, setState] = useState<{
    loading: boolean;
    vc: TwitterAccountVC | null;
  }>({
    loading: false,
    vc: null,
  });

  const proofProvider = () => {
    const injected = "ethereum" in window && (window.ethereum as IEIP1193Provider);
    if (!injected) throw new Error(`Only injected provider is supported`);
    return new EthProofProvider(injected);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state.loading) return;
    setState({ loading: true, vc: null });
    sybil
      .credential("twitter-account", await proofProvider().proof())
      .then((credential) => {
        console.log("Credential:", credential);
        setState({ loading: false, vc: credential });
      })
      .catch((error) => {
        console.error(error);
        setState({ loading: false, vc: null });
      });
  };

  const renderBody = () => {
    if (state.vc) {
      return (
        <>
          <label>
            Twitter:{" "}
            <span>
              <b> {state.vc.credentialSubject.twitter.username} ✓</b>
            </span>
          </label>
          <textarea readOnly={true} value={JSON.stringify(state.vc, null, 4)}></textarea>
        </>
      );
    } else {
      return (
        <label>
          Twitter: <button type={"submit"}>Add</button>
        </label>
      );
    }
  };

  return (
    <form onSubmit={onSubmit} className={styles.posForm}>
      {renderBody()}
    </form>
  );
}
