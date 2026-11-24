import React, { useState } from 'react';
import { CalendarClock, Check, Plus, TrendingUp, X } from 'lucide-react';
import { formatTWD, RecurringRuleWithMetrics } from '../calculations';
import { Account, Category, RecurringRule } from '../types';

interface RecurringTabProps {
  monthKey: string;
  enableBusinessModule: boolean;
  rulesWithMetrics: RecurringRuleWithMetrics[];
  accounts: Account[];
  categories: Category[];
  onExecuteRule: (rule: RecurringRuleWithMetrics) => void;
  onSkipRule: (rule: RecurringRuleWithMetrics) => void;
  onTogglePauseRule: (rule: RecurringRuleWithMetrics) => void;
  onSaveRule: (rule: RecurringRule, isEdit: boolean) => void;
  onDeleteRule: (rule: RecurringRuleWithMetrics) => void;
}

export const RecurringTab: React.FC<RecurringTabProps> = ({
  enableBusinessModule,
  rulesWithMetrics,
  accounts,
  categories,
  onExecuteRule,
  onSkipRule,
  onTogglePauseRule,
  onSaveRule,
  onDeleteRule,
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RecurringRuleWithMetrics | null>(null);

  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<'fixed_income' | 'fixed_expense' | 'long_term_invest'>(
    'long_term_invest'
  );
  const [amountStr, setAmountStr] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('15');
  const [accountId, setAccountId] = useState(activeAccounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(activeAccounts[1]?.id || '');
  const [categoryId, setCategoryId] = useState(activeCategories[0]?.id || '');
  const [paymentMode, setPaymentMode] = useState<'auto' | 'manual'>('auto');
  const [initAmountStr, setInitAmountStr] = useState('0');
  const [initPeriodsStr, setInitPeriodsStr] = useState('0');

  const visibleRules = rulesWithMetrics.filter((r) => {
    if (enableBusinessModule) return true;
    const acc = accountMap.get(r.accountId);
    const cat = r.categoryId ? categoryMap.get(r.categoryId) : undefined;
    if (acc?.isBusinessWorkingCapital || acc?.type === 'business_cashbox' || cat?.isBusiness) {
      return false;
    }
    return true;
  });

  const openAddModal = () => {
    setEditingRule(null);
    setTitle('');
    setKind('long_term_invest');
    setAmountStr('');
    setDayOfMonth('15');
    setAccountId(activeAccounts[0]?.id || '');
    setToAccountId(activeAccounts[1]?.id || activeAccounts[0]?.id || '');
    setCategoryId(activeCategories[0]?.id || '');
    setPaymentMode('auto');
    setInitAmountStr('0');
    setInitPeriodsStr('0');
    setIsModalOpen(true);
  };

  const openEditModal = (rule: RecurringRuleWithMetrics) => {
    setEditingRule(rule);
    setTitle(rule.title);
    setKind(rule.kind);
    setAmountStr(String(rule.amount));
    setDayOfMonth(String(rule.dayOfMonth));
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

    const day = Math.max(1, Math.min(28, parseInt(dayOfMonth, 10) || 1));
    const initAmt = Math.max(0, Math.round(parseFloat(initAmountStr) || 0));
    const initPer = Math.max(0, parseInt(initPeriodsStr, 10) || 0);

    const payload: RecurringRule = {
      id: editingRule ? editingRule.id : `rule_${Date.now()}`,
      title: title.trim(),
      kind,
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

  const longTermRules = visibleRules.filter((r) => r.kind === 'long_term_invest');
  const fixedCashflowRules = visibleRules.filter((r) => r.kind !== 'long_term_invest');

  const totalLongTermInvested = longTermRules.reduce(
    (sum, r) => sum + r.totalCumulativeAmount,
    0
  );

  return (
    <div className="space-y-3">
      {/* Header Banner */}
      <div className="rounded-3xl bg-slate-900 text-white p-4.5 shadow-md border border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400">長期累計投入</span>
            <div className="text-xl font-mono font-bold tabular-nums text-sky-400 mt-0.5">
              {formatTWD(totalLongTermInvested)}
            </div>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="h-8 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增規則</span>
          </button>
        </div>
      </div>

      {/* Section 1: Long-Term Investments */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-sky-500" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
            定期定額 ({longTermRules.length})
          </h3>
        </div>

        {longTermRules.length === 0 ? (
          <div className="py-5 text-center text-xs text-slate-400">尚無規則</div>
        ) : (
          <div className="space-y-2">
            {longTermRules.map((rule) => (
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
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {rule.title}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        · {rule.dayOfMonth}日 · {rule.paymentMode === 'auto' ? '自動' : '手動'}
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
                        本月已入帳
                      </span>
                    ) : rule.isSkippedThisMonth ? (
                      <span className="text-[11px] font-semibold text-slate-400">已跳過</span>
                    ) : (
                      rule.status === 'active' && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onExecuteRule(rule)}
                            className="h-7 px-2.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-[11px] font-semibold flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>入帳</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onSkipRule(rule)}
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
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Fixed Monthly Income & Expenses */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-2">
        <div className="flex items-center gap-1.5">
          <CalendarClock className="w-3.5 h-3.5 text-emerald-600" />
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
            固定收支 ({fixedCashflowRules.length})
          </h3>
        </div>

        {fixedCashflowRules.length === 0 ? (
          <div className="py-5 text-center text-xs text-slate-400">尚無規則</div>
        ) : (
          <div className="space-y-2">
            {fixedCashflowRules.map((rule) => (
              <div
                key={rule.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {rule.title}
                      </span>
                      <span className="text-[11px] text-slate-400 shrink-0">
                        · {rule.dayOfMonth}日
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
                        本月已入帳
                      </span>
                    ) : rule.isSkippedThisMonth ? (
                      <span className="text-[11px] font-semibold text-slate-400">已跳過</span>
                    ) : (
                      rule.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => onExecuteRule(rule)}
                          className="h-7 px-2.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-[11px] font-semibold"
                        >
                          入帳
                        </button>
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
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Recurring Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {editingRule ? '編輯規則' : '新增規則'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400"
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
                    onClick={() => setKind(item.id)}
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

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">名稱</label>
                <input
                  type="text"
                  required
                  placeholder="例如：0050 定期定額"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    金額 (NT$)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    required
                    min="1"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    扣款日
                  </label>
                  <select
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={String(d)}>
                        每月 {d} 日
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    {kind === 'fixed_income' ? '入帳帳戶' : '扣款帳戶'}
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                  >
                    {activeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {kind === 'long_term_invest' ? (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      轉入帳戶
                    </label>
                    <select
                      value={toAccountId}
                      onChange={(e) => setToAccountId(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                    >
                      {activeAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      分類
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white"
                    >
                      {activeCategories
                        .filter(
                          (c) => c.type === (kind === 'fixed_income' ? 'income' : 'expense')
                        )
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('auto')}
                  className={`h-8 rounded-xl text-xs font-semibold border ${
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
                  className={`h-8 rounded-xl text-xs font-semibold border ${
                    paymentMode === 'manual'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  手動轉帳
                </button>
              </div>

              {kind === 'long_term_invest' && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                    既有累積設定
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
                        既有金額
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
    </div>
  );
};
