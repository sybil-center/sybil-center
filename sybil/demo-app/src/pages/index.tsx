import Head from "next/head";
import { TwitterPos } from "@/components/twitter-pos";
import { ConnectMetamask } from "@/components/connect-metamask";
import { DiscordPos } from "@/components/discord-pos";

export default function Home() {
  return (
    <>
      <Head>
        <title>VC Proof-of-Social</title>
        <meta name="description" content="VC Proof-of-social" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <ConnectMetamask />
        <TwitterPos />
        <DiscordPos />
      </main>
    </>
  );
}
