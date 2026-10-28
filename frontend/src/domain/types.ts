// Data shapes from the brief. Money is always integer paise (₹1,250.50 = 125050).

export const CATEGORIES = ['Food', 'Travel', 'Stay', 'Activities', 'Other'] as const;
export type Category = (typeof CATEGORIES)[number];

export type MemberId = string;
/** Integer number of paise. */
export type Paise = number;

export interface Member {
  id: MemberId;
  name: string;
}

export type Split =
  | { type: 'equal'; memberIds: MemberId[] }
  | { type: 'exact'; shares: Record<MemberId, Paise> }
  /** Percent per member, up to 2 decimals (e.g. 33.33), as in the brief's JSON. */
  | { type: 'percent'; shares: Record<MemberId, number> };

export type SplitType = Split['type'];

export interface Expense {
  id: string;
  description: string;
  amount: Paise;
  paidBy: MemberId;
  /** YYYY-MM-DD */
  date: string;
  category: Category;
  split: Split;
}

export function isCategory(value: unknown): value is Category {
  return CATEGORIES.some((category) => category === value);
}
