export type AddApiKeys<T, U> = {
  [K in keyof U]: U[K] extends (...args: infer P) => any
    ? P extends [infer Ctx, ...infer Rest]
      ? (...args: Rest) => AddArgsAndReturn<U, U>
      : AddArgsAndReturn<U, U>
    : AddArgsAndReturn<U[K], U>;
} & { run: (ctx?: any) => any; goto: (chain: ValidChain<U>) => AddArgsAndReturn<U, U> };

export type AddArgsAndReturn<T, U> = T extends (...args: any[]) => any
  ? Parameters<T> extends [infer Ctx, ...infer Rest]
    ? ((...args: Rest) => AddArgsAndReturn<U, U> & { run: (ctx?: any) => any; goto: (chain: ValidChain<U>) => AddArgsAndReturn<U, U> }) & AddApiKeys<T, U>
    : (() => AddArgsAndReturn<U, U> & { run: (ctx?: any) => any; goto: (chain: ValidChain<U>) => AddArgsAndReturn<U, U> }) & AddApiKeys<T, U>
  : {
      [P in keyof T]: T[P] extends (...args: any[]) => any
        ? Parameters<T[P]> extends [infer Ctx, ...infer Rest]
          ? ((...args: Rest) => AddArgsAndReturn<U, U> & { run: (ctx?: any) => any; goto: (chain: ValidChain<U>) => AddArgsAndReturn<U, U> }) & AddApiKeys<T, U>
          : AddArgsAndReturn<U, U> & AddApiKeys<T, U> & { run: (ctx?: any) => any; goto: (chain: ValidChain<U>) => AddArgsAndReturn<U, U> }
        : AddArgsAndReturn<T[P], U> & { goto: (chain: ValidChain<U>) => AddArgsAndReturn<U, U> };
    } & { run: (ctx?: any) => any; goto: (chain: ValidChain<U>) => AddArgsAndReturn<U, U> };

export type ValidChain<U> = U extends (...args: any[]) => any
  ? ((...args: Parameters<U>) => any) | (() => any)
  : { [K in keyof U]: ValidChain<U[K]> };

export type FluentApi<V, U> = AddArgsAndReturn<V, U>;

export type CombinedFluentApi<T> = {
  [K in keyof T]: FluentApi<T[K], T>;
};

export type ApiCall = { method: string; args?: any[]; goto?: any };