const fs = require("fs");
const markdown = require("remark-parse");
const stringify = require("remark-stringify");
const unified = require("unified");
const { format } = require("date-fns");

const text = fs.readFileSync("./test/index.md", { encoding: "utf-8" });

function tokenizeDue(eat, value, silent) {
  const match = /^@due\((.*)\)/.exec(value);

  if (match) {
    console.log({ match, value });

    if (silent) {
      return true;
    }

    return eat(match[0])({
      type: "due",
      value,
      date: match[1],
      children: [{ type: "text", value: match[0] }]
    });
  }
}

function locateDue(value, fromIndex) {
  return value.indexOf("@", fromIndex);
}

tokenizeDue.notInLink = true;
tokenizeDue.locator = locateDue;

function dueTag() {
  if (this.Compiler) {
    const Compiler = this.Compiler;
    const visitors = Compiler.prototype.visitors;

    visitors.due = node => {
      // this might be not needed at all - we can just highlight the dates in UI/cli tools
      const today = format(Date.now(), "YYYY-MM-DD");
      return node.date === today ? "@today" : node.value;
    };
  }

  if (this.Parser) {
    const Parser = this.Parser;
    const tokenizers = Parser.prototype.inlineTokenizers;
    const methods = Parser.prototype.inlineMethods;

    tokenizers["due"] = tokenizeDue;

    methods.splice(methods.indexOf("text"), 0, "due");
  }
}

const parsed = unified()
  .use(markdown)
  .use(dueTag)
  .parse(text);

parsed.children[1].children[0].checked = true;

console.log(parsed.children[1].children[0].children[0]);

const stringified = unified()
  .use(stringify, { listItemIndent: 1 })
  .use(dueTag)
  .stringify(parsed);

console.log(stringified);
