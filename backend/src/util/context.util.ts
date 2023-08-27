import { Injector } from "typed-inject";

export const contextUtil = {
  from<TContext = Record<string, any>, TTokens = keyof TContext>(injectionTokens: TTokens[], injector: Injector<TContext>) {
    const context: { [key: string]: any } = {};
    injectionTokens.forEach((token) => {
      //@ts-ignore
      context[token] = injector.resolve(token);
    });
    return context as TContext;
  }
};
