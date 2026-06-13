import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { subscribeToOperations, subscribeToSections } from '../lib/db';
import { Operation, Section } from '../types';
import { Link, useParams } from 'react-router-dom';
import { FileText, ArrowRight } from 'lucide-react';

export default function SectionView() {
  const { user } = useAuth();
  const { sectionId } = useParams<{ sectionId: string }>();
  const [operations, setOperations] = useState<Operation[]>([]);
  const [section, setSection] = useState<Section | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !sectionId) return;
    
    // In a real app we might fetch the single section instead, 
    // but for simplicity we can just subscribe/filter.
    const unsubSections = subscribeToSections(user.uid, (data) => {
      setSection(data.find(s => s.id === sectionId) || null);
    });

    const unsubOperations = subscribeToOperations(user.uid, sectionId, (data) => {
      setOperations(data);
      setLoading(false);
    });

    return () => {
      unsubSections();
      unsubOperations();
    };
  }, [user, sectionId]);

  if (loading) return <div className="text-center py-12 text-teal-400 text-xs">جاري التحميل...</div>;

  if (!section) return <div className="text-center py-12 text-gray-500 text-xs">القسم غير موجود</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="p-2 text-gray-400 hover:text-white bg-white/5 rounded border border-white/10 transition-colors">
          <ArrowRight className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-serif italic text-white flex items-center gap-2">
            {section.name} <span className="text-[10px] px-1.5 py-0.5 bg-teal-500/10 text-teal-400 rounded not-italic font-sans">Active</span>
          </h2>
          <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wide">العمليات (نماذج الإدخال)</p>
        </div>
      </div>

      {operations.length === 0 ? (
        <div className="bg-[#121212] rounded-3xl p-12 text-center border border-white/10 flex flex-col items-center">
          <h3 className="text-sm font-bold text-white">لا توجد عمليات مضافة</h3>
          <p className="text-xs text-gray-500 mt-2">توجه للإعدادات لإنشاء عمليات ونماذج إدخال لهذا القسم.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {operations.map((operation) => (
             <Link
             key={operation.id}
             to={`/sections/${sectionId}/operations/${operation.id}`}
             className="p-5 bg-[#161616] border border-transparent hover:border-white/10 rounded-xl relative overflow-hidden opacity-80 hover:opacity-100 transition-all group flex items-center gap-4"
           >
             <div className="p-2 bg-white/5 text-gray-400 border border-white/10 rounded-lg group-hover:bg-teal-500/10 group-hover:text-teal-400 group-hover:border-teal-500/20 transition-colors shrink-0">
               <FileText className="w-5 h-5" />
             </div>
             <div className="flex-1">
               <h3 className="font-bold text-sm text-white">{operation.name}</h3>
               <p className="text-xs text-gray-500 mt-1">إدخال الفواتير والقيود</p>
             </div>
           </Link>
          ))}
        </div>
      )}
    </div>
  );
}
