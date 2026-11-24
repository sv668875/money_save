import React from 'react';
import { ArrowRightLeft, Coins, Package, Store } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AccountWithBalance,
  BusinessSummary,
  calculateBusinessSummary,
  formatTWD,
} from '../calculations';
import { QuickAddInitialPreset } from './QuickAddDrawer';
import { MonthStepper } from './SharedUI';
import { Category, Transaction } from '../types';

interface BusinessTabProps {
  monthKey: string;
  onMonthChange: (newMonth: string) => void;
  accountsWithBalance: AccountWithBalance[];
  categories: Category[];
  transactions: Transaction[];
  businessSummary: BusinessSummary;
  onOpenQuickAdd: (preset: QuickAddInitialPreset) => void;
}

function getPreviousMonthKey(baseMonthKey: string, offset: number): string {
  const [y, m] = baseMonthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const BusinessTab: React.FC<BusinessTabProps> = ({
  monthKey,
  onMonthChange,
  accountsWithBalance,
  categories,
  transactions,
  businessSummary,
  onOpenQuickAdd,
}) => {
  const cashboxAccount =
    accountsWithBalance.find(
      (a) => !a.archived && (a.type === 'business_cashbox' || a.isBusinessWorkingCapital)
    ) || accountsWithBalance[0];

  const mainBankAccount =
    accountsWithBalance.find((a) => !a.archived && a.type === 'bank') || accountsWithBalance[0];

  const m2 = getPreviousMonthKey(monthKey, -2);
  const m1 = getPreviousMonthKey(monthKey, -1);
  const chartData = [m2, m1, monthKey].map((mk) => {
    const s = calculateBusinessSummary(accountsWithBalance, categories, transactions, mk);
    return {
      month: mk.slice(5) + '月',
      營收: s.monthlyRevenue,
      成本: s.monthlyExpense,
    };
  });

  const bizCatIds = new Set(categories.filter((c) => c.isBusiness).map((c) => c.id));
  const bizAccIds = new Set(
    accountsWithBalance
      .filter((a) => a.isBusinessWorkingCapital || a.type === 'business_cashbox')
      .map((a) => a.id)
  );

  const bizTransactions = transactions
    .filter(
      (tx) =>
        tx.date.startsWith(monthKey) &&
        ((tx.categoryId && bizCatIds.has(tx.categoryId)) ||
          bizAccIds.has(tx.accountId) ||
          (tx.toAccountId && bizAccIds.has(tx.toAccountId)))
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-3.5">
      {/* Working Capital & Monthly P&L Hero Card */}
      <div className="rounded-3xl bg-slate-900 text-white p-5 shadow-md border border-slate-800">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Store className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-amber-300">機台周轉</span>
          </div>
          <MonthStepper monthKey={monthKey} onChange={onMonthChange} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 pb-3.5 border-b border-slate-800">
          <div>
            <div className="text-[11px] text-slate-400">錢箱餘額</div>
            <div className="text-xl font-mono font-bold tabular-nums text-amber-400 mt-0.5">
              {formatTWD(businessSummary.workingCapitalTotal)}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400">
              本月淨利 ({businessSummary.profitMargin}%)
            </div>
            <div
              className={`text-xl font-mono font-bold tabular-nums mt-0.5 ${
                businessSummary.monthlyNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatTWD(businessSummary.monthlyNetProfit, true)}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-slate-800/80">
            <div className="text-[10px] text-slate-400">收幣</div>
            <div className="text-xs font-mono font-bold tabular-nums text-emerald-400 mt-0.5">
              {businessSummary.monthlyRevenue.toLocaleString('zh-TW')}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/80">
            <div className="text-[10px] text-slate-400">場租</div>
            <div className="text-xs font-mono font-bold tabular-nums text-rose-400 mt-0.5">
              {businessSummary.monthlyRent.toLocaleString('zh-TW')}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/80">
            <div className="text-[10px] text-slate-400">貨款/耗材</div>
            <div className="text-xs font-mono font-bold tabular-nums text-rose-400 mt-0.5">
              {(businessSummary.monthlyGoods + businessSummary.monthlyOtherCost).toLocaleString(
                'zh-TW'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 1-Tap Claw Machine Quick Actions */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-3.5">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() =>
              onOpenQuickAdd({
                type: 'income',
                accountId: cashboxAccount?.id,
                categoryId: 'cat_biz_rev',
                incomeKind: 'variable',
                note: '機台收幣',
              })
            }
            className="min-h-[44px] px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/70 text-emerald-900 dark:text-emerald-300 flex items-center justify-center gap-2 text-xs font-bold"
          >
            <Coins className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>收幣入帳</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onOpenQuickAdd({
                type: 'expense',
                accountId: cashboxAccount?.id,
                categoryId: 'cat_biz_goods',
                note: '批發補貨',
              })
            }
            className="min-h-[44px] px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-300 flex items-center justify-center gap-2 text-xs font-bold"
          >
            <Package className="w-4 h-4 text-amber-600 shrink-0" />
            <span>進貨扣款</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onOpenQuickAdd({
                type: 'expense',
                accountId: cashboxAccount?.id,
                categoryId: 'cat_biz_rent',
                note: '機台場租',
              })
            }
            className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 text-xs font-bold"
          >
            <Store className="w-4 h-4 text-slate-600 shrink-0" />
            <span>繳交場租</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onOpenQuickAdd({
                type: 'transfer',
                accountId: cashboxAccount?.id,
                toAccountId: mainBankAccount?.id,
                note: '獲利轉回銀行',
              })
            }
            className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2 text-xs font-bold"
          >
            <ArrowRightLeft className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>轉回銀行</span>
          </button>
        </div>
      </div>

      {/* 3-Month Business Revenue vs Expense BarChart */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-2.5">
          近三月營收與成本
        </h3>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: unknown) => formatTWD(Number(value) || 0)}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="營收" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="成本" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Business Transactions List */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-2.5">
          本月明細 ({bizTransactions.length})
        </h3>
        {bizTransactions.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">尚無紀錄</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {bizTransactions.map((tx) => (
              <div key={tx.id} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {tx.note || '機台帳務'}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">{tx.date}</div>
                </div>
                <div
                  className={`text-xs font-mono font-bold tabular-nums shrink-0 ${
                    tx.type === 'income'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : tx.type === 'expense'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                  {formatTWD(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
