// Display formatting. Integer/string operations only: no floats, no locale data needed.

import type { Paise, Split } from './types';

/** Indian digit grouping: 10000000 -> "1,00,00,000" (last three digits, then pairs). */
function groupIndian(digits: string): string {
  const lastThree = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return rest === '' ? lastThree : `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`;
}

/** 10000000 paise -> "₹1,00,000.00"; negative values get a leading "-". */
export function formatINR(paise: Paise): string {
  const abs = Math.abs(paise);
  const fraction = abs % 100;
  const rupees = (abs - fraction) / 100;
  const sign = paise < 0 ? '-' : '';
  return `${sign}₹${groupIndian(String(rupees))}.${String(fraction).padStart(2, '0')}`;
}

/** Basis points -> "33.33" / "100" for messages. */
export function formatPercent(basisPoints: number): string {
  const fraction = basisPoints % 100;
  const whole = (basisPoints - fraction) / 100;
  return fraction === 0 ? String(whole) : `${whole}.${String(fraction).padStart(2, '0').replace(/0$/, '')}`;
}

const SPLIT_LABEL: Record<Split['type'], string> = {
  equal: 'Equally',
  exact: 'Exact amounts',
  percent: 'Percentages',
};

/** "Equally, 4 people" / "Exact amounts, 3 people" / "Percentages, 1 person" */
export function describeSplit(split: Split): string {
  const count = split.type === 'equal' ? split.memberIds.length : Object.keys(split.shares).length;
  return `${SPLIT_LABEL[split.type]}, ${count} ${count === 1 ? 'person' : 'people'}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-03-12" -> "12 Mar 2026" (string-based, so no timezone shifts). */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  const monthName = MONTHS[Number(month) - 1];
  if (year === undefined || day === undefined || monthName === undefined) return isoDate;
  return `${String(Number(day))} ${monthName} ${year}`;
}
