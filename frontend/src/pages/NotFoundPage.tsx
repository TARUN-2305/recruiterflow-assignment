import { Link } from 'react-router';
import { usePageHeading } from '../app/usePageHeading';

export function NotFoundPage() {
  const headingRef = usePageHeading('Page not found');
  return (
    <section className="page">
      <h1 ref={headingRef} tabIndex={-1}>
        Page not found
      </h1>
      <p>There is no page at this address.</p>
      <p>
        <Link to="/">Back to Expenses</Link>
      </p>
    </section>
  );
}
