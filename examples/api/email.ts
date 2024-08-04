const welcome = (ctx: any) => {
  // send welcome email
  const success = Math.random() > 0.5;
  if (!success && !ctx.errors.length) {
    ctx.errors.push(`Failed to send welcome email to: ${ctx.value}`);
  }
}

const checkin = (ctx: any) => {
  const success = Math.random() > 0.5;
  if (!success && !ctx.errors.length) {
    ctx.errors.push(`Failed to send checkin email to: ${ctx.value}`);
  }
}

export type Methods = {
  welcome: () => void;
  checkin: () => void;
};

export const methods = {
  welcome,
  checkin,
};
