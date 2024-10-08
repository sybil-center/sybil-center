import * as u8a from "uint8arrays";
import * as fs from "node:fs";

function main() {
  const gcpKey = process.env["GCP_KEY"];
  if (!gcpKey) throw new Error(`GCP_KEY undefined`);
  const jsonkey = u8a.toString(u8a.fromString(gcpKey, "base64url"), "utf-8");
  fs.writeFileSync(new URL("../gcp-key.json", import.meta.url), jsonkey);
}

try {
  main();
} catch (e) {
  console.log(e.message);
}