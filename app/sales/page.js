


import EntryPage from '../../components/EntryPage';
export default function Page() {
  return <EntryPage table="sales" title="Sales & Income" noun="sale" cats={['Daily sales', 'Catering', 'Invoice payment', 'Other income']} />;
}