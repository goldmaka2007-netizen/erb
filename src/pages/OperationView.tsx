import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useAccounts } from '../hooks/useAccounts';
import { subscribeToOperations, subscribeToTransactions, createTransaction, getNextInvoiceNumber, getInvoicePrefix, deleteTransaction, subscribeToSections } from '../lib/db';
import { Operation, FormField, Transaction, STANDARD_COLUMNS, Section } from '../types';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Save, History, Plus, Trash2 } from 'lucide-react';

export default function OperationView() {
  const { user } = useAuth();
  const accounts = useAccounts();
  const { sectionId, operationId } = useParams<{ sectionId: string, operationId: string }>();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const [operation, setOperation] = useState<Operation | null>(null);
  const [sectionName, setSectionName] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nextInvoiceState, setNextInvoiceState] = useState<string>('');
  
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
        initial[f.name] = dateParam || new Date().toISOString().split('T')[0];
      }
    });
    return initial;
  };

  useEffect(() => {
    if (!operation) return;
    try {
      let parsedFields = JSON.parse(operation.formConfig);
      if (!Array.isArray(parsedFields) || parsedFields.length === 0) {
        parsedFields = [...STANDARD_COLUMNS];
      }
      const initial = getInitialData(parsedFields);
      
      // Auto-set transaction date to today by default if field exists
      if (parsedFields.some((f: FormField) => f.name === 'transaction_date')) {
        initial['transaction_date'] = dateParam || new Date().toISOString().split('T')[0];
      }

      // Auto-set market price based on global setting if available
      if (parsedFields.some((f: FormField) => f.name === 'market_price')) {
         const globalPrice21 = localStorage.getItem('goldPrice21');
         const globalSilverPrice = localStorage.getItem('silverPrice925');
         const isSilverOp = operation.name.includes('فضة') || operation.name.includes('فضه') || sectionName.includes('فضة') || sectionName.includes('فضه');
         
         // Try to determine if it's silver from a default caliber or section name? 
         // For initialization, we simply default to gold price unless a silver caliber is set.
         if (initial['caliber'] && Number(initial['caliber']) > 24) {
            if (globalSilverPrice && !isNaN(Number(globalSilverPrice))) {
               initial['market_price'] = Math.round(Number(globalSilverPrice));
            }
         } else if (isSilverOp) {
             if (globalSilverPrice && !isNaN(Number(globalSilverPrice))) {
                initial['market_price'] = Math.round(Number(globalSilverPrice));
             }
         } else if (globalPrice21 && !isNaN(Number(globalPrice21))) {
            const price21 = Number(globalPrice21);
            initial['market_price'] = price21; // Assuming 21 carat for gold init
         }
      }

      setFormData(initial);

      // Always pre-calculate the next invoice number to show in UI
      if (user) {
         getNextInvoiceNumber(user.uid).then(nextNum => {
           const prefix = getInvoicePrefix(operation.name);
           setNextInvoiceState(`${prefix}${nextNum}`);
           
           // Also put it in form data if someone still relies on it internally
           setFormData(prev => ({
             ...prev,
             ['invoice_number']: `${prefix}${nextNum}`
           }));
         });
      }
    } catch (e) {
      console.error(e);
    }
  }, [operation, user, sectionName]);

  useEffect(() => {
    if (!user || !sectionId || !operationId) return;

    const unsubSections = subscribeToSections(user.uid, (data) => {
      const sec = data.find(s => s.id === sectionId);
      if (sec) setSectionName(sec.name);
    });

    const unsubOps = subscribeToOperations(user.uid, sectionId, (data) => {
      setOperation(data.find(o => o.id === operationId) || null);
      if (loading) setLoading(false);
    });

    const unsubTx = subscribeToTransactions(user.uid, operationId, (data) => {
      setTransactions(data);
    });

    return () => {
      unsubSections();
      unsubOps();
      unsubTx();
    };
  }, [user, sectionId, operationId]);

  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  if (loading) return <div className="text-center py-12 text-teal-400 text-xs">جاري التحميل...</div>;
  if (!operation) return <div className="text-center py-12 text-gray-500 text-xs">العملية غير موجودة</div>;

  let fields: FormField[] = [];
  try {
    const parsed = JSON.parse(operation.formConfig);
    if (Array.isArray(parsed) && parsed.length > 0) {
      fields = parsed;
    } else {
      fields = [...STANDARD_COLUMNS];
    }
  } catch (e) {
    console.error("Invalid form configuration", e);
    fields = [...STANDARD_COLUMNS];
  }

  const handleInputChange = (name: string, value: any) => {
    if (typeof value === 'string') {
      const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      value = value.replace(/[٠-٩]/g, w => arabicNumbers.indexOf(w).toString());
      
      const currentField = fields.find(f => f.name === name);
      if (currentField?.type === 'number') {
        value = value.replace(/[،,٫]/g, '.');
        value = value.replace(/[^\d.-]/g, '');
      }
    }

    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-set caliber if a select product has a caliber attached (e.g. سبيكة:24)
      if (operation) {
        try {
          const operationFields: FormField[] = JSON.parse(operation.formConfig);
          const currentField = operationFields.find(f => f.name === name);
          if (currentField && currentField.type === 'select' && currentField.options) {
             const selectedOpt = currentField.options.find(opt => {
               const parts = opt.split(':');
               return parts[0].trim() === value;
             });
             if (selectedOpt && selectedOpt.includes(':')) {
               const parsedCaliber = Number(selectedOpt.split(':')[1].trim());
               if (!isNaN(parsedCaliber)) {
                  updated['caliber'] = parsedCaliber;
               }
             }
          }
        } catch (e) {}
      }

      // Auto-calculate factor, market_price, and weight_arabic based on weight and caliber
      if (name === 'weight' || name === 'caliber' || updated.caliber !== prev.caliber) {
        const weightAmount = Number(name === 'weight' ? value : updated.weight);
        const currentCaliber = Number(updated.caliber);
        
        if (currentCaliber) {
          const isSilver = currentCaliber > 24;
          const baseCaliber = isSilver ? 925 : 21;
          const factor = Number((currentCaliber / baseCaliber).toFixed(9)); // High precision fraction
          updated['factor'] = factor;
          
          if (weightAmount > 0) {
            updated['weight_arabic'] = Number((weightAmount * factor).toFixed(2));
          } else {
            updated['weight_arabic'] = '';
          }

          // Adjust market price using the correct global base price
          if (isSilver || sectionName.includes('فضة') || sectionName.includes('فضه') || (operation && (operation.name.includes('فضة') || operation.name.includes('فضه')))) {
             const globalSilverPrice = localStorage.getItem('silverPrice925');
             if (globalSilverPrice && !isNaN(Number(globalSilverPrice))) {
                updated['market_price'] = Math.round(Number(globalSilverPrice));
             }
          } else {
             const globalPrice21 = localStorage.getItem('goldPrice21');
             if (globalPrice21 && !isNaN(Number(globalPrice21))) {
                updated['market_price'] = Math.round(Number(globalPrice21) * factor);
             }
          }

        } else {
          updated['factor'] = '';
          updated['weight_arabic'] = '';
        }
      }

      return updated;
    });
  };

  const handleDelete = async (txId: string) => {
    if (!user) return;
    await deleteTransaction(user.uid, txId);
    setDeletingTxId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !operationId) return;
    setSaving(true);
    
    // Use form invoice number if exists, otherwise generate
    let finalInvoiceNumber = formData['invoice_number'];
    if (!finalInvoiceNumber) {
      const nextInvoiceNumber = await getNextInvoiceNumber(user.uid);
      const prefix = getInvoicePrefix(operation.name);
      finalInvoiceNumber = `${prefix}${nextInvoiceNumber}`;
    }
    
    // Auto-map conventional field names if they exist in formData to base fields for standard transactions
    const baseTxPayload: Partial<Transaction> = {
      transactionDate: formData['transaction_date'] || new Date().toISOString(),
      invoiceNumber: finalInvoiceNumber,
      operationType: formData['operation_type'] || operation.name,
      debitAccount: formData['debit_account'] || '',
      creditAccount: formData['credit_account'] || '',
      cashAmount: formData['cash_amount'] ? Math.round(Number(formData['cash_amount'])) : 0,
      weight: formData['weight'] ? Number(Number(formData['weight']).toFixed(2)) : 0,
      caliber: Number(formData['caliber']) || 0,
      weightArabic: formData['weight_arabic'] ? Number(Number(formData['weight_arabic']).toFixed(2)) : 0,
      quantity: formData['quantity'] ? Math.round(Number(formData['quantity'])) : 0,
      customerName: formData['customer_name'] || '',
      phoneNumber: formData['phone_number'] || '',
      marketPrice: formData['market_price'] ? Math.round(Number(formData['market_price'])) : 0,
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
      // Refresh the next sequence
      getNextInvoiceNumber(user.uid).then(nextNum => {
        const prefix = getInvoicePrefix(operation.name);
        setNextInvoiceState(`${prefix}${nextNum}`);
        setFormData(prev => ({
          ...prev,
          ['invoice_number']: `${prefix}${nextNum}`
        }));
      });
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
                    {/* Fixed Invoice Number Display */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-teal-400 font-bold uppercase tracking-wide block text-right">
                        رقم الفاتورة (تلقائي)
                      </label>
                      <input
                        type="text"
                        readOnly
                        className="w-full border border-white/10 rounded-lg p-2.5 text-[16px] text-teal-500 font-mono focus:border-teal-500 outline-none transition-all bg-[#1a1a1a] cursor-not-allowed opacity-80"
                        value={nextInvoiceState ? nextInvoiceState : 'جاري التوليد...'}
                      />
                    </div>

                    {fields.filter(f => !f.hidden && f.name !== 'invoice_number').map((field, idx) => {
                      return (
                      <div key={idx} className="space-y-1.5 relative">
                        <label className="text-[10px] text-teal-400 font-bold uppercase tracking-wide block text-right">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {field.type === 'select' ? (
                          <select
                            required={field.required}
                            disabled={field.readonly}
                            className={`w-full border border-white/10 rounded-lg p-2.5 text-[16px] text-white focus:border-teal-500 outline-none transition-all appearance-none ${field.readonly ? 'bg-[#1a1a1a] cursor-not-allowed opacity-70' : 'bg-white/5 focus:bg-white/10'}`}
                            value={formData[field.name] || ''}
                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                          >
                            <option value="" className="bg-[#111] text-gray-400">اختر...</option>
                            {field.options?.map((opt, idx) => {
                              const parts = opt.split(':');
                              const optName = parts[0].trim();
                              return <option key={`${optName}-${idx}`} value={optName} className="bg-[#111] text-white">{optName}</option>
                            })}
                          </select>
                        ) : field.type === 'boolean' ? (
                          <label className={`flex items-center gap-3 mt-2 group ${field.readonly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}>
                            <input
                              type="checkbox"
                              disabled={field.readonly}
                              checked={formData[field.name] || false}
                              onChange={(e) => handleInputChange(field.name, e.target.checked)}
                              className="w-4 h-4 rounded border-white/20 bg-white/5 text-teal-500 focus:ring-teal-500/30 focus:ring-offset-0 disabled:opacity-70 disabled:cursor-not-allowed"
                            />
                            <span className="text-xs text-gray-300 group-hover:text-white transition-colors">نعم</span>
                          </label>
                        ) : (
                            <div className="relative">
                              <input
                                type={field.type === 'number' ? 'text' : field.type}
                                inputMode={field.type === 'number' ? 'decimal' : undefined}
                                dir={field.type === 'number' ? 'ltr' : 'auto'}
                                required={field.required}
                                readOnly={field.readonly || field.name === 'invoice_number'}
                                step={field.type === 'number' ? (field.name.includes('weight') ? '0.01' : '1') : undefined}
                                className={`w-full border border-white/10 rounded-lg p-2.5 text-[16px] text-white focus:border-teal-500 outline-none transition-all placeholder:text-gray-600 ${field.readonly || field.name === 'invoice_number' ? 'bg-[#1a1a1a] cursor-not-allowed opacity-70' : 'bg-white/5 focus:bg-white/10'}`}
                                value={formData[field.name] || ''}
                                onChange={(e) => handleInputChange(field.name, e.target.value)}
                                placeholder={`أدخل ${field.label}`}
                              />
                            </div>
                        )}
                      </div>
                    )})}
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
      )}
    </div>
  );
}
