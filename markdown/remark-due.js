function tokenizeDates(eat, value, silent) {
  const match = /^@due\((.*)\)/.exec(value);

  if (match) {
    if (silent) {
      return true;
    }

    return eat(match[0])({
      type: "due",
      value: match[0],
      date: match[1],
      children: [{ type: "text", value: match[0] }]
    });
  }
}

function locateDue(value, fromIndex) {
  return value.indexOf("@", fromIndex);
}

tokenizeDates.notInLink = true;
tokenizeDates.locator = locateDue;

function remarkDates() {
  if (this.Compiler) {
    const Compiler = this.Compiler;
    const visitors = Compiler.prototype.visitors;

    visitors.due = node => node.value;
  }

  if (this.Parser) {
    const Parser = this.Parser;
    const tokenizers = Parser.prototype.inlineTokenizers;
    const methods = Parser.prototype.inlineMethods;

    tokenizers["due"] = tokenizeDates;

    methods.splice(methods.indexOf("text"), 0, "due");
  }
}

module.exports = remarkDates;
