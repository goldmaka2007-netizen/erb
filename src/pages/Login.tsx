import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { user, login } = useAuth();

  if (user) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a0a] font-sans text-gray-200" dir="rtl">
      <div className="max-w-md w-full space-y-8 bg-[#111111] border border-white/5 p-8 rounded-2xl shadow-2xl text-center">
        <div>
          <h2 className="mt-6 text-2xl font-serif italic tracking-tight text-white">نظام مكة للصياغة</h2>
          <p className="mt-2 text-xs text-gray-500">
            أهلاً بك، يرجى تسجيل الدخول للوصول إلى النظام.
          </p>
        </div>
        <div className="mt-8">
          <button
            onClick={login}
            className="w-full flex justify-center py-3 px-4 border border-teal-500/50 rounded-xl shadow-[0_0_15px_rgba(20,184,166,0.2)] text-sm font-bold text-black bg-teal-500 hover:bg-teal-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111111] focus:ring-teal-500 transition-all active:scale-95"
          >
            تسجيل الدخول بحساب Google
          </button>
        </div>
      </div>
    </div>
  );
}
