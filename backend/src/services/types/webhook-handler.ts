import { FastifyRequest } from "fastify";

export interface IWebhookHandler<TResult = any> {
  handleWebhook(req: FastifyRequest): Promise<TResult>
}
