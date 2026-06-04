/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Fuel, ShieldAlert, ShieldCheck, LogIn, LogOut, Database, Cloud } from 'lucide-react';
import { isRealFirebase } from '../lib/database';

interface HeaderProps {
  currentFactoryName: string;
  isAdmin: boolean;
  userEmail: string | null;
  onAuthTrigger: () => void;
  onLogout: () => void;
}

export default function Header({
  currentFactoryName,
  isAdmin,
  userEmail,
  onAuthTrigger,
  onLogout
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm" id="main-header">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-600 text-white p-2.5 rounded-xl shadow-md flex items-center justify-center">
          <Fuel className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            نظام إدارة تجهيز المنتجات النفطية
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            المتابعة الذكية للكميات المخصصة والتوزيع اليومي للمكلفين
          </p>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-3">
        {/* Dynamic Database Badge */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
          isRealFirebase 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
            : 'bg-indigo-50 text-indigo-700 border-indigo-250'
        }`}>
          {isRealFirebase ? <Cloud className="w-3.5 h-3.5" /> : <Database className="w-3.5 h-3.5" />}
          <span>{isRealFirebase ? "سحابي سريّ (Firebase)" : "قاعدة محلية نشطة"}</span>
        </div>

        {/* Admin Authorization Status Card */}
        {isAdmin ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-1.5">
            <div className="flex items-center gap-1.5 text-emerald-700 text-sm font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>المدير: {userEmail || "مستعرض كامل الصلاحية"}</span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:underline font-bold border-r border-emerald-200 pr-3 mr-1"
              title="خروج من لوحة الإدارة"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>
        ) : (
          <button
            onClick={onAuthTrigger}
            className="flex items-center gap-2 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl text-sm font-bold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
            id="auth-btn"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل دخول المدير (صلاحية التعديل)</span>
          </button>
        )}
      </div>
    </header>
  );
}
