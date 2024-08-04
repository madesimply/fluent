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
      run: () => run2
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
    function isPromise(value) {
      return value instanceof Promise;
    }
    var run2 = ({ ops, ctx, api: api2 }) => {
      const config = JSON.parse(JSON.stringify(ops));
      ctx.api = api2;
      let hasPromise = false;
      const results = config.map((item) => {
        const { method: path, args = [] } = item;
        const splitPath = path.split(".");
        const method = splitPath.reduce((acc, key) => acc[key], api2);
        const result = method(ctx, ...args);
        if (isPromise(result)) {
          hasPromise = true;
        }
        return result;
      });
      if (hasPromise) {
        return Promise.all(results).then(() => {
          return ctx;
        });
      }
      return ctx;
    };
  }
});

// examples/validator/index.ts
var import_dist = __toESM(require_dist());

// examples/validator/string.ts
var isString = (ctx) => {
  ctx.errors = ctx.errors || [];
  if (typeof ctx.value !== "string") {
    ctx.errors.push("Value must be a string");
  }
};
var pattern = (ctx, args) => {
  isString(ctx);
  const regexp = new RegExp(args);
  const matchesPattern = regexp.test(ctx.value);
  if (!matchesPattern) {
    ctx.errors.push("Value must match the pattern");
  }
};
var equals = (ctx, args) => {
  isString(ctx);
  const isEqual = ctx.value === args;
  if (!isEqual) {
    ctx.errors.push("Value must be equal to the argument");
  }
};
var required = (ctx) => {
  isString(ctx);
  const hasValue = ctx.value !== void 0 && ctx.value !== null;
  if (!hasValue) {
    ctx.errors.push("Value is required");
  }
};
var methods = {
  string: {
    required,
    pattern,
    equals
  }
};

// examples/validator/index.ts
var api = {
  v: methods
};
var { v } = (0, import_dist.fluent)(api);
var isEmail = v.string.pattern(/^\S+@\S+\.\S+$/.source).required;
var emails = [
  "test@email.com",
  void 0,
  12324,
  "invalidemail"
];
emails.forEach((email) => {
  console.log((0, import_dist.run)({ ops: isEmail, ctx: { value: email }, api }));
});
