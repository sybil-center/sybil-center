import { FormEvent, useState } from "react";
import { DiscordAccountVC, EthWalletProvider, IEIP1193Provider, Sybil } from "@sybil-center/sdk";
import styles from "@/styles/twitter-pos.module.css";

export const sybil = new Sybil(
  { apiKey: "get API keys from Dev Portal" });

export function DiscordPos() {
  const [state, setState] = useState<{
    loading: boolean;
    vc: DiscordAccountVC | null;
  }>({
    loading: false,
    vc: null
  });

  const wallet = () => {
    const injected = "ethereum" in window && (window.ethereum as IEIP1193Provider);
    if (!injected) throw new Error(`Ethereum injected provider is not present as browser extension`);
    return new EthWalletProvider(injected);
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state.loading) return;
    setState({ loading: true, vc: null });
    sybil
      .credential("discord-account", await wallet().proof(), {
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
