import { FormEvent, useState } from "react";
import { DiscordAccountVC, EthRequestSigner, IEIP1193Provider } from "@sybil-center/sdk";
import { sybil } from "@/service/sybil";
import styles from "@/styles/twitter-pos.module.css";


export function DiscordPos() {
  const [state, setState] = useState<{
    loading: boolean;
    vc: DiscordAccountVC | null;
  }>({
    loading: false,
    vc: null
  });

  const signer = () => {
    const injected = "ethereum" in window && (window.ethereum as IEIP1193Provider);
    if (!injected) throw new Error(`Ethereum injected provider is not present as browser extension`);
    return new EthRequestSigner(injected);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state.loading) return;
    setState({ loading: true, vc: null });
    sybil
      .credential("discord-account", signer().sign, {
        custom: { helloFrom: "@sybil-center/sdk" }
      })
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
            Discord:{" "}
            <span>
              <b> {state.vc.credentialSubject.discord.username} ✓</b>
            </span>
          </label>
          <textarea readOnly={true} value={JSON.stringify(state.vc, null, 4)}></textarea>
        </>
      );
    } else {
      return (
        <label>
          Discord: <button type={"submit"}>Add</button>
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
