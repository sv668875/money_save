import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  ChevronUp,
  Plus,
  Users,
  X,
} from 'lucide-react';
import {
  formatPartyDisplayName,
  formatTWD,
  MultiPartyDebtOverview,
  PairwiseDebtRelation,
  resolveDebtParties,
} from '../calculations';
import { QuickAddInitialPreset } from './QuickAddDrawer';
import { DatePickerButton } from './SharedUI';
import { getTodayDateString } from '../storage';
import { Account } from '../types';

interface DebtsTabProps {
  debtOverview: MultiPartyDebtOverview;
  accounts: Account[];
  enableBusinessModule: boolean;
  onOpenQuickAdd: (preset: QuickAddInitialPreset) => void;
  onConfirmPairRepayment: (
    relation: PairwiseDebtRelation,
    accountId: string,
    amount: number,
    date: string,
    note: string
  ) => void;
  onWriteOffBadDebt: (relation: PairwiseDebtRelation) => void;
}

type DebtSubView = 'mine' | 'others' | 'summary';
type StatusFilter = 'unsettled' | 'settled' | 'all';

export const DebtsTab: React.FC<DebtsTabProps> = ({
  debtOverview,
  accounts,
  enableBusinessModule,
  onOpenQuickAdd,
  onConfirmPairRepayment,
  onWriteOffBadDebt,
}) => {
  const activeAccounts = accounts.filter(
    (a) =>
      !a.archived &&
      (enableBusinessModule || (!a.isBusinessWorkingCapital && a.type !== 'business_cashbox'))
  );

  const [subView, setSubView] = useState<DebtSubView>('mine');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('unsettled');
  const [expandedPairKey, setExpandedPairKey] = useState<string | null>(
    debtOverview.allRelations[0]?.pairKey || null
  );

  // 智慧結清 / 部分還款 Modal 狀態
  const [repayingRel, setRepayingRel] = useState<PairwiseDebtRelation | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [repayAmountStr, setRepayAmountStr] = useState<string>('');
  const [repayDate, setRepayDate] = useState<string>(getTodayDateString());
  const [repayNote, setRepayNote] = useState<string>('');

  const openRepayModal = (rel: PairwiseDebtRelation, isPartial = false) => {
    setRepayingRel(rel);
    setSelectedAccountId(activeAccounts[0]?.id || accounts[0]?.id || '');
    setRepayAmountStr(
      isPartial
        ? String(Math.max(100, Math.round(rel.absNetAmount / 2)))
        : String(rel.absNetAmount)
    );
    setRepayDate(getTodayDateString());
    setRepayNote(isPartial ? '部分還款' : '還款結清');
  };

  const handleRepaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayingRel) return;
    if (repayingRel.involvesSelf && !selectedAccountId) return;
    const amt = Math.round(parseFloat(repayAmountStr) || 0);
    if (amt <= 0) return;

    onConfirmPairRepayment(
      repayingRel,
      repayingRel.involvesSelf ? selectedAccountId : '',
      amt,
      repayDate,
      repayNote.trim() || '還款結清'
    );
    setRepayingRel(null);
  };

  const renderRelationCard = (rel: PairwiseDebtRelation) => {
    const isExpanded = expandedPairKey === rel.pairKey;
    const partyADisp = formatPartyDisplayName(rel.partyA);
    const partyBDisp = formatPartyDisplayName(rel.partyB);
    const creditorDisp = rel.creditor ? formatPartyDisplayName(rel.creditor) : '';
    const debtorDisp = rel.debtor ? formatPartyDisplayName(rel.debtor) : '';

    // 判斷對於「我」而言是應收、應付，或是他人之間
    const isMyReceivable = rel.involvesSelf && rel.creditor === 'SELF';
    const isMyPayable = rel.involvesSelf && rel.debtor === 'SELF';

    return (
      <div
        key={rel.pairKey}
        className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-3.5">
          {/* Top Summary Line */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                {rel.isSettled ? (
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {partyADisp} ↔ {partyBDisp}
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                    <span>{debtorDisp}</span>
                    <span className="text-xs font-semibold text-slate-400">欠</span>
                    <span>{creditorDisp}</span>
                  </div>
                )}

                {/* 狀態標籤：未結清 / 已結清 */}
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                    rel.isSettled
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      : isMyReceivable
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                      : isMyPayable
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                  }`}
                >
                  {rel.isSettled
                    ? '已結清'
                    : isMyReceivable
                    ? '未結清 · 應收'
                    : isMyPayable
                    ? '未結清 · 應付'
                    : '未結清 · 他人互欠'}
                </span>
              </div>

              <div className="text-[11px] text-slate-400 font-mono mt-1">
                {partyADisp}墊 {rel.aPaidForBTotal.toLocaleString('zh-TW')} · {partyBDisp}墊{' '}
                {rel.bPaidForATotal.toLocaleString('zh-TW')} · 已還{' '}
                {(rel.aRepaidBTotal + rel.bRepaidATotal).toLocaleString('zh-TW')}
              </div>
            </div>

            <div className="text-right shrink-0">
              <div
                className={`text-base font-mono font-bold tabular-nums ${
                  rel.isSettled
                    ? 'text-slate-400'
                    : isMyReceivable
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : isMyPayable
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-sky-600 dark:text-sky-400'
                }`}
              >
                {formatTWD(rel.absNetAmount)}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onOpenQuickAdd({
                    type: 'debt',
                    payerName: rel.partyA,
                    debtorName: rel.partyB,
                  })
                }
                className="min-h-[36px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 transition whitespace-nowrap"
              >
                +{partyADisp}墊
              </button>
              <button
                type="button"
                onClick={() =>
                  onOpenQuickAdd({
                    type: 'debt',
                    payerName: rel.partyB,
                    debtorName: rel.partyA,
                  })
                }
                className="min-h-[36px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 transition whitespace-nowrap"
              >
                +{partyBDisp}墊
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {!rel.isSettled && (
                <>
                  <button
                    type="button"
                    onClick={() => openRepayModal(rel, true)}
                    className="min-h-[36px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold whitespace-nowrap"
                  >
                    部分還款
                  </button>
                  <button
                    type="button"
                    onClick={() => openRepayModal(rel, false)}
                    className="min-h-[36px] px-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>結清</span>
                  </button>
                  {isMyReceivable && (
                    <button
                      type="button"
                      onClick={() => onWriteOffBadDebt(rel)}
                      className="min-h-[36px] px-2 rounded-xl border border-rose-200 dark:border-rose-800/70 text-rose-600 dark:text-rose-400 text-xs font-semibold whitespace-nowrap"
                    >
                      呆帳
                    </button>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={() => setExpandedPairKey(isExpanded ? null : rel.pairKey)}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="展開歷史明細"
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

        {/* Expanded Transaction History */}
        {isExpanded && (
          <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-200/50 dark:divide-slate-700/50">
            {rel.transactions.map((tx) => {
              const accName = tx.accountId
                ? accounts.find((a) => a.id === tx.accountId)?.name || ''
                : '';
              const parties = resolveDebtParties(tx);
              const pDisp = parties ? formatPartyDisplayName(parties.payer) : '';
              const dDisp = parties ? formatPartyDisplayName(parties.debtor) : '';

              const badgeLabel =
                tx.type === 'debt'
                  ? `${pDisp}幫${dDisp}墊`
                  : tx.isBadDebtWriteOff
                  ? '呆帳核銷'
                  : `${pDisp}還${dDisp}`;

              return (
                <div
                  key={tx.id}
                  className="py-2 flex items-center justify-between text-xs gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      <span>{badgeLabel}</span>
                      {tx.note ? ` · ${tx.note}` : ''}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      {tx.date} {accName ? `· ${accName}` : '· 不影響個人帳戶'}
                    </div>
                  </div>
                  <div className="font-mono font-bold tabular-nums text-slate-900 dark:text-white shrink-0">
                    {formatTWD(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const filteredSummaryRelations = debtOverview.allRelations.filter((rel) => {
    if (statusFilter === 'unsettled') return !rel.isSettled;
    if (statusFilter === 'settled') return rel.isSettled;
    return true;
  });

  return (
    <div className="space-y-3.5">
      {/* =========================================================
          頂部綜合總計儀表板（我的帳務總計 ＋ 全體/第三方統計）
         ========================================================= */}
      <div className="rounded-3xl bg-slate-900 text-white p-4.5 shadow-md border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">多方代墊與借還款中心</span>
          </div>
          <button
            type="button"
            onClick={() =>
              onOpenQuickAdd({
                type: 'debt',
                payerName: 'SELF',
              })
            }
            className="min-h-[38px] px-3.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 hover:bg-emerald-500 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增代墊</span>
          </button>
        </div>

        {/* 我的帳務總計 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-2xl bg-slate-800/90">
            <div className="text-[11px] text-slate-400">別人欠我 (應收)</div>
            <div className="text-sm font-mono font-bold tabular-nums text-emerald-400 mt-0.5">
              {debtOverview.myTotalReceivable.toLocaleString('zh-TW')}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-800/90">
            <div className="text-[11px] text-slate-400">我欠別人 (應付)</div>
            <div className="text-sm font-mono font-bold tabular-nums text-amber-400 mt-0.5">
              {debtOverview.myTotalPayable.toLocaleString('zh-TW')}
            </div>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-800/90">
            <div className="text-[11px] text-slate-400">我的淨結算</div>
            <div
              className={`text-sm font-mono font-bold tabular-nums mt-0.5 ${
                debtOverview.myNetSettlement >= 0 ? 'text-white' : 'text-rose-400'
              }`}
            >
              {debtOverview.myNetSettlement >= 0 ? '+' : ''}
              {debtOverview.myNetSettlement.toLocaleString('zh-TW')}
            </div>
          </div>
        </div>

        {/* 全體 / 第三方統計 */}
        <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            他人之間 (A↔B) 未結清：
            <strong className="font-mono text-sky-400 ml-1">
              {formatTWD(debtOverview.thirdPartyUnsettledTotal)}
            </strong>
          </div>
          <div className="text-slate-400">
            未結清關係：
            <strong className="font-mono text-white ml-1">
              {debtOverview.totalUnsettledRelationsCount} 筆
            </strong>
          </div>
        </div>
      </div>

      {/* =========================================================
          分頁切換視圖：與我有關 | 他人之間 (A ↔ B) | 綜合總覽
         ========================================================= */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        {(
          [
            {
              id: 'mine',
              label: `與我有關 (${debtOverview.myRelations.length})`,
            },
            {
              id: 'others',
              label: `他人之間 (${debtOverview.thirdPartyRelations.length})`,
            },
            {
              id: 'summary',
              label: '綜合總覽',
            },
          ] as { id: DebtSubView; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubView(tab.id)}
            className={`min-h-[42px] px-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              subView === tab.id
                ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-2xs'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* =========================================================
          視圖 1：與我有關 (Self ↔ Person)
         ========================================================= */}
      {subView === 'mine' && (
        <div className="space-y-2.5">
          {debtOverview.myRelations.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 py-10 text-center">
              <p className="text-xs font-semibold text-slate-400">尚無與我有關的代墊往來</p>
            </div>
          ) : (
            debtOverview.myRelations.map(renderRelationCard)
          )}
        </div>
      )}

      {/* =========================================================
          視圖 2：他人之間 (A ↔ B)
         ========================================================= */}
      {subView === 'others' && (
        <div className="space-y-2.5">
          <div className="px-3.5 py-2.5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/60 flex items-center justify-between gap-2">
            <span className="text-xs text-sky-900 dark:text-sky-200 font-medium">
              記錄朋友之間的代墊互欠，獨立於您的個人資產之外。
            </span>
            <button
              type="button"
              onClick={() =>
                onOpenQuickAdd({
                  type: 'debt',
                  payerName: debtOverview.allContactNames[0] || 'SELF',
                  debtorName: debtOverview.allContactNames[1] || '',
                })
              }
              className="min-h-[36px] px-2.5 rounded-xl bg-sky-600 text-white text-xs font-bold shrink-0"
            >
              ＋記一筆
            </button>
          </div>

          {debtOverview.thirdPartyRelations.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 py-10 text-center">
              <p className="text-xs font-semibold text-slate-400">尚無他人之間的代墊紀錄</p>
            </div>
          ) : (
            debtOverview.thirdPartyRelations.map(renderRelationCard)
          )}
        </div>
      )}

      {/* =========================================================
          視圖 3：綜合總覽（所有參與者淨額總計表 ＋ 狀態篩選關係清單）
         ========================================================= */}
      {subView === 'summary' && (
        <div className="space-y-3.5">
          {/* 所有參與者淨額總計表 */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                所有參與者淨額總計表
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2.5 pl-3.5 pr-2">參與者</th>
                    <th className="py-2.5 px-2 text-right">總應收</th>
                    <th className="py-2.5 px-2 text-right">總應付</th>
                    <th className="py-2.5 pl-2 pr-3.5 text-right">最終淨額</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {debtOverview.participantSummaries.map((p) => (
                    <tr
                      key={p.name}
                      className={
                        p.isSelf ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                      }
                    >
                      <td className="py-2.5 pl-3.5 pr-2 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <span>{p.displayName}</span>
                        {p.isSelf && (
                          <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-white dark:bg-emerald-600">
                            本人
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                        {p.totalReceivable.toLocaleString('zh-TW')}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-amber-600 dark:text-amber-400">
                        {p.totalPayable.toLocaleString('zh-TW')}
                      </td>
                      <td
                        className={`py-2.5 pl-2 pr-3.5 text-right font-mono font-bold tabular-nums ${
                          p.netPosition > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : p.netPosition < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {p.netPosition > 0 ? '+' : ''}
                        {p.netPosition.toLocaleString('zh-TW')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 依狀態篩選：未結清 | 已結清 | 全部 */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              全部關係明細 ({filteredSummaryRelations.length})
            </span>
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {(
                [
                  { id: 'unsettled', label: '未結清' },
                  { id: 'settled', label: '已結清' },
                  { id: 'all', label: '全部' },
                ] as { id: StatusFilter; label: string }[]
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`min-h-[36px] px-3 rounded-lg text-xs font-bold transition ${
                    statusFilter === f.id
                      ? 'bg-slate-900 text-white dark:bg-emerald-600'
                      : 'text-slate-500'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredSummaryRelations.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 py-8 text-center">
              <p className="text-xs font-semibold text-slate-400">無符合篩選條件的關係</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredSummaryRelations.map(renderRelationCard)}
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          智慧結清 / 部分還款 Modal（自動判斷是否涉及本人帳戶）
         ========================================================= */}
      {repayingRel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {repayingRel.debtor ? formatPartyDisplayName(repayingRel.debtor) : ''} 還款給{' '}
                {repayingRel.creditor ? formatPartyDisplayName(repayingRel.creditor) : ''}
              </h3>
              <button
                type="button"
                onClick={() => setRepayingRel(null)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              目前互抵後未結清淨額：
              <strong className="font-mono text-slate-900 dark:text-white ml-1">
                {formatTWD(repayingRel.absNetAmount)}
              </strong>
            </p>

            <form onSubmit={handleRepaySubmit} className="space-y-3">
              {/* 動態帳戶欄位：若涉及「我」必選收付款帳戶；若為他人之間 (A ↔ B) 自動隱藏我的帳戶選單 */}
              {repayingRel.involvesSelf ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    {repayingRel.creditor === 'SELF'
                      ? '我的收款帳戶（錢進哪個帳戶）'
                      : '我的付款帳戶（從哪個帳戶付）'}
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    required
                    className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {activeAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200/70 dark:border-sky-800/50 text-[11px] text-sky-800 dark:text-sky-200">
                  此為「{formatPartyDisplayName(repayingRel.partyA)} ↔{' '}
                  {formatPartyDisplayName(repayingRel.partyB)}」他人之間的還款，不會影響您的個人帳戶餘額。
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    還款金額 (NT$)
                  </label>
                  <button
                    type="button"
                    onClick={() => setRepayAmountStr(String(repayingRel.absNetAmount))}
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400"
                  >
                    帶入全額結清
                  </button>
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  min="1"
                  required
                  value={repayAmountStr}
                  onChange={(e) => setRepayAmountStr(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  日期
                </label>
                <DatePickerButton value={repayDate} onChange={setRepayDate} />
              </div>

              <div>
                <input
                  type="text"
                  placeholder="備註（選填）"
                  value={repayNote}
                  onChange={(e) => setRepayNote(e.target.value)}
                  className="w-full min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-1 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRepayingRel(null)}
                  className="min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold"
                >
                  確認入帳
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
