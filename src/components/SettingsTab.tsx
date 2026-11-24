import React, { useRef, useState } from 'react';
import {
  Database,
  Download,
  FileSpreadsheet,
  Moon,
  Plus,
  RotateCcw,
  Store,
  Sun,
  Tag,
  Trash2,
  Upload,
} from 'lucide-react';
import { Category } from '../types';
import { PWAInstallButton } from './PWAComponents';
import { CategoryIcon } from './SharedUI';

interface SettingsTabProps {
  categories: Category[];
  darkMode: boolean;
  onToggleDarkMode: () => void;
  enableBusinessModule: boolean;
  onToggleBusinessModule: () => void;
  onAddCategory: (cat: Category) => void;
  onToggleArchiveCategory: (cat: Category) => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onImportJSON: (jsonStr: string) => void;
  onResetDemoData: () => void;
  onClearAllData: () => void;
}

const ICON_OPTIONS = [
  'Utensils',
  'Train',
  'Home',
  'ShoppingBag',
  'Smartphone',
  'Store',
  'Package',
  'Wrench',
  'Briefcase',
  'TrendingUp',
  'Zap',
  'Coins',
  'RefreshCw',
];

export const SettingsTab: React.FC<SettingsTabProps> = ({
  categories,
  darkMode,
  onToggleDarkMode,
  enableBusinessModule,
  onToggleBusinessModule,
  onAddCategory,
  onToggleArchiveCategory,
  onExportCSV,
  onExportJSON,
  onImportJSON,
  onResetDemoData,
  onClearAllData,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'expense' | 'income'>('expense');
  const [catIsBiz, setCatIsBiz] = useState(false);
  const [catIcon, setCatIcon] = useState('Utensils');
  const [showArchivedCats, setShowArchivedCats] = useState(false);

  const handleAddCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    onAddCategory({
      id: `cat_${Date.now()}`,
      name: catName.trim(),
      type: catType,
      isBusiness: enableBusinessModule ? catIsBiz : false,
      icon: catIcon,
      archived: false,
    });
    setCatName('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text === 'string') {
        onImportJSON(text);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const visibleCats = categories.filter((c) => {
    if (!showArchivedCats && c.archived) return false;
    if (!enableBusinessModule && c.isBusiness) return false;
    return true;
  });

  return (
    <div className="space-y-3.5">
      {/* Module & Appearance Toggles */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 divide-y divide-slate-100 dark:divide-slate-800">
        {/* Claw Machine / Side-Business Module Switch */}
        <div className="pb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                副業機台功能
              </div>
              <div className="text-[11px] text-slate-400">
                關閉時隱藏所有機台頁面與欄位
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleBusinessModule}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              enableBusinessModule
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}
          >
            {enableBusinessModule ? '已開啟' : '已隱藏'}
          </button>
        </div>

        {/* Theme Switch */}
        <div className="pt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              深色模式
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0"
          >
            {darkMode ? '深色' : '淺色'}
          </button>
        </div>
      </div>

      {/* Category Management Card */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">分類管理</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowArchivedCats(!showArchivedCats)}
            className="text-xs text-slate-400 hover:text-slate-700"
          >
            {showArchivedCats ? '隱藏封存' : '顯示封存'}
          </button>
        </div>

        <form
          onSubmit={handleAddCat}
          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-2.5"
        >
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              required
              placeholder="分類名稱"
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              className="col-span-2 min-h-[38px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
            <select
              value={catType}
              onChange={(e) => setCatType(e.target.value as 'expense' | 'income')}
              className="min-h-[38px] px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
            >
              <option value="expense">支出</option>
              <option value="income">收入</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {ICON_OPTIONS.map((ic) => (
              <button
                key={ic}
                type="button"
                onClick={() => setCatIcon(ic)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition ${
                  catIcon === ic
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600'
                    : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                }`}
              >
                <CategoryIcon name={ic} className="w-4 h-4" />
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-0.5">
            {enableBusinessModule ? (
              <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={catIsBiz}
                  onChange={(e) => setCatIsBiz(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600"
                />
                <span>機台分類</span>
              </label>
            ) : (
              <div />
            )}
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增</span>
            </button>
          </div>
        </form>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {visibleCats.map((cat) => (
            <div
              key={cat.id}
              className={`py-2 flex items-center justify-between ${
                cat.archived ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                  <CategoryIcon name={cat.icon} className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {cat.name}
                </span>
                <span className="text-[11px] text-slate-400">
                  · {cat.type === 'expense' ? '支出' : '收入'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onToggleArchiveCategory(cat)}
                className="text-xs text-slate-400 hover:text-slate-800 dark:hover:text-white"
              >
                {cat.archived ? '解封' : '封存'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Data Backup & Export Card (Spacious 2-Column Mobile Grid) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-3">
        <div className="flex items-center gap-1.5">
          <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">資料備份</h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExportCSV}
            className="min-h-[42px] px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>匯出 CSV</span>
          </button>

          <button
            type="button"
            onClick={onExportJSON}
            className="min-h-[42px] px-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>匯出備份</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="col-span-2 min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span>匯入備份檔 (.json)</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onResetDemoData}
            className="min-h-[38px] px-2.5 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center justify-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>載入範例</span>
          </button>
          <button
            type="button"
            onClick={onClearAllData}
            className="min-h-[38px] px-2.5 rounded-xl border border-rose-200 dark:border-rose-800/70 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>清空資料</span>
          </button>
        </div>
      </div>

      {/* Subtle Low-Profile Install Link at Bottom of Settings */}
      <div className="pt-2 pb-1">
        <PWAInstallButton />
      </div>
    </div>
  );
};
