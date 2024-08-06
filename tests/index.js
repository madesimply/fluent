
import { fluent, run, chain } from "../dist/index.js";

const api = {
  baseMethod(opts) {
    opts.ctx.baseMethod = true;
    opts.ctx.fromBaseMethod = true;
    opts.run({ op: api.namespace.method, ctx: opts.ctx });
  },
  baseMethodWithArgs(opts, arg1, arg2) {
    opts.ctx.baseMethodWithArgs = [arg1, arg2];
  },
  namespace: {
    method(opts) {
      opts.ctx['namespace.method'] = true;
      opts.ctx['namespace.method.secondRun'] = opts.ctx.fromBaseMethod;
    },
    methodWithArgs(opts, arg1, arg2) {
      opts.ctx['namespace.methodWithArgs'] = [arg1, arg2];
    },
    nestedNamespace: {
      method(opts) {
        opts.ctx['namespace.nestedNamespace.method'] = true;
      },
      methodWithArgs(opts, arg1, arg2) {
        opts.ctx['namespace.nestedNamespace.methodWithArgs'] = [arg1, arg2];
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
const ctx = {};
run({ api, ctx, op: root.baseMethod }).then(res => {
  console.assert(ctx.baseMethod === true, 'run - baseMethod');
})

run({ api, ctx, op: root.baseMethodWithArgs(1, 2) }).then(res => {
  console.assert(ctx.baseMethodWithArgs[0] === 1 && ctx.baseMethodWithArgs[1] === 2, 'run - baseMethodWithArgs');
})

run({ api, ctx, op: root.namespace.method }).then(res => {
  console.assert(ctx['namespace.method'] === true, 'run - namespace.method');
})

run({ api, ctx, op: root.namespace.methodWithArgs(1, 2) }).then(res => {
  console.assert(ctx['namespace.methodWithArgs'][0] === 1 && ctx['namespace.methodWithArgs'][1] === 2, 'run - namespace.methodWithArgs');
})  

run({ api, ctx, op: root.namespace.nestedNamespace.method }).then(res => {
  console.assert(ctx['namespace.nestedNamespace.method'] === true, 'run - namespace.nestedNamespace.method');
})

run({ api, ctx, op: root.namespace.nestedNamespace.methodWithArgs(1, 2) }).then(res => {
  console.assert(ctx['namespace.nestedNamespace.methodWithArgs'][0] === 1 && ctx['namespace.nestedNamespace.methodWithArgs'][1] === 2, 'run - namespace.nestedNamespace.methodWithArgs');
})

run({ api, ctx, op: root.baseMethod }).then(res => {
  console.assert(ctx['namespace.method.secondRun'] === true, 'run - namespace.method.secondRun');
})

// Test parsing 
const opString = JSON.stringify(root.namespace.nestedNamespace.methodWithArgs(1, 2));
const parsedOp = chain(opString, root);

console.assert(JSON.stringify(parsedOp) === '[{"method":"namespace.nestedNamespace.methodWithArgs","args":[1,2]}]', 'chain');

console.assert(JSON.stringify(parsedOp.baseMethod) === '[{"method":"namespace.nestedNamespace.methodWithArgs","args":[1,2]},{"method":"baseMethod"}]', 'chain - chainable');