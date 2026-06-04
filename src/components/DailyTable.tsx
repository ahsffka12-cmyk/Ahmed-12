/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Save, Trash, RotateCcw, AlertCircle, Share2, HelpCircle } from 'lucide-react';

interface DailyTableProps {
  daysData: Record<number, number>;
  onDayValueChange: (day: number, liters: number) => void;
  onSave: () => void;
  isAdmin: boolean;
  isSaving: boolean;
  activeFilter?: string;
}

const CAR_LOAD = 33000;

export default function DailyTable({
  daysData,
  onDayValueChange,
  onSave,
  isAdmin,
  isSaving,
  activeFilter = "all"
}: DailyTableProps) {
  const [localDays, setLocalDays] = useState<Record<number, number>>({});

  // Synchronize local states when parent state is fetched
  useEffect(() => {
    const days: Record<number, number> = {};
    for (let i = 1; i <= 31; i++) {
      days[i] = daysData[i] || 0;
    }
    setLocalDays(days);
  }, [daysData]);

  // Filtered day numbers to list of keys
  const daysToRender = useMemo(() => {
    const list = Array.from({ length: 31 }, (_, i) => i + 1);
    if (activeFilter === "all") return list;
    
    return list.filter(day => {
      const liters = localDays[day] || 0;
      if (activeFilter === "first_half") return day >= 1 && day <= 15;
      if (activeFilter === "second_half") return day >= 16 && day <= 31;
      if (activeFilter === "active") return liters > 0;
      if (activeFilter === "high") return liters >= 99000;
      return true;
    });
  }, [localDays, activeFilter]);

  const handleInputChange = (day: number, valString: string) => {
    const numeric = parseFloat(valString) || 0;
    const cleanValue = Math.max(0, numeric);
    setLocalDays(prev => ({ ...prev, [day]: cleanValue }));
    onDayValueChange(day, cleanValue);
  };

  const handleQuickFillTrucks = (day: number, count: number) => {
    if (!isAdmin) return;
    const targetLiters = count * CAR_LOAD;
    setLocalDays(prev => ({ ...prev, [day]: targetLiters }));
    onDayValueChange(day, targetLiters);
  };

  const handleResetDays = () => {
    if (!confirm("هل أنت متأكد من تصفير سحوبات جميع الأيام بالجدول؟")) return;
    const cleared: Record<number, number> = {};
    for (let i = 1; i <= 31; i++) {
      cleared[i] = 0;
      onDayValueChange(i, 0);
    }
    setLocalDays(cleared);
  };

  // Render a single cell row
  const renderDayRowCells = (day: number) => {
    const liters = localDays[day] || 0;
    const trucks = Number((liters / CAR_LOAD).toFixed(2));
    
    return (
      <>
        {/* Day Number Column */}
        <td className="bg-slate-50 font-bold text-slate-705 text-center border-l border-slate-200 w-14 py-2 font-mono" id={`cell-day-${day}`}>
          {day}
        </td>

        {/* Liters Input Column */}
        <td className="px-3 py-1.5 border-l border-slate-200">
          <div className="relative flex items-center justify-center">
            <input
              type="number"
              min="0"
              value={liters === 0 ? "" : liters}
              onChange={(e) => handleInputChange(day, e.target.value)}
              disabled={!isAdmin}
              placeholder="0 (لتر)"
              className="w-full text-center py-1.5 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono focus:bg-white bg-slate-50/50 text-slate-800 disabled:opacity-75 disabled:cursor-not-allowed"
            />
          </div>
        </td>

        {/* Trucks Counter and Helper Pill Column */}
        <td className="px-2 py-1.5 text-center text-xs text-slate-500 font-medium">
          <div className="flex items-center justify-between gap-1 max-w-[140px] mx-auto">
            <span className="font-mono font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 flex items-center gap-1">
              {trucks} <span className="text-[10px] font-bold text-slate-500 font-sans">سيارة</span>
            </span>

            {/* Quick Actions for admin (fill precisely 1 or 2 tanker trucks) */}
            {isAdmin && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => handleQuickFillTrucks(day, 1)}
                  className="px-1 py-0.5 bg-slate-100 border border-slate-250 text-[10px] rounded hover:bg-emerald-500 hover:text-white hover:border-emerald-500 font-bold transition-all"
                  title="تعبئة سيارة كاملة (33 ألف لتر)"
                >
                  1س
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFillTrucks(day, 2)}
                  className="px-1 py-0.5 bg-slate-100 border border-slate-250 text-[10px] rounded hover:bg-emerald-500 hover:text-white hover:border-emerald-500 font-bold transition-all"
                  title="تعبئة سيارتين (66 ألف لتر)"
                >
                  2س
                </button>
              </div>
            )}
          </div>
        </td>
      </>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6" id="daily-table-container">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">تفاصيل جدول التجهيز اليومي</h3>
            <p className="text-xs text-slate-400 mt-0.5">معادلة آلية الحمولة (33,000 لتر لكل سيارة شحن رئيسية)</p>
          </div>
        </div>

        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={handleResetDays}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 focus:outline-none"
              title="تصفير الجدول وتفريغ كمياته بالكامل"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تصفير الجدول</span>
            </button>
          </div>
        )}
      </div>

      {/* Main conditional table block */}
      {activeFilter === "all" ? (
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white text-xs font-bold border-b border-slate-700">
                {/* Left Segment: Days 17-31 */}
                <th className="px-3 py-3 w-14 text-center border-l border-slate-700">اليوم</th>
                <th className="px-4 py-3 text-center border-l border-slate-700">الكمية المجهزة (لتر)</th>
                <th className="px-3 py-3 text-center border-l border-slate-600">سيارات الشحن</th>

                {/* Right Segment: Days 1-16 */}
                <th className="px-3 py-3 w-14 text-center border-l border-slate-700">اليوم</th>
                <th className="px-4 py-3 text-center border-l border-slate-700">الكمية المجهزة (لتر)</th>
                <th className="px-3 py-3 text-center">سيارات الشحن</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-middle">
              {Array.from({ length: 16 }).map((_, index) => {
                const rightDay = index + 1; // 1 to 16
                const leftDay = index + 17; // 17 to 32 (we ignore 32)
                return (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    {/* Left Segment: Days 17-31 */}
                    {leftDay <= 31 ? (
                      renderDayRowCells(leftDay)
                    ) : (
                      <>
                        <td className="bg-slate-100 text-center border-l border-slate-200 text-slate-400 font-mono text-xs font-medium py-2">-</td>
                        <td className="px-3 py-1.5 border-l border-slate-200 text-center text-slate-350 text-xs">-</td>
                        <td className="px-2 py-1.5 border-l border-slate-200 text-center text-slate-350 text-xs">-</td>
                      </>
                    )}

                    {/* Right Segment: Days 1-16 */}
                    {renderDayRowCells(rightDay)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
          {daysToRender.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-slate-50 font-bold text-sm">
              لا توجد سحوبات مجهزة تطابق شرط الفلترة المختار في هذا الشهر.
            </div>
          ) : (
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white text-xs font-bold border-b border-slate-700">
                  <th className="px-6 py-3 w-28 text-center border-l border-slate-700">اليوم</th>
                  <th className="px-6 py-3 border-l border-slate-700">الكمية المجهزة للفترة (لتر)</th>
                  <th className="px-6 py-3 text-center">سيارات الشحن مكافئ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-middle">
                {daysToRender.map((day) => {
                  const liters = localDays[day] || 0;
                  const trucks = Number((liters / CAR_LOAD).toFixed(2));
                  return (
                    <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                      {/* Day Column */}
                      <td className="bg-slate-50 font-bold text-slate-700 text-center border-l border-slate-200 w-28 py-4 font-mono">
                        يوم {day}
                      </td>

                      {/* Liters Input Column */}
                      <td className="px-6 py-2 border-l border-slate-200">
                        <div className="max-w-xs relative flex items-center">
                          <input
                            type="number"
                            min="0"
                            value={liters === 0 ? "" : liters}
                            onChange={(e) => handleInputChange(day, e.target.value)}
                            disabled={!isAdmin}
                            placeholder="0 (لتر)"
                            className="w-full text-center py-2 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono bg-slate-50/50 text-slate-800 disabled:opacity-75 disabled:cursor-not-allowed"
                          />
                        </div>
                      </td>

                      {/* Trucks equivalence */}
                      <td className="px-6 py-2 text-center text-xs text-slate-500 font-medium">
                        <div className="flex items-center justify-center gap-4">
                          <span className="font-mono font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 flex items-center gap-1">
                            {trucks} <span className="text-[10px] font-bold text-slate-400 font-sans">سيارة</span>
                          </span>

                          {isAdmin && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleQuickFillTrucks(day, 1)}
                                className="px-3 py-1 bg-slate-100 border border-slate-200 text-xs rounded-lg hover:bg-emerald-500 hover:text-white hover:border-emerald-500 font-bold transition-all"
                              >
                                ١ سيارة
                              </button>
                              <button
                                type="button"
                                onClick={() => handleQuickFillTrucks(day, 2)}
                                className="px-3 py-1 bg-slate-100 border border-slate-200 text-xs rounded-lg hover:bg-emerald-500 hover:text-white hover:border-emerald-500 font-bold transition-all"
                              >
                                ٢ سيارة
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {isAdmin ? (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs text-amber-600 font-bold">
            <AlertCircle className="w-4 h-4 animate-pulse shrink-0" />
            <span>انتبه: يجب الضغط على زر الحفظ السحابي لضمان ثبات التغييرات على السيرفر المركزي.</span>
          </div>
          
          <button
            onClick={onSave}
            disabled={isSaving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md disabled:opacity-50 transition-all hover:-translate-y-0.5"
            id="cloud-save-btn"
          >
            <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
            <span>{isSaving ? "جاري الحفظ والنسخ المتزامن..." : "حفظ التعديلات سحابياً وبشكل دوري"}</span>
          </button>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl flex items-center gap-2.5 text-xs text-slate-500 font-medium">
          <HelpCircle className="w-4 h-4 text-slate-400" />
          <span>الجدول في وضع القراءة فقط. يرجى تسجيل الدخول كمسؤول من أعلى الصفحة لتعديل حصص التوزيع اليومية.</span>
        </div>
      )}

    </div>
  );
}
