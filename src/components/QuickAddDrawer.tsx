import React, { useEffect, useState } from 'react';
import {
  Check,
  Divide,
  Layers,
  Plus,
  SlidersHorizontal,
  UserPlus,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  Account,
  Category,
  QuickTemplate,
  Transaction,
  TransactionType,
} from '../types';
import { formatPartyDisplayName } from '../calculations';
import { getTodayDateString } from '../storage';
import { CategoryIcon, DatePickerButton } from './SharedUI';

export interface QuickAddInitialPreset {
  type?: TransactionType;
  accountId?: string;
  toAccountId?: string;
  categoryId?: string;
  incomeKind?: 'fixed' | 'variable';
  payerName?: string;     // 'SELF' 或聯絡人姓名
  debtorName?: string;    // 'SELF' 或聯絡人姓名
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
  templates: QuickTemplate[];
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
  templates,
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

  // =========================================================
  // 升級版「代墊拆帳 / 還款」三步驟狀態
  // =========================================================
  // contactPool: 動態維護可選聯絡人池（合併歷史聯絡人與當下新增的聯絡人，嚴格去重）
  const [contactPool, setContactPool] = useState<string[]>([]);
  // 步驟 1: 誰付的錢？ ('SELF' 或聯絡人姓名)
  const [payerName, setPayerName] = useState<string>('SELF');
  const [newPayerInput, setNewPayerInput] = useState<string>('');
  const [isAddingCustomPayer, setIsAddingCustomPayer] = useState<boolean>(false);

  // 步驟 3: 誰要分攤？ (已選中的分攤名單陣列，嚴格防重複！元素為 'SELF' 或聯絡人姓名)
  const [selectedDebtors, setSelectedDebtors] = useState<string[]>([]);
  // 智能分攤模式：'equal' (自動均分，預設) | 'custom' (自訂金額)
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  // 自訂金額 Map: key 為參與者 ('SELF' 或姓名), value 為輸入字串
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  // 新增分攤聯絡人輸入框
  const [newDebtorInput, setNewDebtorInput] = useState<string>('');

  // 還款專用受款人 ('SELF' 或聯絡人姓名)
  const [repayReceiverName, setRepayReceiverName] = useState<string>('SELF');

  // 分期設定
  const [enableInstallment, setEnableInstallment] = useState<boolean>(false);
  const [installmentTotal, setInstallmentTotal] = useState<string>('3');
  const [autoGenerateAllPeriods, setAutoGenerateAllPeriods] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    // 初始化聯絡人池（去重且排除 'SELF' 與 '我'）
    const cleanPeople = Array.from(
      new Set(
        existingPeople
          .map((p) => p.trim())
          .filter((p) => p.length > 0 && p !== 'SELF' && p !== '我')
      )
    );

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountStr(String(editingTransaction.amount));
      setDate(editingTransaction.date);
      setAccountId(editingTransaction.accountId || activeAccounts[0]?.id || '');
      setToAccountId(
        editingTransaction.toAccountId || activeAccounts[1]?.id || activeAccounts[0]?.id || ''
      );
      setCategoryId(editingTransaction.categoryId || activeCategories[0]?.id || '');
      setIncomeKind(editingTransaction.incomeKind || 'variable');
      setNote(editingTransaction.note);

      const resolvedPayer =
        editingTransaction.payerName ||
        (editingTransaction.debtDirection === 'they_lent'
          ? editingTransaction.personName || cleanPeople[0] || '朋友'
          : 'SELF');
      const resolvedDebtor =
        editingTransaction.debtorName ||
        (editingTransaction.debtDirection === 'they_lent'
          ? 'SELF'
          : editingTransaction.personName || cleanPeople[0] || '朋友');

      if (resolvedPayer !== 'SELF' && !cleanPeople.includes(resolvedPayer)) {
        cleanPeople.push(resolvedPayer);
      }
      if (resolvedDebtor !== 'SELF' && !cleanPeople.includes(resolvedDebtor)) {
        cleanPeople.push(resolvedDebtor);
      }

      setContactPool(cleanPeople);
      setPayerName(resolvedPayer);
      setSelectedDebtors([resolvedDebtor]);
      setRepayReceiverName(resolvedDebtor);
      setSplitMode('equal');
      setCustomAmounts({ [resolvedDebtor]: String(editingTransaction.amount) });
      setIsAddingCustomPayer(false);
      setNewPayerInput('');
      setNewDebtorInput('');
      setEnableInstallment(Boolean(editingTransaction.installmentTotal));
      setInstallmentTotal(String(editingTransaction.installmentTotal || 3));
      setAutoGenerateAllPeriods(false);
      return;
    }

    const initType = preset?.type || 'expense';
    setType(initType);
    const initAmtStr = preset?.amount ? String(preset.amount) : '';
    setAmountStr(initAmtStr);
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

    // 解析預設付款人與分攤對象
    let initPayer = preset?.payerName || 'SELF';
    let initDebtor = preset?.debtorName || '';

    if (!preset?.payerName && !preset?.debtorName && preset?.personName) {
      if (preset.debtDirection === 'they_lent') {
        initPayer = preset.personName;
        initDebtor = 'SELF';
      } else {
        initPayer = 'SELF';
        initDebtor = preset.personName;
      }
    }

    if (initPayer !== 'SELF' && !cleanPeople.includes(initPayer)) {
      cleanPeople.push(initPayer);
    }
    if (initDebtor && initDebtor !== 'SELF' && !cleanPeople.includes(initDebtor)) {
      cleanPeople.push(initDebtor);
    }

    setContactPool(cleanPeople);
    setPayerName(initPayer);

    const defaultDebtorList = initDebtor
      ? [initDebtor]
      : initPayer === 'SELF'
      ? cleanPeople[0]
        ? [cleanPeople[0]]
        : []
      : ['SELF'];

    setSelectedDebtors(defaultDebtorList);
    setRepayReceiverName(
      initDebtor || (initPayer === 'SELF' ? cleanPeople[0] || '' : 'SELF')
    );
    setSplitMode('equal');
    setCustomAmounts(
      defaultDebtorList.length === 1 && initAmtStr
        ? { [defaultDebtorList[0]]: initAmtStr }
        : {}
    );
    setIsAddingCustomPayer(false);
    setNewPayerInput('');
    setNewDebtorInput('');
    setEnableInstallment(false);
    setInstallmentTotal('6');
    setAutoGenerateAllPeriods(false);
  }, [isOpen, editingTransaction, preset, enableBusinessModule]);

  if (!isOpen) return null;

  const filteredCategories = activeCategories.filter(
    (c) => c.type === (type === 'income' ? 'income' : 'expense')
  );

  // 嚴格區分支出與收入快捷範本
  const matchingTemplates =
    type === 'expense' || type === 'income'
      ? templates.filter((tpl) => tpl.type === type)
      : [];

  const handleTypeSwitch = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'expense' || newType === 'income' || newType === 'debt') {
      const targetCatType = newType === 'income' ? 'income' : 'expense';
      const list = activeCategories.filter((c) => c.type === targetCatType);
      if (!list.some((c) => c.id === categoryId)) {
        setCategoryId(list[0]?.id || '');
      }
    }
  };

  const addQuickAmount = (delta: number) => {
    const current = parseFloat(amountStr) || 0;
    const nextStr = String(current + delta);
    setAmountStr(nextStr);
  };

  const applyQuickTemplate = (tpl: QuickTemplate) => {
    setType(tpl.type);
    setAmountStr(String(tpl.amount));
    setCategoryId(tpl.categoryId);
    if (tpl.accountId && activeAccounts.some((a) => a.id === tpl.accountId)) {
      setAccountId(tpl.accountId);
    }
    setNote(tpl.title);
  };

  // 正規化聯絡人名稱：若輸入「我」或「SELF」統一轉為 'SELF'
  const normalizePersonToken = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (trimmed === '我' || trimmed.toUpperCase() === 'SELF') return 'SELF';
    return trimmed;
  };

  // 步驟 1：新增自訂付款人
  const handleConfirmNewPayer = () => {
    const token = normalizePersonToken(newPayerInput);
    if (!token) return;
    if (token !== 'SELF' && !contactPool.includes(token)) {
      setContactPool((prev) => [...prev, token]);
    }
    setPayerName(token);
    setNewPayerInput('');
    setIsAddingCustomPayer(false);
  };

  // 步驟 3：切換分攤對象（嚴格防重複：已選則移除、未選則加入）
  const handleToggleDebtor = (personToken: string) => {
    setSelectedDebtors((prev) => {
      const exists = prev.includes(personToken);
      if (exists) {
        return prev.filter((p) => p !== personToken);
      } else {
        return [...prev, personToken];
      }
    });
  };

  // 步驟 3：透過輸入框新增聯絡人並直接選中（若已存在則直接選中，絕不重複新增）
  const handleAddNewDebtorFromInput = () => {
    const token = normalizePersonToken(newDebtorInput);
    if (!token) return;

    if (token !== 'SELF' && !contactPool.includes(token)) {
      setContactPool((prev) => [...prev, token]);
    }

    setSelectedDebtors((prev) => (prev.includes(token) ? prev : [...prev, token]));
    setNewDebtorInput('');
  };

  // 計算自動均分或自訂分攤金額
  const totalAmountNum = Math.round(parseFloat(amountStr) || 0);
  const debtorCount = selectedDebtors.length;

  const computedAllocations: Record<string, number> = {};
  if (type === 'debt' && debtorCount > 0) {
    if (splitMode === 'equal') {
      const baseShare = debtorCount > 0 ? Math.floor(totalAmountNum / debtorCount) : 0;
      const remainder = totalAmountNum - baseShare * debtorCount;
      // 除不盡的尾數優先歸入付款人（若付款人在分攤名單內），否則歸入第一位分攤者
      const remainderTarget = selectedDebtors.includes(payerName)
        ? payerName
        : selectedDebtors[0];

      for (const person of selectedDebtors) {
        computedAllocations[person] =
          baseShare + (person === remainderTarget ? remainder : 0);
      }
    } else {
      for (const person of selectedDebtors) {
        computedAllocations[person] = Math.max(
          0,
          Math.round(parseFloat(customAmounts[person] || '0') || 0)
        );
      }
    }
  }

  const allocatedSum = Object.values(computedAllocations).reduce((s, v) => s + v, 0);
  const remainingDiff = totalAmountNum - allocatedSum;

  // 檢核代墊拆帳是否可送出
  // 注意：若只有 1 人分攤，該人不可與付款人相同（例如「我」幫「我」代墊無意義，除非多人含自己分攤）
  const isSingleSelfToSelf =
    type === 'debt' &&
    selectedDebtors.length === 1 &&
    selectedDebtors[0] === payerName;

  const isDebtSplitValid =
    type !== 'debt' ||
    (totalAmountNum > 0 &&
      selectedDebtors.length > 0 &&
      !isSingleSelfToSelf &&
      allocatedSum === totalAmountNum &&
      selectedDebtors.some((d) => d !== payerName && (computedAllocations[d] || 0) > 0));

  // 是否需要顯示「我的個人帳戶」選單？
  // 嚴格帳務隔離：
  // - 一般支出/收入/轉帳：必選帳戶
  // - 代墊 (type === 'debt')：只有當付款人是「我 ('SELF')」時才顯示我的付款帳戶！當付款人不是我時自動隱藏。
  // - 還款 (type === 'repay')：只有當付款人或收款人其中一方是「我 ('SELF')」時才顯示我的帳戶！
  const requiresMyAccount =
    type === 'expense' ||
    type === 'income' ||
    type === 'transfer' ||
    (type === 'debt' && payerName === 'SELF') ||
    (type === 'repay' && (payerName === 'SELF' || repayReceiverName === 'SELF'));

  // 若分攤清單中包含「我 ('SELF')」，自動顯示個人消費分類選單
  const debtIncludesSelfShare =
    type === 'debt' &&
    selectedDebtors.includes('SELF') &&
    (computedAllocations['SELF'] || 0) > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = Math.round(parseFloat(amountStr));
    if (!parsedAmount || parsedAmount <= 0) return;
    if (requiresMyAccount && !accountId) return;

    if (editingTransaction) {
      if (type === 'debt') {
        const targetDebtor = selectedDebtors[0] || '朋友';
        const updated: Transaction = {
          ...editingTransaction,
          type: 'debt',
          amount: parsedAmount,
          date,
          accountId: payerName === 'SELF' ? accountId : '',
          categoryId: targetDebtor === 'SELF' ? categoryId : undefined,
          payerName,
          debtorName: targetDebtor,
          personName:
            payerName === 'SELF'
              ? targetDebtor
              : targetDebtor === 'SELF'
              ? payerName
              : `${payerName}→${targetDebtor}`,
          debtDirection:
            payerName === 'SELF'
              ? 'i_lent'
              : targetDebtor === 'SELF'
              ? 'they_lent'
              : undefined,
          note: note.trim(),
        };
        onSaveTransactions([updated], true);
        onClose();
        return;
      }

      if (type === 'repay') {
        const updated: Transaction = {
          ...editingTransaction,
          type: 'repay',
          amount: parsedAmount,
          date,
          accountId:
            payerName === 'SELF' || repayReceiverName === 'SELF' ? accountId : '',
          payerName,
          debtorName: repayReceiverName,
          personName:
            payerName === 'SELF'
              ? repayReceiverName
              : repayReceiverName === 'SELF'
              ? payerName
              : `${payerName}→${repayReceiverName}`,
          debtDirection:
            repayReceiverName === 'SELF'
              ? 'i_lent'
              : payerName === 'SELF'
              ? 'they_lent'
              : undefined,
          note: note.trim(),
        };
        onSaveTransactions([updated], true);
        onClose();
        return;
      }

      const updated: Transaction = {
        ...editingTransaction,
        type,
        amount: parsedAmount,
        date,
        accountId,
        toAccountId: type === 'transfer' ? toAccountId : editingTransaction.toAccountId,
        categoryId: type === 'expense' || type === 'income' ? categoryId : undefined,
        incomeKind: type === 'income' ? incomeKind : undefined,
        note: note.trim(),
      };
      onSaveTransactions([updated], true);
      onClose();
      return;
    }

    // =========================================================
    // 新增「代墊拆帳」送出邏輯（支援 我<->他人、他人<->我、他人A<->他人B）
    // =========================================================
    if (type === 'debt') {
      if (!isDebtSplitValid) return;
      const generatedTxs: Transaction[] = [];
      const baseNote = note.trim();
      const payerDisplay = formatPartyDisplayName(payerName);

      selectedDebtors.forEach((debtor, idx) => {
        const shareAmt = computedAllocations[debtor] || 0;
        if (shareAmt <= 0) return;

        // 情況 A：付款人是「我」，而分攤人也是「我」 -> 直接拆出一筆我的個人日常支出 (expense)
        if (payerName === 'SELF' && debtor === 'SELF') {
          generatedTxs.push({
            id: `tx_${Date.now()}_self_${idx}`,
            type: 'expense',
            amount: shareAmt,
            date,
            accountId,
            categoryId: categoryId || activeCategories[0]?.id,
            note: baseNote ? `${baseNote} (個人分攤)` : '代墊拆帳 (個人分攤)',
          });
          return;
        }

        // 情況 B：付款人是「他人 A」，而分攤人也是「他人 A」自己 -> 他人自己的消費不屬於代墊欠款，直接略過不記帳
        if (payerName === debtor) {
          return;
        }

        // 情況 C：payerName !== debtor (跨人代墊：我幫B墊、A幫我墊、或 A幫B墊)
        const debtorDisplay = formatPartyDisplayName(debtor);
        const involvesMe = payerName === 'SELF' || debtor === 'SELF';

        generatedTxs.push({
          id: `tx_${Date.now()}_debt_${idx}`,
          type: 'debt',
          amount: shareAmt,
          date,
          // 只有當「我」是付款人時才綁定我的帳戶扣款；他人付款時 accountId 為空字串
          accountId: payerName === 'SELF' ? accountId : '',
          // 當別人幫「我」代墊時，綁定我的個人消費分類，使該筆計入我的本月個人支出
          categoryId:
            debtor === 'SELF' ? categoryId || activeCategories[0]?.id : undefined,
          payerName,
          debtorName: debtor,
          personName: involvesMe
            ? payerName === 'SELF'
              ? debtor
              : payerName
            : `${payerDisplay}→${debtorDisplay}`,
          debtDirection:
            payerName === 'SELF'
              ? 'i_lent'
              : debtor === 'SELF'
              ? 'they_lent'
              : undefined,
          note:
            baseNote ||
            (payerName === 'SELF'
              ? `幫 ${debtorDisplay} 代墊`
              : debtor === 'SELF'
              ? `${payerDisplay} 幫我代墊`
              : `${payerDisplay} 幫 ${debtorDisplay} 代墊`),
        });
      });

      if (generatedTxs.length > 0) {
        onSaveTransactions(generatedTxs, false);
        onClose();
      }
      return;
    }

    // =========================================================
    // 新增「還款」送出邏輯（支援 我還人、人還我、他人A還他人B）
    // =========================================================
    if (type === 'repay') {
      if (!payerName || !repayReceiverName || payerName === repayReceiverName) return;
      const involvesMe = payerName === 'SELF' || repayReceiverName === 'SELF';
      const payerDisp = formatPartyDisplayName(payerName);
      const receiverDisp = formatPartyDisplayName(repayReceiverName);

      const repayTx: Transaction = {
        id: `tx_${Date.now()}_repay`,
        type: 'repay',
        amount: parsedAmount,
        date,
        accountId: involvesMe ? accountId : '',
        payerName,
        debtorName: repayReceiverName,
        personName: involvesMe
          ? payerName === 'SELF'
            ? repayReceiverName
            : payerName
          : `${payerDisp}→${receiverDisp}`,
        debtDirection:
          repayReceiverName === 'SELF'
            ? 'i_lent'
            : payerName === 'SELF'
            ? 'they_lent'
            : undefined,
        note: note.trim() || `${payerDisp} 還款給 ${receiverDisp}`,
      };

      onSaveTransactions([repayTx], false);
      onClose();
      return;
    }

    // =========================================================
    // 分期付款送出邏輯
    // =========================================================
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

    // 一般支出 / 收入 / 轉帳
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      type,
      amount: parsedAmount,
      date,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      categoryId: type === 'expense' || type === 'income' ? categoryId : undefined,
      incomeKind: type === 'income' ? incomeKind : undefined,
      note: note.trim() || (type === 'transfer' ? '轉帳' : ''),
    };

    onSaveTransactions([newTx], false);
    onClose();
  };

  // 所有可選參與者清單（第一個永遠是 'SELF' 代表「我」，接著是所有聯絡人）
  const allParticipants = ['SELF', ...contactPool];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-t-3xl bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-2xl max-h-[92vh] flex flex-col">
        {/* Top Handle & Header */}
        <div className="pt-2.5 pb-2 px-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-1.5" />
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {editingTransaction ? '編輯紀錄' : '新增記帳'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600"
              aria-label="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Transaction Type Segmented Bar */}
          <div className="mt-1 grid grid-cols-5 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(
              [
                { id: 'expense', label: '支出' },
                { id: 'income', label: '收入' },
                { id: 'transfer', label: '轉帳' },
                { id: 'debt', label: '代墊拆帳' },
                { id: 'repay', label: '還款' },
              ] as { id: TransactionType; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTypeSwitch(tab.id)}
                className={`min-h-[40px] text-xs font-semibold rounded-lg transition whitespace-nowrap ${
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
          {/* Quick Templates Strip (strictly filtered by expense vs income) */}
          {!editingTransaction && matchingTemplates.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {matchingTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyQuickTemplate(tpl)}
                  className="min-h-[38px] px-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-1 shrink-0"
                >
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>{tpl.title}</span>
                  <span className="font-mono">${tpl.amount}</span>
                </button>
              ))}
            </div>
          )}

          {/* =========================================================
              代墊拆帳 專屬三步驟流暢體驗 (type === 'debt')
             ========================================================= */}
          {type === 'debt' ? (
            <div className="space-y-3.5">
              {/* 步驟 1：誰付的錢？（付款人） */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    1. 誰先付的錢？（付款人）
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    付款：{formatPartyDisplayName(payerName)}
                  </span>
                </div>

                {/* 付款人快選 Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {allParticipants.map((person) => {
                    const isSelected = payerName === person;
                    return (
                      <button
                        key={person}
                        type="button"
                        onClick={() => setPayerName(person)}
                        className={`min-h-[42px] px-3.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 dark:bg-emerald-600 dark:border-emerald-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                        <span>{formatPartyDisplayName(person)}</span>
                      </button>
                    );
                  })}

                  {!isAddingCustomPayer ? (
                    <button
                      type="button"
                      onClick={() => setIsAddingCustomPayer(true)}
                      className="min-h-[42px] px-3 rounded-xl text-xs font-semibold border border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>其他付款人</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 w-full pt-1">
                      <input
                        type="text"
                        placeholder="輸入付款人姓名..."
                        value={newPayerInput}
                        onChange={(e) => setNewPayerInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleConfirmNewPayer();
                          }
                        }}
                        className="flex-1 min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={handleConfirmNewPayer}
                        className="min-h-[42px] px-3.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold"
                      >
                        確定
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCustomPayer(false);
                          setNewPayerInput('');
                        }}
                        className="min-h-[42px] px-2.5 rounded-xl text-xs text-slate-400"
                      >
                        取消
                      </button>
                    </div>
                  )}
                </div>

                {/* 當付款人是「我」時才顯示我的付款帳戶；他人先付時自動隱藏 */}
                {payerName === 'SELF' ? (
                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      我的付款帳戶
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
                ) : (
                  <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 px-3 py-2 rounded-xl border border-amber-200/70 dark:border-amber-800/50">
                    由「{payerName}」先墊付，不會扣除您的個人帳戶餘額。
                  </div>
                )}
              </div>

              {/* 步驟 2：總金額、日期與備註 */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    2. 總付款金額與日期
                  </span>
                  <div className="flex items-center gap-1">
                    {[100, 500, 1000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => addQuickAmount(val)}
                        className="min-h-[32px] px-2 text-[11px] font-mono font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
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
                    placeholder="0"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full pl-14 pr-4 py-2.5 text-2xl font-mono font-bold tabular-nums rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <DatePickerButton value={date} onChange={setDate} />

                <input
                  type="text"
                  placeholder="備註（例如：熱炒聚餐、演唱會門票）"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              {/* 步驟 3：誰要分攤？（智能防重複選取器） */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      3. 誰要分攤？（點擊選取，不重複）
                    </span>
                  </div>

                  {/* 智能分攤模式切換：自動均分 | 自訂金額 */}
                  <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/80 dark:bg-slate-900 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setSplitMode('equal')}
                      className={`min-h-[32px] px-2.5 rounded-md text-[11px] font-bold flex items-center gap-1 transition ${
                        splitMode === 'equal'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      <Divide className="w-3 h-3" />
                      <span>自動均分</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // 切換到自訂金額時，預填目前的均分結果方便微調
                        const nextCustom: Record<string, string> = {};
                        for (const p of selectedDebtors) {
                          nextCustom[p] = String(computedAllocations[p] || 0);
                        }
                        setCustomAmounts((prev) => ({ ...nextCustom, ...prev }));
                        setSplitMode('custom');
                      }}
                      className={`min-h-[32px] px-2.5 rounded-md text-[11px] font-bold flex items-center gap-1 transition ${
                        splitMode === 'custom'
                          ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs'
                          : 'text-slate-500'
                      }`}
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>自訂金額</span>
                    </button>
                  </div>
                </div>

                {/* 聯絡人快選區 (Chips)：已選中立即顯示打勾與高亮狀態，再次點擊即移出，嚴格防止重複加入 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {allParticipants.map((person) => {
                    const isSelected = selectedDebtors.includes(person);
                    return (
                      <button
                        key={person}
                        type="button"
                        onClick={() => handleToggleDebtor(person)}
                        className={`min-h-[42px] px-3 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{formatPartyDisplayName(person)}</span>
                      </button>
                    );
                  })}
                </div>

                {/* ＋ 新增聯絡人輸入框（若輸入已存在的姓名，直接選中該人而非重複新增） */}
                <div className="flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <UserPlus className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="輸入新聯絡人姓名加入分攤..."
                      value={newDebtorInput}
                      onChange={(e) => setNewDebtorInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewDebtorFromInput();
                        }
                      }}
                      className="w-full min-h-[42px] pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewDebtorFromInput}
                    className="min-h-[42px] px-3.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold shrink-0"
                  >
                    ＋加入
                  </button>
                </div>

                {/* 已選分攤清單明細（每人金額＋移除 × 按鈕） */}
                {selectedDebtors.length === 0 ? (
                  <div className="py-4 text-center text-xs text-rose-500 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-rose-200 dark:border-rose-900/50">
                    請點擊上方標籤選擇至少 1 位分攤對象
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedDebtors.map((person) => {
                      const shareAmt = computedAllocations[person] || 0;
                      const isPayerSelf = person === payerName;
                      return (
                        <div
                          key={person}
                          className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {formatPartyDisplayName(person)}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                isPayerSelf
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {isPayerSelf
                                ? '自己吸收'
                                : `欠 ${formatPartyDisplayName(payerName)}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {splitMode === 'equal' ? (
                              <span className="text-sm font-mono font-bold text-slate-900 dark:text-white px-2">
                                NT$ {shareAmt.toLocaleString('zh-TW')}
                              </span>
                            ) : (
                              <div className="relative w-28">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                                  $
                                </span>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min="0"
                                  value={customAmounts[person] ?? ''}
                                  onChange={(e) =>
                                    setCustomAmounts((prev) => ({
                                      ...prev,
                                      [person]: e.target.value,
                                    }))
                                  }
                                  className="w-full min-h-[38px] pl-6 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-right text-xs font-mono font-bold text-slate-900 dark:text-white"
                                />
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleToggleDebtor(person)}
                              className="min-w-[38px] min-h-[38px] rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              aria-label={`移除 ${formatPartyDisplayName(person)}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 分攤金額防呆檢核狀態列 */}
                <div
                  className={`p-2.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-between ${
                    isSingleSelfToSelf
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
                      : totalAmountNum > 0 && remainingDiff === 0 && selectedDebtors.length > 0
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300'
                  }`}
                >
                  {isSingleSelfToSelf ? (
                    <span>付款人與唯一分攤人不可同為「{formatPartyDisplayName(payerName)}」</span>
                  ) : (
                    <>
                      <span>
                        已分配 NT${allocatedSum.toLocaleString('zh-TW')} / 總額 NT$
                        {totalAmountNum.toLocaleString('zh-TW')}
                      </span>
                      <span>
                        {remainingDiff === 0
                          ? '金額吻合'
                          : remainingDiff > 0
                          ? `尚餘 NT$${remainingDiff.toLocaleString('zh-TW')}`
                          : `超出 NT$${Math.abs(remainingDiff).toLocaleString('zh-TW')}`}
                      </span>
                    </>
                  )}
                </div>

                {/* 若分攤清單中包含「我」，顯示個人消費分類選單 */}
                {debtIncludesSelfShare && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                      我的分攤份額 (NT${(computedAllocations['SELF'] || 0).toLocaleString('zh-TW')}) 計入個人支出分類：
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {filteredCategories.map((cat) => {
                        const isSelected = cat.id === categoryId;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategoryId(cat.id)}
                            className={`p-2 rounded-xl border text-left flex flex-col justify-between min-h-[52px] transition ${
                              isSelected
                                ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/60 dark:border-emerald-500 text-slate-900 dark:text-white'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <CategoryIcon
                              name={cat.icon}
                              className={`w-3.5 h-3.5 ${
                                isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'
                              }`}
                            />
                            <span className="text-[11px] font-semibold truncate w-full">
                              {cat.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* =========================================================
               一般支出 / 收入 / 轉帳 / 還款 表單
               ========================================================= */
            <>
              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    {type === 'expense' && enableInstallment ? '分期總額' : '金額'}
                  </label>
                  <div className="flex items-center gap-1">
                    {[100, 500, 1000, 5000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => addQuickAmount(val)}
                        className="min-h-[32px] px-2 text-[11px] font-mono font-semibold rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
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

              {/* Date Picker */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  日期
                </label>
                <DatePickerButton value={date} onChange={setDate} />
              </div>

              {/* 還款專用：選擇「誰還錢」給「誰」 */}
              {type === 'repay' && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        還款人（誰出錢）
                      </label>
                      <select
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                        className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        {allParticipants.map((p) => (
                          <option key={p} value={p}>
                            {formatPartyDisplayName(p)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        收款人（還給誰）
                      </label>
                      <select
                        value={repayReceiverName}
                        onChange={(e) => setRepayReceiverName(e.target.value)}
                        className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        {allParticipants.map((p) => (
                          <option key={p} value={p}>
                            {formatPartyDisplayName(p)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {payerName === repayReceiverName && (
                    <div className="text-xs text-rose-500 font-semibold">
                      還款人與收款人不可相同
                    </div>
                  )}
                </div>
              )}

              {/* Account Selection (僅在涉及本人帳務時顯示) */}
              {requiresMyAccount && (
                <div className={type === 'transfer' ? 'grid grid-cols-2 gap-2' : ''}>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {type === 'transfer'
                        ? '轉出帳戶'
                        : type === 'income'
                        ? '存入帳戶'
                        : type === 'repay'
                        ? repayReceiverName === 'SELF'
                          ? '我的收款帳戶'
                          : '我的付款帳戶'
                        : '帳戶'}
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
                      <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
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
              )}

              {/* Income Kind Toggle */}
              {type === 'income' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIncomeKind('variable')}
                    className={`min-h-[40px] rounded-xl text-xs font-semibold border transition ${
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
                    className={`min-h-[40px] rounded-xl text-xs font-semibold border transition ${
                      incomeKind === 'fixed'
                        ? 'border-emerald-600 bg-emerald-50/70 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    固定月薪
                  </button>
                </div>
              )}

              {/* Category Grid for Expense / Income */}
              {(type === 'expense' || type === 'income') && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                    分類
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
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
                              className={`w-3.5 h-3.5 ${
                                isSelected
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : cat.isBusiness
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-500'
                              }`}
                            />
                            {enableBusinessModule && cat.isBusiness && (
                              <span className="text-[9px] font-semibold text-amber-700 dark:text-amber-400">
                                機台
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-semibold truncate w-full">
                            {cat.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Installment Helper */}
              {type === 'expense' && !editingTransaction && (
                <div className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        分期付款
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEnableInstallment(!enableInstallment)}
                      className={`min-h-[34px] px-2.5 rounded-lg text-[11px] font-semibold transition ${
                        enableInstallment
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {enableInstallment ? '已開啟' : '單筆'}
                    </button>
                  </div>

                  {enableInstallment && (
                    <div className="mt-2 pt-2 border-t border-slate-200/70 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-slate-500">期數</span>
                        <div className="flex items-center gap-1">
                          {['3', '6', '12', '24'].map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => setInstallmentTotal(p)}
                              className={`min-h-[34px] px-2.5 rounded-lg text-[11px] font-mono font-semibold ${
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
                          className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600"
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
                  className="w-full min-h-[42px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={
              (type === 'debt' && !isDebtSplitValid) ||
              (type === 'repay' && payerName === repayReceiverName)
            }
            className="w-full min-h-[44px] rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 active:scale-[0.99] transition disabled:opacity-40 disabled:pointer-events-none"
          >
            <Check className="w-4 h-4" />
            <span>
              {editingTransaction
                ? '儲存修改'
                : type === 'debt' && !isDebtSplitValid
                ? '請確認分攤對象與金額吻合'
                : '完成記帳'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
