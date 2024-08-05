
const { fluent, run } = require("../dist/index.js");

const api = {
  baseMethod(opts) {
  },
  baseMethodWithArgs(opts, arg1, arg2) {
  },
  namespace: {
    method() {
    },
    methodWithArgs(opts, arg1, arg2) {
    },
    nestedNamespace: {
      method() {
      },
      methodWithArgs(opts, arg1, arg2) {
      },
    }
  }
}

// Run tests
const root = fluent(api);

// Test base method
console.assert(JSON.stringify(root.baseMethod) === '[{"method":"baseMethod"}]', 'failed: baseMethod');

// Test base method with args
console.assert(JSON.stringify(root.baseMethodWithArgs(1, 2)) === '[{"method":"baseMethodWithArgs","args":[1,2]}]', 'failed: baseMethodWithArgs');

// Test namespace method
console.assert(JSON.stringify(root.namespace.method) === '[{"method":"namespace.method"}]', 'failed: namespace.method');

// Test namespace method with args
console.assert(JSON.stringify(root.namespace.methodWithArgs(1, 2)) === '[{"method":"namespace.methodWithArgs","args":[1,2]}]', 'failed: namespace.methodWithArgs');

// Test nested namespace method
console.assert(JSON.stringify(root.namespace.nestedNamespace.method) === '[{"method":"namespace.nestedNamespace.method"}]', 'failed: namespace.nestedNamespace.method');

// Test nested namespace method with args
console.assert(JSON.stringify(root.namespace.nestedNamespace.methodWithArgs(1, 2)) === '[{"method":"namespace.nestedNamespace.methodWithArgs","args":[1,2]}]', 'failed: namespace.nestedNamespace.methodWithArgs');
