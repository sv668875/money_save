import React, { useState } from 'react';
import { CalendarClock, Check, Plus, SkipForward, X } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  AccountWithBalance,
  calculateCategoryBreakdown,
  calculateYearlyStatistics,
  formatTWD,
  MonthlyOverviewMetrics,
  RecurringRuleWithMetrics,
} from '../calculations';
import { Account, AccountType, Category, Transaction } from '../types';
import {
  ACCOUNT_TYPE_LABELS,
  AccountTypeIcon,
  MonthStepper,
  YearStepper,
} from './SharedUI';

interface OverviewTabProps {
  monthKey: string;
  onMonthChange: (newMonth: string) => void;
  enableBusinessModule: boolean;
  overview: MonthlyOverviewMetrics;
  accountsWithBalance: AccountWithBalance[];
  categories: Category[];
  transactions: Transaction[];
  pendingRules: RecurringRuleWithMetrics[];
  onExecuteRecurring: (rule: RecurringRuleWithMetrics) => void;
  onSkipRecurring: (rule: RecurringRuleWithMetrics) => void;
  onSaveAccount: (account: Account, isEdit: boolean) => void;
  onArchiveAccount: (account: AccountWithBalance) => void;
  onDeleteAccount: (account: AccountWithBalance) => void;
  onAdjustBalance: (account: AccountWithBalance, targetBalance: number, note: string) => void;
}

const PIE_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#6366f1', '#ec4899', '#64748b'];

export const OverviewTab: React.FC<OverviewTabProps> = ({
  monthKey,
  onMonthChange,
  enableBusinessModule,
  overview,
  accountsWithBalance,
  categories,
  transactions,
  pendingRules,
  onExecuteRecurring,
  onSkipRecurring,
  onSaveAccount,
  onArchiveAccount,
  onDeleteAccount,
  onAdjustBalance,
}) => {
  const [timeDimension, setTimeDimension] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(
    () => parseInt(monthKey.slice(0, 4), 10) || new Date().getFullYear()
  );
  const [yearlyTableMode, setYearlyTableMode] = useState<'quarter' | 'month'>('quarter');

  const [showArchivedAccounts, setShowArchivedAccounts] = useState(false);

  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<AccountWithBalance | null>(null);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('bank');
  const [accInitBal, setAccInitBal] = useState('0');
  const [accIsBiz, setAccIsBiz] = useState(false);

  const [calibratingAcc, setCalibratingAcc] = useState<AccountWithBalance | null>(null);
  const [targetBalanceStr, setTargetBalanceStr] = useState('');
  const [calibrateNote, setCalibrateNote] = useState('');

  const [chartScope, setChartScope] = useState<'all' | 'personal' | 'business'>('personal');

  const effectiveChartScope = enableBusinessModule ? chartScope : 'personal';

  const visibleAccounts = accountsWithBalance.filter((a) => {
    if (!showArchivedAccounts && a.archived) return false;
    if (!enableBusinessModule && (a.isBusinessWorkingCapital || a.type === 'business_cashbox')) {
      return false;
    }
    return true;
  });

  const breakdown = calculateCategoryBreakdown(
    categories,
    transactions,
    monthKey,
    effectiveChartScope
  );

  const yearlyStats = calculateYearlyStatistics(
    accountsWithBalance,
    categories,
    transactions,
    selectedYear,
    enableBusinessModule
  );

  const openAddAccount = () => {
    setEditingAcc(null);
    setAccName('');
    setAccType('bank');
    setAccInitBal('0');
    setAccIsBiz(false);
    setIsAccModalOpen(true);
  };

  const openEditAccount = (acc: AccountWithBalance) => {
    setEditingAcc(acc);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccInitBal(String(acc.initialBalance));
    setAccIsBiz(acc.isBusinessWorkingCapital);
    setIsAccModalOpen(true);
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;
    const initBal = Math.round(parseFloat(accInitBal) || 0);
    const isWorkingCap = accType === 'business_cashbox' ? true : accIsBiz;

    if (editingAcc) {
      onSaveAccount(
        {
          id: editingAcc.id,
          name: accName.trim(),
          type: accType,
          initialBalance: initBal,
          isBusinessWorkingCapital: isWorkingCap,
          archived: editingAcc.archived,
        },
        true
      );
    } else {
      onSaveAccount(
        {
          id: `acc_${Date.now()}`,
          name: accName.trim(),
          type: accType,
          initialBalance: initBal,
          isBusinessWorkingCapital: isWorkingCap,
          archived: false,
        },
        false
      );
    }
    setIsAccModalOpen(false);
  };

  const openCalibrateModal = (acc: AccountWithBalance) => {
    setCalibratingAcc(acc);
    setTargetBalanceStr(String(acc.currentBalance));
    setCalibrateNote('餘額校正');
  };

  const handleCalibrateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calibratingAcc) return;
    const target = Math.round(parseFloat(targetBalanceStr) || 0);
    onAdjustBalance(calibratingAcc, target, calibrateNote.trim() || '餘額校正');
    setCalibratingAcc(null);
  };

  const netWorthDisplayed = enableBusinessModule
    ? overview.totalNetWorth
    : overview.totalNetWorth - overview.businessWorkingCapital;

  const netSavingsDisplayed = enableBusinessModule
    ? overview.monthlyNetSavings
    : overview.monthlyPersonalIncome - overview.monthlyPersonalExpense;

  const accountTypesList = (Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).filter((t) =>
    enableBusinessModule ? true : t !== 'business_cashbox'
  );

  const tableRows =
    yearlyTableMode === 'quarter' ? yearlyStats.quarterlyRows : yearlyStats.monthlyRows;

  return (
    <div className="space-y-3">
      {/* Time Dimension Switcher: 月度 | 年度 */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl flex-1 max-w-[160px]">
          <button
            type="button"
            onClick={() => setTimeDimension('monthly')}
            className={`h-7 px-3 rounded-lg text-xs font-bold transition ${
              timeDimension === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            月度
          </button>
          <button
            type="button"
            onClick={() => setTimeDimension('yearly')}
            className={`h-7 px-3 rounded-lg text-xs font-bold transition ${
              timeDimension === 'yearly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            年度
          </button>
        </div>

        {timeDimension === 'monthly' ? (
          <MonthStepper monthKey={monthKey} onChange={onMonthChange} />
        ) : (
          <YearStepper year={selectedYear} onChange={setSelectedYear} />
        )}
      </div>

      {/* YEARLY VIEW: 年度總計摘要卡 & 季度/月度數據切換表 */}
      {timeDimension === 'yearly' ? (
        <div className="space-y-3">
          {/* 年度總計摘要卡 */}
          <div className="rounded-3xl bg-slate-900 text-white p-4.5 shadow-md border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">
                {selectedYear} 年度淨結餘
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                儲蓄率 {yearlyStats.savingsRate}%
              </span>
            </div>
            <div
              className={`mt-1 text-2xl font-mono font-bold tabular-nums tracking-tight ${
                yearlyStats.netSavings >= 0 ? 'text-white' : 'text-rose-400'
              }`}
            >
              {formatTWD(yearlyStats.netSavings, true)}
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-800 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] text-slate-400">年度總收入</div>
                <div className="text-sm font-mono font-bold tabular-nums text-emerald-400 mt-0.5">
                  {formatTWD(yearlyStats.totalIncome)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">年度總支出</div>
                <div className="text-sm font-mono font-bold tabular-nums text-rose-400 mt-0.5">
                  {formatTWD(yearlyStats.totalExpense)}
                </div>
              </div>
            </div>
          </div>

          {/* 季度 / 月度數據切換表 */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {selectedYear} 統計明細
              </h3>
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setYearlyTableMode('quarter')}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-bold transition ${
                    yearlyTableMode === 'quarter'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  按季 (Q1-Q4)
                </button>
                <button
                  type="button"
                  onClick={() => setYearlyTableMode('month')}
                  className={`h-7 px-2.5 rounded-md text-[11px] font-bold transition ${
                    yearlyTableMode === 'month'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  按月 (1-12月)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2 pl-3.5 pr-2">期間</th>
                    <th className="py-2 px-2 text-right">收入</th>
                    <th className="py-2 px-2 text-right">支出</th>
                    <th className="py-2 pl-2 pr-3.5 text-right">結餘</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {tableRows.map((row) => (
                    <tr
                      key={row.key}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 pl-3.5 pr-2 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {row.label}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {row.income.toLocaleString('zh-TW')}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                        {row.expense.toLocaleString('zh-TW')}
                      </td>
                      <td
                        className={`py-2.5 pl-2 pr-3.5 text-right font-mono font-bold tabular-nums ${
                          row.net >= 0
                            ? 'text-slate-900 dark:text-white'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {row.net >= 0 ? '+' : ''}
                        {row.net.toLocaleString('zh-TW')}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/90 dark:bg-slate-800 font-bold text-xs border-t border-slate-200 dark:border-slate-700">
                    <td className="py-2.5 pl-3.5 pr-2 text-slate-900 dark:text-white">
                      年度總計
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {yearlyStats.totalIncome.toLocaleString('zh-TW')}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-rose-600 dark:text-rose-400">
                      {yearlyStats.totalExpense.toLocaleString('zh-TW')}
                    </td>
                    <td
                      className={`py-2.5 pl-2 pr-3.5 text-right font-mono tabular-nums ${
                        yearlyStats.netSavings >= 0
                          ? 'text-slate-900 dark:text-white'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {yearlyStats.netSavings >= 0 ? '+' : ''}
                      {yearlyStats.netSavings.toLocaleString('zh-TW')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* MONTHLY VIEW */
        <>
          {/* Hero Net Worth Card */}
          <div className="rounded-3xl bg-slate-900 text-white p-4.5 shadow-md border border-slate-800">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-400">總淨值</span>
              <span className="text-xs font-mono text-slate-400">{monthKey}</span>
            </div>
            <div className="mt-1 text-2xl font-mono font-bold tabular-nums tracking-tight text-white">
              {formatTWD(netWorthDisplayed)}
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-800 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] text-slate-400">可用資金</div>
                <div className="text-sm font-mono font-bold tabular-nums text-emerald-400 mt-0.5">
                  {formatTWD(overview.personalLiquidAssets)}
                </div>
              </div>

              {enableBusinessModule && (
                <div>
                  <div className="text-[11px] text-slate-400">機台周轉</div>
                  <div className="text-sm font-mono font-bold tabular-nums text-amber-400 mt-0.5">
                    {formatTWD(overview.businessWorkingCapital)}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[11px] text-slate-400">投資加密</div>
                <div className="text-sm font-mono font-bold tabular-nums text-sky-400 mt-0.5">
                  {formatTWD(overview.investmentAndCrypto)}
                </div>
              </div>

              <div>
                <div className="text-[11px] text-slate-400">卡債 / 代墊</div>
                <div className="text-xs font-mono font-semibold tabular-nums text-slate-200 mt-0.5">
                  <span className="text-rose-400">
                    -{overview.creditCardDebt.toLocaleString('zh-TW')}
                  </span>
                  <span className="mx-1 text-slate-600">/</span>
                  <span className="text-emerald-400">
                    +{(overview.netReceivable - overview.netPayable).toLocaleString('zh-TW')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Pending Recurring Rules Alert Banner */}
          {pendingRules.length > 0 && (
            <div className="rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 text-xs font-bold">
                  <CalendarClock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>待入帳 ({pendingRules.length})</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {pendingRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-amber-200/70 dark:border-slate-800"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {rule.title}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {rule.dayOfMonth}日 · {formatTWD(rule.amount)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onExecuteRecurring(rule)}
                        className="h-7 px-2.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>入帳</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onSkipRecurring(rule)}
                        title="跳過"
                        className="h-7 w-7 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Cashflow Quick Summary */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">本月收支</h3>
              <span
                className={`text-xs font-mono font-bold tabular-nums ${
                  netSavingsDisplayed >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                結餘 {formatTWD(netSavingsDisplayed, true)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="text-[11px] text-slate-500">收入</div>
                <div className="text-sm font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatTWD(overview.monthlyPersonalIncome)}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  固 {overview.monthlyFixedIncome.toLocaleString('zh-TW')} / 浮{' '}
                  {overview.monthlyVariableIncome.toLocaleString('zh-TW')}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <div className="text-[11px] text-slate-500">支出</div>
                <div className="text-sm font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">
                  {formatTWD(overview.monthlyPersonalExpense)}
                </div>
              </div>

              {enableBusinessModule && (
                <>
                  <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20">
                    <div className="text-[11px] text-amber-800 dark:text-amber-300">機台營收</div>
                    <div className="text-sm font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {formatTWD(overview.monthlyBusinessIncome)}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20">
                    <div className="text-[11px] text-amber-800 dark:text-amber-300">機台成本</div>
                    <div className="text-sm font-mono font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">
                      {formatTWD(overview.monthlyBusinessExpense)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Accounts List */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">帳戶</h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowArchivedAccounts(!showArchivedAccounts)}
                  className="h-7 px-2 rounded-lg text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showArchivedAccounts ? '隱藏封存' : '封存'}
                </button>
                <button
                  type="button"
                  onClick={openAddAccount}
                  className="h-7 px-2.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>新增</span>
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className={`py-2.5 flex items-center justify-between gap-2 ${
                    acc.archived ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        acc.isBusinessWorkingCapital || acc.type === 'business_cashbox'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                          : acc.type === 'credit_card'
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
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

                  <div className="text-right shrink-0">
                    <div
                      className={`text-xs font-mono font-bold tabular-nums ${
                        acc.currentBalance < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {formatTWD(acc.currentBalance)}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <button
                        type="button"
                        onClick={() => openCalibrateModal(acc)}
                        className="px-1 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        校正
                      </button>
                      <span className="text-slate-300 dark:text-slate-700 text-[10px]">·</span>
                      <button
                        type="button"
                        onClick={() => openEditAccount(acc)}
                        className="px-1 py-0.5 text-[11px] font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        編輯
                      </button>
                      <span className="text-slate-300 dark:text-slate-700 text-[10px]">·</span>
                      {acc.transactionCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => onArchiveAccount(acc)}
                          className="px-1 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400"
                        >
                          {acc.archived ? '解封' : '封存'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onDeleteAccount(acc)}
                          className="px-1 py-0.5 text-[11px] font-medium text-rose-500"
                        >
                          刪除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Expense Breakdown Chart */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">支出比例</h3>
              {enableBusinessModule && (
                <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {(
                    [
                      { id: 'all', label: '全部' },
                      { id: 'personal', label: '個人' },
                      { id: 'business', label: '機台' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setChartScope(tab.id)}
                      className={`h-6 px-2 text-[11px] font-semibold rounded-md transition ${
                        chartScope === tab.id
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {breakdown.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">尚無支出紀錄</div>
            ) : (
              <div className="space-y-3">
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={breakdown}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={58}
                        paddingAngle={3}
                      >
                        {breakdown.map((entry, idx) => (
                          <Cell
                            key={entry.categoryId}
                            fill={PIE_COLORS[idx % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: unknown) => formatTWD(Number(value) || 0)}
                        contentStyle={{
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5">
                  {breakdown.map((item, idx) => (
                    <div
                      key={item.categoryId}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white shrink-0">
                        {formatTWD(item.amount)} ({item.percentage}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Add / Edit Account Modal */}
      {isAccModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingAcc ? '編輯帳戶' : '新增帳戶'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAccModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAccountSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">名稱</label>
                <input
                  type="text"
                  required
                  placeholder="例如：台新銀行"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">類型</label>
                <select
                  value={accType}
                  onChange={(e) => {
                    const newType = e.target.value as AccountType;
                    setAccType(newType);
                    if (newType === 'business_cashbox') setAccIsBiz(true);
                  }}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                >
                  {accountTypesList.map((k) => (
                    <option key={k} value={k}>
                      {ACCOUNT_TYPE_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  初始餘額 (NT$)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  required
                  value={accInitBal}
                  onChange={(e) => setAccInitBal(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              {enableBusinessModule && (
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={accType === 'business_cashbox' ? true : accIsBiz}
                    disabled={accType === 'business_cashbox'}
                    onChange={(e) => setAccIsBiz(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-600"
                  />
                  <span>列為機台周轉金</span>
                </label>
              )}

              <div className="pt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsAccModalOpen(false)}
                  className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold"
                >
                  儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Balance Calibration Modal */}
      {calibratingAcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                校正「{calibratingAcc.name}」
              </h3>
              <button
                type="button"
                onClick={() => setCalibratingAcc(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              目前帳面：<strong className="font-mono">{formatTWD(calibratingAcc.currentBalance)}</strong>
            </p>

            <form onSubmit={handleCalibrateSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  實際餘額 (NT$)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  required
                  autoFocus
                  value={targetBalanceStr}
                  onChange={(e) => setTargetBalanceStr(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
              <div className="pt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCalibratingAcc(null)}
                  className="h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="h-9 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold"
                >
                  確認
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
