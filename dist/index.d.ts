type ExtractThisParameter<T> = T extends (this: infer This, ...args: any[]) => any ? This extends object ? This : {} : {};
interface FluentOptions {
    blocking?: boolean;
}
type ApiContext<TApi> = UnionToIntersection<{
    [K in keyof TApi]: TApi[K] extends (...args: any[]) => any ? ExtractThisParameter<TApi[K]> : TApi[K] extends object ? ApiContext<TApi[K]> : never;
}[keyof TApi]> & {
    fluent?: FluentOptions;
};
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
type HasRequiredProperties<T> = T extends object ? {} extends {
    [K in keyof T]: T[K] extends undefined ? never : K;
} ? false : true : false;
type Chain = ReadonlyArray<ChainItem>;
type FluentStructure = {
    readonly chain: Chain;
    run: () => any;
};
type ChainItem = {
    method: string;
    args: readonly unknown[];
    data: unknown;
    return: unknown;
};
type ExtractChain<T> = T extends FluentStructure ? T['chain'] : T extends ReadonlyArray<infer U> ? ExtractChain<U>[] : T extends object ? {
    [K in keyof T]: ExtractChain<T[K]>;
} : T;
type Fluent<TRootApi, TCurrentApi, TChain extends Chain, TPath extends string = ""> = {
    readonly chain: TChain;
    run: TChain extends [] ? never : TChain extends [infer First, ...any[]] ? First extends {
        data: infer TData;
    } ? (data: TData) => TChain extends [...any[], infer Last] ? Last extends {
        data: any;
        return: infer TReturn;
    } ? TReturn extends Promise<any> ? Promise<TReturn extends Promise<infer R> ? R : never> : TReturn extends void ? Last['data'] : TReturn : never : never : never : never;
    goto: <T extends FluentStructure>(fluentProxy: T) => Fluent<TRootApi, TCurrentApi, [...TChain, ...T['chain']], TPath>;
    toString: () => string;
} & {
    [K in keyof TRootApi | keyof TCurrentApi]: K extends keyof TCurrentApi ? TCurrentApi[K] extends (this: any, data: infer TData, ...args: infer TArgs) => infer TReturn ? <const T extends TArgs>(...args: T) => Fluent<TRootApi, TCurrentApi, [
        ...TChain,
        {
            method: `${TPath}${K & string}`;
            args: {
                [P in keyof T]: ExtractChain<T[P]>;
            };
            data: TData;
            return: TReturn extends void ? TData : TReturn;
        }
    ], TPath> : Fluent<TRootApi, TCurrentApi[K] extends object ? TCurrentApi[K] : TCurrentApi, TChain, `${TPath}${K & string}.`> : K extends keyof TRootApi ? TRootApi[K] extends (this: any, data: infer TData, ...args: infer TArgs) => infer TReturn ? <const T extends TArgs>(...args: T) => Fluent<TRootApi, TRootApi, [
        ...TChain,
        {
            method: `${K & string}`;
            args: {
                [P in keyof T]: ExtractChain<T[P]>;
            };
            data: TData;
            return: TReturn extends void ? TData : TReturn;
        }
    ], ""> : Fluent<TRootApi, TRootApi[K] extends object ? TRootApi[K] : TRootApi, TChain, `${K & string}.`> : never;
};
type FluentConfig<TApi, TCtx, TInitialChain extends Chain = []> = {
    api: TApi;
    ctx?: TCtx;
    chain?: TInitialChain | string;
};

declare function fluent<TApi, TCtx extends ApiContext<TApi>, TInitialChain extends Chain = []>(config: HasRequiredProperties<ApiContext<TApi>> extends true ? FluentConfig<TApi, ApiContext<TApi>, TInitialChain> & {
    ctx: ApiContext<TApi>;
} : FluentConfig<TApi, ApiContext<TApi>, TInitialChain>): Fluent<TApi, TApi, TInitialChain, "">;

export { type ApiContext, type Fluent, type FluentConfig, type FluentOptions, fluent };
