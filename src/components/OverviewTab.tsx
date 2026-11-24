import React, { useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  Check,
  CreditCard,
  Plus,
  SkipForward,
  X,
} from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import {
  AccountWithBalance,
  calculateCategoryBreakdown,
  calculateYearlyStatistics,
  formatTWD,
  getRecurringActionButtonLabel,
  MonthlyOverviewMetrics,
  RecurringRuleWithMetrics,
} from '../calculations';
import { Account, AccountType, Category, Transaction } from '../types';
import {
  ACCOUNT_TYPE_LABELS,
  AccountPickerButton,
  AccountTypeIcon,
  DatePickerButton,
  DayOfMonthPickerButton,
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
  onRequestSkipRecurring: (rule: RecurringRuleWithMetrics) => void;
  onPayCreditCardBill: (
    cardAccount: AccountWithBalance,
    fromAccountId: string,
    amount: number,
    date: string
  ) => void;
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
  onRequestSkipRecurring,
  onPayCreditCardBill,
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

  // Account Add / Edit Modal State
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [editingAcc, setEditingAcc] = useState<AccountWithBalance | null>(null);
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('bank');
  const [accInitBal, setAccInitBal] = useState('0');
  const [accIsBiz, setAccIsBiz] = useState(false);
  const [accBillingDay, setAccBillingDay] = useState<number | undefined>(undefined);
  const [accPaymentDueDay, setAccPaymentDueDay] = useState<number | undefined>(undefined);

  // Balance Calibrate Modal State
  const [calibratingAcc, setCalibratingAcc] = useState<AccountWithBalance | null>(null);
  const [targetBalanceStr, setTargetBalanceStr] = useState('');
  const [calibrateNote, setCalibrateNote] = useState('');

  // Credit Card Bill Payment Modal State
  const [payingCardAcc, setPayingCardAcc] = useState<AccountWithBalance | null>(null);
  const [payFromAccountId, setPayFromAccountId] = useState<string>('');
  const [payAmountStr, setPayAmountStr] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const [chartScope, setChartScope] = useState<'all' | 'personal' | 'business'>('personal');

  const effectiveChartScope = enableBusinessModule ? chartScope : 'personal';

  const visibleAccounts = accountsWithBalance.filter((a) => {
    if (!showArchivedAccounts && a.archived) return false;
    if (!enableBusinessModule && (a.isBusinessWorkingCapital || a.type === 'business_cashbox')) {
      return false;
    }
    return true;
  });

  // Bank/Cash accounts available for paying credit card bills
  const payableSourceAccounts = accountsWithBalance.filter(
    (a) =>
      !a.archived &&
      (a.type === 'bank' || a.type === 'cash') &&
      (enableBusinessModule || !a.isBusinessWorkingCapital)
  );

  // Credit card accounts that are due soon (within 5 days of paymentDueDay and unpaidCardDebt > 0)
  const dueSoonCreditCards = accountsWithBalance.filter(
    (a) => !a.archived && a.type === 'credit_card' && a.isDueSoon && a.unpaidCardDebt > 0
  );

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
    setAccBillingDay(15);
    setAccPaymentDueDay(1);
    setIsAccModalOpen(true);
  };

  const openEditAccount = (acc: AccountWithBalance) => {
    setEditingAcc(acc);
    setAccName(acc.name);
    setAccType(acc.type);
    setAccInitBal(String(acc.initialBalance));
    setAccIsBiz(acc.isBusinessWorkingCapital);
    setAccBillingDay(acc.billingDay);
    setAccPaymentDueDay(acc.paymentDueDay);
    setIsAccModalOpen(true);
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;
    const initBal = Math.round(parseFloat(accInitBal) || 0);
    const isWorkingCap = accType === 'business_cashbox' ? true : accIsBiz;

    const payload: Account = {
      id: editingAcc ? editingAcc.id : `acc_${Date.now()}`,
      name: accName.trim(),
      type: accType,
      initialBalance: initBal,
      isBusinessWorkingCapital: isWorkingCap,
      archived: editingAcc ? editingAcc.archived : false,
      billingDay: accType === 'credit_card' ? accBillingDay : undefined,
      paymentDueDay: accType === 'credit_card' ? accPaymentDueDay : undefined,
    };

    onSaveAccount(payload, Boolean(editingAcc));
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

  const openPayCardModal = (cardAcc: AccountWithBalance) => {
    setPayingCardAcc(cardAcc);
    const defaultBank =
      payableSourceAccounts.find((a) => a.type === 'bank') || payableSourceAccounts[0];
    setPayFromAccountId(defaultBank?.id || '');
    setPayAmountStr(String(cardAcc.unpaidCardDebt));
    setPayDate(new Date().toISOString().slice(0, 10));
  };

  const handlePayCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingCardAcc || !payFromAccountId) return;
    const amt = Math.round(parseFloat(payAmountStr) || 0);
    if (amt <= 0) return;
    onPayCreditCardBill(payingCardAcc, payFromAccountId, amt, payDate);
    setPayingCardAcc(null);
  };

  const netSavingsDisplayed = enableBusinessModule
    ? overview.monthlyNetSavings
    : overview.monthlyPersonalIncome - overview.monthlyPersonalExpense;

  const accountTypesList = (Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).filter((t) =>
    enableBusinessModule ? true : t !== 'business_cashbox'
  );

  const tableRows =
    yearlyTableMode === 'quarter' ? yearlyStats.quarterlyRows : yearlyStats.monthlyRows;

  const totalPendingCount = pendingRules.length + dueSoonCreditCards.length;

  return (
    <div className="space-y-3">
      {/* Time Dimension Switcher: 月度 | 年度 */}
      <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl flex-1 max-w-[160px]">
          <button
            type="button"
            onClick={() => setTimeDimension('monthly')}
            className={`h-8 px-3 rounded-lg text-xs font-bold transition ${
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
            className={`h-8 px-3 rounded-lg text-xs font-bold transition ${
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
          {/* 總資產配置卡 (Total Assets, Liabilities, Net Worth + Stacked Bar & Percentage Breakdown) */}
          <div className="rounded-3xl bg-slate-900 text-white p-4.5 shadow-md border border-slate-800 space-y-3.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-medium text-slate-400">淨資產（扣除負債）</div>
                <div className="mt-0.5 text-2xl font-mono font-bold tabular-nums tracking-tight text-white">
                  {formatTWD(overview.totalNetWorth)}
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg">
                {monthKey}
              </span>
            </div>

            {/* 總資產 vs 總負債 */}
            <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-800">
              <div>
                <div className="text-[11px] text-slate-400">總資產（正資產）</div>
                <div className="text-sm font-mono font-bold tabular-nums text-emerald-400 mt-0.5">
                  {formatTWD(overview.totalAssets)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">總負債（未繳卡費 / 應付）</div>
                <div className="text-sm font-mono font-bold tabular-nums text-rose-400 mt-0.5">
                  {overview.totalLiabilities > 0
                    ? `-${formatTWD(overview.totalLiabilities)}`
                    : formatTWD(0)}
                </div>
              </div>
            </div>

            {/* 資產分布堆疊橫條圖與百分比清單 */}
            {overview.assetAllocation.length > 0 && (
              <div className="pt-2.5 border-t border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>總資產配置比例</span>
                  <span className="font-mono">100%</span>
                </div>

                {/* Stacked Bar */}
                <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden flex gap-0.5">
                  {overview.assetAllocation.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        width: `${Math.max(item.percentage, 2)}%`,
                        backgroundColor: item.color,
                      }}
                      className="h-full first:rounded-l-full last:rounded-r-full transition-all"
                      title={`${item.label}: ${formatTWD(item.amount)} (${item.percentage}%)`}
                    />
                  ))}
                </div>

                {/* Allocation Percentage List */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-0.5">
                  {overview.assetAllocation.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-[11px] bg-slate-800/50 px-2.5 py-1.5 rounded-xl"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-slate-300 truncate">{item.label}</span>
                      </div>
                      <div className="font-mono font-bold text-white shrink-0 ml-1">
                        {item.percentage}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 待辦與待繳清單 (Pending Recurring Rules + Due-Soon Credit Cards) */}
          {totalPendingCount > 0 && (
            <div className="rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 text-xs font-bold">
                  <CalendarClock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>待繳與定期確認 ({totalPendingCount})</span>
                </div>
              </div>

              <div className="space-y-1.5">
                {/* Credit Cards Due Within 5 Days */}
                {dueSoonCreditCards.map((cardAcc) => (
                  <div
                    key={`cc_due_${cardAcc.id}`}
                    className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-3 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                          卡費到期
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {cardAcc.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                        每月 {cardAcc.paymentDueDay} 號截止
                        {cardAcc.daysUntilDue !== undefined
                          ? `（剩 ${cardAcc.daysUntilDue} 天）`
                          : ''}{' '}
                        · 未繳 {formatTWD(cardAcc.unpaidCardDebt)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openPayCardModal(cardAcc)}
                      className="h-8 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 shrink-0 shadow-2xs"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>繳卡費</span>
                    </button>
                  </div>
                ))}

                {/* Pending Recurring Rules */}
                {pendingRules.map((rule) => {
                  const { actionLabel } = getRecurringActionButtonLabel(rule.kind);
                  const kindBadge =
                    rule.kind === 'fixed_income'
                      ? {
                          text: '固定收入',
                          cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
                        }
                      : rule.kind === 'long_term_invest'
                      ? {
                          text: '定期投入',
                          cls: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300',
                        }
                      : {
                          text: '固定支出',
                          cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
                        };

                  return (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-3 py-2.5 rounded-xl border border-amber-200/70 dark:border-slate-800"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${kindBadge.cls}`}
                          >
                            {kindBadge.text}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {rule.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          每月 {rule.dayOfMonth} 日 ·{' '}
                          <span
                            className={
                              rule.kind === 'fixed_income'
                                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                : 'text-slate-700 dark:text-slate-200 font-bold'
                            }
                          >
                            {rule.kind === 'fixed_income' ? '+' : ''}
                            {formatTWD(rule.amount)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onExecuteRecurring(rule)}
                          className={`h-8 px-3 rounded-xl text-white text-xs font-bold flex items-center gap-1 ${
                            rule.kind === 'fixed_income'
                              ? 'bg-emerald-600'
                              : rule.kind === 'long_term_invest'
                              ? 'bg-sky-600'
                              : 'bg-slate-900 dark:bg-slate-700'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{actionLabel}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRequestSkipRecurring(rule)}
                          title="跳過本期"
                          aria-label={`跳過本期 ${rule.title}`}
                          className="h-8 w-8 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
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
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">帳戶與信用卡</h3>
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
              {visibleAccounts.map((acc) => {
                const isCreditCard = acc.type === 'credit_card';
                const hasUnpaidCardDebt = isCreditCard && acc.unpaidCardDebt > 0;

                return (
                  <div
                    key={acc.id}
                    className={`py-3 flex items-start justify-between gap-2 ${
                      acc.archived ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          acc.isBusinessWorkingCapital || acc.type === 'business_cashbox'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                            : isCreditCard
                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        <AccountTypeIcon type={acc.type} className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {acc.name}
                          </span>
                          {isCreditCard && acc.isDueSoon && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                              <AlertCircle className="w-2.5 h-2.5" />
                              即將到期
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {ACCOUNT_TYPE_LABELS[acc.type]}
                          {isCreditCard && (acc.billingDay || acc.paymentDueDay) && (
                            <span className="ml-1 font-mono text-slate-400">
                              ·{' '}
                              {acc.billingDay ? `結帳 ${acc.billingDay}號` : ''}
                              {acc.billingDay && acc.paymentDueDay ? ' / ' : ''}
                              {acc.paymentDueDay ? `繳款 ${acc.paymentDueDay}號` : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {isCreditCard ? (
                        <div>
                          <div className="text-[10px] font-semibold text-slate-400">
                            {hasUnpaidCardDebt ? '目前未繳卡費（負債）' : '本期無未繳卡費'}
                          </div>
                          <div
                            className={`text-xs font-mono font-bold tabular-nums ${
                              hasUnpaidCardDebt
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {hasUnpaidCardDebt
                              ? `-${formatTWD(acc.unpaidCardDebt)}`
                              : formatTWD(acc.currentBalance)}
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`text-xs font-mono font-bold tabular-nums ${
                            acc.currentBalance < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          {formatTWD(acc.currentBalance)}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1.5 mt-1">
                        {hasUnpaidCardDebt && (
                          <>
                            <button
                              type="button"
                              onClick={() => openPayCardModal(acc)}
                              className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[11px] font-bold hover:bg-rose-700"
                            >
                              繳卡費
                            </button>
                            <span className="text-slate-300 dark:text-slate-700 text-[10px]">
                              ·
                            </span>
                          </>
                        )}
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
                );
              })}
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

      {/* Credit Card Bill Payment Modal (繳卡費) */}
      {payingCardAcc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    繳交信用卡費
                  </h3>
                  <p className="text-[11px] text-slate-500">{payingCardAcc.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayingCardAcc(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-rose-800 dark:text-rose-300">
                目前未繳卡費（負債）
              </span>
              <span className="text-sm font-mono font-bold text-rose-600 dark:text-rose-400">
                -{formatTWD(payingCardAcc.unpaidCardDebt)}
              </span>
            </div>

            <form onSubmit={handlePayCardSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  扣款銀行 / 現金帳戶
                </label>
                <AccountPickerButton
                  accounts={payableSourceAccounts}
                  value={payFromAccountId}
                  onChange={setPayFromAccountId}
                  label="選擇扣款帳戶"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    繳款金額 (NT$)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    required
                    min="1"
                    value={payAmountStr}
                    onChange={(e) => setPayAmountStr(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    繳款日期
                  </label>
                  <DatePickerButton value={payDate} onChange={setPayDate} />
                </div>
              </div>

              <div className="pt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayingCardAcc(null)}
                  className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  確認繳款
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Account Modal (Zero Native <select>) */}
      {isAccModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingAcc ? '編輯帳戶' : '新增帳戶'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAccModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
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
                  placeholder="例如：台新銀行、國泰 CUBE 卡"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                  帳戶類型
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {accountTypesList.map((k) => {
                    const isSelected = accType === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setAccType(k);
                          if (k === 'business_cashbox') setAccIsBiz(true);
                        }}
                        className={`h-10 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        <AccountTypeIcon type={k} className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{ACCOUNT_TYPE_LABELS[k]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  {accType === 'credit_card'
                    ? '初始未繳卡費（若目前欠款 5000 請填 -5000）'
                    : '初始餘額 (NT$)'}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  required
                  value={accInitBal}
                  onChange={(e) => setAccInitBal(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                />
              </div>

              {/* Credit Card Optional Billing & Payment Due Day */}
              {accType === 'credit_card' && (
                <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 space-y-2">
                  <div className="text-[11px] font-bold text-rose-900 dark:text-rose-300">
                    信用卡帳單日設定（選填，截止前 5 天自動提醒）
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">
                        結帳日（例：15 號）
                      </label>
                      <DayOfMonthPickerButton
                        value={accBillingDay}
                        onChange={setAccBillingDay}
                        label="選擇結帳日"
                        allowClear={true}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">
                        繳款截止日（例：1 號）
                      </label>
                      <DayOfMonthPickerButton
                        value={accPaymentDueDay}
                        onChange={setAccPaymentDueDay}
                        label="選擇繳款截止日"
                        allowClear={true}
                      />
                    </div>
                  </div>
                </div>
              )}

              {enableBusinessModule && accType !== 'credit_card' && (
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
                  className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold"
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
              目前帳面：
              <strong className="font-mono">{formatTWD(calibratingAcc.currentBalance)}</strong>
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
