import { fluent, run } from "../../dist";
import { methods as emailMethods, Methods as EmailMethods } from './email';
import { methods as userMethods, Methods as UserMethods } from './users';

const api = {
  a: {
    email: emailMethods as EmailMethods,
    user: userMethods as UserMethods,
  }
}

const { a } = fluent(api);

const email = "bob@email.com";

const op = a.user.registered(a.email.checkin, a.email.welcome);

const ctx = { value: email, errors: [] };

console.log(run({ op, ctx, api }));
