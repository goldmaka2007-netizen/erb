import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { subscribeToSections, createSection, subscribeToOperations, createOperation, updateOperation } from '../lib/db';
import { Section, Operation, FormField } from '../types';
import { FileText, Folder, Save, Settings as SettingsIcon, Pencil, CheckSquare, Square, Plus } from 'lucide-react';

const STANDARD_COLUMNS: FormField[] = [
  { name: 'transaction_date', label: 'التاريخ', type: 'date', required: false },
  { name: 'invoice_number', label: 'رقم الفاتورة', type: 'text', required: false },
  { name: 'debit_account', label: 'حساب المدين (من حساب)', type: 'select', options: ['الخزنة', 'تيفيت الكسر', 'مخزون الذهب عيار 18', 'مخزون الذهب عيار 21', 'مخزون الذهب عيار 24', 'كسر افرنجي', 'الصافي'], required: false },
  { name: 'credit_account', label: 'حساب الدائن (إلى حساب)', type: 'select', options: ['الخزنة', 'تيفيت الكسر', 'مخزون الذهب عيار 18', 'مخزون الذهب عيار 21', 'مخزون الذهب عيار 24', 'كسر افرنجي', 'الصافي'], required: false },
  { name: 'cash_amount', label: 'المبلغ نقداً', type: 'number', required: false },
  { name: 'weight', label: 'الوزن', type: 'number', required: false },
  { name: 'weight_arabic', label: 'الوزن العربي', type: 'number', required: false },
  { name: 'caliber', label: 'العيار', type: 'number', required: false },
  { name: 'quantity', label: 'العدد', type: 'number', required: false },
  { name: 'customer_name', label: 'اسم العميل', type: 'text', required: false },
  { name: 'phone_number', label: 'رقم التليفون', type: 'text', required: false },
  { name: 'market_price', label: 'سعر السوق', type: 'number', required: false },
  { name: 'factor', label: 'المعامل', type: 'number', required: false },
  { name: 'notes', label: 'ملاحظات', type: 'text', required: false },
];

export default function Settings() {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');

  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [newOpName, setNewOpName] = useState('');
  
  const [editingOp, setEditingOp] = useState<Operation | null>(null);
  const [fieldsEditor, setFieldsEditor] = useState<FormField[]>([]);

  useEffect(() => {
    if (!user) return;
    const unsubSections = subscribeToSections(user.uid, (data) => setSections(data));
    return () => unsubSections();
  }, [user]);

  useEffect(() => {
    if (!user || !sections.length) return;
    const unsubs = sections.map(s => subscribeToOperations(user.uid, s.id, (data) => {
      setOperations(prev => {
        const others = prev.filter(o => o.sectionId !== s.id);
        return [...others, ...data];
      });
    }));
    return () => unsubs.forEach(fn => fn());
  }, [user, sections]);

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newSectionName.trim()) return;
    await createSection(user.uid, { name: newSectionName, description: newSectionDesc });
    setNewSectionName('');
    setNewSectionDesc('');
  };

  const handleAddOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedSectionId || !newOpName.trim()) return;
    const defaultFields: FormField[] = [];
    await createOperation(user.uid, { 
      sectionId: selectedSectionId, 
      name: newOpName, 
      formConfig: JSON.stringify(defaultFields)
    });
    setNewOpName('');
  };

  const openOpEditor = (op: Operation) => {
    setEditingOp(op);
    try {
      setFieldsEditor(JSON.parse(op.formConfig));
    } catch {
      setFieldsEditor([]);
    }
  };

  const handleSaveFields = async () => {
    if (!user || !editingOp) return;
    await updateOperation(user.uid, editingOp.id, { formConfig: JSON.stringify(fieldsEditor) });
    setEditingOp(null);
  };

  const addField = () => {
    setFieldsEditor([...fieldsEditor, { name: '', label: '', type: 'text', required: false }]);
  };

  const updateField = (index: number, key: keyof FormField, value: any) => {
    const newFields = [...fieldsEditor];
    newFields[index] = { ...newFields[index], [key]: value };
    setFieldsEditor(newFields);
  };

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h2 className="text-xl font-serif italic text-white flex items-center gap-3">
          <SettingsIcon className="w-6 h-6 text-teal-400" />
          الإعدادات / Settings
        </h2>
        <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wide">
          قم بتعريف الأقسام، العمليات، ونماذج إدخال البيانات المرتبطة بشجرة الحسابات.
        </p>
      </div>

      <div className="bg-[#161616] rounded-2xl border border-white/5 p-6 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500/50"></div>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Folder className="w-4 h-4 text-teal-400" /> إضافة قسم جديد
        </h3>
        <form onSubmit={handleAddSection} className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            required
            placeholder="اسم القسم (مثال: المشغولات الذهبية)"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-teal-500 outline-none placeholder:text-gray-600"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
          />
          <input
            type="text"
            placeholder="الوصف"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-teal-500 outline-none placeholder:text-gray-600"
            value={newSectionDesc}
            onChange={(e) => setNewSectionDesc(e.target.value)}
          />
          <button type="submit" className="bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500 hover:text-black hover:border-transparent px-6 py-2 rounded-lg font-bold text-xs transition-all w-full sm:w-auto">
            إضافة قسم
          </button>
        </form>
      </div>

      <div className="bg-[#161616] rounded-2xl border border-white/5 p-6 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#444]"></div>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" /> إضافة عملية (نموذج إدخال) تحت قسم
        </h3>
        <form onSubmit={handleAddOperation} className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <select
            required
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-gray-500 outline-none appearance-none"
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
          >
            <option value="" className="bg-[#111] text-gray-500">اختر القسم...</option>
            {sections.map(s => <option key={s.id} value={s.id} className="bg-[#111]">{s.name}</option>)}
          </select>
          <input
            type="text"
            required
            placeholder="اسم العملية (مثال: تيفيت الكسر)"
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-gray-500 outline-none placeholder:text-gray-600"
            value={newOpName}
            onChange={(e) => setNewOpName(e.target.value)}
          />
          <button type="submit" className="bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 px-6 py-2 rounded-lg font-bold text-xs transition-all w-full sm:w-auto">
            إضافة عملية
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {sections.map(section => (
          <div key={section.id} className="bg-[#121212] border border-white/10 rounded-xl overflow-hidden">
            <div className="bg-[#0d0d0d] px-6 py-4 border-b border-white/5 text-right flex justify-between items-center">
               <div>
                  <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wide block">القسم</span>
                  <span className="text-sm font-bold text-white mt-0.5 block">{section.name}</span>
               </div>
            </div>
            <div className="p-4 divide-y divide-white/5">
              {operations.filter(o => o.sectionId === section.id).length === 0 && (
                <div className="text-[10px] text-gray-500 py-2 text-center">لا توجد عمليات مضافة هنا</div>
              )}
              {operations.filter(o => o.sectionId === section.id).map(op => (
                <div key={op.id} className="py-3 flex items-center justify-between group">
                  <div className="font-medium text-sm text-gray-300 group-hover:text-white transition-colors flex items-center gap-3">
                     <div className="w-1.5 h-1.5 rounded-full bg-teal-500/50"></div>
                     {op.name}
                  </div>
                  <button 
                    onClick={() => openOpEditor(op)}
                    className="flex items-center gap-2 text-[10px] px-3 py-1.5 border border-white/10 rounded hover:bg-white/5 text-teal-400 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    تعديل النموذج
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editingOp && createPortal(
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl">
          <div className="bg-[#111111] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-center bg-[#0d0d0d] rounded-t-2xl shrink-0">
              <div>
                 <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-teal-400">تعديل نموذج:</span> {editingOp.name}
                 </h3>
                 <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">البيانات ستحفظ بنسق JSON المطابق لشجرة الحسابات.</p>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#0a0a0a] flex flex-col lg:flex-row gap-6">
              
              <div className="w-full lg:w-64 shrink-0 flex flex-col gap-3">
                <h4 className="text-[10px] text-teal-400 font-bold uppercase tracking-widest border-b border-white/10 pb-2">الحقول القياسية (إظهار/إخفاء سريـع)</h4>
                <div className="flex flex-col gap-2 overflow-y-auto pr-2 custom-scrollbar max-h-[250px] lg:max-h-full">
                  {STANDARD_COLUMNS.map((stdCol) => {
                    const isEnabled = fieldsEditor.some(f => f.name === stdCol.name);
                    return (
                      <button 
                        key={stdCol.name}
                        onClick={() => {
                          if (isEnabled) setFieldsEditor(fieldsEditor.filter(f => f.name !== stdCol.name));
                          else setFieldsEditor([...fieldsEditor, { ...stdCol }]);
                        }}
                        className={`flex items-center gap-2 text-xs font-bold w-full text-right px-3 py-2 rounded-lg border ${isEnabled ? 'bg-teal-500/10 border-teal-500/30 text-white shadow-sm' : 'bg-[#111] border-white/5 text-gray-500 hover:text-gray-300 hover:bg-white/5'} transition-all outline-none`}
                      >
                        {isEnabled ? <CheckSquare className="w-4 h-4 text-teal-500 shrink-0" /> : <Square className="w-4 h-4 shrink-0" />}
                        <span className="truncate">{stdCol.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <h4 className="text-[10px] text-teal-400 font-bold uppercase tracking-widest">تخصيص الحقول النشطة</h4>
                  <span className="text-[10px] text-gray-500">{fieldsEditor.length} حقل نشط</span>
                </div>
                
                {fieldsEditor.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-600 border border-dashed border-white/5 rounded-2xl">اختر الحقول من القائمة الجانبية أو أضف حقلاً جديداً</div>
                ) : (
                  fieldsEditor.map((field, idx) => (
                    <div key={idx} className="bg-[#161616] p-4 border border-white/5 rounded-xl flex flex-col gap-4 relative overflow-hidden group">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/5 group-hover:bg-teal-500/50 transition-colors"></div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="w-full">
                          <label className="text-[10px] text-teal-400 font-bold uppercase tracking-wide block text-right mb-1">المعرف (Key)</label>
                          <input 
                            type="text" 
                            value={field.name}
                            onChange={e => updateField(idx, 'name', e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-teal-500 outline-none text-left"
                            placeholder="e.g. weight_arabic"
                            dir="ltr"
                          />
                        </div>
                        <div className="w-full">
                          <label className="text-[10px] text-teal-400 font-bold uppercase tracking-wide block text-right mb-1">الاسم لليوزر (العرض)</label>
                          <input 
                            type="text" 
                            value={field.label}
                            onChange={e => updateField(idx, 'label', e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-teal-500 outline-none"
                            placeholder="الوزن العربي"
                          />
                        </div>
                        <div className="w-full">
                          <label className="text-[10px] text-teal-400 font-bold uppercase tracking-wide block text-right mb-1">النوع</label>
                          <select 
                            value={field.type}
                            onChange={e => updateField(idx, 'type', e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-teal-500 outline-none appearance-none"
                          >
                            <option value="text" className="bg-[#111]">نص</option>
                            <option value="number" className="bg-[#111]">رقم</option>
                            <option value="date" className="bg-[#111]">تاريخ</option>
                            <option value="boolean" className="bg-[#111]">نعم/لا</option>
                            <option value="select" className="bg-[#111]">قائمة</option>
                          </select>
                        </div>
                        <div className="w-full flex items-center justify-between gap-2 h-[34px] px-1">
                          <label className="flex items-center gap-2 cursor-pointer group/req">
                            <input 
                              type="checkbox" 
                              checked={field.required || false}
                              onChange={e => updateField(idx, 'required', e.target.checked)}
                              className="w-4 h-4 rounded border-white/20 bg-black/20 text-teal-500 focus:ring-teal-500/30 cursor-pointer"
                            />
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide group-hover/req:text-teal-400 transition-colors">إجباري</span>
                          </label>
                          <button 
                            onClick={() => setFieldsEditor(fieldsEditor.filter((_, i) => i !== idx))}
                            className="text-red-500/70 hover:text-red-400 text-[10px] uppercase font-bold transition-colors bg-red-500/5 hover:bg-red-500/10 px-2 py-1 rounded"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                      
                      <div className="w-full mt-2 pt-3 border-t border-white/5 space-y-3">
                        {field.type === 'select' && (
                          <div>
                            <label className="text-[10px] text-teal-400 font-bold uppercase tracking-wide block text-right mb-1">عناصر القائمة (مفصولة بـ فاصلة , أو ،)</label>
                            <input 
                              type="text" 
                              value={field._rawOptions !== undefined ? field._rawOptions : (field.options?.join('، ') || '')}
                              onChange={e => {
                                const raw = e.target.value;
                                const newFields = [...fieldsEditor];
                                newFields[idx] = {
                                  ...newFields[idx],
                                  _rawOptions: raw,
                                  options: raw.split(/[,،]/).map(s=>s.trim()).filter(Boolean)
                                };
                                setFieldsEditor(newFields);
                              }}
                              className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-teal-500 outline-none"
                              placeholder="الخزنة، تيفيت الكسر، حساب الصافي"
                            />
                          </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-4 items-end bg-[#111111] p-3 rounded-lg border border-white/5">
                          <div className="flex-1 w-full">
                            <label className="text-[10px] text-yellow-500 font-bold uppercase tracking-wide block text-right mb-1">قيمة افتراضية / ثابتة (خياري)</label>
                            <input 
                              type="text" 
                              value={field.defaultValue?.toString() || ''}
                              onChange={e => updateField(idx, 'defaultValue', e.target.value)}
                              className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-yellow-500 outline-none"
                              placeholder="مثال: الخزنة"
                            />
                          </div>
                          <div className="flex items-center pb-2 w-full sm:w-auto">
                             <label className="flex items-center gap-2 cursor-pointer group/hide">
                              <input 
                                type="checkbox" 
                                checked={field.hidden || false}
                                onChange={e => updateField(idx, 'hidden', e.target.checked)}
                                className="w-4 h-4 rounded border-white/20 bg-black/20 text-yellow-500 focus:ring-yellow-500/30 cursor-pointer"
                              />
                              <span className="text-[10px] text-gray-400 uppercase tracking-wide group-hover/hide:text-yellow-500 transition-colors">إخفاء عن المستخدم (يعتمد القيمة الثابتة سراً)</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                <button 
                  onClick={() => addField()}
                  className="flex items-center gap-2 w-full justify-center py-4 border border-dashed border-white/10 rounded-xl text-gray-500 hover:text-teal-400 hover:border-teal-500/30 hover:bg-teal-500/5 outline-none transition-all text-xs font-bold uppercase tracking-wide"
                >
                  <Plus className="w-4 h-4" />
                  إضافة حقل مخصص جديد
                </button>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 border-t border-white/5 flex justify-end gap-3 bg-[#0d0d0d] rounded-b-2xl shrink-0">
              <button 
                onClick={() => setEditingOp(null)}
                className="px-6 py-2 rounded border border-white/10 text-xs text-gray-400 hover:bg-white/5 transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={handleSaveFields}
                className="px-6 py-2 bg-teal-500 hover:bg-teal-400 text-black rounded font-bold text-xs flex items-center gap-2 transition-colors shadow-lg shadow-teal-500/20"
              >
                <Save className="w-4 h-4" />
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
