import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { subscribeToAllTransactions, deleteTransaction } from '../lib/db';
import { Transaction } from '../types';
import { Trash2 } from 'lucide-react';

export default function LedgerView() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToAllTransactions(user.uid, (data) => {
      setTransactions(data);
      if (loading) setLoading(false);
    });
    return unsub;
  }, [user]);

  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  const handleDelete = async (txId: string) => {
    if (!user) return;
    await deleteTransaction(user.uid, txId);
    setDeletingTxId(null);
  };

  if (loading) return <div className="text-center py-12 text-teal-400 text-xs">جاري التحميل...</div>;


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-xl font-serif italic text-white">دفتر اليومية المجمع</h2>
          <p className="text-[10px] text-teal-400 mt-1 uppercase tracking-wide">جميع القيود في جدول واحد</p>
        </div>
        <span className="text-[10px] text-gray-500">{transactions.length} Records</span>
      </div>

      <div className="bg-[#161616] rounded-2xl border border-white/5 shadow-2xl overflow-hidden overflow-x-auto w-full">
        <table className="w-full min-w-[1200px] divide-y divide-white/5">
          <thead className="bg-[#111111] border-b border-white/10">
            <tr>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">التاريخ</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">العملية</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">رقم الفاتورة</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">حساب المدين</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">حساب الدائن</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">نقداً</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">الوزن</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">الوزن العربي</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">العيار</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">العدد</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">اسم العميل</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">رقم التليفون</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">سعر السوق</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">المعامل</th>
              <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">ملاحظات</th>
              <th className="px-6 py-4 text-center text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.length === 0 && (
              <tr>
                <td colSpan={16} className="px-6 py-8 text-center text-xs text-gray-500">لا توجد سجلات.</td>
              </tr>
            )}
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-300">
                  {tx.transactionDate || new Date(tx.createdAt).toLocaleDateString('ar-EG')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                  {tx.operationType || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                  {tx.invoiceNumber || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                  {tx.debitAccount || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                  {tx.creditAccount || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-teal-500 font-mono">
                  {tx.cashAmount ? Math.round(Number(tx.cashAmount)).toLocaleString('en-US') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-yellow-500 font-mono">
                  {tx.weight ? Number(tx.weight).toFixed(2) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-yellow-400 font-mono">
                  {tx.weightArabic ? Number(tx.weightArabic).toFixed(2) : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                  {tx.caliber || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                  {tx.quantity || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                  {tx.customerName || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                  {tx.phoneNumber || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-teal-500 font-mono">
                  {tx.marketPrice ? Number(tx.marketPrice).toLocaleString('en-US') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-mono">
                  {tx.factor || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 truncate max-w-[200px]" title={tx.notes}>
                  {tx.notes || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {deletingTxId === tx.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleDelete(tx.id!)} className="bg-red-500/20 text-red-500 px-2 py-1 rounded text-[10px] hover:bg-red-500/30 font-bold transition-all">تأكيد</button>
                      <button onClick={() => setDeletingTxId(null)} className="bg-white/5 text-gray-400 px-2 py-1 rounded text-[10px] hover:bg-white/10 font-bold transition-all">إلغاء</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingTxId(tx.id!)}
                      className="p-1.5 text-red-500/70 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                      title="حذف القيد"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
