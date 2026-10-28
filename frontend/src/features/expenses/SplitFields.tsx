import type { Member, MemberId, SplitType } from '../../domain/types';
import type { ExpenseDraft, FieldErrors } from '../../domain/validation';
import { FieldError, describedBy } from './FieldError';

const SPLIT_OPTIONS: { value: SplitType; label: string }[] = [
  { value: 'equal', label: 'Equally' },
  { value: 'exact', label: 'Exact amounts' },
  { value: 'percent', label: 'Percentages' },
];

interface SplitFieldsProps {
  members: Member[];
  draft: ExpenseDraft;
  errors: FieldErrors;
  onSplitTypeChange: (type: SplitType) => void;
  onSelectedChange: (memberId: MemberId, selected: boolean) => void;
  onShareChange: (field: 'exactInputs' | 'percentInputs', memberId: MemberId, value: string) => void;
}

export function SplitFields({
  members,
  draft,
  errors,
  onSplitTypeChange,
  onSelectedChange,
  onShareChange,
}: SplitFieldsProps) {
  const type = draft.splitType;

  return (
    <fieldset className="split" aria-describedby={describedBy('split', errors.split)}>
      <legend>Split</legend>
      <div className="choice-row">
        {SPLIT_OPTIONS.map((option) => (
          <label key={option.value} className="choice">
            <input
              type="radio"
              name="splitType"
              value={option.value}
              checked={type === option.value}
              onChange={() => { onSplitTypeChange(option.value); }}
            />
            {option.label}
          </label>
        ))}
      </div>

      {type === 'equal' ? (
        <fieldset className="split__members">
          <legend>Split equally between</legend>
          <div className="choice-row">
            {members.map((m) => (
              <label key={m.id} className="choice">
                <input
                  type="checkbox"
                  id={`equal-${m.id}`}
                  checked={draft.equalSelected[m.id] === true}
                  onChange={(e) => { onSelectedChange(m.id, e.target.checked); }}
                />
                {m.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="share-grid">
          <p className="field-hint">
            {type === 'exact'
              ? 'Enter each person’s share in ₹. Leave blank for anyone not included.'
              : 'Enter each person’s percentage. They must add up to 100.'}
          </p>
          {members.map((m) => {
            const id = `${type}-${m.id}`;
            const field = type === 'exact' ? 'exactInputs' : 'percentInputs';
            const error = errors.shares?.[m.id];
            return (
              <div key={m.id} className="share-row">
                <label htmlFor={id}>
                  {m.name} ({type === 'exact' ? '₹' : '%'})
                </label>
                <input
                  id={id}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={draft[field][m.id] ?? ''}
                  onChange={(e) => { onShareChange(field, m.id, e.target.value); }}
                  aria-invalid={error !== undefined}
                  aria-describedby={describedBy(id, error)}
                />
                <FieldError id={id} message={error} />
              </div>
            );
          })}
        </div>
      )}

      <FieldError id="split" message={errors.split} />
    </fieldset>
  );
}
