import React, { useEffect, useState } from 'react';
import { Check, Layers, User, X } from 'lucide-react';
import { Account, Category, Transaction, TransactionType } from '../types';
import { getTodayDateString } from '../storage';
import { CategoryIcon, DatePickerButton } from './SharedUI';

export interface QuickAddInitialPreset {
  type?: TransactionType;
  accountId?: string;
  toAccountId?: string;
  categoryId?: string;
  incomeKind?: 'fixed' | 'variable';
  personName?: string;
  debtDirection?: 'i_lent' | 'they_lent';
  amount?: number;
  note?: string;
}

interface QuickAddDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  existingPeople: string[];
  enableBusinessModule: boolean;
  editingTransaction?: Transaction | null;
  preset?: QuickAddInitialPreset | null;
  onSaveTransactions: (txs: Transaction[], isEdit: boolean) => void;
}

export const QuickAddDrawer: React.FC<QuickAddDrawerProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  existingPeople,
  enableBusinessModule,
  editingTransaction,
  preset,
  onSaveTransactions,
}) => {
  const activeAccounts = accounts.filter(
    (a) =>
      !a.archived &&
      (enableBusinessModule || (!a.isBusinessWorkingCapital && a.type !== 'business_cashbox'))
  );
  const activeCategories = categories.filter(
    (c) => !c.archived && (enableBusinessModule || !c.isBusiness)
  );

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('');
  const [date, setDate] = useState<string>(getTodayDateString());
  const [accountId, setAccountId] = useState<string>(activeAccounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState<string>(
    activeAccounts[1]?.id || activeAccounts[0]?.id || ''
  );
  const [categoryId, setCategoryId] = useState<string>('');
  const [incomeKind, setIncomeKind] = useState<'fixed' | 'variable'>('variable');
  const [note, setNote] = useState<string>('');

  const [personName, setPersonName] = useState<string>('');
  const [debtDirection, setDebtDirection] = useState<'i_lent' | 'they_lent'>('i_lent');

  const [enableInstallment, setEnableInstallment] = useState<boolean>(false);
  const [installmentTotal, setInstallmentTotal] = useState<string>('3');
  const [autoGenerateAllPeriods, setAutoGenerateAllPeriods] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountStr(String(editingTransaction.amount));
      setDate(editingTransaction.date);
      setAccountId(editingTransaction.accountId);
      setToAccountId(
        editingTransaction.toAccountId || activeAccounts[1]?.id || activeAccounts[0]?.id || ''
      );
      setCategoryId(editingTransaction.categoryId || '');
      setIncomeKind(editingTransaction.incomeKind || 'variable');
      setNote(editingTransaction.note);
      setPersonName(editingTransaction.personName || '');
      setDebtDirection(editingTransaction.debtDirection || 'i_lent');
      setEnableInstallment(Boolean(editingTransaction.installmentTotal));
      setInstallmentTotal(String(editingTransaction.installmentTotal || 3));
      setAutoGenerateAllPeriods(false);
      return;
    }

    const initType = preset?.type || 'expense';
    setType(initType);
    setAmountStr(preset?.amount ? String(preset.amount) : '');
    setDate(getTodayDateString());
    setAccountId(preset?.accountId || activeAccounts[0]?.id || '');
    setToAccountId(
      preset?.toAccountId ||
        activeAccounts.find((a) => a.id !== (preset?.accountId || activeAccounts[0]?.id))?.id ||
        activeAccounts[0]?.id ||
        ''
    );

    const matchingCats = activeCategories.filter(
      (c) => c.type === (initType === 'income' ? 'income' : 'expense')
    );
    setCategoryId(preset?.categoryId || matchingCats[0]?.id || '');
    setIncomeKind(preset?.incomeKind || 'variable');
    setNote(preset?.note || '');
    setPersonName(preset?.personName || existingPeople[0] || '');
    setDebtDirection(preset?.debtDirection || 'i_lent');
    setEnableInstallment(false);
    setInstallmentTotal('6');
    setAutoGenerateAllPeriods(false);
  }, [isOpen, editingTransaction, preset, enableBusinessModule]);

  if (!isOpen) return null;

  const filteredCategories = activeCategories.filter(
    (c) => c.type === (type === 'income' ? 'income' : 'expense')
  );

  const handleTypeSwitch = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'expense' || newType === 'income') {
      const list = activeCategories.filter((c) => c.type === newType);
      if (!list.some((c) => c.id === categoryId)) {
        setCategoryId(list[0]?.id || '');
      }
    }
  };

  const addQuickAmount = (delta: number) => {
    const current = parseFloat(amountStr) || 0;
    setAmountStr(String(current + delta));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Math.round(parseFloat(amountStr));
    if (!parsedAmount || parsedAmount <= 0 || !accountId) return;

    if (editingTransaction) {
      const updated: Transaction = {
        ...editingTransaction,
        type,
        amount: parsedAmount,
        date,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : editingTransaction.toAccountId,
        categoryId: type === 'expense' || type === 'income' ? categoryId : undefined,
        incomeKind: type === 'income' ? incomeKind : undefined,
        personName: type === 'debt' || type === 'repay' ? personName.trim() : undefined,
        debtDirection: type === 'debt' || type === 'repay' ? debtDirection : undefined,
        note: note.trim(),
      };
      onSaveTransactions([updated], true);
      onClose();
      return;
    }

    if (type === 'expense' && enableInstallment) {
      const totalPeriods = Math.max(2, Math.min(60, parseInt(installmentTotal, 10) || 3));
      const groupId = `inst_${Date.now()}`;
      const perPeriodAmount = Math.round(parsedAmount / totalPeriods);

      if (autoGenerateAllPeriods) {
        const [y, m, d] = date.split('-').map(Number);
        const generated: Transaction[] = [];
        for (let i = 1; i <= totalPeriods; i++) {
          const dt = new Date(y, m - 1 + (i - 1), Math.min(28, d));
          const yy = dt.getFullYear();
          const mm = String(dt.getMonth() + 1).padStart(2, '0');
          const dd = String(dt.getDate()).padStart(2, '0');
          generated.push({
            id: `tx_${Date.now()}_${i}`,
            type: 'expense',
            amount: perPeriodAmount,
            date: `${yy}-${mm}-${dd}`,
            accountId,
            categoryId,
            note: note.trim() || '分期',
            installmentGroupId: groupId,
            installmentIndex: i,
            installmentTotal: totalPeriods,
          });
        }
        onSaveTransactions(generated, false);
      } else {
        const singleInst: Transaction = {
          id: `tx_${Date.now()}`,
          type: 'expense',
          amount: perPeriodAmount,
          date,
          accountId,
          categoryId,
          note: note.trim() || '分期',
          installmentGroupId: groupId,
          installmentIndex: 1,
          installmentTotal: totalPeriods,
        };
        onSaveTransactions([singleInst], false);
      }
      onClose();
      return;
    }

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      type,
      amount: parsedAmount,
      date,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      categoryId: type === 'expense' || type === 'income' ? categoryId : undefined,
      incomeKind: type === 'income' ? incomeKind : undefined,
      personName: type === 'debt' || type === 'repay' ? personName.trim() || '朋友' : undefined,
      debtDirection: type === 'debt' || type === 'repay' ? debtDirection : undefined,
      note:
        note.trim() ||
        (type === 'transfer'
          ? '轉帳'
          : type === 'debt'
          ? debtDirection === 'i_lent'
            ? `幫 ${personName.trim() || '朋友'} 代墊`
            : `${personName.trim() || '朋友'} 墊付`
          : type === 'repay'
          ? `${personName.trim() || '朋友'} 還款`
          : ''),
    };

    onSaveTransactions([newTx], false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Top Handle & Header */}
        <div className="pt-2.5 pb-2 px-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" />
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {editingTransaction ? '編輯紀錄' : '新增記帳'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Transaction Type Segmented Bar */}
          <div className="mt-2 grid grid-cols-5 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(
              [
                { id: 'expense', label: '支出' },
                { id: 'income', label: '收入' },
                { id: 'transfer', label: '轉帳' },
                { id: 'debt', label: '代墊' },
                { id: 'repay', label: '還款' },
              ] as { id: TransactionType; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTypeSwitch(tab.id)}
                className={`py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                  type === tab.id
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {type === 'expense' && enableInstallment ? '分期總額' : '金額'}
              </label>
              <div className="flex items-center gap-1">
                {[100, 500, 1000, 5000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => addQuickAmount(val)}
                    className="px-2 py-0.5 text-[11px] font-mono font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-mono font-bold text-slate-400">
                NT$
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="1"
                required
                autoFocus
                placeholder="0"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-14 pr-4 py-2.5 text-2xl font-mono font-bold tabular-nums rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Date Picker (No manual typing needed!) */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
              日期
            </label>
            <DatePickerButton value={date} onChange={setDate} />
          </div>

          {/* Account Selection */}
          <div className={type === 'transfer' ? 'grid grid-cols-2 gap-2.5' : ''}>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                {type === 'transfer' ? '轉出帳戶' : type === 'income' ? '存入帳戶' : '帳戶'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
              >
                {activeAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {type === 'transfer' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  轉入帳戶
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                >
                  {activeAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Income Kind Toggle */}
          {type === 'income' && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIncomeKind('variable')}
                className={`min-h-[38px] rounded-xl text-xs font-semibold border transition ${
                  incomeKind === 'variable'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                浮動收入
              </button>
              <button
                type="button"
                onClick={() => setIncomeKind('fixed')}
                className={`min-h-[38px] rounded-xl text-xs font-semibold border transition ${
                  incomeKind === 'fixed'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-500'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                固定月薪
              </button>
            </div>
          )}

          {/* Category Grid */}
          {(type === 'expense' || type === 'income') && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                分類
              </label>
              <div className="grid grid-cols-4 gap-2">
                {filteredCategories.map((cat) => {
                  const isSelected = cat.id === categoryId;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`p-2 rounded-xl border text-left flex flex-col justify-between min-h-[54px] transition ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60 dark:border-emerald-500 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <CategoryIcon
                          name={cat.icon}
                          className={`w-4 h-4 ${
                            isSelected
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : cat.isBusiness
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-500'
                          }`}
                        />
                        {enableBusinessModule && cat.isBusiness && (
                          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                            機台
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold truncate w-full mt-1">
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Debt & Repay Bidirectional Fields */}
          {(type === 'debt' || type === 'repay') && (
            <div className="space-y-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDebtDirection('i_lent')}
                  className={`min-h-[38px] px-2 rounded-xl text-xs font-semibold border transition ${
                    debtDirection === 'i_lent'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {type === 'debt' ? '我幫人墊 (應收)' : '對方還我'}
                </button>
                <button
                  type="button"
                  onClick={() => setDebtDirection('they_lent')}
                  className={`min-h-[38px] px-2 rounded-xl text-xs font-semibold border transition ${
                    debtDirection === 'they_lent'
                      ? 'border-amber-600 bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {type === 'debt' ? '別人幫墊 (應付)' : '我還對方'}
                </button>
              </div>

              <div>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="對象姓名"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full min-h-[40px] pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                {existingPeople.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {existingPeople.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPersonName(p)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                          personName === p
                            ? 'bg-slate-900 text-white dark:bg-emerald-600'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Installment Helper */}
          {type === 'expense' && !editingTransaction && (
            <div className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    分期付款
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableInstallment(!enableInstallment)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    enableInstallment
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {enableInstallment ? '已開啟' : '單筆'}
                </button>
              </div>

              {enableInstallment && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-200/70 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">期數</span>
                    <div className="flex items-center gap-1">
                      {['3', '6', '12', '24'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setInstallmentTotal(p)}
                          className={`px-2 py-1 rounded-lg text-xs font-mono font-semibold ${
                            installmentTotal === p
                              ? 'bg-slate-900 text-white dark:bg-emerald-600'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {p}期
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoGenerateAllPeriods}
                      onChange={(e) => setAutoGenerateAllPeriods(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600"
                    />
                    <span>自動展開全部 {installmentTotal} 期</span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Note Input */}
          <div>
            <input
              type="text"
              placeholder="備註（選填）"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full min-h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-2xl bg-slate-900 dark:bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-md hover:opacity-95 active:scale-[0.99] transition"
          >
            <Check className="w-4 h-4" />
            <span>{editingTransaction ? '儲存' : '完成記帳'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
