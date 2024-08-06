type AddApiKeys<T, U> = {
    [K in keyof U]: U[K] extends (...args: infer P) => any ? P extends [infer Ctx, ...infer Rest] ? (...args: Rest) => AddConfigPropAndReturn<U, U> : AddConfigPropAndReturn<U, U> : AddConfigPropAndReturn<U[K], U>;
};
type AddConfigPropAndReturn<T, U> = T extends (...args: any[]) => any ? Parameters<T> extends [infer Ctx, ...infer Rest] ? ((...args: Rest) => AddConfigPropAndReturn<U, U>) & AddApiKeys<T, U> : AddConfigPropAndReturn<U, U> & AddApiKeys<T, U> : {
    [P in keyof T]: T[P] extends (...args: any[]) => any ? Parameters<T[P]> extends [infer Ctx, ...infer Rest] ? ((...args: Rest) => AddConfigPropAndReturn<U, U>) & AddApiKeys<T, U> : AddConfigPropAndReturn<U, U> & AddApiKeys<T, U> & T[P] : AddConfigPropAndReturn<T[P], U>;
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
type Ctx = any;
declare const run: ({ op, ctx, api }: {
    op: any;
    ctx: Ctx;
    api: any;
}) => Promise<any>;
declare const parseOp: (op: string, fluent: any) => any;

export { type AddConfigPropAndReturn, type ApiCall, type CombinedFluentApi, type FluentApi, fluent, parseOp, run };
