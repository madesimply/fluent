var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// dist/index.js
var require_dist = __commonJS({
  "dist/index.js"(exports2, module2) {
    var __defProp2 = Object.defineProperty;
    var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames2 = Object.getOwnPropertyNames;
    var __hasOwnProp2 = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    var src_exports = {};
    __export(src_exports, {
      fluent: () => fluent2,
      run: () => run3
    });
    module2.exports = __toCommonJS(src_exports);
    function fluent2(apiStructure) {
      const createProxy = (parentCalls = [], currentPath = [], currentTarget = apiStructure) => {
        const calls = [...parentCalls];
        const handler = {
          get(_, prop) {
            if (prop === "toJSON") {
              return () => calls;
            }
            if (typeof prop === "string") {
              const newPath = [...currentPath, prop];
              const fullPath = newPath.join(".");
              const isNamespace = typeof currentTarget[prop] === "object";
              if (isNamespace) {
                return createProxy(calls, newPath, currentTarget[prop]);
              } else {
                if (prop in apiStructure) {
                  return createProxy(calls, [prop], apiStructure[prop]);
                }
                calls.push({ method: fullPath });
                const proxy2 = new Proxy(function(...args) {
                  calls[calls.length - 1].args = args;
                  return createProxy(calls, currentPath, currentTarget);
                }, handler);
                return proxy2;
              }
            }
            return void 0;
          }
        };
        const isFunction = typeof currentTarget === "function";
        const func = isFunction ? (...args) => {
          calls.push({ method: currentPath.join("."), args });
          return createProxy(calls, currentPath, currentTarget);
        } : () => {
        };
        const proxy = new Proxy(func, handler);
        proxy.toJSON = () => calls;
        return proxy;
      };
      const rootProxy = new Proxy({}, {
        get(_, prop) {
          if (prop === "toJSON") {
            return () => [];
          }
          return createProxy([], [prop], apiStructure[prop]);
        }
      });
      rootProxy.toJSON = () => [];
      return rootProxy;
    }
    var run3 = ({ op: op2, ctx: ctx2, api: api2 }) => {
      const config = JSON.parse(JSON.stringify(op2));
      if (typeof ctx2 !== "object") {
        throw new Error("The context object must be an object");
      }
      if ("run" in ctx2 || "ops" in ctx2) {
        throw new Error('The context object cannot have properties named "run" or "ops"');
      }
      Object.defineProperties(ctx2, {
        run: {
          value: (op22) => run3({ op: op22, ctx: ctx2, api: api2 }),
          enumerable: false,
          writable: false,
          configurable: false
        },
        ops: {
          value: [],
          enumerable: true,
          writable: false,
          configurable: false
        }
      });
      const executeOperation = (item) => {
        const { method: path, args = [] } = item;
        const splitPath = path.split(".");
        const method = splitPath.reduce((acc, key) => acc[key], api2);
        return method(ctx2, ...args);
      };
      const executeChain = async (startIndex) => {
        for (let i = startIndex; i < config.length; i++) {
          const result = executeOperation(config[i]);
          if (result instanceof Promise) {
            const resolvedResult = await result;
            ctx2.ops.push({ path: config[i].method, args: config[i].args, result: resolvedResult });
          } else {
            ctx2.ops.push({ path: config[i].method, args: config[i].args, result });
          }
        }
        return ctx2;
      };
      for (let i = 0; i < config.length; i++) {
        const result = executeOperation(config[i]);
        if (result instanceof Promise) {
          return executeChain(i).then(() => ctx2);
        } else {
          ctx2.ops.push({ path: config[i].method, args: config[i].args, result });
        }
      }
      return ctx2;
    };
  }
});

// examples/api/index.ts
var import_dist2 = __toESM(require_dist());

// examples/api/email.ts
var welcome = (ctx2) => {
  const success = Math.random() > 0.5;
  if (!success && !ctx2.errors.length) {
    ctx2.errors.push(`Failed to send welcome email to: ${ctx2.value}`);
  }
};
var checkin = (ctx2) => {
  const success = Math.random() > 0.5;
  if (!success && !ctx2.errors.length) {
    ctx2.errors.push(`Failed to send checkin email to: ${ctx2.value}`);
  }
};
var methods = {
  welcome,
  checkin
};

// examples/api/users.ts
var import_dist = __toESM(require_dist());
var register = (ctx2) => {
  const success = Math.random() > 0.2;
  if (!success && !ctx2.errors.length) {
    ctx2.errors.push(`Failed to register user with email: ${ctx2.value}`);
  }
};
var registered = (ctx2, ifUser, ifGuest) => {
  const isRegistered = Math.random() > 0.2;
  ctx2.isRegistered = isRegistered;
  if (isRegistered && !ctx2.errors.length) {
    (0, import_dist.run)({ api: ctx2.api, ops: ifUser, ctx: ctx2 });
  } else if (!isRegistered && ifGuest) {
    (0, import_dist.run)({ api: ctx2.api, ops: ifGuest, ctx: ctx2 });
  }
};
var methods2 = {
  register,
  registered
};

// examples/api/index.ts
var api = {
  a: {
    email: methods,
    user: methods2
  }
};
var { a } = (0, import_dist2.fluent)(api);
var email = "bob@email.com";
var op = a.user.registered(a.email.checkin, a.email.welcome);
var ctx = { value: email, errors: [] };
console.log((0, import_dist2.run)({ op, ctx, api }));
