'use client';
import { useState } from 'react';
import EntryPage from '../../components/EntryPage';

export default function Page() {
  const [open, setOpen] = useState(false);
  return (
    <EntryPage
      table="sales"
      title="Sales & Income"
      noun="sale"
      cats={['Daily sales', 'Catering', 'Invoice payment', 'Other income']}
      open={open}
      onClose={() => setOpen(false)}
      renderActions={() => (
        <button type="button" onClick={() => setOpen(true)}>Add Revenue</button>
      )}
    />
  );
}
