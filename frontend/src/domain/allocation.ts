// Splitting an amount into integer paise without losing or inventing a paisa.
//
// Rule (used for both equal and percentage splits): everyone first gets their exact share
// rounded down to the paisa. The leftover paise (fewer than the number of people) go one each
// to the people whose shares were rounded down the most; ties go to whoever comes first in
// the trip's member list. So ₹100 split equally between Aarav, Diya and Kabir is
// 33.34 + 33.33 + 33.33.

import { percentToBasisPoints } from './money';
import type { Expense, MemberId, Paise } from './types';

export interface Weight {
  memberId: MemberId;
  /** Non-negative integer: 1 for an equal split, basis points for a percentage split. */
  weight: number;
}

/**
 * Largest-remainder allocation. `weights` must be in trip member order; that order breaks ties.
 * Uses only exact integer arithmetic (all intermediate values stay far below 2^53).
 */
export function allocate(total: Paise, weights: readonly Weight[]): Record<MemberId, Paise> {
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new RangeError(`total must be a non-negative integer number of paise, got ${total}`);
  }
  const weightSum = weights.reduce((sum, w) => sum + w.weight, 0);
  if (weights.some((w) => !Number.isSafeInteger(w.weight) || w.weight < 0) || weightSum <= 0) {
    throw new RangeError('weights must be non-negative integers with a positive sum');
  }

  const parts = weights.map((w, index) => {
    const scaled = total * w.weight;
    const remainder = scaled % weightSum;
    return { memberId: w.memberId, index, base: (scaled - remainder) / weightSum, remainder };
  });

  let leftover = total - parts.reduce((sum, p) => sum + p.base, 0);
  const byLargestRemainder = [...parts].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index,
  );
  const extra = new Set<number>();
  for (const part of byLargestRemainder) {
    if (leftover === 0) break;
    extra.add(part.index);
    leftover -= 1;
  }

  const shares: Record<MemberId, Paise> = {};
  for (const part of parts) {
    shares[part.memberId] = part.base + (extra.has(part.index) ? 1 : 0);
  }
  return shares;
}

/**
 * Each participant's share of one expense, in paise. `memberOrder` is the trip's member list
 * order (used for tie-breaking, never the JSON key order). Throws if the expense references
 * unknown members; stored and entered data is validated before it gets here.
 */
export function sharesFor(expense: Expense, memberOrder: readonly MemberId[]): Record<MemberId, Paise> {
  const { split, amount } = expense;
  const known = new Set(memberOrder);
  const participants =
    split.type === 'equal' ? split.memberIds : Object.keys(split.shares);
  const unknown = participants.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new Error(`Expense ${expense.id} refers to unknown members: ${unknown.join(', ')}`);
  }

  switch (split.type) {
    case 'equal': {
      const selected = new Set(split.memberIds);
      return allocate(
        amount,
        memberOrder.filter((id) => selected.has(id)).map((memberId) => ({ memberId, weight: 1 })),
      );
    }
    case 'exact':
      return { ...split.shares };
    case 'percent': {
      const weights = memberOrder.flatMap((memberId) => {
        const percent = split.shares[memberId];
        if (percent === undefined) return [];
        const basisPoints = percentToBasisPoints(percent);
        if (basisPoints === null) {
          throw new Error(`Expense ${expense.id} has an invalid percentage for ${memberId}`);
        }
        return [{ memberId, weight: basisPoints }];
      });
      return allocate(amount, weights);
    }
  }
}
