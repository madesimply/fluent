type AddApiKeys<T, U> = {
    [K in keyof U]: U[K] extends (...args: infer P) => any ? P extends [infer Ctx, ...infer Rest] ? (...args: Rest) => AddArgsAndReturn<U, U> : AddArgsAndReturn<U, U> : AddArgsAndReturn<U[K], U>;
} & {
    run: (ctx?: any) => any;
    goto: (chain: ValidChain<U>) => AddArgsAndReturn<U, U>;
};
type AddArgsAndReturn<T, U> = T extends (...args: any[]) => any ? Parameters<T> extends [infer Ctx, ...infer Rest] ? ((...args: Rest) => AddArgsAndReturn<U, U> & {
    run: (ctx?: any) => any;
    goto: (chain: ValidChain<U>) => AddArgsAndReturn<U, U>;
}) & AddApiKeys<T, U> : (() => AddArgsAndReturn<U, U> & {
    run: (ctx?: any) => any;
    goto: (chain: ValidChain<U>) => AddArgsAndReturn<U, U>;
}) & AddApiKeys<T, U> : {
    [P in keyof T]: T[P] extends (...args: any[]) => any ? Parameters<T[P]> extends [infer Ctx, ...infer Rest] ? ((...args: Rest) => AddArgsAndReturn<U, U> & {
        run: (ctx?: any) => any;
        goto: (chain: ValidChain<U>) => AddArgsAndReturn<U, U>;
    }) & AddApiKeys<T, U> : AddArgsAndReturn<U, U> & AddApiKeys<T, U> & {
        run: (ctx?: any) => any;
        goto: (chain: ValidChain<U>) => AddArgsAndReturn<U, U>;
    } : AddArgsAndReturn<T[P], U> & {
        goto: (chain: ValidChain<U>) => AddArgsAndReturn<U, U>;
    };
} & {
    run: (ctx?: any) => any;
    goto: (chain: ValidChain<U>) => AddArgsAndReturn<U, U>;
};
type ValidChain<U> = U extends (...args: any[]) => any ? ((...args: Parameters<U>) => any) | (() => any) : {
    [K in keyof U]: ValidChain<U[K]>;
};
type FluentApi<V, U> = AddArgsAndReturn<V, U>;
type CombinedFluentApi<T> = {
    [K in keyof T]: FluentApi<T[K], T>;
};
type ApiCall = {
    method: string;
    args?: any[];
    goto?: any;
};

declare function fluent<T extends Record<string, any>>(api: T): CombinedFluentApi<T>;
declare function fluent<T extends Record<string, any>>(api: T, chain: ApiCall[]): CombinedFluentApi<T>;

export { type AddApiKeys, type AddArgsAndReturn, type ApiCall, type CombinedFluentApi, type FluentApi, type ValidChain, fluent };
