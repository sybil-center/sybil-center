import fs from "node:fs";
import * as u8a from "uint8arrays";

function main() {
  const json = fs.readFileSync(new URL("./gcp-key.json", import.meta.url), { encoding: "utf-8" });
  console.log(json);
  const encoded = u8a.toString(u8a.fromString(json, "utf-8"), "base64url");
  fs.writeFileSync(new URL("./base64url-key.txt", import.meta.url), encoded);
}

try {
  main()
} catch (e: any) {
  console.log(e.message);
}
