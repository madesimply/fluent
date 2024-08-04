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

// examples/api/email.ts
var email_exports = {};
__export(email_exports, {
  methods: () => methods
});
module.exports = __toCommonJS(email_exports);
var welcome = (ctx) => {
  const success = Math.random() > 0.5;
  if (!success && !ctx.errors.length) {
    ctx.errors.push(`Failed to send welcome email to: ${ctx.value}`);
  }
};
var checkin = (ctx) => {
  const success = Math.random() > 0.5;
  if (!success && !ctx.errors.length) {
    ctx.errors.push(`Failed to send checkin email to: ${ctx.value}`);
  }
};
var methods = {
  welcome,
  checkin
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  methods
});
