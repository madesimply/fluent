type ApiCall<TMethod extends string, TArgs extends ReadonlyArray<any>, TData = any, TReturn = any> = {
    readonly method: TMethod;
    readonly args: TArgs;
    readonly dataType: TData;
    readonly returnType: TReturn;
};
type RuntimeApiCall = {
    readonly method: string;
    readonly args: ReadonlyArray<any>;
};
type GotoItem<TMethod extends string = string, TArgs extends ReadonlyArray<any> = ReadonlyArray<any>> = {
    goto: TMethod;
    args: TArgs;
};
type ChainItem = RuntimeApiCall | GotoItem;
type Chain = ReadonlyArray<ChainItem>;
type FluentProxyStructure = {
    readonly chain: Chain;
};
type ExtractChain<T, Depth extends number = 0> = Depth extends 8 ? any : T extends string ? string : T extends number ? number : T extends boolean ? boolean : T extends null ? null : T extends undefined ? undefined : T extends FluentProxyStructure ? T['chain'][number] : T extends ReadonlyArray<any> ? {
    [K in keyof T]: ExtractChain<T[K], AddOne<Depth>>;
} : T extends object ? {
    readonly [K in keyof T]: ExtractChain<T[K], AddOne<Depth>>;
} : never;
type AddOne<T extends number> = [1, 2, 3, 4, 5, 6, 7, 8, 9][T];
type ExtractThisParameter<T> = T extends (this: infer This, ...args: any[]) => any ? This : never;
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
type FluentProxy<TRootApi, TCurrentApi, TChain extends Chain, TPath extends string = ""> = FluentProxyStructure & {
    readonly chain: TChain;
    run: TChain extends [] ? never : TChain extends [infer First, ...any[]] ? First extends ApiCall<any, any, infer TData, any> ? (data: TData) => TChain extends [...any[], infer Last] ? Last extends ApiCall<any, any, infer TLastData, infer TReturn> ? TReturn extends Promise<any> ? Promise<TReturn extends Promise<infer R> ? R : never> : TReturn extends void ? TLastData : TReturn : never : never : never : never;
    goto: <T extends FluentProxyStructure>(fluentProxy: T) => T['chain'][0] extends ApiCall<infer M, infer A, any, any> ? FluentProxy<TRootApi, TCurrentApi, [...TChain, GotoItem<M, A>], TPath> : never;
    toString: () => string;
} & {
    [K in keyof TRootApi | keyof TCurrentApi]: K extends keyof TCurrentApi ? TCurrentApi[K] extends (data: infer TData, ...args: infer TArgs) => infer TReturn ? <T extends TArgs>(...args: T) => FluentProxy<TRootApi, TCurrentApi, [...TChain, ApiCall<`${TPath}${K & string}`, ExtractChain<T>, TData, TReturn>], TPath> : FluentProxy<TRootApi, TCurrentApi[K] extends object ? TCurrentApi[K] : TCurrentApi, TChain, `${TPath}${K & string}.`> : K extends keyof TRootApi ? TRootApi[K] extends (data: infer TData, ...args: infer TArgs) => infer TReturn ? <T extends TArgs>(...args: T) => FluentProxy<TRootApi, TRootApi, [...TChain, ApiCall<`${K & string}`, ExtractChain<T>, TData, TReturn>], ""> : FluentProxy<TRootApi, TRootApi[K] extends object ? TRootApi[K] : TRootApi, TChain, `${K & string}.`> : never;
};
type FluentConfig<TApi, TCtx, TInitialChain extends Chain = []> = {
    api: TApi;
    ctx?: TCtx;
    chain?: TInitialChain | string;
};

declare function fluent<TApi, TCtx extends ApiContext<TApi>, TInitialChain extends Chain = []>(config: HasRequiredProperties<ApiContext<TApi>> extends true ? FluentConfig<TApi, ApiContext<TApi>, TInitialChain> & {
    ctx: ApiContext<TApi>;
} : FluentConfig<TApi, ApiContext<TApi>, TInitialChain>): FluentProxy<TApi, TApi, TInitialChain, "">;

export { fluent };
