import { run } from "../../dist";

const register = (ctx: any) => {
  // register user
  const success = Math.random() > 0.2;
  if (!success && !ctx.errors.length) {
    ctx.errors.push(`Failed to register user with email: ${ctx.value}`);
  }
}

const registered = (ctx: any, ifUser: any, ifGuest?: any) => {
  // send welcome email
  const isRegistered = Math.random() > 0.2;
  ctx.isRegistered = isRegistered;
  if (isRegistered && !ctx.errors.length) {
    run({ api: ctx.api, ops: ifUser, ctx });
  } else if (!isRegistered && ifGuest) {
    run({ api: ctx.api, ops: ifGuest, ctx });
  }
}

export type Methods = {
  register: () => void;
  registered: (ifUser: any, ifGuest?: any) => void;
};

export const methods = {
  register,
  registered,
};
