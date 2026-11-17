import EntryPage from '../../components/EntryPage';
export default function Page() {
  return <EntryPage table="expenses" title="Expenses" noun="expense" cats={['Ingredients', 'Wages', 'Rent', 'Utilities', 'Supplies', 'Transport']} />;
}
