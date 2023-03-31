import dotenv from "dotenv";
import { writeFile } from "node:fs/promises";

const BUILD_FOLDER = new URL("../../build/", import.meta.url);
const OPTIONS_FILEPATH = new URL("./options.json", BUILD_FOLDER);

async function main() {
  dotenv.config();
  const providerEndpointString = process.env["REACT_APP_VC_PROVIDER_URL_API"];
  console.info("REACT_APP_VC_PROVIDER_URL_API:", providerEndpointString);
  if (!providerEndpointString) throw new Error(`No REACT_APP_VC_PROVIDER_URL_API found`);
  const providerEndpoint = new URL(providerEndpointString);
  const options = {
    provider: providerEndpoint.origin,
  };
  const serialized = JSON.stringify(options);
  console.log(`Writing options to ${OPTIONS_FILEPATH.href}`);
  await writeFile(OPTIONS_FILEPATH, serialized);
  console.log("Done writing options");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
