'use client';
import { useState } from 'react';
import EntryPage from '../../components/EntryPage';

export default function Page() {
  const [open, setOpen] = useState(false);
  return (
    <EntryPage
      table="expenses"
      title="Expenses"
      noun="expenses"
      cats={['Ingredients', 'Wages', 'Rent', 'Utilities', 'Supplies', 'Transport']}
      open={open}
      onClose={() => setOpen(false)}
      renderActions={() => (
        <button type="button" onClick={() => setOpen(true)}>Add Expense</button>
      )}
    />
  );
}
