import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { subscribeToAllTransactions, subscribeToSections, subscribeToAllOperations } from '../lib/db';
import { Transaction, Section, Operation } from '../types';
import { Calendar, Wallet, ArrowDownRight, ArrowUpRight, Ban, Folder, FileText } from 'lucide-react';

export default function DailyJournalView() {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Default to today's date in YYYY-MM-DD format
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    // Use local time for the date string
    const offset = today.getTimezoneOffset();
    return new Date(today.getTime() - (offset*60*1000)).toISOString().split('T')[0];
  });

  useEffect(() => {
    if (!user) return;
    let loadingCount = 3;
    const checkLoading = () => {
      loadingCount--;
      if (loadingCount === 0) setLoading(false);
    };

    const unsubSec = subscribeToSections(user.uid, (data) => {
      setSections(data);
      checkLoading();
    });
    const unsubOp = subscribeToAllOperations(user.uid, (data) => {
      setOperations(data);
      checkLoading();
    });
    const unsubTx = subscribeToAllTransactions(user.uid, (data) => {
      setTransactions(data);
      checkLoading();
    });
    return () => {
      unsubSec();
      unsubOp();
      unsubTx();
    };
  }, [user]);

  const getTxDateStr = (tx: Transaction) => {
    if (tx.transactionDate) return tx.transactionDate;
    const d = new Date(tx.createdAt);
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - (offset*60*1000)).toISOString().split('T')[0];
  };

  // Calculate balances and filter transactions for the selected day
  let openingBalance = 0;
  let todayDebit = 0; // Inflow to safe
  let todayCredit = 0; // Outflow from safe
  const dayTransactions: Transaction[] = [];

  transactions.forEach((tx) => {
    const txDate = getTxDateStr(tx);
    const cash = Number(tx.cashAmount || 0);

    if (txDate < selectedDate) {
      // Before selected date -> affects opening balance
      if (tx.debitAccount === 'الخزنة') openingBalance += cash;
      if (tx.creditAccount === 'الخزنة') openingBalance -= cash;
    } else if (txDate === selectedDate) {
      // On selected date -> affects day's flow
      dayTransactions.push(tx);
      if (tx.debitAccount === 'الخزنة') todayDebit += cash;
      if (tx.creditAccount === 'الخزنة') todayCredit += cash;
    }
  });

  const closingBalance = openingBalance + todayDebit - todayCredit;

  if (loading) return <div className="text-center py-12 text-teal-400 text-xs">جاري التحميل...</div>;

  const transactionsByOperation: Record<string, Transaction[]> = {};
  dayTransactions.forEach(tx => {
    if (!transactionsByOperation[tx.operationId]) transactionsByOperation[tx.operationId] = [];
    transactionsByOperation[tx.operationId].push(tx);
  });

  // Sort sections by createdAt, and operations by createdAt
  const activeOperations = operations.filter(op => transactionsByOperation[op.id]);
  const activeSections = sections.filter(sec => activeOperations.some(op => op.sectionId === sec.id));

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h2 className="text-xl font-serif italic text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-teal-400" />
            يومية الخزنة والعمليات
          </h2>
          <p className="text-[10px] text-teal-400 mt-1 uppercase tracking-wide">ملخص حركة الخزينة والقيود ليوم محدد</p>
        </div>
        
        <div className="flex items-center gap-3 bg-[#111] p-2 border border-white/10 rounded-xl shadow-lg">
          <label className="text-xs text-gray-400 mr-2 font-bold">تاريخ اليومية:</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-[#1a1a1a] text-white border border-white/5 rounded-lg px-3 py-2 outline-none focus:border-teal-500 font-mono text-sm"
          />
        </div>
      </div>

      {/* Vault Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Opening Balance */}
        <div className="bg-[#111] rounded-2xl border border-white/5 p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 bg-white mix-blend-overlay rounded-bl-full pointer-events-none">
            <Wallet className="w-16 h-16" />
          </div>
          <p className="text-xs text-yellow-500 font-bold mb-1">الرصيد الافتتاحي</p>
          <p className="text-2xl text-white font-mono">{openingBalance.toLocaleString('en-US')}</p>
          <p className="text-[10px] text-gray-500 mt-1">رصيد الخزنة بدايه اليوم</p>
        </div>

        {/* Total Inflow (Debit Vault) */}
        <div className="bg-[#111] rounded-2xl border border-teal-500/20 p-5 relative overflow-hidden shadow-[0_0_15px_rgba(20,184,166,0.05)]">
          <div className="absolute top-0 right-0 p-4 opacity-10 bg-teal-500 mix-blend-overlay rounded-bl-full pointer-events-none">
            <ArrowDownRight className="w-16 h-16 text-teal-400" />
          </div>
          <p className="text-xs text-teal-400 font-bold mb-1">وارد (مدين الخزنة)</p>
          <p className="text-2xl text-white font-mono">+{todayDebit.toLocaleString('en-US')}</p>
          <p className="text-[10px] text-gray-500 mt-1">إجمالي ما دخل الخزنة اليوم</p>
        </div>

        {/* Total Outflow (Credit Vault) */}
        <div className="bg-[#111] rounded-2xl border border-red-500/20 p-5 relative overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.05)]">
          <div className="absolute top-0 right-0 p-4 opacity-10 bg-red-500 mix-blend-overlay rounded-bl-full pointer-events-none">
            <ArrowUpRight className="w-16 h-16 text-red-500" />
          </div>
          <p className="text-xs text-red-400 font-bold mb-1">منصرف (دائن الخزنة)</p>
          <p className="text-2xl text-white font-mono">-{todayCredit.toLocaleString('en-US')}</p>
          <p className="text-[10px] text-gray-500 mt-1">إجمالي ما خرج من الخزنة اليوم</p>
        </div>

        {/* Closing Balance */}
        <div className="bg-[#161616] rounded-2xl border border-white/10 p-5 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 pt-4 pr-5 opacity-10 pointer-events-none">
            <Wallet className="w-16 h-16" />
          </div>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500/50"></div>
          <p className="text-xs text-white font-bold mb-1">الرصيد الختامي</p>
          <p className="text-2xl text-yellow-500 font-mono">{closingBalance.toLocaleString('en-US')}</p>
          <p className="text-[10px] text-gray-500 mt-1">رصيد الخزنة نهاية اليوم</p>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-sm font-bold text-white mb-6">تفاصيل حركات اليوم ({dayTransactions.length})</h3>
        
        {activeSections.length === 0 ? (
          <div className="bg-[#161616] border border-white/5 rounded-2xl p-12 text-center shadow-2xl">
            <Ban className="w-12 h-12 text-white/5 mx-auto mb-4" />
            <p className="text-sm text-gray-400 font-bold">لا توجد عمليات مسجلة في هذا اليوم.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {activeSections.map(section => {
              const sectionOps = activeOperations.filter(op => op.sectionId === section.id);
              
              return (
                <div key={section.id} className="bg-[#111111] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                  {/* Section Header */}
                  <div className="bg-[#1a1a1a] px-6 py-4 flex items-center gap-3 border-b border-white/10">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
                      <Folder className="w-5 h-5 text-teal-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold">{section.name}</h4>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">القسم</p>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-6">
                    {sectionOps.map(op => {
                      const opTxs = transactionsByOperation[op.id] || [];
                      return (
                        <div key={op.id} className="border border-white/5 rounded-xl overflow-hidden bg-[#161616]">
                          {/* Operation Header */}
                          <div className="px-5 py-3 bg-white/[0.02] flex items-center gap-3 border-b border-white/5">
                            <FileText className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-bold text-emerald-400">{op.name}</span>
                            <span className="text-xs text-gray-500 mr-auto px-2 py-1 bg-white/5 rounded-md">({opTxs.length}) قيود</span>
                          </div>
                          
                          {/* Transactions Table */}
                          <div className="overflow-x-auto w-full">
                            <table className="w-full min-w-[1000px] divide-y divide-white/5">
                              <thead className="bg-[#111111]/50 border-b border-white/5">
                                <tr>
                                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">رقم الفاتورة</th>
                                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">حساب المدين</th>
                                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">حساب الدائن</th>
                                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">المبلغ نقداً</th>
                                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">الوزن</th>
                                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">العيار</th>
                                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">سعر السوق</th>
                                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">ملاحظات</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.02]">
                                {opTxs.map(tx => (
                                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400 font-mono">
                                      {tx.invoiceNumber || '-'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-teal-400">
                                      {tx.debitAccount || '-'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-red-400">
                                      {tx.creditAccount || '-'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-white font-mono">
                                      {tx.cashAmount ? Math.round(Number(tx.cashAmount)).toLocaleString('en-US') : '-'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-yellow-500 font-mono">
                                      {tx.weight ? Number(tx.weight).toFixed(2) : '-'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-yellow-500 font-mono">
                                      {tx.caliber || '-'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-yellow-400 font-mono">
                                      {tx.marketPrice ? Number(tx.marketPrice).toLocaleString('en-US') : '-'}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500 truncate max-w-[150px]" title={tx.notes}>
                                      {tx.notes || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
