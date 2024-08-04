import { fluent, run } from "../../dist";
import { methods as stringMethods, Methods as StringMethods } from './string';

const api = {
  v: stringMethods as StringMethods,
}

const { v } = fluent(api);

const isEmail = v.string.pattern(/^\S+@\S+\.\S+$/.source).required;

const emails = [
  "test@email.com",
  undefined,
  12324,
  "invalidemail",
];

emails.forEach(async email => {
  console.log(run({ op: isEmail, ctx: { value: email }, api }));
});
