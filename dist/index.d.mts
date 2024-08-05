type AddApiKeys<T, U> = {
    [K in keyof U]: FluentApi<U[K], U>;
};
type AddConfigPropAndReturn<T, U> = T extends (ctx: any, ...args: infer A) => any ? (...args: A) => AddConfigPropAndReturn<U, U> & AddApiKeys<OmitFirstArg<T>, U> : {
    [P in keyof T]: T[P] extends (ctx: any, ...args: infer A) => any ? (...args: A) => AddConfigPropAndReturn<Omit<T, P>, U> & AddApiKeys<OmitFirstArg<T[P]>, U> : AddConfigPropAndReturn<T[P], U> & AddApiKeys<T[P], U>;
} & AddApiKeys<T, U>;
type OmitFirstArg<T> = T extends (ctx: any, ...args: infer A) => infer R ? (...args: A) => R : T;
type FluentApi<V, U> = AddConfigPropAndReturn<V, U>;
type CombinedFluentApi<T> = {
    [K in keyof T]: FluentApi<T[K], T>;
};
type ApiCall = {
    method: string;
    args?: any[];
};
declare function fluent<T extends Record<string, any>>(apiStructure: T): CombinedFluentApi<T>;
type Ctx = {
    run: (op: any) => any;
    ops: Array<{
        path: string;
        args: any[];
        result?: any;
    }>;
} & {
    [key: string]: any;
};
type RunCtx = Omit<Ctx, "run" | "ops"> & {
    run?: (op: any) => any;
    ops?: Array<{
        path: string;
        args: any[];
        result?: any;
    }>;
};
declare const run: ({ op, ctx: _ctx, api }: {
    op: any;
    ctx: RunCtx;
    api: any;
}) => any | Promise<any>;

export { type AddApiKeys, type AddConfigPropAndReturn, type ApiCall, type CombinedFluentApi, type Ctx, type FluentApi, fluent, run };
