// Add-expense form validation. Every field is checked independently so that pressing Save
// shows an error next to every field that breaks a rule; nothing is saved unless all pass.

import { isValidIsoDate } from './dates';
import { formatINR, formatPercent } from './format';
import {
  basisPointsToPercent,
  FULL_PERCENT_BP,
  MAX_AMOUNT_PAISE,
  parseHundredths,
  type HundredthsParse,
} from './money';
import { isCategory, type Expense, type Member, type MemberId, type Paise, type Split, type SplitType } from './types';

export const DESCRIPTION_MAX_LENGTH = 60;

/** Raw form state: everything is kept as typed, and only converted on Save. */
export interface ExpenseDraft {
  description: string;
  amount: string;
  paidBy: string;
  date: string;
  category: string;
  splitType: SplitType;
  equalSelected: Record<MemberId, boolean>;
  exactInputs: Record<MemberId, string>;
  percentInputs: Record<MemberId, string>;
}

export interface FieldErrors {
  description?: string;
  amount?: string;
  paidBy?: string;
  date?: string;
  category?: string;
  /** Error for the split as a whole (nobody selected, totals do not match). */
  split?: string;
  /** Errors for individual member inputs in exact / percentage mode. */
  shares?: Record<MemberId, string>;
}

export type ValidationResult = { ok: true; expense: Expense } | { ok: false; errors: FieldErrors };

export const AMOUNT_MUST_BE_POSITIVE = 'Amount must be more than ₹0'; // wording required by the brief

function amountError(parsed: HundredthsParse): string | undefined {
  switch (parsed.kind) {
    case 'empty':
      return 'Amount is required';
    case 'negative':
      return AMOUNT_MUST_BE_POSITIVE;
    case 'too-many-decimals':
      return 'Amount can have at most 2 decimal places';
    case 'too-large':
      return `Amount must be at most ${formatINR(MAX_AMOUNT_PAISE)}`;
    case 'invalid':
      return 'Enter an amount in rupees, for example 1250.50';
    case 'ok':
      if (parsed.value === 0) return AMOUNT_MUST_BE_POSITIVE;
      if (parsed.value > MAX_AMOUNT_PAISE) return `Amount must be at most ${formatINR(MAX_AMOUNT_PAISE)}`;
      return undefined;
  }
}

/** Per-member exact share in paise: blank means 0 (not part of the split). */
function shareError(parsed: HundredthsParse): string | undefined {
  switch (parsed.kind) {
    case 'ok':
    case 'empty':
      return undefined;
    case 'negative':
      return 'Must be ₹0 or more';
    case 'too-many-decimals':
      return 'At most 2 decimal places';
    case 'too-large':
    case 'invalid':
      return 'Enter an amount such as 500 or 499.50';
  }
}

/** Per-member percentage in basis points: blank means 0. */
function percentError(parsed: HundredthsParse): string | undefined {
  switch (parsed.kind) {
    case 'ok':
      return parsed.value > FULL_PERCENT_BP ? 'Must be between 0 and 100' : undefined;
    case 'empty':
      return undefined;
    case 'negative':
      return 'Must be between 0 and 100';
    case 'too-many-decimals':
      return 'At most 2 decimal places';
    case 'too-large':
    case 'invalid':
      return 'Enter a percentage such as 25 or 33.33';
  }
}

const valueOrZero = (parsed: HundredthsParse): number => (parsed.kind === 'ok' ? parsed.value : 0);

interface SplitOutcome {
  split?: Split;
  error?: string;
  shareErrors: Record<MemberId, string>;
}

function validateSplit(draft: ExpenseDraft, members: readonly Member[], amount: Paise | undefined): SplitOutcome {
  const shareErrors: Record<MemberId, string> = {};

  if (draft.splitType === 'equal') {
    const memberIds = members.filter((m) => draft.equalSelected[m.id] === true).map((m) => m.id);
    return memberIds.length === 0
      ? { error: 'Select at least one member to split between', shareErrors }
      : { split: { type: 'equal', memberIds }, shareErrors };
  }

  const inputs = draft.splitType === 'exact' ? draft.exactInputs : draft.percentInputs;
  const checkOne = draft.splitType === 'exact' ? shareError : percentError;
  const values = new Map<MemberId, number>();
  for (const member of members) {
    const parsed = parseHundredths(inputs[member.id] ?? '');
    const error = checkOne(parsed);
    if (error !== undefined) shareErrors[member.id] = error;
    values.set(member.id, valueOrZero(parsed));
  }
  if (Object.keys(shareErrors).length > 0) return { shareErrors };

  const total = [...values.values()].reduce((sum, v) => sum + v, 0);
  const included = members.filter((m) => (values.get(m.id) ?? 0) > 0);

  if (draft.splitType === 'exact') {
    // Without a valid total amount there is nothing to compare the shares against yet.
    if (amount === undefined) return { shareErrors };
    if (total < amount) return { error: `${formatINR(amount - total)} left to assign`, shareErrors };
    if (total > amount) return { error: `${formatINR(total - amount)} over the total`, shareErrors };
    const shares: Record<MemberId, Paise> = {};
    for (const m of included) shares[m.id] = values.get(m.id) ?? 0;
    return { split: { type: 'exact', shares }, shareErrors };
  }

  if (total !== FULL_PERCENT_BP) {
    return {
      error: `Percentages add up to ${formatPercent(total)}%; they must total exactly 100%`,
      shareErrors,
    };
  }
  const shares: Record<MemberId, number> = {};
  for (const m of included) shares[m.id] = basisPointsToPercent(values.get(m.id) ?? 0);
  return { split: { type: 'percent', shares }, shareErrors };
}

/** `today` is "YYYY-MM-DD" in the user's timezone; `newId` becomes the expense id on success. */
export function validateExpenseDraft(
  draft: ExpenseDraft,
  members: readonly Member[],
  today: string,
  newId: string,
): ValidationResult {
  const errors: FieldErrors = {};

  const description = draft.description.trim();
  if (description === '') errors.description = 'Description is required';
  else if (Array.from(description).length > DESCRIPTION_MAX_LENGTH) {
    errors.description = `Description must be at most ${String(DESCRIPTION_MAX_LENGTH)} characters`;
  }

  const parsedAmount = parseHundredths(draft.amount);
  const amountProblem = amountError(parsedAmount);
  if (amountProblem !== undefined) errors.amount = amountProblem;
  const amount = amountProblem === undefined && parsedAmount.kind === 'ok' ? parsedAmount.value : undefined;

  const payer = members.find((m) => m.id === draft.paidBy);
  if (payer === undefined) errors.paidBy = 'Choose who paid';

  if (draft.date === '') errors.date = 'Date is required';
  else if (!isValidIsoDate(draft.date)) errors.date = 'Enter a valid date';
  else if (draft.date > today) errors.date = 'Date cannot be in the future';

  const category = draft.category;
  if (!isCategory(category)) errors.category = 'Choose a category';

  const splitOutcome = validateSplit(draft, members, amount);
  if (splitOutcome.error !== undefined) errors.split = splitOutcome.error;
  if (Object.keys(splitOutcome.shareErrors).length > 0) errors.shares = splitOutcome.shareErrors;

  if (
    Object.keys(errors).length > 0 ||
    amount === undefined ||
    payer === undefined ||
    !isCategory(category) ||
    splitOutcome.split === undefined
  ) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    expense: {
      id: newId,
      description,
      amount,
      paidBy: payer.id,
      date: draft.date,
      category,
      split: splitOutcome.split,
    },
  };
}
