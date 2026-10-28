import { useState, type SubmitEvent } from 'react';
import { CATEGORIES, type Expense, type Member, type MemberId, type SplitType } from '../../domain/types';
import { validateExpenseDraft, type ExpenseDraft, type FieldErrors } from '../../domain/validation';
import { FieldError, describedBy } from './FieldError';
import { SplitFields } from './SplitFields';

interface AddExpenseFormProps {
  members: Member[];
  /** "YYYY-MM-DD"; the default date and the latest allowed date. */
  today: string;
  createId: () => string;
  onSave: (expense: Expense) => void;
  onCancel: () => void;
}

function emptyDraft(members: readonly Member[], today: string): ExpenseDraft {
  return {
    description: '',
    amount: '',
    paidBy: '',
    date: today,
    category: '',
    splitType: 'equal',
    // Everyone is selected by default for an equal split; untick people who were not there.
    equalSelected: Object.fromEntries(members.map((m) => [m.id, true])),
    exactInputs: {},
    percentInputs: {},
  };
}

const TOP_FIELDS = ['description', 'amount', 'paidBy', 'date', 'category'] as const;

/** The id of the first control with an error, in on-screen order. */
function firstInvalidControl(errors: FieldErrors, draft: ExpenseDraft, members: readonly Member[]): string | null {
  for (const field of TOP_FIELDS) {
    if (errors[field] !== undefined) return field;
  }
  const withShareError = members.find((m) => errors.shares?.[m.id] !== undefined);
  if (withShareError !== undefined) return `${draft.splitType}-${withShareError.id}`;
  const first = members[0];
  return errors.split !== undefined && first !== undefined ? `${draft.splitType}-${first.id}` : null;
}

export function AddExpenseForm({ members, today, createId, onSave, onCancel }: AddExpenseFormProps) {
  const [draft, setDraft] = useState<ExpenseDraft>(() => emptyDraft(members, today));
  // Errors appear after the first Save attempt, then update as the user fixes each field.
  const [attempted, setAttempted] = useState(false);

  const check = attempted ? validateExpenseDraft(draft, members, today, '') : null;
  const errors: FieldErrors = check !== null && !check.ok ? check.errors : {};
  const hasErrors = Object.keys(errors).length > 0;

  const setField = <K extends keyof ExpenseDraft>(key: K, value: ExpenseDraft[K]): void => {
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const setMemberValue = (
    field: 'exactInputs' | 'percentInputs',
    memberId: MemberId,
    value: string,
  ): void => {
    setDraft((current) => ({ ...current, [field]: { ...current[field], [memberId]: value } }));
  };
  const setSelected = (memberId: MemberId, selected: boolean): void => {
    setDraft((current) => ({
      ...current,
      equalSelected: { ...current.equalSelected, [memberId]: selected },
    }));
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const result = validateExpenseDraft(draft, members, today, createId());
    if (result.ok) {
      onSave(result.expense);
      return;
    }
    setAttempted(true);
    const target = firstInvalidControl(result.errors, draft, members);
    if (target !== null) document.getElementById(target)?.focus();
  };

  return (
    <form className="expense-form" noValidate onSubmit={handleSubmit}>
      {attempted && hasErrors && (
        <p className="form-alert" role="alert">
          Some fields need attention. Nothing has been saved yet.
        </p>
      )}

      <div className="field">
        <label htmlFor="description">Description</label>
        <input
          id="description"
          type="text"
          autoComplete="off"
          value={draft.description}
          onChange={(e) => { setField('description', e.target.value); }}
          aria-invalid={errors.description !== undefined}
          aria-describedby={describedBy('description', errors.description, 'description-hint')}
        />
        <p id="description-hint" className="field-hint">Up to 60 characters.</p>
        <FieldError id="description" message={errors.description} />
      </div>

      <div className="field">
        <label htmlFor="amount">Amount (₹)</label>
        <input
          id="amount"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={draft.amount}
          onChange={(e) => { setField('amount', e.target.value); }}
          aria-invalid={errors.amount !== undefined}
          aria-describedby={describedBy('amount', errors.amount)}
        />
        <FieldError id="amount" message={errors.amount} />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="paidBy">Paid by</label>
          <select
            id="paidBy"
            value={draft.paidBy}
            onChange={(e) => { setField('paidBy', e.target.value); }}
            aria-invalid={errors.paidBy !== undefined}
            aria-describedby={describedBy('paidBy', errors.paidBy)}
          >
            <option value="">Choose who paid</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <FieldError id="paidBy" message={errors.paidBy} />
        </div>

        <div className="field">
          <label htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            max={today}
            value={draft.date}
            onChange={(e) => { setField('date', e.target.value); }}
            aria-invalid={errors.date !== undefined}
            aria-describedby={describedBy('date', errors.date)}
          />
          <FieldError id="date" message={errors.date} />
        </div>

        <div className="field">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={draft.category}
            onChange={(e) => { setField('category', e.target.value); }}
            aria-invalid={errors.category !== undefined}
            aria-describedby={describedBy('category', errors.category)}
          >
            <option value="">Choose a category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <FieldError id="category" message={errors.category} />
        </div>
      </div>

      <SplitFields
        members={members}
        draft={draft}
        errors={errors}
        onSplitTypeChange={(type: SplitType) => { setField('splitType', type); }}
        onSelectedChange={setSelected}
        onShareChange={setMemberValue}
      />

      <div className="form-actions">
        <button type="submit" className="button button--primary">
          Save expense
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
