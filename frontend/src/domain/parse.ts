// Defensive parsing of data from outside the type system (localStorage, the sample JSON file).
// Values are narrowed from `unknown` with type guards and rebuilt as fresh objects: no casts.
// Any invalid record makes the whole input invalid (callers then fall back to the sample data).

import { isValidIsoDate } from './dates';
import { FULL_PERCENT_BP, MAX_AMOUNT_PAISE, percentToBasisPoints } from './money';
import { isCategory, type Expense, type Member, type MemberId, type Paise, type Split } from './types';
import { DESCRIPTION_MAX_LENGTH } from './validation';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function parseMembers(value: unknown): Member[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const members: Member[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isNonEmptyString(item.id) || !isNonEmptyString(item.name)) return null;
    members.push({ id: item.id, name: item.name });
  }
  return new Set(members.map((m) => m.id)).size === members.length ? members : null;
}

function parseSplit(value: unknown, amount: Paise, known: ReadonlySet<MemberId>): Split | null {
  if (!isRecord(value)) return null;

  if (value.type === 'equal') {
    const ids = value.memberIds;
    if (!Array.isArray(ids) || ids.length === 0) return null;
    const memberIds: MemberId[] = [];
    for (const id of ids) {
      if (typeof id !== 'string' || !known.has(id)) return null;
      memberIds.push(id);
    }
    return new Set(memberIds).size === memberIds.length ? { type: 'equal', memberIds } : null;
  }

  if (value.type !== 'exact' && value.type !== 'percent') return null;
  const raw = value.shares;
  if (!isRecord(raw)) return null;
  const entries = Object.entries(raw);
  if (entries.length === 0 || entries.some(([id]) => !known.has(id))) return null;

  if (value.type === 'exact') {
    const shares: Record<MemberId, Paise> = {};
    let sum = 0;
    for (const [id, share] of entries) {
      if (typeof share !== 'number' || !Number.isSafeInteger(share) || share < 0) return null;
      shares[id] = share;
      sum += share;
    }
    return sum === amount ? { type: 'exact', shares } : null;
  }

  const shares: Record<MemberId, number> = {};
  let totalBasisPoints = 0;
  for (const [id, percent] of entries) {
    if (typeof percent !== 'number') return null;
    const basisPoints = percentToBasisPoints(percent);
    if (basisPoints === null || basisPoints > FULL_PERCENT_BP) return null;
    shares[id] = percent;
    totalBasisPoints += basisPoints;
  }
  return totalBasisPoints === FULL_PERCENT_BP ? { type: 'percent', shares } : null;
}

function parseExpense(value: unknown, known: ReadonlySet<MemberId>): Expense | null {
  if (!isRecord(value)) return null;
  const { id, description, amount, paidBy, date, category, split } = value;
  if (!isNonEmptyString(id) || !isNonEmptyString(description)) return null;
  if (Array.from(description.trim()).length > DESCRIPTION_MAX_LENGTH) return null;
  if (typeof amount !== 'number' || !Number.isSafeInteger(amount)) return null;
  if (amount <= 0 || amount > MAX_AMOUNT_PAISE) return null;
  if (typeof paidBy !== 'string' || !known.has(paidBy)) return null;
  if (typeof date !== 'string' || !isValidIsoDate(date)) return null;
  if (!isCategory(category)) return null;
  const parsedSplit = parseSplit(split, amount, known);
  if (parsedSplit === null) return null;
  return { id, description, amount, paidBy, date, category, split: parsedSplit };
}

/** A list of expenses that all reference `members`; null if anything is malformed. */
export function parseExpenses(value: unknown, members: readonly Member[]): Expense[] | null {
  if (!Array.isArray(value)) return null;
  const known = new Set(members.map((m) => m.id));
  const expenses: Expense[] = [];
  for (const item of value) {
    const expense = parseExpense(item, known);
    if (expense === null) return null;
    expenses.push(expense);
  }
  return new Set(expenses.map((e) => e.id)).size === expenses.length ? expenses : null;
}

/** The `{ members, expenses }` shape of src/data/sample-data.json. */
export function parseTripData(value: unknown): { members: Member[]; expenses: Expense[] } | null {
  if (!isRecord(value)) return null;
  const members = parseMembers(value.members);
  if (members === null) return null;
  const expenses = parseExpenses(value.expenses, members);
  return expenses === null ? null : { members, expenses };
}
