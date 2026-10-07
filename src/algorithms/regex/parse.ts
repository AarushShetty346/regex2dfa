/**
 * Regular-expression parser.
 *
 * Supported syntax (whitespace is ignored):
 *   ab      concatenation
 *   a|b     alternation (union)
 *   a*      Kleene star        a+  one or more        a?  zero or one
 *   (a)     grouping
 *   ε       the empty string (or `\e`, which is easier to type)
 *   \x      escape: matches the operator character x literally (e.g. `\*`, `\(`)
 *
 * Any other printable character is a literal symbol.
 *
 * Grammar (precedence: postfix ops > concatenation > alternation):
 *   alt    := concat ('|' concat)*
 *   concat := repeat repeat*
 *   repeat := atom ('*' | '+' | '?')*
 *   atom   := symbol | ε | '(' alt ')'
 */

export type RegexNode =
  | { kind: 'symbol'; id: number; symbol: string }
  | { kind: 'epsilon'; id: number }
  | { kind: 'concat'; id: number; left: RegexNode; right: RegexNode }
  | { kind: 'union'; id: number; left: RegexNode; right: RegexNode }
  | { kind: 'star'; id: number; child: RegexNode }
  | { kind: 'plus'; id: number; child: RegexNode }
  | { kind: 'optional'; id: number; child: RegexNode };

export const EPSILON = 'ε';

const OPERATORS = new Set(['|', '*', '+', '?', '(', ')']);

export class RegexSyntaxError extends Error {
  constructor(
    message: string,
    /** Index into the original input where the problem was found. */
    public readonly position: number,
  ) {
    super(message);
    this.name = 'RegexSyntaxError';
  }
}

type Token =
  | { type: 'symbol'; value: string; pos: number }
  | { type: 'epsilon'; pos: number }
  | { type: 'op'; value: string; pos: number };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (/\s/.test(c)) continue;
    if (c === '\\') {
      const next = input[i + 1];
      if (next === undefined) throw new RegexSyntaxError('Trailing backslash: escape what?', i);
      tokens.push(next === 'e' ? { type: 'epsilon', pos: i } : { type: 'symbol', value: next, pos: i });
      i++;
    } else if (c === EPSILON) {
      tokens.push({ type: 'epsilon', pos: i });
    } else if (OPERATORS.has(c)) {
      tokens.push({ type: 'op', value: c, pos: i });
    } else {
      tokens.push({ type: 'symbol', value: c, pos: i });
    }
  }
  return tokens;
}

/** Parse `input` into an AST. Throws `RegexSyntaxError` with a position on bad input. */
export function parseRegex(input: string): RegexNode {
  const tokens = tokenize(input);
  if (tokens.length === 0) throw new RegexSyntaxError('Enter a regular expression.', 0);

  let pos = 0;
  let nextId = 0;
  const peek = () => tokens[pos];
  const at = () => peek()?.pos ?? input.length;
  const isOp = (v: string) => peek()?.type === 'op' && (peek() as { value: string }).value === v;

  function alt(): RegexNode {
    let left = concat();
    while (isOp('|')) {
      pos++;
      const right = concat();
      left = { kind: 'union', id: nextId++, left, right };
    }
    return left;
  }

  function startsAtom() {
    const t = peek();
    return t !== undefined && (t.type !== 'op' || t.value === '(');
  }

  function concat(): RegexNode {
    if (!startsAtom()) {
      const t = peek();
      if (t === undefined) throw new RegexSyntaxError('Expression ends where an operand was expected.', at());
      const v = (t as { value: string }).value;
      if (v === '|' || v === ')')
        throw new RegexSyntaxError(`Empty operand before '${v}'. Use ε for the empty string.`, at());
      throw new RegexSyntaxError(`'${v}' has nothing to apply to.`, at());
    }
    let left = repeat();
    while (startsAtom()) {
      const right = repeat();
      left = { kind: 'concat', id: nextId++, left, right };
    }
    return left;
  }

  function repeat(): RegexNode {
    let node = atom();
    while (isOp('*') || isOp('+') || isOp('?')) {
      const op = (peek() as { value: string }).value;
      pos++;
      const kind = op === '*' ? 'star' : op === '+' ? 'plus' : 'optional';
      node = { kind, id: nextId++, child: node };
    }
    return node;
  }

  function atom(): RegexNode {
    const t = tokens[pos++];
    if (t.type === 'symbol') return { kind: 'symbol', id: nextId++, symbol: t.value };
    if (t.type === 'epsilon') return { kind: 'epsilon', id: nextId++ };
    // Only '(' reaches here (startsAtom guards the rest).
    const inner = alt();
    if (!isOp(')')) throw new RegexSyntaxError(`Missing ')' for the '(' at character ${t.pos + 1}.`, at());
    pos++;
    return inner;
  }

  const tree = alt();
  if (pos < tokens.length) {
    const t = peek() as { value: string };
    throw new RegexSyntaxError(
      t.value === ')' ? "Unmatched ')'." : `Unexpected '${t.value}'.`,
      at(),
    );
  }
  return tree;
}

/** Nodes in post-order: children before parents. This is the order Thompson's construction runs in. */
export function postOrder(node: RegexNode): RegexNode[] {
  const out: RegexNode[] = [];
  const visit = (n: RegexNode) => {
    if (n.kind === 'concat' || n.kind === 'union') {
      visit(n.left);
      visit(n.right);
    } else if (n.kind === 'star' || n.kind === 'plus' || n.kind === 'optional') {
      visit(n.child);
    }
    out.push(n);
  };
  visit(node);
  return out;
}

const PREC: Record<RegexNode['kind'], number> = {
  union: 1,
  concat: 2,
  star: 3,
  plus: 3,
  optional: 3,
  symbol: 4,
  epsilon: 4,
};

/** Pretty-print a (sub)tree with the minimum parentheses needed. */
export function regexToString(node: RegexNode): string {
  const wrap = (child: RegexNode, min: number) => {
    const s = regexToString(child);
    return PREC[child.kind] < min ? `(${s})` : s;
  };
  switch (node.kind) {
    case 'symbol':
      return OPERATORS.has(node.symbol) || node.symbol === '\\' ? `\\${node.symbol}` : node.symbol;
    case 'epsilon':
      return EPSILON;
    case 'concat':
      return wrap(node.left, 2) + wrap(node.right, 2);
    case 'union':
      return `${wrap(node.left, 1)}|${wrap(node.right, 1)}`;
    case 'star':
      return `${wrap(node.child, 4)}*`;
    case 'plus':
      return `${wrap(node.child, 4)}+`;
    case 'optional':
      return `${wrap(node.child, 4)}?`;
  }
}

/** Postfix (reverse Polish) form with an explicit concatenation operator `•`. */
export function toPostfix(node: RegexNode): string {
  return postOrder(node)
    .map((n) => {
      switch (n.kind) {
        case 'symbol':
          return n.symbol;
        case 'epsilon':
          return EPSILON;
        case 'concat':
          return '•';
        case 'union':
          return '|';
        case 'star':
          return '*';
        case 'plus':
          return '+';
        case 'optional':
          return '?';
      }
    })
    .join(' ');
}

/** The input alphabet: every distinct literal symbol, sorted. */
export function alphabetOf(node: RegexNode): string[] {
  const set = new Set<string>();
  for (const n of postOrder(node)) if (n.kind === 'symbol') set.add(n.symbol);
  return [...set].sort();
}
