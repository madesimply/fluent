var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// examples/validator/string.ts
var string_exports = {};
__export(string_exports, {
  methods: () => methods
});
module.exports = __toCommonJS(string_exports);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  methods
});
