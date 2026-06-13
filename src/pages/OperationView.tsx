import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { subscribeToOperations, subscribeToTransactions, createTransaction } from '../lib/db';
import { Operation, FormField, Transaction } from '../types';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Save, History, Plus } from 'lucide-react';

export default function OperationView() {
  const { user } = useAuth();
  const { sectionId, operationId } = useParams<{ sectionId: string, operationId: string }>();
  const [operation, setOperation] = useState<Operation | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [viewState, setViewState] = useState<'form' | 'history'>('form');

  const getInitialData = (formFields: FormField[]) => {
    const initial: Record<string, any> = {};
    formFields.forEach(f => {
      if (f.defaultValue !== undefined && f.defaultValue !== '') {
        initial[f.name] = f.defaultValue;
      } else if (f.type === 'boolean') {
        initial[f.name] = false;
      } else if (f.type === 'date' && f.name === 'transaction_date') {
        initial[f.name] = new Date().toISOString().split('T')[0];
      }
    });
    return initial;
  };

  useEffect(() => {
    if (!operation) return;
    try {
      const parsedFields: FormField[] = JSON.parse(operation.formConfig);
      setFormData(getInitialData(parsedFields));
    } catch (e) {
      console.error(e);
    }
  }, [operation]);

  useEffect(() => {
    if (!user || !sectionId || !operationId) return;

    const unsubOps = subscribeToOperations(user.uid, sectionId, (data) => {
      setOperation(data.find(o => o.id === operationId) || null);
      if (loading) setLoading(false);
    });

    const unsubTx = subscribeToTransactions(user.uid, operationId, (data) => {
      setTransactions(data);
    });

    return () => {
      unsubOps();
      unsubTx();
    };
  }, [user, sectionId, operationId]);

  if (loading) return <div className="text-center py-12 text-teal-400 text-xs">جاري التحميل...</div>;
  if (!operation) return <div className="text-center py-12 text-gray-500 text-xs">العملية غير موجودة</div>;

  let fields: FormField[] = [];
  try {
    fields = JSON.parse(operation.formConfig);
  } catch (e) {
    console.error("Invalid form configuration", e);
  }

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !operationId) return;
    setSaving(true);
    
    // Auto-map conventional field names if they exist in formData to base fields for standard transactions
    const baseTxPayload: Partial<Transaction> = {
      transactionDate: formData['transaction_date'] || new Date().toISOString(),
      invoiceNumber: formData['invoice_number'] || '',
      operationType: formData['operation_type'] || operation.name,
      debitAccount: formData['debit_account'] || '',
      creditAccount: formData['credit_account'] || '',
      cashAmount: Number(formData['cash_amount']) || 0,
      weight: Number(formData['weight']) || 0,
      caliber: Number(formData['caliber']) || 0,
      weightArabic: Number(formData['weight_arabic']) || 0,
      quantity: Number(formData['quantity']) || 0,
      customerName: formData['customer_name'] || '',
      phoneNumber: formData['phone_number'] || '',
      marketPrice: Number(formData['market_price']) || 0,
      factor: Number(formData['factor']) || 0,
      notes: formData['notes'] || '',
      transactionId: formData['transaction_id'] || `${Date.now()}`,
    };

    try {
      await createTransaction(user.uid, {
        operationId,
        ...baseTxPayload,
        data: JSON.stringify(formData) // Store everything raw strictly in JSON
      });
      setFormData(getInitialData(fields));
      // Optional: Add a nice toast instead of alert later
    } catch (error) {
      alert('خطأ في حفظ القيد');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to={`/sections/${sectionId}`} className="p-2 text-gray-400 hover:text-white bg-white/5 rounded border border-white/10 transition-colors">
            <ArrowRight className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-serif italic text-white">{operation.name}</h2>
            <p className="text-[10px] text-teal-400 mt-1 uppercase tracking-wide">إدخال قيد / فاتورة</p>
          </div>
        </div>

        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
          <button 
            onClick={() => setViewState('form')}
            className={`flex items-center justify-center gap-2 px-4 py-1.5 ${viewState === 'form' ? 'bg-white/10 text-teal-400 shadow-sm border border-white/5' : 'text-gray-500 hover:text-gray-300'} rounded text-xs transition-all flex-1 sm:flex-none`}
          >
            <Plus className="w-3 h-3" />
            إضافة جديد
          </button>
          <button 
            onClick={() => setViewState('history')}
            className={`flex items-center justify-center gap-2 px-4 py-1.5 ${viewState === 'history' ? 'bg-white/10 text-teal-400 shadow-sm border border-white/5' : 'text-gray-500 hover:text-gray-300'} rounded text-xs transition-all flex-1 sm:flex-none`}
          >
            <History className="w-3 h-3" />
            السجل ({transactions.length})
          </button>
        </div>
      </div>

      {viewState === 'form' ? (
        <div className="flex justify-center">
            {/* Form Preview (Simulated Mobile View container aesthetic) */}
            <div className="w-full max-w-lg bg-[#121212] rounded-3xl border border-white/10 shadow-2xl flex flex-col p-6 sm:p-8">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-6 text-center">Mobile Form View — معالجة النموذج</div>
              
              <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs">لم يتم إعداد حقول لهذه العملية بعد.</div>
                ) : (
                  <div className="space-y-4">
                    {fields.filter(f => !f.hidden).map((field, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <label className="text-[10px] text-teal-400 font-bold uppercase tracking-wide block text-right">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {field.type === 'select' ? (
                          <select
                            required={field.required}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-teal-500 focus:bg-white/10 outline-none transition-all appearance-none"
                            value={formData[field.name] || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                          >
                            <option value="" className="bg-[#111] text-gray-400">اختر...</option>
                            {field.options?.map(opt => <option key={opt} value={opt} className="bg-[#111] text-white">{opt}</option>)}
                          </select>
                        ) : field.type === 'boolean' ? (
                          <label className="flex items-center gap-3 mt-2 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={formData[field.name] || false}
                              onChange={(e) => handleInputChange(field.name, e.target.checked)}
                              className="w-4 h-4 rounded border-white/20 bg-white/5 text-teal-500 focus:ring-teal-500/30 focus:ring-offset-0"
                            />
                            <span className="text-xs text-gray-300 group-hover:text-white transition-colors">نعم</span>
                          </label>
                        ) : (
                          <input
                            type={field.type}
                            required={field.required}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-teal-500 focus:bg-white/10 outline-none transition-all placeholder:text-gray-600"
                            value={formData[field.name] || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                            placeholder={`أدخل ${field.label}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {fields.length > 0 && (
                  <button
                    type="submit"
                    disabled={saving}
                    className="mt-4 w-full py-3 bg-teal-500 text-black font-bold rounded-xl text-sm shadow-lg shadow-teal-500/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex justify-center items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'جاري الحفظ...' : 'إرسال البيانات / Submit'}
                  </button>
                )}
              </form>
            </div>
        </div>
      ) : (
        <div className="bg-[#161616] rounded-2xl border border-white/5 shadow-2xl overflow-hidden overflow-x-auto w-full">
          <table className="w-full min-w-[800px] divide-y divide-white/5">
            <thead className="bg-[#111111] border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">التاريخ</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">رقم الفاتورة</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">حساب المدين</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">حساب الدائن</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">المبلغ نقدية</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">الوزن</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold text-teal-400 uppercase tracking-widest whitespace-nowrap">الوزن (عربي)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-xs text-gray-500">لا توجد سجلات.</td>
                </tr>
              )}
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-300">
                    {tx.transactionDate || new Date(tx.createdAt).toLocaleDateString('ar-EG')}
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
                    {tx.cashAmount ? Number(tx.cashAmount).toLocaleString('en-US') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-yellow-500 font-mono">
                    {tx.weight || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-yellow-400 font-mono">
                    {tx.weightArabic || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
