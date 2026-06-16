import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../hooks/useAuth';
import { useAccounts } from '../hooks/useAccounts';
import { subscribeToSections, createSection, updateSection, deleteSection, subscribeToOperations, createOperation, updateOperation, deleteOperation, renumberAllTransactions } from '../lib/db';
import { Section, Operation, FormField, STANDARD_COLUMNS } from '../types';
import { FileText, Folder, Save, Settings as SettingsIcon, Pencil, CheckSquare, Square, Plus, Trash2, Edit2, ArrowUp, ArrowDown } from 'lucide-react';
import ImportData from '../components/ImportData';

function OptionsEditor({ field, idx, updateField, accounts }: { field: FormField, idx: number, updateField: (i: number, k: string, v: any) => void, accounts: string[] }) {
  const [inputValue, setInputValue] = useState('');
  const options = field.options || [];

  const handleAdd = (val: string) => {
    if (!val) return;
    const newOptions = [...options];
    if (!newOptions.includes(val)) {
      newOptions.push(val);
      updateField(idx, 'options', newOptions);
    }
  };

  const handleRemove = (val: string) => {
    updateField(idx, 'options', options.filter((o: string) => o !== val));
  };

  return (
    <div>
       <label className="text-[10px] text-teal-400 font-bold uppercase tracking-wide block text-right mb-1">
          عناصر القائمة {field.name.includes('account') && '(اختر أو أضف حسابات)'}
       </label>
       <div className="flex flex-wrap gap-2 mb-3">
         {options.map((opt: string, i: number) => (
           <span key={i} className="bg-white/10 text-white px-2 py-1 flex items-center gap-1.5 rounded text-xs border border-white/20">
             {opt}
             <button type="button" onClick={() => handleRemove(opt)} className="text-red-400 hover:text-red-300">
               <span className="sr-only">إزالة</span>
               <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
             </button>
           </span>
         ))}
       </div>

       <div className="flex gap-2">
         {field.name.includes('account') && (
           <select
             className="bg-black/20 border border-white/10 rounded-lg p-2 text-[14px] text-white focus:border-teal-500 outline-none w-1/3"
             value=""
             onChange={(e) => handleAdd(e.target.value)}
           >
             <option value="">-- من السجل --</option>
             {accounts.filter(a => !options.includes(a)).map((a, i) => <option key={i} value={a}>{a}</option>)}
           </select>
         )}
         <div className="flex flex-1 gap-2">
           <input
             type="text"
             className="flex-1 bg-black/20 border border-white/10 rounded-lg p-2 text-[14px] text-white focus:border-teal-500 outline-none"
             placeholder="اكتب خياراً جديداً... ثم اضغط إضافة"
             value={inputValue}
             onChange={e => setInputValue(e.target.value)}
             onKeyDown={e => {
               if (e.key === 'Enter') {
                 e.preventDefault();
                 handleAdd(inputValue.trim());
                 setInputValue('');
               }
             }}
           />
           <button
             type="button"
             onClick={() => {
               handleAdd(inputValue.trim());
               setInputValue('');
             }}
             className="bg-teal-500/20 text-teal-400 px-3 py-2 rounded-lg text-[12px] font-bold"
           >
             إضافة
           </button>
         </div>
       </div>

       {!field.name.includes('account') && (
         <p className="text-[10px] text-gray-500 mt-1.5 text-right w-full leading-normal">
           لربط المنتج بعيار أوتوماتيكياً في الفواتير، أضف (:العيار) بعد اسم المنتج (مثال: <span className="text-teal-400">سبيكة:24</span>).
         </p>
       )}
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const accounts = useAccounts();
  const [sections, setSections] = useState<Section[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');

  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [newOpName, setNewOpName] = useState('');
  
  const [editingOp, setEditingOp] = useState<Operation | null>(null);
  const [fieldsEditor, setFieldsEditor] = useState<FormField[]>([]);
  
  const [renamingOpId, setRenamingOpId] = useState<string | null>(null);
  const [renameOpValue, setRenameOpValue] = useState<string>('');
  const [deletingOpId, setDeletingOpId] = useState<string | null>(null);

  const [movingOpId, setMovingOpId] = useState<string | null>(null);
  const [moveOpSectionId, setMoveOpSectionId] = useState<string>('');

  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [renameSectionValue, setRenameSectionValue] = useState<string>('');
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);

  const [isRenumbering, setIsRenumbering] = useState(false);
  const [renumberStatus, setRenumberStatus] = useState('');

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
    const defaultFields: FormField[] = [...STANDARD_COLUMNS];
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
      const parsed = JSON.parse(op.formConfig);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setFieldsEditor(parsed);
      } else {
        setFieldsEditor([...STANDARD_COLUMNS]);
      }
    } catch {
      setFieldsEditor([...STANDARD_COLUMNS]);
    }
  };

  const handleSaveRename = async (opId: string) => {
    if (!user || !renameOpValue.trim()) return;
    await updateOperation(user.uid, opId, { name: renameOpValue });
    setRenamingOpId(null);
  };

  const handleConfirmDelete = async (opId: string) => {
    if (!user) return;
    await deleteOperation(user.uid, opId);
    setDeletingOpId(null);
  };

  const handleMoveOp = async (opId: string) => {
    if (!user || !moveOpSectionId) return;
    await updateOperation(user.uid, opId, { sectionId: moveOpSectionId });
    setMovingOpId(null);
  };

  const handleSaveSectionRename = async (sectionId: string) => {
    if (!user || !renameSectionValue.trim()) return;
    await updateSection(user.uid, sectionId, { name: renameSectionValue });
    setRenamingSectionId(null);
  };

  const handleConfirmSectionDelete = async (sectionId: string) => {
    if (!user) return;
    await deleteSection(user.uid, sectionId);
    setDeletingSectionId(null);
  };

  const handleRenumber = async () => {
    if (!user || isRenumbering) return;
    setIsRenumbering(true);
    setRenumberStatus('جاري تكويد الفواتير...');
    try {
      const count = await renumberAllTransactions(user.uid, 100001);
      setRenumberStatus(`تم تكويد عدد ${count} فاتورة بنجاح.`);
      setTimeout(() => setRenumberStatus(''), 5000);
    } catch (e) {
      console.error(e);
      setRenumberStatus('حدث خطأ أثناء التكويد');
    }
    setIsRenumbering(false);
  };

  const handleSaveFields = async () => {
    if (!user || !editingOp) return;
    await updateOperation(user.uid, editingOp.id, { 
      formConfig: JSON.stringify(fieldsEditor)
    });
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

      <div className="bg-gray-800 rounded-2xl border border-white/5 p-6 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500/50"></div>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Folder className="w-4 h-4 text-teal-400" /> إضافة قسم جديد
        </h3>
        <form onSubmit={handleAddSection} className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            required
            placeholder="اسم القسم (مثال: المشغولات الذهبية)"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-[16px] text-white focus:border-teal-500 outline-none placeholder:text-gray-600"
            value={newSectionName}
            onChange={(e) => setNewSectionName(e.target.value)}
          />
          <input
            type="text"
            placeholder="الوصف"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-[16px] text-white focus:border-teal-500 outline-none placeholder:text-gray-600"
            value={newSectionDesc}
            onChange={(e) => setNewSectionDesc(e.target.value)}
          />
          <button type="submit" className="bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500 hover:text-black hover:border-transparent px-6 py-2 rounded-lg font-bold text-xs transition-all w-full sm:w-auto">
            إضافة قسم
          </button>
        </form>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-white/5 p-6 relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#444]"></div>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" /> إضافة عملية (نموذج إدخال) تحت قسم
        </h3>
        <form onSubmit={handleAddOperation} className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <select
            required
            className="flex-1 min-w-[200px] bg-gray-800 border border-white/10 rounded-lg p-2 text-[16px] text-white focus:border-gray-500 outline-none appearance-none"
            value={selectedSectionId}
            onChange={(e) => setSelectedSectionId(e.target.value)}
          >
            <option value="" className="bg-gray-800 text-gray-400">اختر القسم...</option>
            {sections.map(s => <option key={s.id} value={s.id} className="bg-gray-800">{s.name}</option>)}
          </select>
          <input
            type="text"
            required
            placeholder="اسم العملية (مثال: تيفيت الكسر)"
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded-lg p-2 text-[16px] text-white focus:border-gray-500 outline-none placeholder:text-gray-600"
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
          <div key={section.id} className="bg-gray-800 border border-white/10 rounded-xl overflow-hidden shadow-lg">
            <div className="bg-gray-900 px-6 py-4 border-b border-white/5 text-right flex flex-col sm:flex-row justify-between sm:items-center gap-4">
               
               {renamingSectionId === section.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input 
                      type="text" 
                      value={renameSectionValue} 
                      onChange={(e) => setRenameSectionValue(e.target.value)} 
                      className="bg-black/20 border border-teal-500/50 rounded p-1.5 text-[16px] text-white outline-none w-full max-w-[200px]"
                      autoFocus
                    />
                    <button onClick={() => handleSaveSectionRename(section.id)} className="bg-teal-500/20 text-teal-400 p-1.5 rounded hover:bg-teal-500/30">
                      <CheckSquare className="w-4 h-4" />
                    </button>
                    <button onClick={() => setRenamingSectionId(null)} className="bg-white/5 text-gray-400 p-1.5 rounded hover:bg-white/10">
                      <Square className="w-4 h-4" />
                    </button>
                  </div>
               ) : (
                  <div>
                    <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wide block">القسم</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">{section.name}</span>
                  </div>
               )}

               <div className="flex justify-end gap-2 shrink-0">
                  {deletingSectionId === section.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-red-400 font-bold">تأكيد حذف القسم بكل محتوياته؟</span>
                      <button onClick={() => handleConfirmSectionDelete(section.id)} className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-[10px] hover:bg-red-500/30 font-bold">نعم</button>
                      <button onClick={() => setDeletingSectionId(null)} className="bg-white/5 text-gray-400 px-2 py-1 rounded text-[10px] hover:bg-white/10 font-bold">إلغاء</button>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => { setRenamingSectionId(section.id); setRenameSectionValue(section.name); setDeletingSectionId(null); }}
                        className="flex items-center gap-1.5 text-[10px] px-2 py-1.5 border border-white/5 rounded hover:bg-white/5 text-blue-400 transition-colors"
                        title="تعديل اسم القسم"
                      >
                        <Edit2 className="w-4 h-4 sm:w-3 sm:h-3" />
                        <span className="hidden sm:inline">تعديل الاسم</span>
                      </button>
                      <button 
                        onClick={() => { setDeletingSectionId(section.id); setRenamingSectionId(null); }}
                        className="flex items-center gap-1.5 text-[10px] px-2 py-1.5 border border-red-500/10 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                        title="حذف القسم"
                      >
                        <Trash2 className="w-4 h-4 sm:w-3 sm:h-3" />
                        <span className="hidden sm:inline">حذف القسم</span>
                      </button>
                    </>
                  )}
               </div>
            </div>
            <div className="p-4 divide-y divide-white/5">
              {operations.filter(o => o.sectionId === section.id).length === 0 && (
                <div className="text-[10px] text-gray-500 py-2 text-center">لا توجد عمليات مضافة هنا</div>
              )}
              {operations.filter(o => o.sectionId === section.id).map(op => (
                <div key={op.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                  
                  {renamingOpId === op.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input 
                        type="text" 
                        value={renameOpValue} 
                        onChange={(e) => setRenameOpValue(e.target.value)} 
                        className="bg-black/20 border border-teal-500/50 rounded p-1.5 text-[16px] text-white outline-none w-full max-w-[200px]"
                        autoFocus
                      />
                      <button onClick={() => handleSaveRename(op.id)} className="bg-teal-500/20 text-teal-400 p-1.5 rounded hover:bg-teal-500/30">
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <button onClick={() => setRenamingOpId(null)} className="bg-white/5 text-gray-400 p-1.5 rounded hover:bg-white/10">
                        <Square className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="font-medium text-sm text-gray-300 group-hover:text-white transition-colors flex items-center gap-3">
                       <div className="w-1.5 h-1.5 rounded-full bg-teal-500/50"></div>
                       {op.name}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 shrink-0 opacity-100 sm:opacity-50 sm:group-hover:opacity-100 transition-opacity">
                    {movingOpId === op.id ? (
                      <div className="flex items-center gap-2">
                        <select 
                          value={moveOpSectionId} 
                          onChange={(e) => setMoveOpSectionId(e.target.value)}
                          className="bg-gray-800 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none"
                        >
                          <option value="">اختر وجهة النقل...</option>
                          {sections.filter(s => s.id !== op.sectionId).map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <button onClick={() => handleMoveOp(op.id)} className="bg-teal-500/20 text-teal-400 px-2 py-1 rounded text-[10px] hover:bg-teal-500/30 font-bold">نقل</button>
                        <button onClick={() => setMovingOpId(null)} className="bg-white/5 text-gray-400 px-2 py-1 rounded text-[10px] hover:bg-white/10 font-bold">إلغاء</button>
                      </div>
                    ) : deletingOpId === op.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-red-400 font-bold">تأكيد الحذف؟</span>
                        <button onClick={() => handleConfirmDelete(op.id)} className="bg-red-500/20 text-red-400 px-2 py-1 rounded text-[10px] hover:bg-red-500/30 font-bold">نعم</button>
                        <button onClick={() => setDeletingOpId(null)} className="bg-white/5 text-gray-400 px-2 py-1 rounded text-[10px] hover:bg-white/10 font-bold">إلغاء</button>
                      </div>
                    ) : (
                      <>
                        <button 
                          onClick={() => { setMovingOpId(op.id); setMoveOpSectionId(''); setRenamingOpId(null); setDeletingOpId(null); }}
                          className="flex items-center gap-1.5 text-[10px] px-2 py-1.5 border border-white/5 rounded hover:bg-white/5 text-teal-400 transition-colors"
                          title="نقل لقسم آخر"
                        >
                          نقل
                        </button>
                        <button 
                          onClick={() => { setRenamingOpId(op.id); setRenameOpValue(op.name); setDeletingOpId(null); setMovingOpId(null); }}
                          className="flex items-center gap-1.5 text-[10px] px-2 py-1.5 border border-white/5 rounded hover:bg-white/5 text-blue-400 transition-colors"
                          title="تعديل الاسم"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => { setDeletingOpId(op.id); setRenamingOpId(null); setMovingOpId(null); }}
                          className="flex items-center gap-1.5 text-[10px] px-2 py-1.5 border border-white/5 rounded hover:bg-white/5 text-red-400 transition-colors"
                          title="حذف العملية"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => openOpEditor(op)}
                          className="flex items-center gap-2 text-[10px] px-3 py-1.5 border border-white/10 rounded hover:bg-white/5 text-teal-400 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          تعديل النموذج
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-8 border-t border-white/5">
        <div className="bg-gray-800 rounded-2xl border border-white/5 p-6 relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500/50"></div>
          <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
             إعادة تكويد الفواتير (توليد أرقام متسلسلة لجميع الداتا الحالية)
          </h3>
          <p className="text-[10px] text-gray-500 mb-4">
            في حالة وجود داتا مستوردة ليس لها رقم فاتورة، أو الرغبة في توحيد التسلسل، يمكنك النقر على الزر لتوليد أرقام فواتير تلقائية متسلسلة تبدأ من 100001 لأقدم عملية وحتى أحدث عملية. <span className="text-yellow-500">تحذير: سيقوم هذا الإجراء بالكتابة فوق أي أرقام فواتير حالية إن وجدت واستبدالها بنظام التكويد الجديد.</span>
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <button 
              onClick={handleRenumber}
              disabled={isRenumbering}
              className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 hover:bg-yellow-500 hover:text-black hover:border-transparent px-6 py-2 rounded-lg font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRenumbering ? 'جاري المعالجة...' : 'ابدأ إعادة التكويد'}
            </button>
            {renumberStatus && (
              <span className="text-xs text-white bg-black/40 px-3 py-1.5 rounded border border-white/10">
                {renumberStatus}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 pt-8 border-t border-white/5">
        <ImportData />
      </div>

      {editingOp && createPortal(
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 sm:p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950 rounded-t-2xl shrink-0">
              <div>
                 <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span className="text-teal-400">تعديل نموذج:</span> {editingOp.name}
                 </h3>
                 <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">البيانات ستحفظ بنسق JSON المطابق لشجرة الحسابات.</p>
              </div>
            </div>
            
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-gray-900 flex flex-col lg:flex-row gap-6">
              
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
                        className={`flex items-center gap-2 text-xs font-bold w-full text-right px-3 py-2 rounded-lg border ${isEnabled ? 'bg-teal-500/10 border-teal-500/30 text-white shadow-sm' : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-700'} transition-all outline-none`}
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
                  <div className="text-center py-12 text-xs text-gray-400 border border-dashed border-gray-700 rounded-2xl">اختر الحقول من القائمة الجانبية أو أضف حقلاً جديداً</div>
                ) : (
                  fieldsEditor.map((field, idx) => (
                    <div key={idx} className="bg-gray-800 p-4 border border-gray-700 rounded-xl flex flex-col gap-4 relative overflow-hidden group">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/5 group-hover:bg-teal-500/50 transition-colors"></div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div className="w-full">
                          <label className="text-[10px] text-teal-400 font-bold uppercase tracking-wide block text-right mb-1">المعرف (Key)</label>
                          <input 
                            type="text" 
                            value={field.name}
                            onChange={e => updateField(idx, 'name', e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-[16px] text-white focus:border-teal-500 outline-none text-left"
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
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-[16px] text-white focus:border-teal-500 outline-none"
                            placeholder="الوزن العربي"
                          />
                        </div>
                        <div className="w-full">
                          <label className="text-[10px] text-teal-400 font-bold uppercase tracking-wide block text-right mb-1">النوع</label>
                          <select 
                            value={field.type}
                            onChange={e => updateField(idx, 'type', e.target.value)}
                            className="w-full bg-black/20 border border-gray-600 rounded-lg p-2 text-[16px] text-white focus:border-teal-500 outline-none appearance-none"
                          >
                            <option value="text" className="bg-gray-800">نص</option>
                            <option value="number" className="bg-gray-800">رقم</option>
                            <option value="date" className="bg-gray-800">تاريخ</option>
                            <option value="boolean" className="bg-gray-800">نعم/لا</option>
                            <option value="select" className="bg-gray-800">قائمة</option>
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
                          <div className="flex gap-1">
                            <button 
                              onClick={() => {
                                if (idx === 0) return;
                                const newFields = [...fieldsEditor];
                                const temp = newFields[idx];
                                newFields[idx] = newFields[idx - 1];
                                newFields[idx - 1] = temp;
                                setFieldsEditor(newFields);
                              }}
                              className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={idx === 0}
                              title="نقل لأعلى"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => {
                                if (idx === fieldsEditor.length - 1) return;
                                const newFields = [...fieldsEditor];
                                const temp = newFields[idx];
                                newFields[idx] = newFields[idx + 1];
                                newFields[idx + 1] = temp;
                                setFieldsEditor(newFields);
                              }}
                              className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                              disabled={idx === fieldsEditor.length - 1}
                              title="نقل لأسفل"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => setFieldsEditor(fieldsEditor.filter((_, i) => i !== idx))}
                              className="text-red-500/70 hover:text-red-400 text-[10px] uppercase font-bold transition-colors bg-red-500/5 hover:bg-red-500/10 px-2 py-1 rounded ms-2"
                              title="حذف الحقل"
                            >
                              حذف
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="w-full mt-2 pt-3 border-t border-white/5 space-y-3">
                        {field.type === 'select' && (
                          <OptionsEditor field={field} idx={idx} updateField={updateField} accounts={accounts} />
                        )}
                        <div className="flex flex-col sm:flex-row gap-4 items-end bg-gray-900 p-3 rounded-lg border border-gray-700">
                          <div className="flex-1 w-full relative">
                            <label className="text-[10px] text-yellow-500 font-bold uppercase tracking-wide block text-right mb-1">قيمة افتراضية / ثابتة (خياري)</label>
                            <input 
                              type="text" 
                              list={field.name.includes('account') ? "accounts-list" : undefined}
                              value={field.defaultValue?.toString() || ''}
                              onChange={e => updateField(idx, 'defaultValue', e.target.value)}
                              className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-[16px] text-white focus:border-yellow-500 outline-none"
                              placeholder={field.name === 'caliber' ? "مثال: 21" : "مثال: الخزنة"}
                            />
                            {field.name.includes('account') && (
                              <datalist id="accounts-list">
                                {accounts.map((acc, aIdx) => (
                                  <option key={aIdx} value={acc} />
                                ))}
                              </datalist>
                            )}
                            {field.name === 'caliber' && (
                              <p className="text-[10px] text-yellow-500/80 mt-1.5 text-right font-bold w-full break-words">
                                أدخل العيار (مثلا 21) لكي يتم احتساب الوزن العربي أوتوماتيكياً في هذه العملية
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-3 pb-2 w-full sm:w-auto">
                             <label className="flex items-center gap-2 cursor-pointer group/hide">
                              <input 
                                type="checkbox" 
                                checked={field.hidden || false}
                                onChange={e => updateField(idx, 'hidden', e.target.checked)}
                                className="w-4 h-4 rounded border-white/20 bg-black/20 text-yellow-500 focus:ring-yellow-500/30 cursor-pointer"
                              />
                              <span className="text-[10px] text-gray-400 uppercase tracking-wide group-hover/hide:text-yellow-500 transition-colors">إخفاء عن المستخدم (يعتمد القيمة الثابتة سراً)</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer group/read">
                              <input 
                                type="checkbox" 
                                checked={field.readonly || false}
                                onChange={e => updateField(idx, 'readonly', e.target.checked)}
                                className="w-4 h-4 rounded border-white/20 bg-black/20 text-teal-500 focus:ring-teal-500/30 cursor-pointer"
                              />
                              <span className="text-[10px] text-gray-400 uppercase tracking-wide group-hover/read:text-teal-400 transition-colors">للقراءة فقط (مغلق أمام التعديل)</span>
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
            
            <div className="p-4 sm:p-6 border-t border-gray-800 flex justify-end gap-3 bg-gray-950 rounded-b-2xl shrink-0">
              <button 
                onClick={() => setEditingOp(null)}
                className="px-6 py-2 rounded border border-gray-700 text-xs text-gray-300 hover:bg-gray-800 transition-colors"
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
