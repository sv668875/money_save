import React, { useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  CreditCard,
  Home,
  Info,
  Landmark,
  Package,
  RefreshCw,
  ShoppingBag,
  Smartphone,
  Store,
  Train,
  TrendingUp,
  Utensils,
  Wallet,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { AccountType, ConfirmModalConfig, ToastMessage } from '../types';
import { getTodayDateString } from '../storage';

export const BrandLogo: React.FC = () => (
  <div className="flex items-center select-none" aria-label="Logo">
    <svg
      width="30"
      height="30"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <rect width="36" height="36" rx="10" className="fill-slate-900 dark:fill-emerald-600" />
      <rect
        x="8"
        y="9"
        width="20"
        height="18"
        rx="4"
        className="stroke-white/90"
        strokeWidth="2.2"
      />
      <path
        d="M12.5 15H23.5"
        className="stroke-emerald-400 dark:stroke-slate-950"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M12.5 20.5H18.5"
        className="stroke-white/90"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="22.5" cy="20.5" r="1.8" className="fill-emerald-400 dark:fill-slate-950" />
    </svg>
  </div>
);

export const CategoryIcon: React.FC<{ name?: string; className?: string }> = ({
  name,
  className = 'w-4 h-4',
}) => {
  switch (name) {
    case 'Utensils':
      return <Utensils className={className} />;
    case 'Train':
      return <Train className={className} />;
    case 'Home':
      return <Home className={className} />;
    case 'ShoppingBag':
      return <ShoppingBag className={className} />;
    case 'Smartphone':
      return <Smartphone className={className} />;
    case 'Store':
      return <Store className={className} />;
    case 'Package':
      return <Package className={className} />;
    case 'Wrench':
      return <Wrench className={className} />;
    case 'Briefcase':
      return <Briefcase className={className} />;
    case 'TrendingUp':
      return <TrendingUp className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Coins':
      return <Coins className={className} />;
    case 'RefreshCw':
      return <RefreshCw className={className} />;
    default:
      return <Wallet className={className} />;
  }
};

export const AccountTypeIcon: React.FC<{ type: AccountType; className?: string }> = ({
  type,
  className = 'w-4 h-4',
}) => {
  switch (type) {
    case 'bank':
      return <Landmark className={className} />;
    case 'cash':
      return <Wallet className={className} />;
    case 'business_cashbox':
      return <Store className={className} />;
    case 'credit_card':
      return <CreditCard className={className} />;
    case 'investment':
      return <TrendingUp className={className} />;
    case 'crypto':
      return <Coins className={className} />;
  }
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: '銀行',
  cash: '現金',
  business_cashbox: '機台錢箱',
  credit_card: '信用卡',
  investment: '投資',
  crypto: '加密幣',
};

/**
 * 簡約精緻的年份切換器 (< 2026 年 >)
 */
export const YearStepper: React.FC<{
  year: number;
  onChange: (newYear: number) => void;
}> = ({ year, onChange }) => {
  return (
    <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/70 dark:border-slate-700">
      <button
        type="button"
        onClick={() => onChange(year - 1)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
        aria-label="上一年"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <span className="px-2 h-7 flex items-center justify-center text-xs font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
        {year}年
      </span>
      <button
        type="button"
        onClick={() => onChange(year + 1)}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
        aria-label="下一年"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/**
 * 簡約精緻的月份切換器
 */
export const MonthStepper: React.FC<{
  monthKey: string;
  onChange: (newMonthKey: string) => void;
  disabled?: boolean;
}> = ({ monthKey, onChange, disabled = false }) => {
  const [openPicker, setOpenPicker] = useState(false);
  const [yStr, mStr] = monthKey.split('-');
  const year = parseInt(yStr, 10) || new Date().getFullYear();
  const month = parseInt(mStr, 10) || new Date().getMonth() + 1;
  const [pickerYear, setPickerYear] = useState(year);

  const shiftMonth = (delta: number) => {
    if (disabled) return;
    const d = new Date(year, month - 1 + delta, 1);
    const ny = d.getFullYear();
    const nm = String(d.getMonth() + 1).padStart(2, '0');
    onChange(`${ny}-${nm}`);
  };

  return (
    <>
      <div
        className={`inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/70 dark:border-slate-700 ${
          disabled ? 'opacity-40 pointer-events-none' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
          aria-label="上個月"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setPickerYear(year);
            setOpenPicker(true);
          }}
          className="px-2 h-7 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition whitespace-nowrap"
        >
          {year}年{month}月
        </button>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
          aria-label="下個月"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {openPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setPickerYear((y) => y - 1)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                {pickerYear} 年
              </span>
              <button
                type="button"
                onClick={() => setPickerYear((y) => y + 1)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const mk = `${pickerYear}-${String(m).padStart(2, '0')}`;
                const isSelected = mk === monthKey;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      onChange(mk);
                      setOpenPicker(false);
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-emerald-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m}月
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setOpenPicker(false)}
              className="mt-3 w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              關閉
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * 簡約互動式日曆選擇器
 */
export const DatePickerButton: React.FC<{
  value: string;
  onChange: (newDate: string) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const todayStr = getTodayDateString();
  const getOffsetDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  };
  const yesterdayStr = getOffsetDate(-1);
  const beforeYesterdayStr = getOffsetDate(-2);

  const parsedParts = value.split('-').map(Number);
  const [viewYear, setViewYear] = useState(parsedParts[0] || new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedParts[1] || new Date().getMonth() + 1);

  const openCalendar = () => {
    const [y, m] = value.split('-').map(Number);
    if (y && m) {
      setViewYear(y);
      setViewMonth(m);
    }
    setIsOpen(true);
  };

  const shiftViewMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth() + 1);
  };

  const firstDayOfWeek = new Date(viewYear, viewMonth - 1, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();

  const friendlyLabel =
    value === todayStr
      ? `今天 (${value.slice(5)})`
      : value === yesterdayStr
      ? `昨天 (${value.slice(5)})`
      : value;

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={openCalendar}
          className="flex-1 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white flex items-center justify-between hover:border-emerald-500 transition"
        >
          <span>{friendlyLabel}</span>
          <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </button>
        <button
          type="button"
          onClick={() => onChange(todayStr)}
          className={`h-9 px-2.5 rounded-xl text-xs font-semibold border transition ${
            value === todayStr
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
        >
          今天
        </button>
        <button
          type="button"
          onClick={() => onChange(yesterdayStr)}
          className={`h-9 px-2.5 rounded-xl text-xs font-semibold border transition ${
            value === yesterdayStr
              ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600'
              : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }`}
        >
          昨天
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-2xl">
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              {[
                { label: '今天', val: todayStr },
                { label: '昨天', val: yesterdayStr },
                { label: '前天', val: beforeYesterdayStr },
              ].map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => {
                    onChange(q.val);
                    setIsOpen(false);
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition ${
                    value === q.val
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mb-2">
              <button
                type="button"
                onClick={() => shiftViewMonth(-1)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                {viewYear}年 {viewMonth}月
              </span>
              <button
                type="button"
                onClick={() => shiftViewMonth(1)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-slate-400 mb-1">
              {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfWeek }, (_, i) => (
                <div key={`empty_${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const fullStr = `${viewYear}-${String(viewMonth).padStart(2, '0')}-${String(
                  dayNum
                ).padStart(2, '0')}`;
                const isSelected = fullStr === value;
                const isToday = fullStr === todayStr;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => {
                      onChange(fullStr);
                      setIsOpen(false);
                    }}
                    className={`h-8 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-emerald-600'
                        : isToday
                        ? 'border border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="mt-3 w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const ToastContainer: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 space-y-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl shadow-lg border text-xs font-semibold transition-all ${
            t.type === 'success'
              ? 'bg-slate-900 text-white border-slate-800 dark:bg-emerald-600 dark:border-emerald-500'
              : t.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500'
              : t.type === 'warning'
              ? 'bg-amber-500 text-slate-950 border-amber-400'
              : 'bg-slate-800 text-white border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {t.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 dark:text-white shrink-0" />
            ) : t.type === 'error' || t.type === 'warning' ? (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Info className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{t.text}</span>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="p-1 rounded-lg opacity-75 hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

export const ConfirmModal: React.FC<{
  config: ConfirmModalConfig;
  onClose: () => void;
}> = ({ config, onClose }) => {
  if (!config.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              config.danger
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {config.title}
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {config.description}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition"
          >
            {config.cancelLabel || '取消'}
          </button>
          <button
            type="button"
            onClick={() => {
              config.onConfirm();
              onClose();
            }}
            className={`h-9 rounded-xl text-white text-xs font-semibold transition ${
              config.danger
                ? 'bg-rose-600 hover:bg-rose-500'
                : 'bg-slate-900 dark:bg-emerald-600 hover:opacity-95'
            }`}
          >
            {config.confirmLabel || '確認'}
          </button>
        </div>
      </div>
    </div>
  );
};
