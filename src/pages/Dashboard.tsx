import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { subscribeToSections } from '../lib/db';
import { Section } from '../types';
import { Link } from 'react-router-dom';
import { Folder, Plus } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToSections(user.uid, (data) => {
      setSections(data);
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  if (loading) {
    return <div className="text-center py-12 text-gray-500 text-xs text-teal-400">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-xl font-serif italic text-white">الأقسام / Departments</h2>
          <p className="text-[10px] text-teal-400 mt-1 uppercase tracking-wide">اختر القسم لبدء إدخال البيانات</p>
        </div>
        <span className="text-[10px] text-gray-500">{sections.length} Sections</span>
      </div>

      {sections.length === 0 ? (
        <div className="bg-[#121212] rounded-3xl p-12 text-center border border-white/10 flex flex-col items-center">
          <Folder className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-sm font-bold text-white">لا توجد أقسام بعد</h3>
          <p className="text-xs text-gray-500 mt-2 mb-6">قم بإضافة أقسام وعمليات من الإعدادات لتبدأ.</p>
          <Link to="/settings" className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/10 text-teal-400 text-xs border border-teal-500/20 rounded hover:bg-teal-500/20 transition-colors">
            <Plus className="w-4 h-4" />
            إضافة أقسام
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section) => (
            <Link
              key={section.id}
              to={`/sections/${section.id}`}
              className="p-6 bg-[#161616] border border-white/5 hover:border-white/20 rounded-xl relative overflow-hidden group transition-all"
            >
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-teal-500 transition-colors"></div>
              <div className="flex items-center gap-4 mb-3">
                <div className="p-2 bg-white/5 text-teal-400 border border-white/10 rounded-lg group-hover:bg-teal-500/10 transition-colors">
                  <Folder className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-teal-400 transition-colors">{section.name}</h3>
              </div>
              {section.description && (
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 pr-2">
                  {section.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
