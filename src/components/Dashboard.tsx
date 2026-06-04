/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { 
  TrendingUp, 
  Layers, 
  CheckSquare, 
  AlertTriangle, 
  FileText, 
  Truck, 
  Percent,
  Compass
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend
} from 'recharts';
import { Factory, ProductionData, StatsSummary } from '../types';

interface DashboardProps {
  selectedFactoryName: string;
  stats: StatsSummary;
  daysData: Record<number, number>;
  allFactories: Factory[];
  allProductionData: Record<string, ProductionData>;
  isAdmin: boolean;
  onAllocatedChange: (val: number) => void;
  onCarriedChange: (val: number) => void;
}

const CAR_LOAD = 33000;

export default function Dashboard({
  selectedFactoryName,
  stats,
  daysData,
  allFactories,
  allProductionData,
  isAdmin,
  onAllocatedChange,
  onCarriedChange
}: DashboardProps) {

  // Prepare data for the daily trend chart
  const trendChartData = useMemo(() => {
    const days = Object.keys(daysData).map(Number).sort((a, b) => a - b);
    return days.map(day => {
      const liters = daysData[day] || 0;
      return {
        day_label: `يوم ${day}`,
        liters: liters,
        trucks: Number((liters / CAR_LOAD).toFixed(2)),
      };
    });
  }, [daysData]);

  // Analytical breakdown of the daily withdrawal patterns
  const patternStats = useMemo(() => {
    const rawValues = Object.entries(daysData).map(([day, val]) => ({
      day: Number(day),
      liters: Number(val) || 0
    }));

    let maxVal = 0;
    let maxDay = 0;
    let activeDaysCount = 0;
    let totalCombined = 0;

    rawValues.forEach(({ day, liters }) => {
      totalCombined += liters;
      if (liters > 0) {
        activeDaysCount++;
      }
      if (liters > maxVal) {
        maxVal = liters;
        maxDay = day;
      }
    });

    const averageDaily = rawValues.length > 0 ? totalCombined / rawValues.length : 0;

    return {
      maxVal,
      maxDay,
      activeDaysCount,
      averageDaily,
    };
  }, [daysData]);

  // Prepare data for comparison chart across all factories
  const comparisonChartData = useMemo(() => {
    return allFactories.map(f => {
      const prod = allProductionData[f.id] || { allocated: 0, carried: 0, days: {} };
      const totalAllocated = prod.allocated + prod.carried;
      const totalDrawn = Object.values(prod.days).reduce((acc: number, curr: number) => acc + (curr || 0), 0);
      const remaining = totalAllocated - totalDrawn;

      return {
        name: f.name.length > 25 ? f.name.substring(0, 22) + "..." : f.name,
        'إجمالي التخصيص والمدور': totalAllocated,
        'إجمالي المجهز': totalDrawn,
        'الرصيد المتبقي': remaining >= 0 ? remaining : 0,
      };
    });
  }, [allFactories, allProductionData]);

  // Formatter helper
  const formatLiters = (num: number) => {
    return num.toLocaleString() + " لتر";
  };

  return (
    <div className="space-y-8" id="dashboard-container">
      {/* Dynamic Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Allocated Allotment */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-500">الكمية المخصصة للشهر</h4>
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
              <Compass className="w-5 h-5" />
            </div>
          </div>
          
          <div className="mt-4">
            {isAdmin ? (
              <div className="space-y-1">
                <input
                  type="number"
                  value={stats.allocated || ""}
                  onChange={(e) => onAllocatedChange(Number(e.target.value) || 0)}
                  placeholder="أدخل الحصة باللتر"
                  className="w-full text-xl font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-center"
                />
                <span className="text-xs text-slate-400 block text-center">اضغط لكتابة قيمة تخصيص جديدة</span>
              </div>
            ) : (
              <div>
                <p className="text-2xl font-black text-slate-800 font-mono">{stats.allocated.toLocaleString()}</p>
                <span className="text-sm text-slate-400 font-bold">لتر</span>
              </div>
            )}
          </div>
        </div>

        {/* Carried/Rolled Quantity */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-500">الكمية المدورة (من الشهر السابق)</h4>
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          
          <div className="mt-4">
            {isAdmin ? (
              <div className="space-y-1">
                <input
                  type="number"
                  value={stats.carried || ""}
                  onChange={(e) => onCarriedChange(Number(e.target.value) || 0)}
                  placeholder="المدور باللتر"
                  className="w-full text-xl font-bold bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center"
                />
                <span className="text-xs text-slate-400 block text-center">اضغط لكتابة قيمة التدوير</span>
              </div>
            ) : (
              <div>
                <p className="text-2xl font-black text-slate-800 font-mono">{stats.carried.toLocaleString()}</p>
                <span className="text-sm text-slate-400 font-bold">لتر</span>
              </div>
            )}
          </div>
        </div>

        {/* Total Drawn Quantity */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border-r-4 border-r-emerald-500">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-500">إجمالي المجهز الفعلي</h4>
              <p className="text-xs text-slate-400 mt-1 font-semibold">مجموع سحوبات الـ 31 يوماً</p>
            </div>
            <div className="bg-emerald-100 text-emerald-800 p-2.5 rounded-xl">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>
          
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <p className="text-2xl font-black text-emerald-700 font-mono">{stats.totalDrawn.toLocaleString()}</p>
              <span className="text-xs text-slate-400 font-bold">لتر مجهز</span>
            </div>
            
            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg text-xs font-bold">
              <Percent className="w-3.5 h-3.5" />
              <span>{stats.percentageDrawn.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Total Remaining Balance */}
        <div className={`bg-white border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all border-r-4 ${
          stats.remaining < 0 
            ? 'border-red-500 border-red-100 bg-red-50/20' 
            : 'border-amber-500 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-600">الرصيد المتبقي الكلي</h4>
              <p className="text-xs text-slate-400 mt-1 font-semibold">تخصيص + مدوّر - المجهز</p>
            </div>
            <div className={`p-2.5 rounded-xl ${
              stats.remaining < 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {stats.remaining < 0 ? <AlertTriangle className="w-5 h-5 animate-bounce" /> : <Layers className="w-5 h-5" />}
            </div>
          </div>
          
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <p className={`text-2xl font-black font-mono ${
                stats.remaining < 0 ? 'text-red-650' : 'text-slate-800'
              }`}>
                {stats.remaining.toLocaleString()}
              </p>
              <span className="text-xs text-slate-400 font-bold">لتر متبقي</span>
            </div>
            {stats.remaining < 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-2.5 py-0.5 rounded-md font-extrabold animate-pulse">
                تجاوز الرصيد
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Auxiliary Statistics Row */}
      <div className="bg-slate-800 text-white rounded-2xl p-6 shadow-inner flex flex-col md:flex-row items-center justify-between gap-6" id="aux-stats">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-base font-black text-slate-100">إجمالي النقل والشحن المكافئ</h4>
            <p className="text-sm text-slate-400 mt-1">
              العدد الكلي لحمولات الناقلات البرية المسجلة (بمعدل حميد يبلغ <strong className="text-amber-400">33,000 لتر</strong> للسيارة الواحدة)
            </p>
          </div>
        </div>
        <div className="text-center md:text-left bg-slate-900 border border-slate-700 px-8 py-3.5 rounded-xl shrink-0">
          <span className="text-sm text-slate-400 block font-bold mb-1">السيارات التقديرية</span>
          <span className="text-3xl font-black text-amber-400 font-mono">{stats.totalTrucks.toFixed(2)}</span>
          <span className="text-sm text-slate-300 font-bold mr-1.5">سيارة شحن</span>
        </div>
      </div>

      {/* Interactive Charts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="charts-grid">
        
        {/* Daily Distribution Level Area Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-800">مخطط مستويات التجهيز اليومي</h3>
            <p className="text-xs text-slate-400 mt-0.5">تفصيل السحب اليومي باللتر على مدار الشهر للمعمل الحالي ({selectedFactoryName})</p>
          </div>

          {/* Pattern analysis mini-metrics badges */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-2 text-center">
              <span className="text-[10px] font-bold text-slate-500 block mb-0.5">أيام السحب النشطة</span>
              <span className="text-xs sm:text-sm font-black text-emerald-700 font-mono">
                {patternStats.activeDaysCount} <span className="text-[9px] font-bold text-slate-400 font-sans">يوم</span>
              </span>
            </div>
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-2 text-center">
              <span className="text-[10px] font-bold text-slate-500 block mb-0.5">الذروة اليومية (يوم {patternStats.maxDay || "-"})</span>
              <span className="text-xs sm:text-sm font-black text-amber-700 font-mono">
                {patternStats.maxVal.toLocaleString()} <span className="text-[9px] font-bold text-slate-400 font-sans">لتر</span>
              </span>
            </div>
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-2 text-center">
              <span className="text-[10px] font-bold text-slate-500 block mb-0.5">المعدل اليومي العام</span>
              <span className="text-xs sm:text-sm font-black text-blue-700 font-mono">
                {Math.round(patternStats.averageDaily).toLocaleString()} <span className="text-[9px] font-bold text-slate-400 font-sans">لتر</span>
              </span>
            </div>
          </div>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLiters" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day_label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <Tooltip 
                  labelClassName="text-xs text-slate-500 font-bold text-right"
                  formatter={(value: any) => [`${Number(value).toLocaleString()} لتر`, 'الكمية']}
                />
                <Area type="monotone" dataKey="liters" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLiters)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Global Factories Allotment Check */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-base font-bold text-slate-800">المقارنة العامة للمنافذ</h3>
            <p className="text-xs text-slate-400 mt-0.5">تمثيل التخصيص الإجمالي الفعلي مقابل الإستهلاك والمتبقي لكل المعامل المتاحة</p>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} />
                <Tooltip 
                  labelClassName="text-xs font-bold text-right text-slate-700"
                  formatter={(value: any) => [`${Number(value).toLocaleString()} لتر`, '']}
                />
                <Legend iconSize={10} style={{ fontSize: '11px' }} />
                <Bar name="إجمالي الرصيد" dataKey="إجمالي التخصيص والمدور" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar name="المجهز لغاية الآن" dataKey="إجمالي المجهز" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
