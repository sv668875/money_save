import React, { useRef, useState } from 'react';
import {
  Calendar,
  Database,
  Download,
  FileSpreadsheet,
  Moon,
  Plus,
  RotateCcw,
  Sliders,
  Store,
  Sun,
  Tag,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';
import { Category, QuickTemplate } from '../types';
import { PWAInstallButton } from './PWAComponents';
import {
  CategoryIcon,
  CategoryPickerButton,
  DayOfMonthPickerButton,
} from './SharedUI';

interface SettingsTabProps {
  categories: Category[];
  monthStartDay: number;
  onChangeMonthStartDay: (day: number) => void;
  templates: QuickTemplate[];
  onAddTemplate: (tpl: QuickTemplate) => void;
  onDeleteTemplate: (tpl: QuickTemplate) => void;
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
  monthStartDay,
  onChangeMonthStartDay,
  templates,
  onAddTemplate,
  onDeleteTemplate,
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

  // 自訂分類表單狀態
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'expense' | 'income'>('expense');
  const [catIsBiz, setCatIsBiz] = useState(false);
  const [catIcon, setCatIcon] = useState('Utensils');
  const [showArchivedCats, setShowArchivedCats] = useState(false);

  // 常用快捷範本表單狀態（明確區分支出與收入）
  const [tplType, setTplType] = useState<'expense' | 'income'>('expense');
  const [tplTitle, setTplTitle] = useState('');
  const [tplAmountStr, setTplAmountStr] = useState('');
  const [tplCategoryId, setTplCategoryId] = useState(
    categories.find((c) => !c.archived && !c.isBusiness && c.type === 'expense')?.id || 'cat_food'
  );

  const visibleCats = categories.filter((c) => {
    if (!showArchivedCats && c.archived) return false;
    if (!enableBusinessModule && c.isBusiness) return false;
    return true;
  });

  const activeCategories = categories.filter(
    (c) => !c.archived && (enableBusinessModule || !c.isBusiness)
  );

  const tplFilteredCategories = activeCategories.filter((c) => c.type === tplType);

  const handleTplTypeChange = (nextType: 'expense' | 'income') => {
    setTplType(nextType);
    const firstMatch = activeCategories.find((c) => c.type === nextType);
    if (firstMatch) {
      setTplCategoryId(firstMatch.id);
    }
  };

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

  const handleAddTpl = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Math.round(parseFloat(tplAmountStr) || 0);
    if (!tplTitle.trim() || amt <= 0) return;
    const validCatId =
      tplFilteredCategories.some((c) => c.id === tplCategoryId)
        ? tplCategoryId
        : tplFilteredCategories[0]?.id || '';
    onAddTemplate({
      id: `tpl_${Date.now()}`,
      title: tplTitle.trim(),
      type: tplType,
      amount: amt,
      categoryId: validCatId,
    });
    setTplTitle('');
    setTplAmountStr('');
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

  const expenseTemplates = templates.filter((t) => t.type === 'expense');
  const incomeTemplates = templates.filter((t) => t.type === 'income');

  return (
    <div className="space-y-3.5">
      {/* =========================================================
          1. 基本記帳設定（每月起始日、常用快捷範本、自訂分類）
         ========================================================= */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-3.5">
        <div className="flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
            1. 基本記帳設定
          </h3>
        </div>

        {/* (A) 每月起始日 */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                每月起始日
              </div>
              <div className="text-[11px] text-slate-400">帳務結算週期基準日</div>
            </div>
          </div>
          <div className="w-32 shrink-0">
            <DayOfMonthPickerButton
              value={monthStartDay}
              onChange={(d) => onChangeMonthStartDay(d || 1)}
              label="選擇每月起始日"
            />
          </div>
        </div>

        {/* (B) 常用快捷範本（嚴格區分支出快捷與收入快捷） */}
        <div className="space-y-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                常用快捷範本
              </span>
            </div>
            <span className="text-[10px] text-slate-400">依支出 / 收入分開顯示</span>
          </div>

          <form
            onSubmit={handleAddTpl}
            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-2"
          >
            {/* 支出 / 收入 類型切換 */}
            <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-900 rounded-lg">
              <button
                type="button"
                onClick={() => handleTplTypeChange('expense')}
                className={`h-7 rounded-md text-xs font-bold transition ${
                  tplType === 'expense'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                支出快捷
              </button>
              <button
                type="button"
                onClick={() => handleTplTypeChange('income')}
                className={`h-7 rounded-md text-xs font-bold transition ${
                  tplType === 'income'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-slate-500'
                }`}
              >
                收入快捷
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                required
                placeholder={tplType === 'expense' ? '名稱 (例: 咖啡)' : '名稱 (例: 獎金)'}
                value={tplTitle}
                onChange={(e) => setTplTitle(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
              <input
                type="number"
                inputMode="decimal"
                required
                min="1"
                placeholder="金額 (NT$)"
                value={tplAmountStr}
                onChange={(e) => setTplAmountStr(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0">
                <CategoryPickerButton
                  categories={tplFilteredCategories}
                  value={tplCategoryId}
                  onChange={setTplCategoryId}
                  label={tplType === 'expense' ? '選擇支出快捷分類' : '選擇收入快捷分類'}
                />
              </div>
              <button
                type="submit"
                className="h-10 px-3.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增</span>
              </button>
            </div>
          </form>

          {templates.length > 0 && (
            <div className="space-y-1.5 pt-0.5">
              {expenseTemplates.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-rose-500">支出：</span>
                  {expenseTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200"
                    >
                      <span>{tpl.title}</span>
                      <span className="font-mono text-slate-500">${tpl.amount}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteTemplate(tpl)}
                        className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-500"
                        aria-label={`刪除快捷範本 ${tpl.title}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {incomeTemplates.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-emerald-600">收入：</span>
                  {incomeTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300"
                    >
                      <span>{tpl.title}</span>
                      <span className="font-mono">${tpl.amount}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteTemplate(tpl)}
                        className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-rose-500"
                        aria-label={`刪除快捷範本 ${tpl.title}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* (C) 自訂分類管理 */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                自訂分類
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowArchivedCats(!showArchivedCats)}
              className="h-7 px-2 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-600"
            >
              {showArchivedCats ? '隱藏封存' : '顯示封存'}
            </button>
          </div>

          <form
            onSubmit={handleAddCat}
            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-2"
          >
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                required
                placeholder="新分類名稱"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="flex-1 min-w-0 h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
              />
              <div className="grid grid-cols-2 gap-0.5 p-0.5 bg-slate-200/70 dark:bg-slate-900 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setCatType('expense')}
                  className={`h-7 px-2.5 rounded-md text-xs font-bold transition ${
                    catType === 'expense'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  支出
                </button>
                <button
                  type="button"
                  onClick={() => setCatType('income')}
                  className={`h-7 px-2.5 rounded-md text-xs font-bold transition ${
                    catType === 'income'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                      : 'text-slate-500'
                  }`}
                >
                  收入
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
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
                  <CategoryIcon name={ic} className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              {enableBusinessModule ? (
                <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={catIsBiz}
                    onChange={(e) => setCatIsBiz(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600"
                  />
                  <span>機台分類</span>
                </label>
              ) : (
                <div />
              )}
              <button
                type="submit"
                className="h-8 px-3 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增分類</span>
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
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {cat.archived ? '解封' : '封存'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================
          2. 外觀與進階功能（深色模式、副業機台功能開關）
         ========================================================= */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2.5">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white">
          2. 外觀與進階功能
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {/* 深色模式 */}
          <div className="pb-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  深色模式
                </div>
                <div className="text-[11px] text-slate-400">切換淺色或深色主題</div>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="h-8 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 shrink-0"
            >
              {darkMode ? '深色' : '淺色'}
            </button>
          </div>

          {/* 副業機台功能開關 */}
          <div className="pt-2.5 flex items-center justify-between gap-3">
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
              className={`h-8 px-3 rounded-lg text-xs font-bold transition shrink-0 ${
                enableBusinessModule
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}
            >
              {enableBusinessModule ? '已開啟' : '已隱藏'}
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          3. 資料備份與管理（JSON 匯出/還原、CSV 匯出、清空範例資料）
         ========================================================= */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2.5">
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
            3. 資料備份與管理
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onExportCSV}
            className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span>匯出 CSV</span>
          </button>

          <button
            type="button"
            onClick={onExportJSON}
            className="h-9 px-3 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span>匯出備份</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="col-span-2 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 shrink-0" />
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
            className="h-8 px-3 rounded-xl border border-amber-200 dark:border-amber-800/70 bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>載入範例</span>
          </button>
          <button
            type="button"
            onClick={onClearAllData}
            className="h-8 px-3 rounded-xl border border-rose-200 dark:border-rose-800/70 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>清空資料</span>
          </button>
        </div>
      </div>

      {/* Subtle Low-Profile Install Link at Bottom of Settings */}
      <div className="pt-1 pb-2">
        <PWAInstallButton />
      </div>
    </div>
  );
};
