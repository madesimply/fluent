import { methods as stringMethods, Methods as StringMethods } from '../validator/string';
import { methods as emailMethods, Methods as EmailMethods } from '../api/email';
import { methods as userMethods, Methods as UserMethods } from '../api/users';
import { fluent, run } from '../../dist';


const api = {
  v: stringMethods as StringMethods,
  a: {
    email: emailMethods as EmailMethods,
    user: userMethods as UserMethods,
  }
}

const { v, a } = fluent(api);

const register = 
  v.string.pattern(/^\S+@\S+\.\S+$/.source).required.
  a.user.register.
  a.user.registered(a.email.welcome);

const emails = [
  "test@bob.com",
  undefined,
];

emails.forEach(email => {
  console.log(run({ ops: register, ctx: { value: email, errors: [] }, api }));
});