import { parseTripData } from '../domain/parse';
import type { Expense, Member } from '../domain/types';
import sampleJson from '../data/sample-data.json';

/** The brief's sample data, validated exactly like the app does at startup. */
export function sampleData(): { members: Member[]; expenses: Expense[] } {
  const data = parseTripData(sampleJson);
  if (data === null) throw new Error('sample-data.json failed validation');
  return data;
}
