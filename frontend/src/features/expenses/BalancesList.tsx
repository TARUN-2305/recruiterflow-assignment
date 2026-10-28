import { describeBalance, type MemberBalance } from '../../domain/balances';

export function BalancesList({ balances }: { balances: MemberBalance[] }) {
  return (
    <ul className="balances">
      {balances.map(({ memberId, name, balance }) => (
        <li
          key={memberId}
          className={`balance ${balance > 0 ? 'balance--credit' : balance < 0 ? 'balance--debit' : ''}`}
        >
          <span className="balance__name">{name}</span>
          <span className="balance__amount">{describeBalance(balance)}</span>
        </li>
      ))}
    </ul>
  );
}
