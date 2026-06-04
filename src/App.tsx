/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DailyTable from './components/DailyTable';
import AuthModal from './components/AuthModal';
import { 
  fetchFactories, 
  createFactory, 
  removeFactory, 
  fetchProductionData, 
  saveProductionData,
  auth,
  isRealFirebase
} from './lib/database';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { Factory, ProductionData, StatsSummary } from './types';
import { AlertCircle, HelpCircle, FileSpreadsheet, Printer, Download, FileText, X } from 'lucide-react';

const CAR_LOAD = 33000;

const AVAILABLE_MONTHS = [
  { value: "2026-06", label: "يونيو ٢٠٢٦ (الشهر الحالي)" },
  { value: "2026-05", label: "مايو ٢٠٢٦" },
  { value: "2026-04", label: "أبريل ٢٠٢٦" },
  { value: "2026-03", label: "مارس ٢٠٢٦" },
  { value: "2026-02", label: "فبراير ٢٠٢٦" },
  { value: "2026-01", label: "يناير ٢٠٢٦" },
  { value: "2025-12", label: "ديسمبر ٢٠٢٥" },
];

export default function App() {
  const [factories, setFactories] = useState<Factory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("2026-06");
  const [activeTab, setActiveTab] = useState<"all" | "first_half" | "second_half" | "active" | "high">("all");

  const [productionData, setProductionData] = useState<ProductionData>({
    allocated: 0,
    carried: 0,
    days: {},
    updatedAt: new Date().toISOString()
  });

  // Keep a map of all production data for comparing factories in the dashboard
  const [allProductionData, setAllProductionData] = useState<Record<string, ProductionData>>({});

  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // 1. Listen for auth changes on real Firebase
  useEffect(() => {
    if (isRealFirebase && auth) {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setIsAdmin(true);
          setUserEmail(user.email);
        } else {
          setIsAdmin(false);
          setUserEmail(null);
        }
      });
      return () => unsubscribe();
    }
  }, []);

  // 2. Load factories on mount
  const loadFactoriesData = async () => {
    setIsLoading(true);
    try {
      const list = await fetchFactories();
      setFactories(list);
      
      // Select the first factory automatically if none selected yet
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0].id);
        setSelectedName(list[0].name);
      }
    } catch (err) {
      console.error("Error loading factories lists:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFactoriesData();
  }, []);

  // 2.5 Prefetch data for all factories when list or active month changes
  useEffect(() => {
    if (factories.length === 0) return;
    
    const prefetch = async () => {
      const dataMap: Record<string, ProductionData> = {};
      await Promise.all(
        factories.map(async (f) => {
          try {
            const data = await fetchProductionData(f.id, selectedMonth);
            dataMap[f.id] = data;
          } catch (e) {
            console.error(`Failed to prefetch data for factory ${f.id} for month ${selectedMonth}`, e);
          }
        })
      );
      setAllProductionData(dataMap);
    };

    prefetch();
  }, [factories, selectedMonth]);

  // 3. Load active factory's production data when selection or month changes
  useEffect(() => {
    if (!selectedId) return;
    
    const loadActiveData = async () => {
      try {
        const data = await fetchProductionData(selectedId, selectedMonth);
        setProductionData(data);
      } catch (err) {
        console.error("Failed to load factory details:", err);
      }
    };
    
    loadActiveData();
  }, [selectedId, selectedMonth]);

  // 4. Compute real-time stats for the loaded factory
  const stats = useMemo<StatsSummary>(() => {
    const allocated = Number(productionData.allocated) || 0;
    const carried = Number(productionData.carried) || 0;
    const totalAllotted = allocated + carried;

    const totalDrawn = (Object.values(productionData.days) as number[]).reduce(
      (acc: number, val: number) => acc + (Number(val) || 0), 
      0
    );

    const remaining = totalAllotted - totalDrawn;
    const percentageDrawn = totalAllotted > 0 ? (totalDrawn / totalAllotted) * 100 : 0;
    const totalTrucks = totalDrawn / CAR_LOAD;

    return {
      allocated,
      carried,
      totalDrawn,
      remaining,
      percentageDrawn,
      totalTrucks
    };
  }, [productionData]);

  // Derive filtered days based on Selected Day Range/Period filter
  const filteredDays = useMemo<Record<number, number>>(() => {
    const rawDays = productionData.days || {};
    const result: Record<number, number> = {};
    
    for (let d = 1; d <= 31; d++) {
      const liters = rawDays[d] || 0;
      
      // Check if it satisfies the active period filter tab
      let matches = false;
      if (activeTab === "all") {
        matches = true;
      } else if (activeTab === "first_half") {
        if (d >= 1 && d <= 15) matches = true;
      } else if (activeTab === "second_half") {
        if (d >= 16 && d <= 31) matches = true;
      } else if (activeTab === "active") {
        if (liters > 0) matches = true;
      } else if (activeTab === "high") {
        if (liters >= 99000) matches = true; // Exceeds or matches 3 trucks
      }
      
      if (matches) {
        result[d] = liters;
      }
    }
    
    return result;
  }, [productionData.days, activeTab]);

  // Handler: Change selection
  const handleSelectFactory = (id: string, name: string) => {
    setSelectedId(id);
    setSelectedName(name);
  };

  // Handler: Create factory
  const handleAddFactory = async (name: string) => {
    try {
      const newFact = await createFactory(name);
      setFactories(prev => [...prev, newFact]);
      // Auto select the newly created factory
      setSelectedId(newFact.id);
      setSelectedName(newFact.name);
      
      // Update data mapping
      setAllProductionData(prev => ({
        ...prev,
        [newFact.id]: { allocated: 0, carried: 0, days: {}, updatedAt: new Date().toISOString() }
      }));
    } catch (err) {
      alert("حدث خطأ أثناء تسجيل المعمل الجديد");
    }
  };

  // Handler: Delete factory
  const handleDeleteFactory = async (id: string) => {
    try {
      await removeFactory(id);
      setFactories(prev => prev.filter(f => f.id !== id));
      
      // Clean up map
      setAllProductionData(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      // If deleted factory was currently selected, select another one
      if (selectedId === id) {
        const remaining = factories.filter(f => f.id !== id);
        if (remaining.length > 0) {
          setSelectedId(remaining[0].id);
          setSelectedName(remaining[0].name);
        } else {
          setSelectedId(null);
          setSelectedName("");
        }
      }
    } catch (err) {
      alert("خطأ أثناء حذف المعمل");
    }
  };

  // Handler: update allocated limits locally
  const handleAllocatedChange = (val: number) => {
    setProductionData(prev => ({
      ...prev,
      allocated: val
    }));
  };

  // Handler: update carried limits locally
  const handleCarriedChange = (val: number) => {
    setProductionData(prev => ({
      ...prev,
      carried: val
    }));
  };

  // Handler: change daily volume levels locally
  const handleDayValueChange = (day: number, liters: number) => {
    setProductionData(prev => {
      const daysCopy = { ...prev.days, [day]: liters };
      return {
        ...prev,
        days: daysCopy
      };
    });
  };

  // Handler: Save modifications to Firestore or LocalStorage
  const handleSaveProductionData = async () => {
    if (!selectedId) return;
    setIsSaving(true);
    try {
      await saveProductionData(selectedId, productionData, selectedMonth);
      
      // Update overall comparison map in state
      setAllProductionData(prev => ({
        ...prev,
        [selectedId]: productionData
      }));

      alert("تم حفظ البيانات والكميات اليومية بنجاح ✅");
    } catch (err) {
      alert("حدث خطأ أثناء تحديث البيانات سحابياً ❌");
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Export current month data to CSV with Arabic support (UTF-8 BOM)
  const handleExportCSV = () => {
    if (!selectedId) return;

    const csvRows = [];

    csvRows.push(`"تقرير إدارة وتوزيع كميات المنتجات النفطية - ${selectedName}"`);
    csvRows.push(`"تاريخ تصدير الملف:","${new Date().toLocaleDateString('ar-QI')}"`);
    csvRows.push(`"فترة التجهير المحددة (الموسم المالي):","${selectedMonth}"`);
    csvRows.push("");

    csvRows.push(`"إجمالي الحصة الموزعة (لتر)","${stats.allocated}"`);
    csvRows.push(`"الرصيد المدور من الفترة السابقة (لتر)","${stats.carried}"`);
    csvRows.push(`"المجموع الكلي التراكمي المخصص (لتر)","${stats.allocated + stats.carried}"`);
    csvRows.push(`"إجمالي كمية الصمام المسحوبة (لتر)","${stats.totalDrawn}"`);
    csvRows.push(`"الرصيد المتبقي المتوفر في الخزان (لتر)","${stats.remaining}"`);
    csvRows.push(`"إجمالي عدد الشاحنات المكافئة (شاحنة)","${stats.totalTrucks.toFixed(2)}"`);
    csvRows.push("");

    csvRows.push(`"يوم التجهيز من الشهر","الكمية المجهزة (لتر)","مكافئ الشاحنات الناقلة (شاحنة/33000 لتر)"`);

    for (let day = 1; day <= 31; day++) {
      const liters = productionData.days[day] || 0;
      const trucks = (liters / CAR_LOAD).toFixed(2);
      csvRows.push(`"يوم ${day}","${liters}","${trucks}"`);
    }

    const csvString = "\uFEFF" + csvRows.join("\r\n");

    try {
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `تقرير_تجهيز_منتجات_نفطية_${selectedName.replace(/\s+/g, '_')}_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("حدث خطأ أثناء تصدير مستند الـ CSV");
    }
  };

  // Sign-in wrapper matching rules instructions
  const firebaseSignIn = async (email: string, pass: string) => {
    if (isRealFirebase && auth) {
      return signInWithEmailAndPassword(auth, email, pass);
    }
    throw new Error("Local instance active");
  };

  const handleLogout = async () => {
    if (isRealFirebase && auth) {
      await signOut(auth);
    }
    // Also reset local admin state
    setIsAdmin(false);
    setUserEmail(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-emerald-500 selection:text-white" dir="rtl">
      
      {/* Upper Brand and Controls header */}
      <Header
        currentFactoryName={selectedName || "المنظومة الوطنية لتجهيز المنتجات النفطية"}
        isAdmin={isAdmin}
        userEmail={userEmail}
        onAuthTrigger={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        
        {/* Navigation Sidebar */}
        <Sidebar
          factories={factories}
          selectedId={selectedId}
          onSelectFactory={handleSelectFactory}
          onAddFactory={handleAddFactory}
          onDeleteFactory={handleDeleteFactory}
          isAdmin={isAdmin}
        />

        {/* Content Section */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-10" id="main-content-area">
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
              <p className="text-sm font-bold text-slate-500">جاري تحميل مستودعات التزويد والبيانات السحابية...</p>
            </div>
          ) : selectedId ? (
            <div className="space-y-10 animate-fade-in">
              
              {/* Dynamic Header & Filter Panel for Active Terminal */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                
                {/* Header Information row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 block mb-1">المستودع المحدد حالياً:</span>
                    <h2 className="text-xl font-extrabold text-slate-800">{selectedName}</h2>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {/* Month selector dropdown */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap">الموسم المالي:</span>
                      <select
                        value={selectedMonth}
                        onChange={(e) => {
                          setSelectedMonth(e.target.value);
                          // Reset period/interval filter to all when changing months
                          setActiveTab("all");
                        }}
                        className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 cursor-pointer hover:bg-slate-100 transition-colors"
                      >
                        {AVAILABLE_MONTHS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="text-xs text-slate-400 font-medium">
                      آخر تحديث سحابي: <span className="font-mono font-bold text-slate-600">
                        {new Date(productionData.updatedAt).toLocaleDateString('ar-QI', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Date interval & qualitative filters row */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <span>تصفية فترات التجهيز والشحن:</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveTab("all")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === "all"
                          ? "bg-slate-805 bg-slate-800 text-white shadow-xs"
                          : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      عرض الشهر بالكامل (١ - ٣١)
                    </button>
                    
                    <button
                      onClick={() => setActiveTab("first_half")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === "first_half"
                          ? "bg-slate-800 text-white shadow-xs"
                          : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      النصف الأول من الشهر (١ - ١٥)
                    </button>

                    <button
                      onClick={() => setActiveTab("second_half")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === "second_half"
                          ? "bg-slate-800 text-white shadow-xs"
                          : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      النصف الثاني من الشهر (١٦ - ٣١)
                    </button>

                    <button
                      onClick={() => setActiveTab("active")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === "active"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      أيام التجهيز النشطة اليومية
                    </button>

                    <button
                      onClick={() => setActiveTab("high")}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        activeTab === "high"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      رصد سحوبات الذروة (≧ ٣ شاحنات)
                    </button>
                  </div>
                </div>

                {/* Warning notification for empty/unset monthly configurations */}
                {stats.allocated === 0 && stats.carried === 0 && (
                  <div className="bg-amber-50/70 border border-amber-200/60 text-amber-800 p-4 rounded-xl text-xs font-medium flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>⚠️ لم يتم إدخال حصص تخصيص أو سحوبات لهذا المستودع عن الفترة المحددة حالياً. يمكنك تدوير الرصيد وتدوين السحب بالأسفل لحفظ البيانات.</span>
                  </div>
                )}

                {/* Red warning for exceeding the allocated limit (Allocated + Carried) */}
                {stats.totalDrawn > (stats.allocated + stats.carried) && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 animate-bounce" />
                      <div>
                        <span className="font-bold text-sm block mb-0.5 text-rose-900">تجاوز الحد المسموح للحصة المخصصة!</span>
                        <span className="text-rose-700 block">تنبيه إداري: إجمالي كمية السحب والتشغيل المجهزة بالصمام وهي (<strong className="font-mono text-rose-900">{(stats.totalDrawn).toLocaleString()}</strong> لتر) قد تجاوزت السقف المعتمد للحصة المخصصة الكلية لهذه الفترة وهو (<strong className="font-mono text-rose-900">{(stats.allocated + stats.carried).toLocaleString()}</strong> لتر).</span>
                        <span className="text-rose-600 block mt-1 text-[11px] font-bold">مقدار التجاوز الفعلي: <span className="font-mono bg-rose-100 px-1.5 py-0.5 rounded text-rose-800">{(stats.totalDrawn - (stats.allocated + stats.carried)).toLocaleString()} لتر</span> (مكافئ <span className="font-mono bg-rose-100 px-1.5 py-0.5 rounded text-rose-800">{((stats.totalDrawn - (stats.allocated + stats.carried)) / 33000).toFixed(2)} شاحنة ناقلة</span>).</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Export reporting controls */}
                <div className="border-t border-slate-100 pt-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-500 block">تصدير وإصدار التقارير الإدارية:</span>
                    <p className="text-[11px] text-slate-400">تحميل جدول السحوبات كصيغة ملف رقمي إلكتروني، أو معاينة وطباعة التقرير الإداري بنسخته الرسمية وحفظه بصيغة PDF.</p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-all cursor-pointer shadow-xs"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>تصدير البيانات (CSV)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPrintModalOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all cursor-pointer shadow-xs"
                    >
                      <Printer className="w-4 h-4 text-blue-600" />
                      <span>معاينة وتوليد التقرير الإداري (PDF)</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Dashboard and Charts */}
              <Dashboard
                selectedFactoryName={selectedName}
                stats={stats}
                daysData={filteredDays}
                allFactories={factories}
                allProductionData={allProductionData}
                isAdmin={isAdmin}
                onAllocatedChange={handleAllocatedChange}
                onCarriedChange={handleCarriedChange}
              />

              {/* 31-Day log tables */}
              <DailyTable
                daysData={productionData.days}
                onDayValueChange={handleDayValueChange}
                onSave={handleSaveProductionData}
                isAdmin={isAdmin}
                isSaving={isSaving}
                activeFilter={activeTab}
              />

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-white border border-slate-200 rounded-2xl max-w-xl mx-auto shadow-sm gap-4">
              <AlertCircle className="w-12 h-12 text-slate-400" />
              <h3 className="text-lg font-bold text-slate-850">مرحباً بكل في نظام التوزيع المركزي</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                يرجى تحديد مستودع أو معمل نفطي محدد من القائمة الجانبية لعرض حصص التخصيص وإدخال كميات السحب اليومية.
              </p>
            </div>
          )}

        </main>
      </div>

      {/* Admin Authorization Trigger overlay modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(email) => {
          setIsAdmin(true);
          setUserEmail(email);
        }}
        firebaseSignIn={firebaseSignIn}
      />

      {/* Official Report Print Preview Modal (A4 formatted) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in no-print-backdrop">
          {/* Inject dynamic printing layout overrides */}
          <style>{`
            @media print {
              /* Hide all normal screen elements */
              header, aside, main, .no-print, .no-print-backdrop {
                display: none !important;
              }
              /* Reset body backgrounds */
              body, #root {
                background: white !important;
                color: black !important;
                padding: 0 !important;
                margin: 0 !important;
              }
              /* Render ONLY our explicit print target container */
              .print-container {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }
              /* Hide modal control panels during print output */
              .modal-action-bar {
                display: none !important;
              }
            }
          `}</style>
          
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] print-container">
            {/* Modal Actions Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between modal-action-bar">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-400" />
                <span className="font-extrabold text-xs sm:text-sm">معاينة مستند التقرير الرسمي المطور للطباعة</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>تنفيذ الطباعة / حفظ PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs py-1.5 px-3 font-bold transition-all cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>إلغاء</span>
                </button>
              </div>
            </div>

            {/* Official Report Document Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-right" dir="rtl">
              {/* Iraqi Logo and Official Header Style */}
              <div className="border-b-2 border-slate-900 pb-5 mb-5">
                <div className="flex flex-col sm:flex-row items-center justify-between text-center sm:text-right gap-4">
                  <div className="space-y-1">
                    <h1 className="text-sm font-extrabold text-slate-900">جمهورية العراق</h1>
                    <h2 className="text-xs font-bold text-slate-700">وزارة النفط</h2>
                    <h3 className="text-xs font-semibold text-slate-600 font-sans">شركة توزيع المنتجات النفطية</h3>
                    <p className="text-[10px] font-bold text-slate-500">هيئة التجهيز وتنسيق الحصص</p>
                  </div>
                  
                  {/* Center Emblem/Insignia */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full border border-amber-600/50 flex items-center justify-center bg-amber-50 shadow-inner mb-1">
                      <span className="text-amber-600 text-xl font-black">Oil</span>
                    </div>
                    <span className="text-[8px] font-bold text-slate-400 tracking-widest uppercase">وثيقة معتمدة</span>
                  </div>

                  <div className="text-center sm:text-left space-y-1 font-mono">
                    <div className="text-[11px] font-bold text-slate-500 flex items-center sm:justify-end gap-1 direction-ltr">
                      <span>الرقم المرجعي:</span>
                      <span className="text-slate-800 font-sans">S-Oil-{selectedId?.substring(0,6).toUpperCase()}</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 flex items-center sm:justify-end gap-1 direction-ltr">
                      <span>تاريخ التصدير:</span>
                      <span className="text-slate-800 font-sans">{new Date().toLocaleDateString('ar-QI')}</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 flex items-center sm:justify-end gap-1 direction-ltr font-sans">
                      <span>الموسم المالي:</span>
                      <span className="text-slate-800">
                        {AVAILABLE_MONTHS.find(m => m.value === selectedMonth)?.label?.replace(" (الشهر الحالي)", "") || selectedMonth}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-center mt-6">
                  <h2 className="text-base font-black text-slate-900 border-b-2 border-slate-400 pb-1 inline-block px-8 tracking-wide">
                    تقرير كشف ميزانية تجهيز المنتجات النفطية للفترة المحددة
                  </h2>
                  <p className="text-xs font-extrabold text-emerald-700 mt-2">اسم الجهة المستلمة / المعمل: {selectedName}</p>
                </div>
              </div>

              {/* Executive Summary Grid (Official Style) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="border border-slate-300 rounded-xl p-3 text-right bg-slate-50/50">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">الحصة الموزعة (لتر)</span>
                  <span className="text-xs sm:text-sm font-black text-slate-800 font-mono">{(stats.allocated).toLocaleString()}</span>
                </div>
                <div className="border border-slate-300 rounded-xl p-3 text-right bg-slate-50/50">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">الرصيد المدور (لتر)</span>
                  <span className="text-xs sm:text-sm font-black text-slate-800 font-mono">{(stats.carried).toLocaleString()}</span>
                </div>
                <div className="border border-slate-300 rounded-xl p-3 text-right bg-emerald-50 border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 block mb-1">المجموع المسحوب كلياً (لتر)</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-800 font-mono">{(stats.totalDrawn).toLocaleString()}</span>
                </div>
                <div className="border border-slate-300 rounded-xl p-3 text-right bg-amber-50 border-amber-200">
                  <span className="text-[10px] font-bold text-amber-700 block mb-1">الرصيد المتبقي الحر (لتر)</span>
                  <span className="text-xs sm:text-sm font-black text-amber-800 font-mono">{(stats.remaining).toLocaleString()}</span>
                </div>
              </div>

              {/* Sub-details line */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-600 bg-slate-100 p-3 rounded-xl mb-6">
                <div>
                  <span>المجموع التراكمي لسيارات الشحن:</span>
                  <span className="font-mono text-emerald-700 mr-1.5 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">{stats.totalTrucks.toFixed(2)} سيارة شحن مكافئة</span>
                </div>
                <div>
                  <span>مستوى سحب الحصة الإجمالية:</span>
                  <span className="font-mono text-amber-700 mr-1.5 bg-amber-50 px-2 py-1 rounded border border-amber-100">{stats.percentageDrawn.toFixed(1)}%</span>
                </div>
              </div>

              {/* Clean printable tables */}
              <h3 className="text-xs font-black text-slate-800 mb-2 border-r-4 border-slate-700 pr-2">جدول التجهيز اليومي المفصل (١ - ٣١)</h3>
              
              <div className="border border-slate-300 rounded-xl overflow-hidden mb-6 shadow-xs">
                <table className="w-full text-right text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 font-black text-[10px] sm:text-xs">
                      <th className="px-4 py-2 text-center border-l border-slate-300">اليوم</th>
                      <th className="px-4 py-2 border-l border-slate-300">الكمية المجهزة بالصمام (لتر)</th>
                      <th className="px-4 py-2 text-center border-l border-slate-300 font-sans">سيارات شحن مكافئة (١ = ٣٣,٠٠٠ لتر)</th>
                      <th className="px-4 py-2 text-center">حالة التجهيز اليومية</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Array.from({ length: 31 }).map((_, index) => {
                      const day = index + 1;
                      const liters = productionData.days[day] || 0;
                      const trucks = liters > 0 ? (liters / CAR_LOAD).toFixed(2) : "-";
                      
                      return (
                        <tr key={day} className="hover:bg-slate-50/20">
                          <td className="px-4 py-1.5 text-center font-bold text-slate-700 bg-slate-50/50 border-l border-slate-200">يوم {day}</td>
                          <td className="px-4 py-1.5 font-mono text-slate-800 border-l border-slate-200">{liters > 0 ? liters.toLocaleString() : "0"}</td>
                          <td className="px-4 py-1.5 text-center font-mono font-bold text-amber-700 border-l border-slate-200">{trucks}</td>
                          <td className="px-4 py-1.5 text-center text-slate-400 text-[10px]">
                            {liters === 0 ? "لا يوجد سحب مجهز" : liters >= 99000 ? "مستوى تجهيز ذروة مكثف" : "تجهيز اعتيادي دوري"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Signature Area */}
              <div className="mt-8 pt-6 border-t border-dashed border-slate-300 grid grid-cols-2 gap-4">
                <div className="text-right">
                  <p className="text-[11px] text-slate-400 mb-1">الجهة الفنية المدققة:</p>
                  <p className="text-xs font-bold text-slate-700">هيئة المراقبة الميدانية والعدادات</p>
                  <p className="text-[10px] text-slate-400 mt-6">التوقيع والختم المعتمد: ........................</p>
                </div>
                <div className="text-left flex flex-col items-end">
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400 mb-1">مصادقة مدير شركة التوزيع:</p>
                    <p className="text-xs font-black text-slate-800">المهندس المسؤول عن تنسيق الحصص</p>
                    
                    <div className="w-20 h-20 rounded-full border-4 border-dashed border-emerald-600/30 flex items-center justify-center p-1 text-center font-black text-[9px] text-emerald-600/40 font-sans rotate-12 mt-3 select-none pointer-events-none self-end">
                      تأكيد الحصص النفطية - بغداد
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
