import { describe, expect, it } from 'vitest';
import { describeGraph, nextZoom } from './describe';

describe('describeGraph', () => {
  it('lists every node with its start/accepting flags and merged outgoing edges', () => {
    const rows = describeGraph(
      [
        { id: 'd0', label: 'A', start: true },
        { id: 'd1', label: 'B', accepting: true },
      ],
      [
        { from: 'd0', to: 'd1', label: 'a' },
        { from: 'd0', to: 'd1', label: 'b' },
        { from: 'd1', to: 'd1', label: 'a' },
      ],
    );
    expect(rows).toEqual([
      { id: 'd0', label: 'A', start: true, accepting: false, out: [{ label: 'a, b', to: 'B' }] },
      { id: 'd1', label: 'B', start: false, accepting: true, out: [{ label: 'a', to: 'B' }] },
    ]);
  });

  it('keeps tree edges unlabeled and in child order', () => {
    const rows = describeGraph(
      [
        { id: 't0', label: '|' },
        { id: 't1', label: 'a' },
        { id: 't2', label: 'b' },
      ],
      [
        { from: 't0', to: 't1', label: '' },
        { from: 't0', to: 't2', label: '' },
      ],
    );
    expect(rows[0].out).toEqual([
      { label: '', to: 'a' },
      { label: '', to: 'b' },
    ]);
    expect(rows[1].out).toEqual([]);
  });
});

describe('nextZoom', () => {
  it('steps through the zoom levels and clamps at both ends', () => {
    expect(nextZoom(1, 1)).toBe(1.25);
    expect(nextZoom(1.1, 1)).toBe(1.25);
    expect(nextZoom(1.1, -1)).toBe(1);
    expect(nextZoom(3, 1)).toBe(3);
    expect(nextZoom(0.5, -1)).toBe(0.5);
  });
});
