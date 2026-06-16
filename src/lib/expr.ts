// Safe arithmetic expression evaluator for numeric inputs.
// Supports +, -, *, /, parentheses, decimals. No eval().

const TOKEN_RE = /\s*([()+\-*/]|\d+\.?\d*|\.\d+)/g;

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(input)) !== null) {
    if (match.index !== lastIndex) return []; // unexpected character
    tokens.push(match[1]);
    lastIndex = TOKEN_RE.lastIndex;
  }
  if (lastIndex !== input.length) return [];
  return tokens;
}

// Recursive-descent parser: expr -> term (("+"|"-") term)*
//                            term -> factor (("*"|"/") factor)*
//                            factor -> number | "(" expr ")" | "-" factor
class Parser {
  private tokens: string[];
  private pos = 0;

  constructor(tokens: string[]) {
    this.tokens = tokens;
  }

  parse(): number | null {
    if (this.tokens.length === 0) return null;
    const value = this.parseExpr();
    if (value == null || this.pos !== this.tokens.length) return null;
    return value;
  }

  private parseExpr(): number | null {
    let value = this.parseTerm();
    if (value == null) return null;
    while (this.tokens[this.pos] === "+" || this.tokens[this.pos] === "-") {
      const op = this.tokens[this.pos++];
      const rhs = this.parseTerm();
      if (rhs == null) return null;
      value = op === "+" ? value + rhs : value - rhs;
    }
    return value;
  }

  private parseTerm(): number | null {
    let value = this.parseFactor();
    if (value == null) return null;
    while (this.tokens[this.pos] === "*" || this.tokens[this.pos] === "/") {
      const op = this.tokens[this.pos++];
      const rhs = this.parseFactor();
      if (rhs == null) return null;
      if (op === "/" && rhs === 0) return null;
      value = op === "*" ? value * rhs : value / rhs;
    }
    return value;
  }

  private parseFactor(): number | null {
    const tok = this.tokens[this.pos];
    if (tok === "-") {
      this.pos++;
      const value = this.parseFactor();
      return value == null ? null : -value;
    }
    if (tok === "(") {
      this.pos++;
      const value = this.parseExpr();
      if (value == null || this.tokens[this.pos] !== ")") return null;
      this.pos++;
      return value;
    }
    if (tok != null && /^\d*\.?\d+$|^\d+\.?\d*$/.test(tok)) {
      this.pos++;
      return Number(tok);
    }
    return null;
  }
}

// Evaluates a plain number or arithmetic expression (e.g. "2*3", "[8+9]",
// "12.5 + 3 * 2"). Returns null if the input isn't a valid number or
// expression, or contains an operator with too few operands (e.g. "/0").
export function evalExpression(input: string): number | null {
  const trimmed = input.trim().replace(/^\[|\]$/g, "");
  if (trimmed === "") return null;

  if (/^-?\d*\.?\d+$/.test(trimmed)) return Number(trimmed);

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) return null;
  return new Parser(tokens).parse();
}

// True if the raw text looks like it contains an arithmetic operator
// (so the caller knows to evaluate rather than treat it as a plain number).
export function isExpression(input: string): boolean {
  const trimmed = input.trim().replace(/^\[|\]$/g, "");
  return /[+\-*/()]/.test(trimmed.slice(1)) || /^[+*/]/.test(trimmed);
}
