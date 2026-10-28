// Balance = what a member paid minus their share of every expense they are part of.
// Positive: they get money back. Shares of each expense sum exactly to its amount, so the
// balances of all members always add up to exactly 0.

import { sharesFor } from './allocation';
import { formatINR } from './format';
import type { Expense, Member, MemberId, Paise } from './types';

export interface MemberBalance {
  memberId: MemberId;
  name: string;
  balance: Paise;
}

export function computeBalances(members: readonly Member[], expenses: readonly Expense[]): MemberBalance[] {
  const memberOrder = members.map((m) => m.id);
  const totals = new Map<MemberId, Paise>(memberOrder.map((id) => [id, 0]));
  const add = (id: MemberId, paise: Paise): void => {
    const current = totals.get(id);
    if (current === undefined) throw new Error(`Unknown member ${id}`);
    totals.set(id, current + paise);
  };

  for (const expense of expenses) {
    add(expense.paidBy, expense.amount); // the payer need not be part of the split
    for (const [memberId, share] of Object.entries(sharesFor(expense, memberOrder))) {
      add(memberId, -share);
    }
  }
  return members.map((m) => ({ memberId: m.id, name: m.name, balance: totals.get(m.id) ?? 0 }));
}

export function describeBalance(balance: Paise): string {
  if (balance > 0) return `gets back ${formatINR(balance)}`;
  if (balance < 0) return `owes ${formatINR(-balance)}`;
  return 'settled up';
}
