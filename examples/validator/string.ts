const isString = (ctx: any) => {
  ctx.errors = ctx.errors || [];
  if (typeof ctx.value !== "string") {
    ctx.errors.push("Value must be a string");
  }
};

const pattern = (ctx: any, args: string) => {
  isString(ctx);
  const regexp = new RegExp(args);
  const matchesPattern = regexp.test(ctx.value);
  if (!matchesPattern) {
    ctx.errors.push("Value must match the pattern");
  }
};

const equals = (ctx: any, args: string) => {
  isString(ctx);
  const isEqual = ctx.value === args;
  if (!isEqual) {
    ctx.errors.push("Value must be equal to the argument");
  }
};

const required = (ctx: any) => {
  isString(ctx);
  const hasValue = ctx.value !== undefined && ctx.value !== null;
  if (!hasValue) {
    ctx.errors.push("Value is required");
  }
};

export type Methods = {
  string: {
    pattern: (regexp: string) => void;
    equals: (data: string) => void;
    required: () => void;
  };
};

export const methods = {
  string: {
    required,
    pattern,
    equals,
  },
};
