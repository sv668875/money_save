import React, { useState } from 'react';
import { Layers, Plus, Search } from 'lucide-react';
import {
  calculateInstallmentGroups,
  formatTWD,
  InstallmentGroupSummary,
} from '../calculations';
import { Account, Category, Transaction } from '../types';
import { CategoryIcon, MonthStepper } from './SharedUI';

interface LedgerTabProps {
  monthKey: string;
  onMonthChange: (newMonth: string) => void;
  enableBusinessModule: boolean;
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (tx: Transaction) => void;
  onRecordNextInstallment: (group: InstallmentGroupSummary) => void;
}

type FilterMode = 'all' | 'personal' | 'business' | 'debt' | 'installment';

export const LedgerTab: React.FC<LedgerTabProps> = ({
  monthKey,
  onMonthChange,
  enableBusinessModule,
  accounts,
  categories,
  transactions,
  onEditTransaction,
  onDeleteTransaction,
  onRecordNextInstallment,
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllMonths, setShowAllMonths] = useState(false);

  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const installmentGroups = calculateInstallmentGroups(transactions);

  const filteredTxs = transactions
    .filter((tx) => {
      if (!showAllMonths && !tx.date.startsWith(monthKey)) return false;

      const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
      const acc = accountMap.get(tx.accountId);
      const isBiz = Boolean(
        cat?.isBusiness || acc?.isBusinessWorkingCapital || acc?.type === 'business_cashbox'
      );

      // 若未開啟機台模組，預設隱藏機台交易
      if (!enableBusinessModule && isBiz) return false;

      if (filterMode === 'personal' && (isBiz || tx.type === 'debt' || tx.type === 'repay')) {
        return false;
      }
      if (filterMode === 'business' && !isBiz) return false;
      if (filterMode === 'debt' && tx.type !== 'debt' && tx.type !== 'repay') return false;
      if (filterMode === 'installment' && !tx.installmentGroupId) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchNote = tx.note.toLowerCase().includes(q);
        const matchCat = cat?.name.toLowerCase().includes(q);
        const matchAcc = acc?.name.toLowerCase().includes(q);
        const matchPerson = tx.personName?.toLowerCase().includes(q);
        return Boolean(matchNote || matchCat || matchAcc || matchPerson);
      }

      return true;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const groupedByDate = filteredTxs.reduce<Record<string, Transaction[]>>((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = [];
    acc[tx.date].push(tx);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  const filterTabs: { id: FilterMode; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'personal', label: '日常' },
    ...(enableBusinessModule ? [{ id: 'business' as FilterMode, label: '機台' }] : []),
    { id: 'debt', label: '代墊' },
    { id: 'installment', label: '分期' },
  ];

  return (
    <div className="space-y-3.5">
      {/* Top Filter & Search Bar */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <MonthStepper
              monthKey={monthKey}
              onChange={onMonthChange}
              disabled={showAllMonths}
            />
            <button
              type="button"
              onClick={() => setShowAllMonths(!showAllMonths)}
              className={`px-2.5 h-8 rounded-xl text-xs font-semibold border transition whitespace-nowrap ${
                showAllMonths
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {showAllMonths ? '跨月' : '當月'}
            </button>
          </div>
          <span className="text-xs font-mono text-slate-400 shrink-0">
            {filteredTxs.length} 筆
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="搜尋備註、分類、對象..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[38px] pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 text-xs text-slate-900 dark:text-white"
          />
        </div>

        {/* Interactive Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id)}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                filterMode === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Installment Tracking Cards */}
      {(filterMode === 'all' || filterMode === 'installment') && installmentGroups.length > 0 && (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 space-y-2.5">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              分期進度 ({installmentGroups.length})
            </h3>
          </div>

          <div className="space-y-2">
            {installmentGroups.map((group) => {
              const acc = accountMap.get(group.accountId);
              const pct = Math.min(100, Math.round((group.paidPeriods / group.totalPeriods) * 100));
              const isCompleted = group.paidPeriods >= group.totalPeriods;

              return (
                <div
                  key={group.groupId}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/70 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {group.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {acc?.name} · 每期 {formatTWD(group.monthlyAmount)}
                      </div>
                    </div>
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => onRecordNextInstallment(group)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>第 {group.paidPeriods + 1} 期</span>
                      </button>
                    )}
                  </div>

                  <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>
                      {group.paidPeriods}/{group.totalPeriods} 期
                    </span>
                    <span>剩 {formatTWD(group.remainingAmount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Transactions Grouped by Date */}
      {sortedDates.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 py-10 text-center">
          <p className="text-xs font-semibold text-slate-400">無帳務紀錄</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedDates.map((dateStr) => {
            const dayTxs = groupedByDate[dateStr];
            return (
              <div
                key={dateStr}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden"
              >
                <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                    {dateStr}
                  </span>
                  <span className="text-[11px] text-slate-400">{dayTxs.length} 筆</span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {dayTxs.map((tx) => {
                    const acc = accountMap.get(tx.accountId);
                    const toAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : undefined;
                    const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
                    const isBiz = Boolean(
                      cat?.isBusiness ||
                        acc?.isBusinessWorkingCapital ||
                        acc?.type === 'business_cashbox'
                    );

                    let amountColor = 'text-slate-900 dark:text-white';
                    let signPrefix = '';
                    if (tx.type === 'expense') {
                      amountColor = 'text-rose-600 dark:text-rose-400';
                      signPrefix = '-';
                    } else if (tx.type === 'income') {
                      amountColor = 'text-emerald-600 dark:text-emerald-400';
                      signPrefix = '+';
                    } else if (tx.type === 'debt') {
                      amountColor =
                        tx.debtDirection === 'i_lent'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-purple-600 dark:text-purple-400';
                    } else if (tx.type === 'adjustment') {
                      signPrefix = tx.toAccountId === tx.accountId ? '+' : '-';
                    }

                    const titleText =
                      tx.type === 'transfer'
                        ? `${acc?.name || '帳戶'} → ${toAcc?.name || '目標'}`
                        : tx.type === 'debt'
                        ? tx.debtDirection === 'i_lent'
                          ? `代墊 · ${tx.personName}`
                          : `${tx.personName} · 墊付`
                        : tx.type === 'repay'
                        ? tx.isBadDebtWriteOff
                          ? `呆帳 · ${tx.personName}`
                          : `還款 · ${tx.personName}`
                        : tx.type === 'adjustment'
                        ? `${acc?.name} 校正`
                        : cat?.name || '未分類';

                    return (
                      <div
                        key={tx.id}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isBiz
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                                : tx.type === 'income'
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            <CategoryIcon name={cat?.icon} className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {titleText}
                              </span>
                              {tx.installmentTotal && (
                                <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 shrink-0">
                                  {tx.installmentIndex}/{tx.installmentTotal}期
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              <span>{acc?.name}</span>
                              {tx.note && (
                                <>
                                  <span className="mx-1">·</span>
                                  <span>{tx.note}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className={`text-xs font-mono font-bold tabular-nums ${amountColor}`}>
                            {signPrefix}NT$ {tx.amount.toLocaleString('zh-TW')}
                          </div>
                          <div className="flex items-center justify-end gap-2 mt-0.5">
                            <button
                              type="button"
                              onClick={() => onEditTransaction(tx)}
                              className="text-[11px] text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            >
                              編輯
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteTransaction(tx)}
                              className="text-[11px] text-rose-500"
                            >
                              刪除
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
