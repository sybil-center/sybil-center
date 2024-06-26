import { Injector } from "typed-inject";
import { DI } from "../../app.js";


export function EthSybilController(injector: Injector<DI>) {
  const ethSybilStore = injector.resolve("ethSybilStore");
  const fastify = injector.resolve("httpServer").fastify;

  fastify.get<
    { Params: { address: string } }
  >("/api/eth-sybil/:address", async (req, resp) => {
    const address = req.params.address.toLowerCase();
    const found = await ethSybilStore.getByAddress(address);
    if (found) {
      const { sybilId, address, signature } = found;
      return { sybilId, address, signature };
    } else {
      resp.statusCode = 404;
      return { message: `User with ethereum address ${address} does not pass passport verification` };
    }
  });
}