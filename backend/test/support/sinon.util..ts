import sinon, { SinonSpy } from "sinon";


export const sinonUtil = {
  /** Create sinon fake mixture sinon stub and sinon spy, returns sinon spy type */
  replace: <
    T extends { [key: string]: any },
    TKey extends keyof T,
    F extends (args: Parameters<T[TKey]>) => ReturnType<T[TKey]>
  >(obj: T, prop: TKey, replacement: T[TKey]): SinonSpy<Parameters<F>, ReturnType<F>> => {
    // @ts-ignore
    return sinon.replace(obj, prop, replacement);
  }
};
