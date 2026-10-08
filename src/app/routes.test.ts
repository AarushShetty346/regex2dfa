import { describe, expect, it } from 'vitest';
import { parseHash, topicHref } from './routes';

describe('parseHash', () => {
  it('keeps every existing route working', () => {
    for (const id of ['home', 'regex-dfa', 'bottom-up', 'first-follow', 'top-down']) {
      expect(parseHash(`#/${id}`).page).toBe(id);
      expect(parseHash(`#${id}`).page).toBe(id);
    }
  });

  it('sends empty and unknown hashes home', () => {
    expect(parseHash('').page).toBe('home');
    expect(parseHash('#/').page).toBe('home');
    expect(parseHash('#/nope').page).toBe('home');
  });

  it('reads the query after the page id', () => {
    const r = parseHash('#/regex-dfa?re=(a%7Cb)*&stage=min');
    expect(r.page).toBe('regex-dfa');
    expect(r.params.get('re')).toBe('(a|b)*');
    expect(r.params.get('stage')).toBe('min');
  });

  it('round-trips links built with topicHref', () => {
    const href = topicHref('regex-dfa', { re: '(a|ε)b+a?', stage: 'test' });
    const r = parseHash(href);
    expect(r.params.get('re')).toBe('(a|ε)b+a?');
    expect(r.params.get('stage')).toBe('test');
  });
});
