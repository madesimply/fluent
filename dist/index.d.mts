type AddApiKeys<T, U> = {
    [K in keyof U]: FluentApi<U[K], U>;
};
type AddConfigPropAndReturn<T, U> = T extends (...args: any[]) => any ? Parameters<T> extends never[] ? AddConfigPropAndReturn<U, U> & AddApiKeys<T, U> : ((...args: Parameters<T>) => AddConfigPropAndReturn<U, U> & AddApiKeys<T, U>) & AddApiKeys<T, U> : {
    [P in keyof T]: T[P] extends (...args: any[]) => any ? Parameters<T[P]> extends never[] ? AddConfigPropAndReturn<Omit<T, P>, U> & AddApiKeys<T, U> : ((...args: Parameters<T[P]>) => AddConfigPropAndReturn<Omit<T, P>, U> & AddApiKeys<T, U>) & AddApiKeys<T, U> : AddConfigPropAndReturn<T[P], U> & AddApiKeys<T, U>;
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
type ExcludeProps<T, K extends keyof any> = {
    [P in keyof T as P extends K ? never : P]: T[P];
};
type NoOpsOrRun<T> = ExcludeProps<T, 'ops' | 'run'>;
declare const run: ({ op, ctx: _ctx, api }: {
    op: any;
    ctx: NoOpsOrRun<Ctx>;
    api: any;
}) => any | Promise<any>;

export { type AddApiKeys, type AddConfigPropAndReturn, type ApiCall, type CombinedFluentApi, type Ctx, type FluentApi, fluent, run };
