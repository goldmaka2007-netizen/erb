import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Home, Settings, LogOut, Menu, X, Plus, BookText } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'الرئيسية (الأقسام)', href: '/', icon: Home },
    { name: 'يومية الخزنة والعمليات', href: '/journal', icon: BookText },
    { name: 'دفتر اليومية المجمع', href: '/ledger', icon: BookText },
    { name: 'الإعدادات', href: '/settings', icon: Settings },
  ];

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="flex flex-col lg:flex-row w-full h-[100dvh] bg-[#0a0a0a] text-gray-200 font-sans overflow-hidden" dir="rtl">
      {/* Mobile header (hidden on desktop) */}
      <div className="lg:hidden shrink-0 bg-[#111111] border-b border-white/5 px-4 py-3 flex items-center justify-between z-40">
        <h1 className="text-xs uppercase tracking-widest font-bold text-teal-400">نظام مكة للصياغة</h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -mr-2 text-teal-400">
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar for Desktop / Mobile Slide-over */}
      <aside className={`fixed inset-y-0 right-0 z-50 transform transition-transform duration-300 lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} lg:static w-72 max-w-[80vw] bg-[#111111] border-l border-white/5 flex flex-col shadow-2xl lg:shadow-none`}>
        <div className="hidden lg:flex p-6 border-b border-white/5 justify-between items-center h-16 shrink-0">
          <h1 className="text-xs uppercase tracking-widest font-bold text-teal-400">نظام مكة للصياغة</h1>
          <Link to="/settings" className="w-6 h-6 rounded bg-teal-500/10 flex items-center justify-center hover:bg-teal-500/20">
            <Plus className="w-4 h-4 text-teal-400" />
          </Link>
        </div>
        
        <div className="lg:hidden p-6 border-b border-white/5 flex justify-between items-center shrink-0">
          <h1 className="text-xs uppercase tracking-widest font-bold text-teal-400">القائمة</h1>
          <button onClick={closeMenu} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <div className="text-[10px] text-gray-500 uppercase px-2 mb-2 tracking-tighter">القائمة الرئيسية</div>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || (location.pathname.startsWith('/sections') && item.href === '/');
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={closeMenu}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-white/5 border border-white/10' : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-teal-400' : 'bg-gray-600'}`}></div>
                <span className={`text-sm ${isActive ? 'font-medium text-white' : 'text-gray-400'}`}>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-white/5 shrink-0">
          <div className="flex flex-col gap-3">
            <div className="text-[10px] text-teal-400 font-bold uppercase tracking-wide truncate px-2">{user?.email}</div>
            <button
              onClick={() => { closeMenu(); logout(); }}
              className="flex items-center gap-3 px-3 py-3 w-full text-left rounded-lg text-red-500 hover:bg-white/5 hover:text-red-400 transition-colors border border-transparent"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="text-sm">تسجيل خروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto relative z-0">
        <header className="h-16 border-b border-white/5 hidden lg:flex items-center px-8 bg-[#0d0d0d] shrink-0 sticky top-0 z-10">
          <div className="flex items-center space-x-4 space-x-reverse">
             <span className="text-sm text-white font-medium italic">لوحة التحكم</span>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8">
          <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
      
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm" 
          onClick={closeMenu}
        />
      )}
    </div>
  );
}
