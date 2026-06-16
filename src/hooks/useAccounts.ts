import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { subscribeToAllTransactions } from '../lib/db';

export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToAllTransactions(user.uid, (transactions) => {
      const uniqueAccounts = new Set<string>();
      transactions.forEach(tx => {
        if (tx.debitAccount) uniqueAccounts.add(tx.debitAccount);
        if (tx.creditAccount) uniqueAccounts.add(tx.creditAccount);
      });
      // also add standard ones just in case
      ['الخزنة', 'تيفيت الكسر', 'مخزون الذهب عيار 18', 'مخزون الذهب عيار 21', 'مخزون الذهب عيار 24', 'كسر افرنجي', 'الصافي'].forEach(a => uniqueAccounts.add(a));
      setAccounts(Array.from(uniqueAccounts).sort());
    });
    return () => unsub();
  }, [user]);

  return accounts;
}
