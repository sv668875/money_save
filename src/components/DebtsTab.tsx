import React, { useState } from 'react';
import { ArrowLeftRight, Check, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { formatTWD, PersonDebtSummary } from '../calculations';
import { QuickAddInitialPreset } from './QuickAddDrawer';
import { Account } from '../types';

interface DebtsTabProps {
  personDebts: PersonDebtSummary[];
  accounts: Account[];
  enableBusinessModule: boolean;
  onOpenQuickAdd: (preset: QuickAddInitialPreset) => void;
  onSettleDebt: (person: PersonDebtSummary, accountId: string) => void;
  onWriteOffBadDebt: (person: PersonDebtSummary) => void;
}

export const DebtsTab: React.FC<DebtsTabProps> = ({
  personDebts,
  accounts,
  enableBusinessModule,
  onOpenQuickAdd,
  onSettleDebt,
  onWriteOffBadDebt,
}) => {
  const activeAccounts = accounts.filter(
    (a) =>
      !a.archived &&
      (enableBusinessModule || (!a.isBusinessWorkingCapital && a.type !== 'business_cashbox'))
  );
  const [expandedPerson, setExpandedPerson] = useState<string | null>(
    personDebts[0]?.personName || null
  );
  const [settleAccountId, setSettleAccountId] = useState<string>(activeAccounts[0]?.id || '');

  const totalReceivable = personDebts
    .filter((p) => p.netBalance > 0)
    .reduce((s, p) => s + p.netBalance, 0);

  const totalPayable = personDebts
    .filter((p) => p.netBalance < 0)
    .reduce((s, p) => s + Math.abs(p.netBalance), 0);

  const totalWrittenOff = personDebts.reduce((s, p) => s + p.badDebtWrittenOff, 0);

  return (
    <div className="space-y-3.5">
      {/* Debt & Offset Summary Card */}
      <div className="rounded-3xl bg-slate-900 text-white p-5 shadow-md border border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-300">代墊互抵</span>
          </div>
          <button
            type="button"
            onClick={() =>
              onOpenQuickAdd({
                type: 'debt',
                debtDirection: 'i_lent',
              })
            }
            className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增</span>
          </button>
        </div>

        <div className="mt-3.5 grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-2xl bg-slate-800/90">
            <div className="text-[11px] text-slate-400">應收</div>
            <div className="text-sm font-mono font-bold tabular-nums text-emerald-400 mt-0.5">
              {totalReceivable.toLocaleString('zh-TW')}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-800/90">
            <div className="text-[11px] text-slate-400">應付</div>
            <div className="text-sm font-mono font-bold tabular-nums text-amber-400 mt-0.5">
              {totalPayable.toLocaleString('zh-TW')}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-800/90">
            <div className="text-[11px] text-slate-400">呆帳</div>
            <div className="text-sm font-mono font-bold tabular-nums text-slate-400 mt-0.5">
              {totalWrittenOff.toLocaleString('zh-TW')}
            </div>
          </div>
        </div>
      </div>

      {/* Default Settlement Account Selector */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-3.5 py-2.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-300">
          結清帳戶
        </span>
        <select
          value={settleAccountId}
          onChange={(e) => setSettleAccountId(e.target.value)}
          className="min-h-[36px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
        >
          {activeAccounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Person Debt Cards */}
      {personDebts.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 py-10 text-center">
          <p className="text-xs font-semibold text-slate-400">尚無代墊往來</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {personDebts.map((person) => {
            const isExpanded = expandedPerson === person.personName;
            const isSettled = person.netBalance === 0;
            const isReceivable = person.netBalance > 0;

            return (
              <div
                key={person.personName}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden"
              >
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {person.personName}
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            isSettled
                              ? 'text-slate-400'
                              : isReceivable
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          · {isSettled ? '已結清' : isReceivable ? '欠我' : '我欠'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        我墊 {person.iLentTotal.toLocaleString('zh-TW')} · 他墊{' '}
                        {person.theyLentTotal.toLocaleString('zh-TW')} · 已還{' '}
                        {(person.repaidToMeTotal + person.iRepaidTotal).toLocaleString('zh-TW')}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-base font-mono font-bold tabular-nums ${
                          isSettled
                            ? 'text-slate-400'
                            : isReceivable
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {formatTWD(Math.abs(person.netBalance))}
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions Row */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenQuickAdd({
                            type: 'debt',
                            personName: person.personName,
                            debtDirection: 'i_lent',
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                      >
                        +我墊
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onOpenQuickAdd({
                            type: 'debt',
                            personName: person.personName,
                            debtDirection: 'they_lent',
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                      >
                        +他墊
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {!isSettled && (
                        <>
                          <button
                            type="button"
                            onClick={() => onSettleDebt(person, settleAccountId)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>結清</span>
                          </button>
                          {isReceivable && (
                            <button
                              type="button"
                              onClick={() => onWriteOffBadDebt(person)}
                              className="px-2 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/70 text-rose-600 dark:text-rose-400 text-xs font-semibold"
                            >
                              呆帳
                            </button>
                          )}
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPerson(isExpanded ? null : person.personName)
                        }
                        className="p-1.5 rounded-lg text-slate-400"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-200/50 dark:divide-slate-700/50">
                    {person.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="py-2 flex items-center justify-between text-xs gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {tx.type === 'debt'
                              ? tx.debtDirection === 'i_lent'
                                ? '我墊'
                                : '他墊'
                              : tx.isBadDebtWriteOff
                              ? '呆帳'
                              : '還款'}
                            {tx.note ? ` · ${tx.note}` : ''}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">{tx.date}</div>
                        </div>
                        <div className="font-mono font-bold tabular-nums text-slate-900 dark:text-white shrink-0">
                          {formatTWD(tx.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
