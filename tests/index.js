
import { fluent, toChain } from "../dist/index.js";

const api = {
  baseMethod(ctx) {
    ctx.baseMethod = true;
    ctx.fromBaseMethod = true;
    return ctx;
  },
  baseMethodWithArgs(opts, arg1, arg2) {
    ctx.baseMethodWithArgs = [arg1, arg2];
    return ctx;
  },
  namespace: {
    method(ctx) {
      ctx['namespace.method'] = true;
      ctx['namespace.method.secondRun'] = ctx.fromBaseMethod;
      return ctx;
    },
    methodWithArgs(opts, arg1, arg2) {
      ctx['namespace.methodWithArgs'] = [arg1, arg2];
      return ctx;
    },
    nestedNamespace: {
      method(ctx) {
        ctx['namespace.nestedNamespace.method'] = true;
        return ctx;
      },
      methodWithArgs(opts, arg1, arg2) {
        ctx['namespace.nestedNamespace.methodWithArgs'] = [arg1, arg2];
        return ctx;
      },
    }
  }
}

const root = fluent(api);

// Chain tests
console.assert(JSON.stringify(root.baseMethod) === '[{"method":"baseMethod"}]', 'chain - baseMethod');

console.assert(JSON.stringify(root.baseMethodWithArgs(1, 2)) === '[{"method":"baseMethodWithArgs","args":[1,2]}]', 'chain - baseMethodWithArgs');

console.assert(JSON.stringify(root.namespace.method) === '[{"method":"namespace.method"}]', 'chain - namespace.method');

console.assert(JSON.stringify(root.namespace.methodWithArgs(1, 2)) === '[{"method":"namespace.methodWithArgs","args":[1,2]}]', 'chain - namespace.methodWithArgs');

console.assert(JSON.stringify(root.namespace.nestedNamespace.method) === '[{"method":"namespace.nestedNamespace.method"}]', 'chain - namespace.nestedNamespace.method');

console.assert(JSON.stringify(root.namespace.nestedNamespace.methodWithArgs(1, 2)) === '[{"method":"namespace.nestedNamespace.methodWithArgs","args":[1,2]}]', 'chain - namespace.nestedNamespace.methodWithArgs');

console.assert(JSON.stringify(root.namespace.method.baseMethodWithArgs(1,2)) === '[{"method":"namespace.method"},{"method":"baseMethodWithArgs","args":[1,2]}]', 'chain - baseMethodWithArgs');

// Run tests
let ctx = {};
ctx = await root.baseMethod.run(ctx);
console.assert(ctx.baseMethod === true, 'run - baseMethod');

ctx = await root.baseMethodWithArgs(1, 2).run(ctx);
console.assert(ctx.baseMethodWithArgs[0] === 1 && ctx.baseMethodWithArgs[1] === 2, 'run - baseMethodWithArgs');

ctx = await root.namespace.method.run(ctx);
console.assert(ctx['namespace.method'] === true, 'run - namespace.method');

ctx = await root.namespace.methodWithArgs(1, 2).run(ctx);
console.assert(ctx['namespace.methodWithArgs'][0] === 1 && ctx['namespace.methodWithArgs'][1] === 2, 'run - namespace.methodWithArgs');

ctx = await root.namespace.nestedNamespace.method.run(ctx);
console.assert(ctx['namespace.nestedNamespace.method'] === true, 'run - namespace.nestedNamespace.method');

ctx = await root.namespace.nestedNamespace.methodWithArgs(1, 2).run(ctx);
console.assert(ctx['namespace.nestedNamespace.methodWithArgs'][0] === 1 && ctx['namespace.nestedNamespace.methodWithArgs'][1] === 2, 'run - namespace.nestedNamespace.methodWithArgs');

ctx = await root.baseMethod.run(ctx);
console.assert(ctx['namespace.method.secondRun'] === true, 'run - namespace.method.secondRun');

// Test parsing 
const opString = JSON.stringify(root.namespace.nestedNamespace.methodWithArgs(1, 2));
const parsedOp = toChain(opString, root);

console.assert(JSON.stringify(parsedOp) === '[{"method":"namespace.nestedNamespace.methodWithArgs","args":[1,2]}]', 'chain');

console.assert(JSON.stringify(parsedOp.baseMethod) === '[{"method":"namespace.nestedNamespace.methodWithArgs","args":[1,2]},{"method":"baseMethod"}]', 'chain - chainable');