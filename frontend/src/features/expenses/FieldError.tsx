/** The error shown directly under a field; linked to it via aria-describedby. */
export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (message === undefined) return null;
  return (
    <p id={`${id}-error`} className="field-error">
      {message}
    </p>
  );
}

/** aria-describedby value: optional hint id plus the error id when there is an error. */
export function describedBy(id: string, error: string | undefined, hintId?: string): string | undefined {
  const ids = [hintId, error === undefined ? undefined : `${id}-error`].filter(
    (value): value is string => value !== undefined,
  );
  return ids.length > 0 ? ids.join(' ') : undefined;
}
