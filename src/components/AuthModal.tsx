/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Lock, Mail, AlertTriangle, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (email: string, token?: string) => void;
  firebaseSignIn: (email: string, pass: string) => Promise<any>;
}

export default function AuthModal({
  isOpen,
  onClose,
  onLoginSuccess,
  firebaseSignIn
}: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const targetEmail = email.trim();
    const targetPass = password;

    if (!targetEmail || !targetPass) {
      setError("يرجى إدخال البريد الإلمتروني وكلمة المرور.");
      setLoading(false);
      return;
    }

    try {
      // 1. Try Firebase Auth sign-in if connected
      await firebaseSignIn(targetEmail, targetPass);
      onLoginSuccess(targetEmail);
      onClose();
    } catch (firebaseErr: any) {
      let isMockAllowed = false;
      
      // Let's implement immediate local fallback bypass for testing!
      // This is a gorgeous UX: if firebase is not configured/offline, or they use our mock user, allow them premium access.
      if (targetEmail.toLowerCase() === "admin@oil.gov.iq" && targetPass === "admin123") {
        isMockAllowed = true;
      }

      if (isMockAllowed) {
        onLoginSuccess(targetEmail);
        onClose();
      } else {
        // Detailed error messages in Arabic
        console.error("Auth Exception caught:", firebaseErr);
        if (firebaseErr.message && firebaseErr.message.includes("auth/invalid-credential")) {
          setError("خطأ في بيانات الدخول. يرجى التحقق من البريد وكلمة المرور.");
        } else {
          setError(firebaseErr.message || "فشل تسجيل الدخول. تم تفعيل وضع التجربة لـ admin@oil.gov.iq / admin123");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans text-right" dir="rtl" id="auth-modal">
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Header decoration */}
        <div className="bg-slate-950 px-6 py-5 text-white flex items-center justify-between border-b border-slate-855">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-extrabold text-base">تسجيل دخول المسؤول</h3>
              <p className="text-[10px] text-slate-400">بوابة التحكم في حصص التوزيع والكميات المجهزة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* User helper for immediate demo access */}
          <div className="p-3.5 bg-amber-50/60 border border-amber-200 text-slate-750 text-xs rounded-xl space-y-1.5">
            <div className="flex items-center gap-1 font-bold text-amber-800">
              <ShieldCheck className="w-4 h-4" />
              <span>وضع التجربة والمستعرض المحلي نشط</span>
            </div>
            <p className="leading-relaxed">
              يمكنك الدخول الفوري وتجربة كافة صلاحيات التعديل والحفظ كاملة باستخدام بيانات المحاكاة التالية:
            </p>
            <div className="text-left font-mono bg-white border border-amber-100 p-2 rounded text-[11px] space-y-1">
              <div className="flex justify-between">
                <span className="font-sans text-[10px] text-slate-400">بريد التجربة:</span>
                <span className="font-semibold text-slate-700 select-all">admin@oil.gov.iq</span>
              </div>
              <div className="flex justify-between">
                <span className="font-sans text-[10px] text-slate-400">كلمة المرور:</span>
                <span className="font-semibold text-slate-700 select-all">admin123</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">البريد الإلكتروني للوزارة</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@oil.gov.iq"
                className="w-full text-right py-2 pl-4 pr-10 border border-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <Mail className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-600">رمز المرور السري</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="●●●●●●●●"
                className="w-full text-right py-2 pl-4 pr-10 border border-slate-200 text-sm rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <Lock className="absolute right-3.5 top-3 w-4 h-4 text-slate-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-slate-900 border border-slate-800 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-805 transition-all flex items-center justify-center gap-1"
          >
            {loading ? "جاري تعشيق الصلاحيات..." : "تسجيل الدخول الآمن"}
          </button>
        </form>

      </div>
    </div>
  );
}
