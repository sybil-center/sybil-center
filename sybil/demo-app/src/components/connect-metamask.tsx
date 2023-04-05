import { FormEvent, useState } from "react";
import styles from "@/styles/connect-metamask.module.css";
import { EthWalletProvider, IEIP1193Provider } from "@sybil-center/sdk";

export function ConnectMetamask() {
  const [state, setState] = useState<{
    loading: boolean;
    account: string | null;
  }>({ loading: false, account: null });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state.loading) return;
    setState({ loading: true, account: null });
    const injected = "ethereum" in window && (window.ethereum as IEIP1193Provider);
    if (!injected) throw new Error(`Only injected provider is supported`);
    const provider = new EthWalletProvider(injected);
    const account = await provider.getAddress().then(async (account) => {
      if (!account) await (injected as any).enable();
      return account;
    });
    setState({ loading: false, account: account });
  };

  if (state.account) {
    return <div className={styles.account}>{state.account}</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type={"submit"} className={styles.button}>
        Connect to Injected Provider
      </button>
    </form>
  );
}
