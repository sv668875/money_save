import React, { useState } from 'react';
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
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
  User,
  Utensils,
  Wallet,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { AccountWithBalance, formatPartyDisplayName, formatTWD } from '../calculations';
import { Account, AccountType, Category, ConfirmModalConfig, ToastMessage } from '../types';
import { getTodayDateString } from '../storage';

const RECENT_ACCOUNTS_KEY = 'simple_ledger_recent_accounts';

export function getRecentAccountIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordRecentAccountId(accountId: string): void {
  if (!accountId) return;
  try {
    const current = getRecentAccountIds().filter((id) => id !== accountId);
    const next = [accountId, ...current].slice(0, 3);
    localStorage.setItem(RECENT_ACCOUNTS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

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
  bank: '銀行帳戶',
  cash: '現金錢包',
  credit_card: '信用卡',
  investment: '投資證券',
  crypto: '虛擬貨幣',
  business_cashbox: '機台錢箱',
};

/**
 * 現代化底部帳戶選擇器（AccountPicker Bottom Sheet）
 * - 依帳戶類型分組（銀行、現金、信用卡、投資等）
 * - 每個選項以視覺卡片呈現：圖示 + 帳戶名稱 + 當前即時餘額
 * - 將最近使用過的帳戶置頂快選
 */
export const AccountPickerButton: React.FC<{
  accounts: (Account | AccountWithBalance)[];
  value: string;
  onChange: (accountId: string) => void;
  label?: string;
  placeholder?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
}> = ({
  accounts,
  value,
  onChange,
  label = '選擇帳戶',
  placeholder = '請選擇帳戶',
  allowEmpty = false,
  emptyLabel = '不扣款（僅記錄投入成本）',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedAcc = accounts.find((a) => a.id === value);
  const getBal = (acc: Account | AccountWithBalance): number =>
    'currentBalance' in acc ? acc.currentBalance : acc.initialBalance;

  const recentIds = getRecentAccountIds();
  const recentAccounts = recentIds
    .map((id) => accounts.find((a) => a.id === id))
    .filter((a): a is Account | AccountWithBalance => Boolean(a));

  const groupOrder: AccountType[] = [
    'bank',
    'cash',
    'credit_card',
    'investment',
    'crypto',
    'business_cashbox',
  ];

  const handleSelect = (id: string) => {
    if (id) {
      recordRecentAccountId(id);
    }
    onChange(id);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left flex items-center justify-between gap-2 hover:border-emerald-500 transition"
      >
        {selectedAcc ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                selectedAcc.type === 'credit_card'
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                  : selectedAcc.isBusinessWorkingCapital ||
                    selectedAcc.type === 'business_cashbox'
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
              }`}
            >
              <AccountTypeIcon type={selectedAcc.type} className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {selectedAcc.name}
              </div>
              <div
                className={`text-[10px] font-mono ${
                  getBal(selectedAcc) < 0
                    ? 'text-rose-500 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                {selectedAcc.type === 'credit_card' && getBal(selectedAcc) < 0
                  ? `未繳卡費 ${formatTWD(Math.abs(getBal(selectedAcc)))}`
                  : `餘額 ${formatTWD(getBal(selectedAcc))}`}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {allowEmpty && value === '' ? emptyLabel : placeholder}
          </span>
        )}
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl max-h-[82vh] flex flex-col">
            <div className="pt-2.5 pb-2.5 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{label}</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              {allowEmpty && (
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className={`w-full min-h-[48px] p-3 rounded-2xl border text-left flex items-center justify-between transition ${
                    value === ''
                      ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/40 dark:border-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {emptyLabel}
                  </span>
                  {value === '' && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
              )}

              {/* 最近使用過的帳戶置頂快選 */}
              {recentAccounts.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>最近常用</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {recentAccounts.map((acc) => {
                      const isSel = acc.id === value;
                      return (
                        <button
                          key={`recent_${acc.id}`}
                          type="button"
                          onClick={() => handleSelect(acc.id)}
                          className={`min-h-[40px] px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
                            isSel
                              ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <AccountTypeIcon type={acc.type} className="w-3.5 h-3.5" />
                          <span>{acc.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 依帳戶類型分組卡片 */}
              {groupOrder.map((gType) => {
                const groupAccs = accounts.filter((a) => a.type === gType);
                if (groupAccs.length === 0) return null;

                return (
                  <div key={gType} className="space-y-2">
                    <div className="text-[11px] font-bold text-slate-400 px-0.5">
                      {ACCOUNT_TYPE_LABELS[gType]}
                    </div>
                    <div className="space-y-2">
                      {groupAccs.map((acc) => {
                        const isSelected = acc.id === value;
                        const bal = getBal(acc);
                        const isCardDebt = acc.type === 'credit_card' && bal < 0;

                        return (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => handleSelect(acc.id)}
                            className={`w-full min-h-[54px] p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50/70 dark:bg-emerald-950/50 dark:border-emerald-500 shadow-2xs'
                                : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                  acc.type === 'credit_card'
                                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                                    : acc.isBusinessWorkingCapital ||
                                      acc.type === 'business_cashbox'
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                                }`}
                              >
                                <AccountTypeIcon type={acc.type} className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {acc.name}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {ACCOUNT_TYPE_LABELS[acc.type]}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <div
                                  className={`text-xs font-mono font-bold tabular-nums ${
                                    bal < 0
                                      ? 'text-rose-600 dark:text-rose-400'
                                      : 'text-slate-900 dark:text-white'
                                  }`}
                                >
                                  {formatTWD(bal)}
                                </div>
                                {isCardDebt && (
                                  <div className="text-[10px] font-semibold text-rose-500">
                                    目前未繳負債
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * 現代化底部分類選擇器（CategoryPicker Bottom Sheet）
 */
export const CategoryPickerButton: React.FC<{
  categories: Category[];
  value: string;
  onChange: (categoryId: string) => void;
  label?: string;
}> = ({ categories, value, onChange, label = '選擇分類' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCat = categories.find((c) => c.id === value) || categories[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left flex items-center justify-between gap-2 hover:border-emerald-500 transition"
      >
        {selectedCat ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
              <CategoryIcon name={selectedCat.icon} className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {selectedCat.name}
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">請選擇分類</span>
        )}
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl max-h-[75vh] flex flex-col">
            <div className="pt-2.5 pb-2.5 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{label}</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto grid grid-cols-3 gap-2 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              {categories.map((cat) => {
                const isSelected = cat.id === value;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onChange(cat.id);
                      setIsOpen(false);
                    }}
                    className={`min-h-[56px] p-2.5 rounded-2xl border text-left flex flex-col justify-between transition ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/50 dark:border-emerald-500 text-slate-900 dark:text-white'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <CategoryIcon
                        name={cat.icon}
                        className={`w-4 h-4 ${
                          isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                        }`}
                      />
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <span className="text-xs font-bold truncate w-full mt-1">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * 現代化底部日期 (1-28 號) 網格選擇器（取代扣款日/結帳日/繳款截止日原生 <select>）
 */
export const DayOfMonthPickerButton: React.FC<{
  value?: number;
  onChange: (day: number | undefined) => void;
  label?: string;
  prefix?: string;
  allowClear?: boolean;
}> = ({ value, onChange, label = '選擇每月日期', prefix = '每月', allowClear = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left flex items-center justify-between gap-2 hover:border-emerald-500 transition"
      >
        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
          {value ? `${prefix} ${value} 號` : '未設定'}
        </span>
        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{label}</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                const isSelected = value === day;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      onChange(day);
                      setIsOpen(false);
                    }}
                    className={`min-h-[44px] rounded-xl text-xs font-mono font-bold flex items-center justify-center border transition ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/70 dark:border-slate-700'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            {allowClear && (
              <button
                type="button"
                onClick={() => {
                  onChange(undefined);
                  setIsOpen(false);
                }}
                className="mt-3 w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500"
              >
                清除日期設定
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

/**
 * 現代化底部聯絡人選擇器（取代還款人/收款人原生 <select>）
 */
export const PersonPickerButton: React.FC<{
  participants: string[];
  value: string;
  onChange: (person: string) => void;
  label?: string;
}> = ({ participants, value, onChange, label = '選擇對象' }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left flex items-center justify-between gap-2 hover:border-emerald-500 transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
            {formatPartyDisplayName(value)}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{label}</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {participants.map((p) => {
                const isSelected = p === value;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      onChange(p);
                      setIsOpen(false);
                    }}
                    className={`min-h-[48px] px-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="truncate">{formatPartyDisplayName(p)}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
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
        className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
        aria-label="上一年"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <span className="px-2 min-h-[36px] flex items-center justify-center text-xs font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
        {year}年
      </span>
      <button
        type="button"
        onClick={() => onChange(year + 1)}
        className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
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
          className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
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
          className="px-2 min-h-[36px] text-xs font-mono font-bold text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition whitespace-nowrap"
        >
          {year}年{month}月
        </button>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition"
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
                className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                {pickerYear} 年
              </span>
              <button
                type="button"
                onClick={() => setPickerYear((y) => y + 1)}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200"
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
                    className={`min-h-[44px] rounded-xl text-xs font-bold transition ${
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
              className="mt-3 w-full min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
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
          className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white flex items-center justify-between hover:border-emerald-500 transition"
        >
          <span>{friendlyLabel}</span>
          <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </button>
        <button
          type="button"
          onClick={() => onChange(todayStr)}
          className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition ${
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
          className={`min-h-[44px] px-3 rounded-xl text-xs font-semibold border transition ${
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
                  className={`min-h-[40px] rounded-lg text-xs font-bold border transition ${
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
                className="min-w-[40px] min-h-[40px] rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                {viewYear}年 {viewMonth}月
              </span>
              <button
                type="button"
                onClick={() => shiftViewMonth(1)}
                className="min-w-[40px] min-h-[40px] rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200"
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
                    className={`min-h-[38px] rounded-lg text-xs font-mono font-bold flex items-center justify-center transition ${
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
              className="mt-3 w-full min-h-[42px] rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300"
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
    <div className="fixed top-[calc(0.75rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 space-y-2 pointer-events-none select-none">
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
            className="min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 transition"
          >
            {config.cancelLabel || '取消'}
          </button>
          <button
            type="button"
            onClick={() => {
              config.onConfirm();
              onClose();
            }}
            className={`min-h-[44px] rounded-xl text-white text-xs font-semibold transition ${
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
