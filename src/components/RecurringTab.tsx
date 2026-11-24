import React, { useState } from 'react';
import {
  CalendarClock,
  Check,
  Coins,
  Plus,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import {
  AccountWithBalance,
  calculateInvestmentPortfolioSummary,
  formatTWD,
  getRecurringActionButtonLabel,
  INVESTMENT_ASSET_KIND_LABELS,
  RecurringRuleWithMetrics,
} from '../calculations';
import {
  Category,
  InvestmentAssetKind,
  RecurringRule,
  Transaction,
} from '../types';
import {
  AccountPickerButton,
  CategoryPickerButton,
  DatePickerButton,
  DayOfMonthPickerButton,
} from './SharedUI';

interface RecurringTabProps {
  monthKey: string;
  enableBusinessModule: boolean;
  rulesWithMetrics: RecurringRuleWithMetrics[];
  accounts: AccountWithBalance[];
  categories: Category[];
  transactions: Transaction[];
  onExecuteRule: (rule: RecurringRuleWithMetrics) => void;
  onRequestSkipRule: (rule: RecurringRuleWithMetrics) => void;
  onTogglePauseRule: (rule: RecurringRuleWithMetrics) => void;
  onSaveRule: (rule: RecurringRule, isEdit: boolean) => void;
  onDeleteRule: (rule: RecurringRuleWithMetrics) => void;
  onSaveOneOffInvestment: (tx: Transaction) => void;
  onDeleteOneOffInvestment: (tx: Transaction) => void;
}

const ASSET_KIND_OPTIONS: InvestmentAssetKind[] = [
  'stock_etf',
  'fund',
  'crypto',
  'mortgage',
  'other',
];

export const RecurringTab: React.FC<RecurringTabProps> = ({
  enableBusinessModule,
  rulesWithMetrics,
  accounts,
  categories,
  transactions,
  onExecuteRule,
  onRequestSkipRule,
  onTogglePauseRule,
  onSaveRule,
  onDeleteRule,
  onSaveOneOffInvestment,
  onDeleteOneOffInvestment,
}) => {
  const activeAccounts = accounts.filter(
    (a) =>
      !a.archived &&
      (enableBusinessModule || (!a.isBusinessWorkingCapital && a.type !== 'business_cashbox'))
  );
  const activeCategories = categories.filter(
    (c) => !c.archived && (enableBusinessModule || !c.isBusiness)
  );
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // Recurring Rule Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRuleWithMetrics | null>(null);

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<'fixed_income' | 'fixed_expense' | 'long_term_invest'>(
    'long_term_invest'
  );
  const [ruleAssetKind, setRuleAssetKind] = useState<InvestmentAssetKind>('stock_etf');
  const [amountStr, setAmountStr] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState<number>(15);
  const [accountId, setAccountId] = useState(activeAccounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(activeAccounts[1]?.id || '');
  const [categoryId, setCategoryId] = useState(activeCategories[0]?.id || '');
  const [paymentMode, setPaymentMode] = useState<'auto' | 'manual'>('auto');
  const [initAmountStr, setInitAmountStr] = useState('0');
  const [initPeriodsStr, setInitPeriodsStr] = useState('0');

  // One-Off Investment Modal State (單筆買進)
  const [isOneOffModalOpen, setIsOneOffModalOpen] = useState(false);
  const [oneOffAssetKind, setOneOffAssetKind] = useState<InvestmentAssetKind>('stock_etf');
  const [oneOffTitle, setOneOffTitle] = useState('');
  const [oneOffAmountStr, setOneOffAmountStr] = useState('');
  const [oneOffDate, setOneOffDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [oneOffFromAccId, setOneOffFromAccId] = useState<string>(activeAccounts[0]?.id || '');
  const [oneOffToAccId, setOneOffToAccId] = useState<string>('');
  const [oneOffNote, setOneOffNote] = useState('');

  const visibleRules = rulesWithMetrics.filter((r) => {
    if (enableBusinessModule) return true;
    const acc = accountMap.get(r.accountId);
    const cat = r.categoryId ? categoryMap.get(r.categoryId) : undefined;
    if (acc?.isBusinessWorkingCapital || acc?.type === 'business_cashbox' || cat?.isBusiness) {
      return false;
    }
    return true;
  });

  const portfolioSummary = calculateInvestmentPortfolioSummary(visibleRules, transactions);

  const openAddModal = () => {
    setEditingRule(null);
    setTitle('');
    setKind('long_term_invest');
    setRuleAssetKind('stock_etf');
    setAmountStr('');
    setDayOfMonth(15);
    setAccountId(activeAccounts[0]?.id || '');
    const defaultInvestAcc =
      activeAccounts.find((a) => a.type === 'investment' || a.type === 'crypto') ||
      activeAccounts[1] ||
      activeAccounts[0];
    setToAccountId(defaultInvestAcc?.id || '');
    const defaultExpCat =
      activeCategories.find((c) => c.type === 'expense') || activeCategories[0];
    setCategoryId(defaultExpCat?.id || '');
    setPaymentMode('auto');
    setInitAmountStr('0');
    setInitPeriodsStr('0');
    setIsModalOpen(true);
  };

  const openEditModal = (rule: RecurringRuleWithMetrics) => {
    setEditingRule(rule);
    setTitle(rule.title);
    setKind(rule.kind);
    setRuleAssetKind(rule.assetKind || 'stock_etf');
    setAmountStr(String(rule.amount));
    setDayOfMonth(rule.dayOfMonth);
    setAccountId(rule.accountId);
    setToAccountId(rule.toAccountId || activeAccounts[0]?.id || '');
    setCategoryId(rule.categoryId || activeCategories[0]?.id || '');
    setPaymentMode(rule.paymentMode);
    setInitAmountStr(String(rule.initialInvestedAmount || 0));
    setInitPeriodsStr(String(rule.initialInvestedPeriods || 0));
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Math.round(parseFloat(amountStr) || 0);
    if (!title.trim() || amt <= 0) return;

    const day = Math.max(1, Math.min(28, dayOfMonth || 1));
    const initAmt = Math.max(0, Math.round(parseFloat(initAmountStr) || 0));
    const initPer = Math.max(0, parseInt(initPeriodsStr, 10) || 0);

    const payload: RecurringRule = {
      id: editingRule ? editingRule.id : `rule_${Date.now()}`,
      title: title.trim(),
      kind,
      assetKind: kind === 'long_term_invest' ? ruleAssetKind : undefined,
      amount: amt,
      dayOfMonth: day,
      accountId,
      toAccountId: kind === 'long_term_invest' ? toAccountId : undefined,
      categoryId: kind !== 'long_term_invest' ? categoryId : undefined,
      paymentMode,
      status: editingRule ? editingRule.status : 'active',
      pausedSince: editingRule?.pausedSince,
      initialInvestedAmount: kind === 'long_term_invest' ? initAmt : undefined,
      initialInvestedPeriods: kind === 'long_term_invest' ? initPer : undefined,
      skippedPeriods: editingRule ? editingRule.skippedPeriods : [],
    };

    onSaveRule(payload, Boolean(editingRule));
    setIsModalOpen(false);
  };

  const openOneOffModal = () => {
    setOneOffAssetKind('stock_etf');
    setOneOffTitle('');
    setOneOffAmountStr('');
    setOneOffDate(new Date().toISOString().slice(0, 10));
    const defaultBank =
      activeAccounts.find((a) => a.type === 'bank') || activeAccounts[0];
    const defaultInvest = activeAccounts.find(
      (a) => a.type === 'investment' || a.type === 'crypto'
    );
    setOneOffFromAccId(defaultBank?.id || '');
    setOneOffToAccId(defaultInvest?.id || '');
    setOneOffNote('');
    setIsOneOffModalOpen(true);
  };

  const handleOneOffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Math.round(parseFloat(oneOffAmountStr) || 0);
    if (!oneOffTitle.trim() || amt <= 0) return;

    const tx: Transaction = {
      id: `tx_invest_${Date.now()}`,
      date: oneOffDate,
      type: 'transfer',
      amount: amt,
      accountId: oneOffFromAccId || '',
      toAccountId: oneOffToAccId || undefined,
      isOneOffInvestment: true,
      assetKind: oneOffAssetKind,
      assetTitle: oneOffTitle.trim(),
      note: oneOffNote.trim() || `單筆買進：${oneOffTitle.trim()}`,
    };

    onSaveOneOffInvestment(tx);
    setIsOneOffModalOpen(false);
  };

  const longTermRules = visibleRules.filter((r) => r.kind === 'long_term_invest');
  const fixedCashflowRules = visibleRules.filter((r) => r.kind !== 'long_term_invest');

  const filteredCategoriesForKind = activeCategories.filter(
    (c) => c.type === (kind === 'fixed_income' ? 'income' : 'expense')
  );

  return (
    <div className="space-y-3">
      {/* Header Banner: 投資與資產投入總覽 (定期定額 + 單筆買進) */}
      <div className="rounded-3xl bg-slate-900 text-white p-4.5 shadow-md border border-slate-800 space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-medium text-slate-400">
              投資與資產總投入本金
            </span>
            <div className="text-2xl font-mono font-bold tabular-nums text-sky-400 mt-0.5">
              {formatTWD(portfolioSummary.totalPrincipal)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={openOneOffModal}
              className="h-8 px-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>單筆投入</span>
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="h-8 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>定期規則</span>
            </button>
          </div>
        </div>

        {/* 定期定額 vs 單筆買進 分項 */}
        <div className="grid grid-cols-2 gap-3 pt-2.5 border-t border-slate-800">
          <div>
            <div className="text-[11px] text-slate-400">定期定額累計</div>
            <div className="text-sm font-mono font-bold tabular-nums text-white mt-0.5">
              {formatTWD(portfolioSummary.recurringPrincipalTotal)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">單筆買進累計</div>
            <div className="text-sm font-mono font-bold tabular-nums text-emerald-400 mt-0.5">
              {formatTWD(portfolioSummary.oneOffPrincipalTotal)}
            </div>
          </div>
        </div>

        {/* 資產標的分類佔比 */}
        {portfolioSummary.byAssetKind.length > 0 && (
          <div className="pt-2.5 border-t border-slate-800 space-y-1.5">
            <div className="text-[11px] text-slate-400">各類資產投入分布</div>
            <div className="grid grid-cols-2 gap-2">
              {portfolioSummary.byAssetKind.map((item) => (
                <div
                  key={item.kind}
                  className="bg-slate-800/70 px-2.5 py-1.5 rounded-xl flex items-center justify-between text-xs"
                >
                  <span className="text-slate-300 truncate">{item.label}</span>
                  <span className="font-mono font-bold text-sky-400 shrink-0 ml-1">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 1: 定期定額投入 (Recurring Investments) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-sky-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              定期定額投入 ({longTermRules.length})
            </h3>
          </div>
        </div>

        {longTermRules.length === 0 ? (
          <div className="py-5 text-center text-xs text-slate-400">尚無定期定額規則</div>
        ) : (
          <div className="space-y-2">
            {longTermRules.map((rule) => {
              const { actionLabel, doneLabel } = getRecurringActionButtonLabel(rule.kind);
              return (
                <div
                  key={rule.id}
                  className={`p-3 rounded-2xl border transition ${
                    rule.status === 'paused'
                      ? 'bg-slate-50/70 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800 opacity-75'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {rule.assetKind && (
                          <span className="px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 text-[10px] font-bold">
                            {INVESTMENT_ASSET_KIND_LABELS[rule.assetKind]}
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {rule.title}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          · 每月{rule.dayOfMonth}日 ·{' '}
                          {rule.paymentMode === 'auto' ? '自動' : '手動'}
                        </span>
                        {rule.status === 'paused' && (
                          <span className="text-[11px] font-semibold text-amber-600">
                            · 暫停 {rule.pausedMonthsCount}月
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        每期{' '}
                        <strong className="font-mono text-slate-700 dark:text-slate-200">
                          {formatTWD(rule.amount)}
                        </strong>{' '}
                        · 累計 {rule.totalCumulativePeriods} 期
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold tabular-nums text-sky-600 dark:text-sky-400">
                        {formatTWD(rule.totalCumulativeAmount)}
                      </div>
                    </div>
                  </div>

                  {/* Compact single-line action row */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                    <div>
                      {rule.isExecutedThisMonth ? (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {doneLabel}
                        </span>
                      ) : rule.isSkippedThisMonth ? (
                        <span className="text-[11px] font-semibold text-slate-400">
                          本月已跳過
                        </span>
                      ) : (
                        rule.status === 'active' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onExecuteRule(rule)}
                              className="h-7 px-2.5 rounded-lg bg-sky-600 text-white text-[11px] font-semibold flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              <span>{actionLabel}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onRequestSkipRule(rule)}
                              className="h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500"
                            >
                              跳過
                            </button>
                          </div>
                        )
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onTogglePauseRule(rule)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        {rule.status === 'paused' ? '恢復' : '暫停'}
                      </button>
                      <span className="text-slate-300 dark:text-slate-700 text-[10px]">·</span>
                      <button
                        type="button"
                        onClick={() => openEditModal(rule)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        編輯
                      </button>
                      <span className="text-slate-300 dark:text-slate-700 text-[10px]">·</span>
                      <button
                        type="button"
                        onClick={() => onDeleteRule(rule)}
                        className="text-[11px] font-semibold text-rose-500"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: 單筆買進紀錄 (One-Off Investment Transactions) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5 text-emerald-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              單筆買進紀錄 ({portfolioSummary.oneOffTransactions.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={openOneOffModal}
            className="h-7 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>新增單筆</span>
          </button>
        </div>

        {portfolioSummary.oneOffTransactions.length === 0 ? (
          <div className="py-5 text-center text-xs text-slate-400">
            尚無單筆買進紀錄（可記錄零股、ETF、基金或加密貨幣單次加碼）
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {portfolioSummary.oneOffTransactions.map((tx) => {
              const fromAcc = tx.accountId ? accountMap.get(tx.accountId) : undefined;
              const toAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : undefined;
              const kindLabel =
                INVESTMENT_ASSET_KIND_LABELS[tx.assetKind || 'stock_etf'] || '股票 / ETF';

              return (
                <div
                  key={tx.id}
                  className="py-2.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                        {kindLabel}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {tx.assetTitle || tx.note}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                      {tx.date}
                      {fromAcc ? ` · ${fromAcc.name}` : ''}
                      {toAcc ? ` → ${toAcc.name}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-bold tabular-nums text-sky-600 dark:text-sky-400">
                      {formatTWD(tx.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteOneOffInvestment(tx)}
                      title="刪除此筆單筆投入"
                      aria-label={`刪除 ${tx.assetTitle || tx.note}`}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 3: Fixed Monthly Income & Expenses (固定收支) */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2">
        <div className="flex items-center gap-1.5">
          <CalendarClock className="w-3.5 h-3.5 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
            固定收支 ({fixedCashflowRules.length})
          </h3>
        </div>

        {fixedCashflowRules.length === 0 ? (
          <div className="py-5 text-center text-xs text-slate-400">尚無固定收支規則</div>
        ) : (
          <div className="space-y-2">
            {fixedCashflowRules.map((rule) => {
              const { actionLabel, doneLabel } = getRecurringActionButtonLabel(rule.kind);
              return (
                <div
                  key={rule.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                            rule.kind === 'fixed_income'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300'
                          }`}
                        >
                          {rule.kind === 'fixed_income' ? '收入' : '支出'}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {rule.title}
                        </span>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          · 每月{rule.dayOfMonth}日
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {accountMap.get(rule.accountId)?.name}
                      </div>
                    </div>

                    <span
                      className={`text-xs font-mono font-bold shrink-0 ${
                        rule.kind === 'fixed_income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {rule.kind === 'fixed_income' ? '+' : '-'}
                      {formatTWD(rule.amount)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2">
                    <div>
                      {rule.isExecutedThisMonth ? (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {doneLabel}
                        </span>
                      ) : rule.isSkippedThisMonth ? (
                        <span className="text-[11px] font-semibold text-slate-400">
                          本月已跳過
                        </span>
                      ) : (
                        rule.status === 'active' && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onExecuteRule(rule)}
                              className={`h-7 px-2.5 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1 ${
                                rule.kind === 'fixed_income'
                                  ? 'bg-emerald-600'
                                  : 'bg-slate-900 dark:bg-slate-700'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>{actionLabel}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onRequestSkipRule(rule)}
                              className="h-7 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500"
                            >
                              跳過
                            </button>
                          </div>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onTogglePauseRule(rule)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        {rule.status === 'paused' ? '恢復' : '暫停'}
                      </button>
                      <span className="text-slate-300 dark:text-slate-700 text-[10px]">·</span>
                      <button
                        type="button"
                        onClick={() => openEditModal(rule)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                      >
                        編輯
                      </button>
                      <span className="text-slate-300 dark:text-slate-700 text-[10px]">·</span>
                      <button
                        type="button"
                        onClick={() => onDeleteRule(rule)}
                        className="text-[11px] font-semibold text-rose-500"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal 1: Add / Edit One-Off Investment (單筆買進) */}
      {isOneOffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                新增單筆投資買進
              </h3>
              <button
                type="button"
                onClick={() => setIsOneOffModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOneOffSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                  資產類型
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ASSET_KIND_OPTIONS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setOneOffAssetKind(k)}
                      className={`h-8 px-2.5 rounded-xl text-xs font-bold border transition ${
                        oneOffAssetKind === k
                          ? 'border-sky-600 bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      {INVESTMENT_ASSET_KIND_LABELS[k]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  標的名稱
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：台積電 (2330)、0050、比特幣"
                  value={oneOffTitle}
                  onChange={(e) => setOneOffTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    投入金額 (NT$)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    required
                    min="1"
                    placeholder="0"
                    value={oneOffAmountStr}
                    onChange={(e) => setOneOffAmountStr(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    買進日期
                  </label>
                  <DatePickerButton value={oneOffDate} onChange={setOneOffDate} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    扣款帳戶（選填）
                  </label>
                  <AccountPickerButton
                    accounts={activeAccounts}
                    value={oneOffFromAccId}
                    onChange={setOneOffFromAccId}
                    label="選擇扣款帳戶"
                    allowEmpty={true}
                    emptyLabel="不扣款（僅記投入成本）"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    轉入資產帳戶（選填）
                  </label>
                  <AccountPickerButton
                    accounts={activeAccounts}
                    value={oneOffToAccId}
                    onChange={setOneOffToAccId}
                    label="選擇轉入資產帳戶"
                    allowEmpty={true}
                    emptyLabel="不轉入特定帳戶"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  備註（選填）
                </label>
                <input
                  type="text"
                  placeholder="例如：逢低加碼 100 股"
                  value={oneOffNote}
                  onChange={(e) => setOneOffNote(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsOneOffModalOpen(false)}
                  className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="h-10 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
                >
                  儲存單筆投入
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Add / Edit Recurring Rule Modal (Zero Native <select>) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingRule ? '編輯定期規則' : '新增定期規則'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {(
                  [
                    { id: 'long_term_invest', label: '定期定額' },
                    { id: 'fixed_expense', label: '固定支出' },
                    { id: 'fixed_income', label: '固定收入' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setKind(item.id);
                      const nextCats = activeCategories.filter(
                        (c) =>
                          c.type === (item.id === 'fixed_income' ? 'income' : 'expense')
                      );
                      if (nextCats.length > 0) setCategoryId(nextCats[0].id);
                    }}
                    className={`h-8 text-xs font-semibold rounded-lg transition ${
                      kind === item.id
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {kind === 'long_term_invest' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    資產分類
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ASSET_KIND_OPTIONS.map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setRuleAssetKind(k)}
                        className={`h-7 px-2.5 rounded-lg text-[11px] font-bold border transition ${
                          ruleAssetKind === k
                            ? 'border-sky-600 bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        {INVESTMENT_ASSET_KIND_LABELS[k]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">名稱</label>
                <input
                  type="text"
                  required
                  placeholder="例如：0050 定期定額、房租、薪資"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    每期金額 (NT$)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    required
                    min="1"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    每月執行日
                  </label>
                  <DayOfMonthPickerButton
                    value={dayOfMonth}
                    onChange={(d) => setDayOfMonth(d || 1)}
                    label="選擇每月執行日"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    {kind === 'fixed_income' ? '入帳帳戶' : '扣款帳戶'}
                  </label>
                  <AccountPickerButton
                    accounts={activeAccounts}
                    value={accountId}
                    onChange={setAccountId}
                    label={kind === 'fixed_income' ? '選擇入帳帳戶' : '選擇扣款帳戶'}
                  />
                </div>

                {kind === 'long_term_invest' ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      轉入投資帳戶
                    </label>
                    <AccountPickerButton
                      accounts={activeAccounts}
                      value={toAccountId}
                      onChange={setToAccountId}
                      label="選擇轉入投資帳戶"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      收支分類
                    </label>
                    <CategoryPickerButton
                      categories={filteredCategoriesForKind}
                      value={categoryId}
                      onChange={setCategoryId}
                      label="選擇收支分類"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('auto')}
                  className={`h-9 rounded-xl text-xs font-semibold border ${
                    paymentMode === 'auto'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  自動扣款
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('manual')}
                  className={`h-9 rounded-xl text-xs font-semibold border ${
                    paymentMode === 'manual'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  手動確認
                </button>
              </div>

              {kind === 'long_term_invest' && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    使用 App 前的既有累積（選填）
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">既有期數</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={initPeriodsStr}
                        onChange={(e) => setInitPeriodsStr(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">
                        既有累積本金
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={initAmountStr}
                        onChange={(e) => setInitAmountStr(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
    </div>
  );
};
