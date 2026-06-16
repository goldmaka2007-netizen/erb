import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { Upload, AlertCircle, CheckCircle2, Play, Trash2, Folder } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { subscribeToSections } from '../lib/db';
import { Section } from '../types';

export default function ImportData() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'ready' | 'importing' | 'success' | 'error' | 'cleaning'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [progress, setProgress] = useState(0);

  const [sections, setSections] = useState<Section[]>([]);
  const [targetSectionId, setTargetSectionId] = useState<string>('');
  const [confirmCleanup, setConfirmCleanup] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToSections(user.uid, (data) => {
      setSections(data);
      if (data.length > 0 && !targetSectionId) {
        setTargetSectionId(data[0].id);
      }
    });
    return () => unsub();
  }, [user]);

  const handleCleanup = async () => {
    if (!user) return;
    
    setConfirmCleanup(false);
    setStatus('cleaning');
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const { getDocs, collection } = await import('firebase/firestore');
      
      let deletedTxs = 0;
      let deletedOps = 0;
      let deletedSections = 0;

      // 1. Delete all transactions
      const txsSnap = await getDocs(collection(db, `users/${user.uid}/transactions`));
      let batches = [writeBatch(db)];
      let currentBatchIndex = 0;
      let currentBatchSize = 0;

      for (const doc of txsSnap.docs) {
        batches[currentBatchIndex].delete(doc.ref);
        currentBatchSize++;
        deletedTxs++;

        if (currentBatchSize >= 400) {
          batches.push(writeBatch(db));
          currentBatchIndex++;
          currentBatchSize = 0;
        }
      }
      for (let i = 0; i < batches.length; i++) {
        if (i === batches.length - 1 && currentBatchSize === 0) continue;
        await batches[i].commit();
      }

      // 2. Delete all operations
      const opsSnap = await getDocs(collection(db, `users/${user.uid}/operations`));
      batches = [writeBatch(db)];
      currentBatchIndex = 0;
      currentBatchSize = 0;

      for (const doc of opsSnap.docs) {
        batches[currentBatchIndex].delete(doc.ref);
        currentBatchSize++;
        deletedOps++;

        if (currentBatchSize >= 400) {
          batches.push(writeBatch(db));
          currentBatchIndex++;
          currentBatchSize = 0;
        }
      }
      for (let i = 0; i < batches.length; i++) {
        if (i === batches.length - 1 && currentBatchSize === 0) continue;
        await batches[i].commit();
      }

      // 3. Delete all sections
      const sectionsSnap = await getDocs(collection(db, `users/${user.uid}/sections`));
      batches = [writeBatch(db)];
      currentBatchIndex = 0;
      currentBatchSize = 0;

      for (const doc of sectionsSnap.docs) {
        batches[currentBatchIndex].delete(doc.ref);
        currentBatchSize++;
        deletedSections++;

        if (currentBatchSize >= 400) {
          batches.push(writeBatch(db));
          currentBatchIndex++;
          currentBatchSize = 0;
        }
      }
      for (let i = 0; i < batches.length; i++) {
        if (i === batches.length - 1 && currentBatchSize === 0) continue;
        await batches[i].commit();
      }
      
      setStatus('success');
      setSuccessMsg(`تم تنظيف كل البيانات بالكامل: حذف ${deletedSections} قسم و ${deletedOps} عملية و ${deletedTxs} حركة.`);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error occurred during cleanup.');
      setStatus('error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setStatus('parsing');
      setErrorMsg('');
      
      Papa.parse(selected, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
             setErrorMsg(`Found ${results.errors.length} parsing errors. Check your CSV.`);
             setStatus('error');
             // Proceed anyway with data if there are some
          }
          if (results.data.length > 0) {
            setParsedData(results.data);
            setStatus('ready');
          } else {
            setErrorMsg('CSV file is empty or invalid format.');
            setStatus('error');
          }
        },
        error: (error) => {
          setErrorMsg(error.message);
          setStatus('error');
        }
      });
    }
  };

  const handleImport = async () => {
    if (!user || parsedData.length === 0) return;
    setStatus('importing');
    setProgress(0);
    setErrorMsg('');

    try {
      // Compute unique operations
      const uniqueOps = new Map<string, { id: string, columns: Set<string> }>(); // opName -> generatedOp details
      parsedData.forEach(row => {
        const opName = (row['العملية']?.trim() || 'استيراد');
        if (!uniqueOps.has(opName)) {
           const newOpId = doc(collection(db, `users/${user.uid}/operations`)).id;
           uniqueOps.set(opName, { id: newOpId, columns: new Set() });
        }
        
        const opDetails = uniqueOps.get(opName)!;
        Object.entries(row).forEach(([key, val]) => {
          if (val && String(val).trim() !== '' && String(val).trim() !== '0') {
             opDetails.columns.add(key.trim());
          }
        });
      });

      // Prepare prerequisites
      const { getDocs, setDoc } = await import('firebase/firestore');
      
      // Get the chosen section
      let sectionId = targetSectionId;
      
      if (!sectionId) {
        try {
          const newSectionRef = doc(collection(db, `users/${user.uid}/sections`));
          sectionId = newSectionRef.id;
          await setDoc(newSectionRef, {
            name: 'عام',
            userId: user.uid,
            createdAt: Date.now(),
            updatedAt: Date.now()
          });
        } catch (e: any) {
          throw new Error("Failed to create default section: " + e.message);
        }
      }

      // Check existing operations globally by name to avoid duplicates on re-import
      const existingOps = await getDocs(collection(db, `users/${user.uid}/operations`));
      const existingOpMap = new Map<string, string>(); // opName -> opId
      existingOps.docs.forEach(d => {
        const data = d.data();
        existingOpMap.set(data.name, d.id);
      });

      try {
        const opsBatch = writeBatch(db);
        let addedOps = false;
        uniqueOps.forEach((opDetails, opName) => {
          if (!existingOpMap.has(opName)) {
            addedOps = true;
            
            const proposedFields: any[] = [];
            const cols = opDetails.columns;
            
            if (cols.has('التاريخ')) proposedFields.push({ name: 'transaction_date', label: 'التاريخ', type: 'date', required: false });
            if (cols.has('رقم الفاتورة')) proposedFields.push({ name: 'invoice_number', label: 'رقم الفاتورة', type: 'text', required: false, readonly: true });
            if (cols.has('مدين')) proposedFields.push({ name: 'debit_account', label: 'حساب المدين', type: 'select', options: ['الخزنة', 'تيفيت الكسر', 'مخزون الذهب عيار 18', 'مخزون الذهب عيار 21', 'مخزون الذهب عيار 24', 'كسر افرنجي', 'الصافي'], required: false });
            if (cols.has('دائن')) proposedFields.push({ name: 'credit_account', label: 'حساب الدائن', type: 'select', options: ['الخزنة', 'تيفيت الكسر', 'مخزون الذهب عيار 18', 'مخزون الذهب عيار 21', 'مخزون الذهب عيار 24', 'كسر افرنجي', 'الصافي'], required: false });
            if (cols.has('نقداً')) proposedFields.push({ name: 'cash_amount', label: 'المبلغ نقداً', type: 'number', required: false });
            if (cols.has('الوزن')) proposedFields.push({ name: 'weight', label: 'الوزن', type: 'number', required: false });
            if (cols.has('الوزن العربي')) proposedFields.push({ name: 'weight_arabic', label: 'الوزن العربي', type: 'number', required: false });
            if (cols.has('العيار')) proposedFields.push({ name: 'caliber', label: 'العيار', type: 'number', required: false });
            if (cols.has('العدد')) proposedFields.push({ name: 'quantity', label: 'العدد', type: 'number', required: false });
            if (cols.has('اسم العميل')) proposedFields.push({ name: 'customer_name', label: 'اسم العميل', type: 'text', required: false });
            if (cols.has('رقم التليفون')) proposedFields.push({ name: 'phone_number', label: 'رقم التليفون', type: 'text', required: false });
            if (cols.has('سعر السوق')) proposedFields.push({ name: 'market_price', label: 'سعر السوق', type: 'number', required: false });
            if (cols.has('المعامل')) proposedFields.push({ name: 'factor', label: 'المعامل', type: 'number', required: false });
            if (cols.has('ملاحظات')) proposedFields.push({ name: 'notes', label: 'ملاحظات', type: 'text', required: false });

            opsBatch.set(doc(db, `users/${user.uid}/operations`, opDetails.id), {
              name: opName,
              sectionId: sectionId,
              formConfig: JSON.stringify(proposedFields),
              userId: user.uid,
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
            existingOpMap.set(opName, opDetails.id);
          }
        });
        if (addedOps) await opsBatch.commit();
      } catch (e: any) {
        throw new Error("Failed to create operations: " + e.message);
      }

      const BATCH_SIZE = 400; // Firestore limit constraint is 500
      let operationsDone = 0;
      
      // Process in chunks
      for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
        try {
          const batch = writeBatch(db);
          const chunk = parsedData.slice(i, i + BATCH_SIZE);
          
          chunk.forEach((row) => {
            const parsedTDate = row['التاريخ'] ? new Date(row['التاريخ']).getTime() : NaN;
            let tDate = isNaN(parsedTDate) ? Date.now() : parsedTDate;
            
            let parsedCaliber = Number(row['العيار']) || 0;
            let parsedWeight = Number(row['الوزن']) ? Number(Number(row['الوزن']).toFixed(2)) : 0;
            let parsedCash = Number(row['نقداً']) ? Math.round(Number(row['نقداً'])) : 0;
            let weightArabic = Number(row['الوزن العربي']) ? Number(Number(row['الوزن العربي']).toFixed(2)) : 0;
            
            const opName = row['العملية']?.trim() || 'استيراد';
            const opId = existingOpMap.get(opName);
            
            if (!opId) {
              console.warn(`Missing operation ID for ${opName}, skipping row.`);
              return; // Skip invalid rows to prevent batch failure
            }

            const oldTxId = (row['معرف العملية']?.trim() || row['معرف العملية\r']?.trim() || '');

            // Construct the transaction payload
            const txData = {
              userId: user.uid,
              operationId: opId,
              operationType: opName,
              transactionDate: row['التاريخ'] || new Date().toISOString().split('T')[0],
              invoiceNumber: row['رقم الفاتورة'] || '',
              debitAccount: row['مدين'] || '',
              creditAccount: row['دائن'] || '',
              cashAmount: parsedCash,
              weight: parsedWeight,
              caliber: parsedCaliber,
              weightArabic: weightArabic,
              quantity: Number(row['العدد']) ? Math.round(Number(row['العدد'])) : 0,
              customerName: row['اسم العميل'] || '',
              phoneNumber: row['رقم التليفون'] || '',
              marketPrice: Number(row['سعر السوق']) ? Math.round(Number(row['سعر السوق'])) : 0,
              factor: Number(row['المعامل']) || 0,
              notes: row['ملاحظات'] || '',
              createdAt: tDate,
              updatedAt: Date.now(),
              data: JSON.stringify({ oldTxId }) // Maintain old ID in custom data
            };

            const docRef = doc(collection(db, `users/${user.uid}/transactions`));
            batch.set(docRef, txData);
          });

          await batch.commit();
          operationsDone += chunk.length;
          setProgress((operationsDone / parsedData.length) * 100);
        } catch (e: any) {
          throw new Error(`تعذر استيراد الدفعة ${Math.floor(i / BATCH_SIZE) + 1}: ` + e.message);
        }
      }
      
      setStatus('success');
      setSuccessMsg('تم رفع البيانات بنجاح! انتقل للصندوق لرؤية السجلات.');
      setFile(null);
      setParsedData([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error occurred during import.');
      setStatus('error');
    }
  };

  return (
    <div className="bg-[#161616] rounded-2xl border border-white/5 p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500/20 to-teal-500/50"></div>
      
      <h3 className="text-sm font-bold text-white mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-teal-400" /> 
          استيراد البيانات (شيت CSV)
        </div>
        {!confirmCleanup ? (
          <button 
            onClick={() => setConfirmCleanup(true)}
            disabled={status === 'cleaning' || status === 'importing'}
            className="bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1 border border-red-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {status === 'cleaning' ? 'جاري التنظيف...' : 'تنظيف بيانات الاستيراد القديمة'}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400">هل أنت متأكد؟</span>
            <button 
              onClick={handleCleanup}
              disabled={status === 'cleaning' || status === 'importing'}
              className="bg-red-600 text-white px-3 py-1.5 rounded text-xs transition-colors hover:bg-red-700"
            >
              نعم، تنظيف
            </button>
            <button 
              onClick={() => setConfirmCleanup(false)}
              disabled={status === 'cleaning' || status === 'importing'}
              className="bg-[#222] text-gray-300 hover:text-white px-3 py-1.5 rounded text-xs transition-colors border border-white/10"
            >
              إلغاء
            </button>
          </div>
        )}
      </h3>
      <p className="text-[10px] text-gray-400 mb-6 leading-relaxed max-w-2xl">
        قم برفع ملف الـ CSV الذي يحتوي على البيانات بصيغتها الأصلية. 
        سيتم قراءة الأعمدة مثل (التاريخ، العملية، مدين، دائن، الوزن، العيار، إلخ) ورفعها تلقائياً.
      </p>

      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-1">القسم المخصص للعمليات الجديدة (غير المتوفرة بالنظام مسبقاً)</label>
        <select 
          value={targetSectionId} 
          onChange={(e) => setTargetSectionId(e.target.value)}
          className="w-full sm:w-1/3 bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:ring-1 focus:ring-teal-500 outline-none"
        >
          {sections.map(sec => (
            <option key={sec.id} value={sec.id}>{sec.name}</option>
          ))}
          <option value="">إنشاء قسم "عام" افتراضي</option>
        </select>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-[#111] p-4 rounded-xl border border-white/5">
        <input 
          type="file" 
          accept=".csv"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden" 
          id="csv-upload"
        />
        <label 
          htmlFor="csv-upload" 
          className="bg-white/5 hover:bg-white/10 text-white cursor-pointer px-4 py-2.5 rounded-lg border border-white/10 text-xs transition-colors flex justify-center items-center gap-2 min-w-[150px]"
        >
          <Upload className="w-4 h-4" />
          اختر ملف CSV
        </label>
        
        <div className="flex-1 text-xs px-2 text-gray-500">
          {file ? file.name : "لم يتم اختيار ملف بعد"}
        </div>

        {status === 'ready' && (
          <button 
            onClick={handleImport}
            className="bg-teal-500/20 text-teal-400 hover:bg-teal-500 hover:text-black hover:border-transparent cursor-pointer px-6 py-2.5 rounded-lg border border-teal-500/20 text-xs font-bold transition-all flex justify-center items-center gap-2 min-w-[150px]"
          >
            <Play className="w-4 h-4" />
            بدء الاستيراد ({parsedData.length} سجل)
          </button>
        )}
      </div>

      {status === 'importing' && (
        <div className="mt-4 bg-[#111] p-4 rounded-lg border border-teal-500/20">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-teal-400">جاري الرفع... الرجاء عدم غلق الصفحة</span>
            <span className="font-mono text-teal-500">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-teal-500 transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 flex items-center gap-2 text-xs text-red-400 bg-red-400/10 p-3 rounded-lg border border-red-400/20">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {status === 'success' && (
        <div className="mt-4 flex items-center gap-2 text-xs text-green-400 bg-green-400/10 p-3 rounded-lg border border-green-400/20">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  );
}
