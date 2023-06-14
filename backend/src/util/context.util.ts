import { Injector } from "typed-inject";

export function toContext<TContext = { [key: string]: any }, TToken = keyof TContext>(
  injectionTokens: TToken[],
  injector: Injector<TContext>
): TContext {
  const context: { [key: string]: any } = {};
  injectionTokens.forEach((token) => {
    //@ts-ignore
    context[token] = injector.resolve(token);
  });
  return context as TContext;
}
