import { parseTripData } from '../domain/parse';
import type { Expense, Member } from '../domain/types';
import sampleJson from './sample-data.json';

/**
 * The brief's sample trip, validated with the same rules as saved data (no type casts).
 * Returns a fresh copy each time so no two stores share objects.
 */
export function sampleTripData(): { members: Member[]; expenses: Expense[] } {
  const data = parseTripData(structuredClone(sampleJson));
  if (data === null) throw new Error('src/data/sample-data.json is not valid trip data');
  return data;
}
