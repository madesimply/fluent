type AddApiKeys<T, U> = {
    [K in keyof T]: T[K] extends (...args: infer P) => infer R ? P extends [infer Ctx, ...infer Rest] ? (...args: Rest) => AddConfigPropAndReturn<U, U> & AddApiKeys<T, U> : AddConfigPropAndReturn<U, U> & AddApiKeys<T, U> : AddConfigPropAndReturn<T[K], U> & AddApiKeys<T, U>;
};
type AddConfigPropAndReturn<T, U> = T extends (...args: any[]) => any ? Parameters<T> extends [infer Ctx, ...infer Rest] ? ((...args: Rest) => AddConfigPropAndReturn<U, U> & AddApiKeys<T, U>) & AddApiKeys<T, U> : AddConfigPropAndReturn<U, U> & AddApiKeys<T, U> : {
    [P in keyof T]: T[P] extends (...args: any[]) => any ? Parameters<T[P]> extends [infer Ctx, ...infer Rest] ? ((...args: Rest) => AddConfigPropAndReturn<Omit<T, P>, U> & AddApiKeys<T, U>) & AddApiKeys<T, U> : AddConfigPropAndReturn<Omit<T, P>, U> & AddApiKeys<T, U> & T[P] : AddConfigPropAndReturn<T[P], U> & AddApiKeys<T, U>;
} & AddApiKeys<T, U>;
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
}) => Promise<any>;

export { type AddConfigPropAndReturn, type ApiCall, type CombinedFluentApi, type Ctx, type FluentApi, fluent, run };
