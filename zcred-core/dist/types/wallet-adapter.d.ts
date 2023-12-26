import { Identifier } from "./zk-credentials.js";
export type SignFn = (args: {
    message: string;
}) => Promise<string>;
export interface IWalletAdapter {
    /** ZCIP-2 Identifier */
    getSubjectId(): Promise<Identifier>;
    /** Blockchain address*/
    getAddress(): Promise<string>;
    /** CAIP-2 chain identifier */
    getChainId(): Promise<string>;
    /** Sign function */
    sign: SignFn;
}
