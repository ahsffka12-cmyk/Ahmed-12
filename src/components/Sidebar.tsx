/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Factory as FactoryIcon, Plus, Trash2, Search, Building2, Eye } from 'lucide-react';
import { Factory } from '../types';

interface SidebarProps {
  factories: Factory[];
  selectedId: string | null;
  onSelectFactory: (id: string, name: string) => void;
  onAddFactory: (name: string) => void;
  onDeleteFactory: (id: string) => void;
  isAdmin: boolean;
}

export default function Sidebar({
  factories,
  selectedId,
  onSelectFactory,
  onAddFactory,
  onDeleteFactory,
  isAdmin
}: SidebarProps) {
  const [newFactoryName, setNewFactoryName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFactoryName.trim()) return;
    onAddFactory(newFactoryName.trim());
    setNewFactoryName("");
  };

  const filteredFactories = factories.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-full lg:w-80 bg-slate-900 text-white flex flex-col shrink-0 border-l border-slate-800 shadow-xl" id="main-sidebar">
      {/* Brand area */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-amber-500" />
          <div>
            <h2 className="text-lg font-bold text-slate-100">نظام إدارة المعامل</h2>
            <p className="text-xs text-slate-400">قائمة منافذ تجهيز الوقود والمستودعات</p>
          </div>
        </div>
      </div>

      {/* Search area */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 sticky top-0 z-10">
        <div className="relative">
          <input
            type="text"
            placeholder="ابحث عن مستودع أو معمل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-10 py-2 bg-slate-800 text-slate-100 border border-slate-700 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-right"
          />
          <Search className="absolute right-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
        </div>
      </div>

      {/* Factories scroll list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <h3 className="text-xs font-bold text-slate-400 pr-2 mb-3 tracking-wide">المنافذ الحالية ({filteredFactories.length})</h3>
        {filteredFactories.length === 0 ? (
          <div className="text-center py-8 px-4 text-slate-500 text-sm">
            لا توجد معامل مطابقة لطلب البحث
          </div>
        ) : (
          filteredFactories.map((factory) => {
            const isActive = selectedId === factory.id;
            return (
              <div
                key={factory.id}
                className={`group flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white font-medium shadow-md shadow-emerald-900/30 ring-1 ring-emerald-500'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                onClick={() => onSelectFactory(factory.id, factory.name)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <FactoryIcon className={`w-4 h-4 uppercase shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-amber-500'}`} />
                  <span className="truncate text-sm font-semibold">{factory.name}</span>
                </div>
                
                {/* Delete button only if administrator & not active */}
                {isAdmin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`هل أنت متأكد من حذف ${factory.name} وكل بياناته اليومية؟`)) {
                        onDeleteFactory(factory.id);
                      }
                    }}
                    className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100 ${
                      isActive 
                        ? 'hover:bg-emerald-700 text-emerald-100' 
                        : 'hover:bg-slate-700 text-slate-400 hover:text-red-500'
                    }`}
                    title="حذف هذا المعمل"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Admin creation control panel */}
      {isAdmin ? (
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-xs font-bold text-slate-300">تسجيل مستودع/معمل جديد</label>
            <div className="relative">
              <input
                type="text"
                placeholder="اسم المعمل الجديد..."
                value={newFactoryName}
                onChange={(e) => setNewFactoryName(e.target.value)}
                className="w-full text-sm pl-3 pr-4 py-2 bg-slate-800 text-white border border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none focus:border-amber-500 placeholder-slate-500 font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={!newFactoryName.trim()}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-emerald-600 sm:hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg text-sm font-bold transition-all shadow-md focus:ring-2 focus:ring-emerald-400 disabled:pointer-events-none cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة المعمل للمنظومة</span>
            </button>
          </form>
        </div>
      ) : (
        <div className="p-5 border-t border-slate-800 bg-slate-950/60 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 font-medium">
          <Eye className="w-3.5 h-3.5" />
          <span>أنت تتصفح في "وضع العرض فقط"</span>
        </div>
      )}
    </aside>
  );
}
