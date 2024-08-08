import { fluent } from "../dist/index.js";

const api = {
  test() {
    return "test";
  },
  namespace: {
    levelone() {
      return "levelone test";
    },
    deep: {
      leveltwo() {
        return "leveltwo test";
      }
    }
  }
}

const root = fluent(api);

const chainOne = root.test.namespace.levelone;

const rootTwo = fluent(api, JSON.parse(JSON.stringify(chainOne)));

console.log(JSON.stringify(rootTwo.deep.leveltwo.test));