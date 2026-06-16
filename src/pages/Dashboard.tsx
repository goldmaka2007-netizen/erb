import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { Calculator, Settings, BookOpen, PlusCircle } from 'lucide-react';

import { updateSettings, subscribeToSettings } from '../lib/db';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [price21, setPrice21] = useState<number>(0);
  const [silverPrice925, setSilverPrice925] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to Firebase settings
    const unsubscribe = subscribeToSettings(user.uid, (data) => {
      if (data) {
        if (data.goldPrice21) {
          setPrice21(Number(data.goldPrice21));
          localStorage.setItem('goldPrice21', String(data.goldPrice21));
        }
        if (data.silverPrice925) {
          setSilverPrice925(Number(data.silverPrice925));
          localStorage.setItem('silverPrice925', String(data.silverPrice925));
        }
      } else {
        // Fallback to local storage if no Firebase settings exist
        const savedPrice = localStorage.getItem('goldPrice21');
        if (savedPrice) setPrice21(Number(savedPrice));
        
        const savedSilverPrice = localStorage.getItem('silverPrice925');
        if (savedSilverPrice) setSilverPrice925(Number(savedSilverPrice));
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handlePriceChange = (val: string) => {
    const num = Number(val);
    setPrice21(num);
    localStorage.setItem('goldPrice21', val);
    if (user) {
      updateSettings(user.uid, { goldPrice21: num });
    }
  };

  const handleSilverPriceChange = (val: string) => {
    const num = Number(val);
    setSilverPrice925(num);
    localStorage.setItem('silverPrice925', val);
    if (user) {
      updateSettings(user.uid, { silverPrice925: num });
    }
  };

  const getPrice = (caliber: number) => {
    if (!price21) return 0;
    return Math.round((price21 / 21) * caliber);
  };

  const getSilverPrice = (caliber: number) => {
    if (!silverPrice925) return 0;
    return Math.round((silverPrice925 / 925) * caliber);
  };

  return (
    <div className="space-y-8">
      {/* Quick Actions & Gold Price */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Main Action */}
        <div className="bg-[#121212] rounded-3xl border border-teal-500/30 p-8 flex flex-col justify-center items-center text-center relative overflow-hidden group shadow-[0_0_30px_-5px_rgba(20,184,166,0.15)]">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent"></div>
          <h2 className="text-2xl font-serif text-white mb-2 relative z-10">إدخال قيد جديد</h2>
          <p className="text-xs text-teal-400/70 mb-8 relative z-10">اختر القسم والعملية لبدء تسجيل البيانات</p>
          
          <Link to="/sections" className="px-8 py-4 bg-teal-500 text-[#0a0a0a] rounded-xl text-lg font-bold flex items-center gap-3 transition-all hover:bg-teal-400 hover:scale-105 relative z-10 mb-6">
            <PlusCircle className="w-6 h-6" />
            إضافة قيد 
          </Link>

          <div className="flex gap-4 relative z-10 flex-wrap justify-center">
            <Link to="/journal" className="px-6 py-3 bg-[#1a1a1a] border border-white/10 hover:border-white/20 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
              <BookOpen className="w-4 h-4 text-teal-400" />
              يومية الخزينة
            </Link>
            <Link to="/ledger" className="px-6 py-3 bg-[#1a1a1a] border border-white/10 hover:border-white/20 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
              <BookOpen className="w-4 h-4 text-gray-400" />
              الدفتر المجمع
            </Link>
            <Link to="/settings" className="px-6 py-3 bg-[#1a1a1a] border border-white/10 hover:border-white/20 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
              <Settings className="w-4 h-4 text-gray-400" />
              الإعدادات
            </Link>
          </div>
        </div>

        {/* Market Prices */}
        <div className="flex flex-col gap-6">
          {/* Gold Prices */}
          <div className="bg-[#121212] rounded-3xl border border-white/10 p-6 flex flex-col relative overflow-hidden flex-1">
             <div className="absolute top-0 right-0 p-6 opacity-5 -z-0">
               <Calculator className="w-32 h-32" />
             </div>
             <h3 className="text-teal-400 text-sm font-bold uppercase tracking-wide mb-6">أسعار الذهب للسوق</h3>
             <div className="mb-6 relative z-10">
               <label className="block text-xs text-gray-400 mb-2">أدخل سعر جرام 21</label>
               <input
                 type="number"
                 className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-4 text-2xl text-yellow-500 font-mono text-center focus:border-yellow-500 outline-none transition-all"
                 value={price21 || ''}
                 onChange={(e) => handlePriceChange(e.target.value)}
                 placeholder="0"
               />
             </div>
             
             <div className="grid grid-cols-3 gap-4 relative z-10">
               <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                 <div className="text-[10px] text-gray-500 mb-1">عيار 18</div>
                 <div className="text-lg text-white font-mono">{getPrice(18).toLocaleString('en-US')}</div>
               </div>
               <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
                 <div className="text-[10px] text-yellow-500/70 mb-1">عيار 21</div>
                 <div className="text-lg text-yellow-500 font-bold font-mono">{getPrice(21).toLocaleString('en-US')}</div>
               </div>
               <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                 <div className="text-[10px] text-gray-500 mb-1">عيار 24</div>
                 <div className="text-lg text-white font-mono">{getPrice(24).toLocaleString('en-US')}</div>
               </div>
             </div>
          </div>

          {/* Silver Prices */}
          <div className="bg-[#121212] rounded-3xl border border-white/10 p-6 flex flex-col relative overflow-hidden flex-1">
             <div className="absolute top-0 right-0 p-6 opacity-5 -z-0">
               <Calculator className="w-32 h-32" />
             </div>
             <h3 className="text-gray-300 text-sm font-bold uppercase tracking-wide mb-6">سعر الفضة للسوق</h3>
             <div className="mb-6 relative z-10">
               <label className="block text-xs text-gray-400 mb-2">أدخل سعر جرام الفضة</label>
               <input
                 type="number"
                 className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-4 text-2xl text-gray-300 font-mono text-center focus:border-gray-500 outline-none transition-all"
                 value={silverPrice925 || ''}
                 onChange={(e) => handleSilverPriceChange(e.target.value)}
                 placeholder="0"
               />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
