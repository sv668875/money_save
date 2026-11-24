import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CalendarClock,
  ListOrdered,
  PieChart,
  Plus,
  Settings,
  Store,
} from 'lucide-react';
import {
  AccountWithBalance,
  calculateAccountBalances,
  calculateBusinessSummary,
  calculateMonthlyOverview,
  calculateMultiPartyDebtOverview,
  calculatePersonDebts,
  calculateRecurringMetrics,
  formatPartyDisplayName,
  formatTWD,
  InstallmentGroupSummary,
  PairwiseDebtRelation,
  RecurringRuleWithMetrics,
} from './calculations';
import { BusinessTab } from './components/BusinessTab';
import { DebtsTab } from './components/DebtsTab';
import { LedgerTab } from './components/LedgerTab';
import { OverviewTab } from './components/OverviewTab';
import { OfflineIndicator } from './components/PWAComponents';
import { QuickAddDrawer, QuickAddInitialPreset } from './components/QuickAddDrawer';
import { RecurringTab } from './components/RecurringTab';
import { SettingsTab } from './components/SettingsTab';
import { BrandLogo, ConfirmModal, ToastContainer } from './components/SharedUI';
import { getCurrentMonthKey, getTodayDateString, StorageService } from './storage';
import {
  Account,
  ActiveTab,
  Category,
  ConfirmModalConfig,
  LedgerData,
  QuickTemplate,
  RecurringRule,
  ToastMessage,
  Transaction,
} from './types';

const TEMPLATES_STORAGE_KEY = 'simple_ledger_templates_v2';

export default function App() {
  const [data, setData] = useState<LedgerData>(() => StorageService.loadAll());
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [monthKey, setMonthKey] = useState<string>(() => getCurrentMonthKey());
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('simple_ledger_theme') === 'dark';
  });
  const [enableBusinessModule, setEnableBusinessModule] = useState<boolean>(() => {
    return localStorage.getItem('simple_ledger_biz_module') === 'true';
  });
  const [monthStartDay, setMonthStartDay] = useState<number>(() => {
    return parseInt(localStorage.getItem('simple_ledger_start_day') || '1', 10) || 1;
  });
  const [templates, setTemplates] = useState<QuickTemplate[]>(() => {
    try {
      const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // QuickAddDrawer state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [quickAddPreset, setQuickAddPreset] = useState<QuickAddInitialPreset | null>(null);

  // Toast & ConfirmModal state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmConfig, setConfirmConfig] = useState<ConfirmModalConfig>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    const root = document.documentElement;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('simple_ledger_theme', 'dark');
      if (themeMeta) themeMeta.setAttribute('content', '#0f172a');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('simple_ledger_theme', 'light');
      if (themeMeta) themeMeta.setAttribute('content', '#ffffff');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('simple_ledger_biz_module', enableBusinessModule ? 'true' : 'false');
    if (!enableBusinessModule && activeTab === 'business') {
      setActiveTab('overview');
    }
  }, [enableBusinessModule, activeTab]);

  const handleChangeMonthStartDay = (day: number) => {
    setMonthStartDay(day);
    localStorage.setItem('simple_ledger_start_day', String(day));
    showToast(`每月起始日已設為 ${day} 日`, 'info');
  };

  const handleAddTemplate = (tpl: QuickTemplate) => {
    setTemplates((prev) => {
      const next = [...prev, tpl];
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    showToast(`已新增${tpl.type === 'income' ? '收入' : '支出'}快捷「${tpl.title}」`);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    showToast('已移除快捷範本', 'info');
  };

  const showToast = (text: string, type: ToastMessage['type'] = 'success') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const updateData = (updater: (prev: LedgerData) => LedgerData) => {
    setData((prev) => {
      const next = updater(prev);
      StorageService.saveAll(next);
      return next;
    });
  };

  // Dynamic Calculations via pure functions
  const accountsWithBalance = useMemo(
    () => calculateAccountBalances(data.accounts, data.transactions),
    [data.accounts, data.transactions]
  );

  const multiPartyDebtOverview = useMemo(
    () => calculateMultiPartyDebtOverview(data.transactions),
    [data.transactions]
  );

  const personDebts = useMemo(
    () => calculatePersonDebts(data.transactions),
    [data.transactions]
  );

  const businessSummary = useMemo(
    () =>
      calculateBusinessSummary(
        accountsWithBalance,
        data.categories,
        data.transactions,
        monthKey
      ),
    [accountsWithBalance, data.categories, data.transactions, monthKey]
  );

  const recurringWithMetrics = useMemo(
    () => calculateRecurringMetrics(data.recurringRules, data.transactions, monthKey),
    [data.recurringRules, data.transactions, monthKey]
  );

  const pendingRules = useMemo(() => {
    const accountMap = new Map(data.accounts.map((a) => [a.id, a]));
    const categoryMap = new Map(data.categories.map((c) => [c.id, c]));
    return recurringWithMetrics.filter((r) => {
      if (!r.isPendingThisMonth) return false;
      if (!enableBusinessModule) {
        const acc = accountMap.get(r.accountId);
        const cat = r.categoryId ? categoryMap.get(r.categoryId) : undefined;
        if (acc?.isBusinessWorkingCapital || acc?.type === 'business_cashbox' || cat?.isBusiness) {
          return false;
        }
      }
      return true;
    });
  }, [recurringWithMetrics, enableBusinessModule, data.accounts, data.categories]);

  const overviewMetrics = useMemo(
    () =>
      calculateMonthlyOverview(
        accountsWithBalance,
        data.categories,
        data.transactions,
        personDebts,
        monthKey
      ),
    [accountsWithBalance, data.categories, data.transactions, personDebts, monthKey]
  );

  const existingPeople = useMemo(
    () => multiPartyDebtOverview.allContactNames,
    [multiPartyDebtOverview]
  );

  // Handlers for Transactions
  const handleOpenQuickAdd = (preset?: QuickAddInitialPreset) => {
    setEditingTx(null);
    setQuickAddPreset(preset || null);
    setIsQuickAddOpen(true);
  };

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTx(tx);
    setQuickAddPreset(null);
    setIsQuickAddOpen(true);
  };

  const handleSaveTransactions = (newTxs: Transaction[], isEdit: boolean) => {
    if (isEdit && newTxs.length === 1) {
      const updated = newTxs[0];
      updateData((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) => (t.id === updated.id ? updated : t)),
      }));
      showToast('已更新紀錄');
    } else {
      updateData((prev) => ({
        ...prev,
        transactions: [...newTxs, ...prev.transactions],
      }));
      const hasSplitDebt = newTxs.length > 1 && newTxs.some((t) => t.type === 'debt');
      showToast(
        hasSplitDebt
          ? `已完成拆帳（共 ${newTxs.length} 筆紀錄）`
          : newTxs.length > 1
          ? `已新增 ${newTxs.length} 期分期`
          : '記帳完成'
      );
    }
  };

  const handleDeleteTransaction = (tx: Transaction) => {
    setConfirmConfig({
      isOpen: true,
      title: '刪除此筆紀錄？',
      description: `${tx.date} · ${tx.note || '紀錄'} (${formatTWD(tx.amount)})`,
      confirmLabel: '刪除',
      danger: true,
      onConfirm: () => {
        updateData((prev) => ({
          ...prev,
          transactions: prev.transactions.filter((t) => t.id !== tx.id),
        }));
        showToast('已刪除', 'info');
      },
    });
  };

  // Handlers for Accounts
  const handleSaveAccount = (account: Account, isEdit: boolean) => {
    if (isEdit) {
      updateData((prev) => ({
        ...prev,
        accounts: prev.accounts.map((a) => (a.id === account.id ? account : a)),
      }));
      showToast(`已更新「${account.name}」`);
    } else {
      updateData((prev) => ({
        ...prev,
        accounts: [...prev.accounts, account],
      }));
      showToast(`已新增「${account.name}」`);
    }
  };

  const handleArchiveAccount = (acc: AccountWithBalance) => {
    const willArchive = !acc.archived;
    setConfirmConfig({
      isOpen: true,
      title: willArchive ? `封存「${acc.name}」？` : `解封「${acc.name}」？`,
      description: willArchive
        ? '此帳戶已有交易紀錄，封存後將隱藏並保留歷史帳務。'
        : '解封後將重新顯示於列表。',
      confirmLabel: willArchive ? '封存' : '解封',
      danger: false,
      onConfirm: () => {
        updateData((prev) => ({
          ...prev,
          accounts: prev.accounts.map((a) =>
            a.id === acc.id ? { ...a, archived: willArchive } : a
          ),
        }));
        showToast(willArchive ? `已封存「${acc.name}」` : `已解封「${acc.name}」`, 'info');
      },
    });
  };

  const handleDeleteAccount = (acc: AccountWithBalance) => {
    if (acc.transactionCount > 0) {
      handleArchiveAccount(acc);
      return;
    }
    setConfirmConfig({
      isOpen: true,
      title: `刪除「${acc.name}」？`,
      description: '此帳戶尚無交易紀錄，可直接移除。',
      confirmLabel: '刪除',
      danger: true,
      onConfirm: () => {
        updateData((prev) => ({
          ...prev,
          accounts: prev.accounts.filter((a) => a.id !== acc.id),
        }));
        showToast(`已刪除「${acc.name}」`, 'info');
      },
    });
  };

  const handleAdjustBalance = (
    acc: AccountWithBalance,
    targetBalance: number,
    note: string
  ) => {
    const diff = targetBalance - acc.currentBalance;
    if (diff === 0) {
      showToast('餘額無須調整', 'info');
      return;
    }
    const isPositive = diff > 0;
    const adjTx: Transaction = {
      id: `tx_adj_${Date.now()}`,
      type: 'adjustment',
      amount: Math.abs(diff),
      date: getTodayDateString(),
      accountId: acc.id,
      toAccountId: isPositive ? acc.id : undefined,
      note: `${note} (${isPositive ? '+' : '-'}${Math.abs(diff).toLocaleString('zh-TW')})`,
    };
    updateData((prev) => ({
      ...prev,
      transactions: [adjTx, ...prev.transactions],
    }));
    showToast(`已校正為 ${formatTWD(targetBalance)}`);
  };

  // Handlers for Recurring Rules
  const handleExecuteRecurring = (rule: RecurringRuleWithMetrics) => {
    if (rule.isExecutedThisMonth) {
      showToast('本月已入帳', 'warning');
      return;
    }
    const dayStr = String(Math.min(28, Math.max(1, rule.dayOfMonth))).padStart(2, '0');
    const txDate = `${monthKey}-${dayStr}`;

    const newTx: Transaction =
      rule.kind === 'long_term_invest'
        ? {
            id: `tx_rec_${Date.now()}`,
            type: 'transfer',
            amount: rule.amount,
            date: txDate,
            accountId: rule.accountId,
            toAccountId: rule.toAccountId || rule.accountId,
            note: `${rule.title}`,
            recurringRuleId: rule.id,
            periodKey: monthKey,
          }
        : {
            id: `tx_rec_${Date.now()}`,
            type: rule.kind === 'fixed_income' ? 'income' : 'expense',
            amount: rule.amount,
            date: txDate,
            accountId: rule.accountId,
            categoryId: rule.categoryId,
            incomeKind: rule.kind === 'fixed_income' ? 'fixed' : undefined,
            note: `${rule.title}`,
            recurringRuleId: rule.id,
            periodKey: monthKey,
          };

    updateData((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
    }));
    showToast(`已入帳「${rule.title}」`);
  };

  const handleSkipRecurring = (rule: RecurringRuleWithMetrics) => {
    if (rule.skippedPeriods.includes(monthKey)) return;
    updateData((prev) => ({
      ...prev,
      recurringRules: prev.recurringRules.map((r) =>
        r.id === rule.id
          ? { ...r, skippedPeriods: [...r.skippedPeriods, monthKey] }
          : r
      ),
    }));
    showToast(`已跳過「${rule.title}」`, 'info');
  };

  const handleTogglePauseRule = (rule: RecurringRuleWithMetrics) => {
    const isPaused = rule.status === 'paused';
    updateData((prev) => ({
      ...prev,
      recurringRules: prev.recurringRules.map((r) =>
        r.id === rule.id
          ? {
              ...r,
              status: isPaused ? 'active' : 'paused',
              pausedSince: isPaused ? undefined : getTodayDateString(),
            }
          : r
      ),
    }));
    showToast(isPaused ? `已恢復「${rule.title}」` : `已暫停「${rule.title}」`, 'info');
  };

  const handleSaveRule = (rule: RecurringRule, isEdit: boolean) => {
    if (isEdit) {
      updateData((prev) => ({
        ...prev,
        recurringRules: prev.recurringRules.map((r) => (r.id === rule.id ? rule : r)),
      }));
      showToast(`已更新「${rule.title}」`);
    } else {
      updateData((prev) => ({
        ...prev,
        recurringRules: [...prev.recurringRules, rule],
      }));
      showToast(`已新增「${rule.title}」`);
    }
  };

  const handleDeleteRule = (rule: RecurringRuleWithMetrics) => {
    setConfirmConfig({
      isOpen: true,
      title: `刪除「${rule.title}」？`,
      description: '已入帳的歷史紀錄不受影響。',
      confirmLabel: '刪除',
      danger: true,
      onConfirm: () => {
        updateData((prev) => ({
          ...prev,
          recurringRules: prev.recurringRules.filter((r) => r.id !== rule.id),
        }));
        showToast(`已刪除「${rule.title}」`, 'info');
      },
    });
  };

  // Handlers for Installments
  const handleRecordNextInstallment = (group: InstallmentGroupSummary) => {
    const nextIdx = group.paidPeriods + 1;
    if (nextIdx > group.totalPeriods) return;
    const newTx: Transaction = {
      id: `tx_inst_${Date.now()}`,
      type: 'expense',
      amount: group.monthlyAmount,
      date: getTodayDateString(),
      accountId: group.accountId,
      categoryId: group.categoryId,
      note: group.title,
      installmentGroupId: group.groupId,
      installmentIndex: nextIdx,
      installmentTotal: group.totalPeriods,
    };
    updateData((prev) => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
    }));
    showToast(`已入帳第 ${nextIdx}/${group.totalPeriods} 期`);
  };

  // Handlers for Multi-Party Debt Repayment (supports both Self<->Other and Other A<->Other B) & Bad Debt Write-Off
  const handleConfirmPairRepayment = (
    relation: PairwiseDebtRelation,
    selectedAccountId: string,
    amount: number,
    date: string,
    note: string
  ) => {
    if (!relation.debtor || !relation.creditor) return;

    const payer = relation.debtor;     // 還錢的人（原欠款方）
    const receiver = relation.creditor; // 收錢的人（原債權方）
    const involvesSelf = relation.involvesSelf;

    const accName =
      involvesSelf && selectedAccountId
        ? data.accounts.find((a) => a.id === selectedAccountId)?.name || '選定帳戶'
        : '';

    const repayTx: Transaction = {
      id: `tx_repay_${Date.now()}`,
      type: 'repay',
      amount,
      date,
      accountId: involvesSelf ? selectedAccountId : '',
      payerName: payer,
      debtorName: receiver,
      personName: involvesSelf
        ? relation.partyB
        : `${formatPartyDisplayName(payer)}→${formatPartyDisplayName(receiver)}`,
      debtDirection: involvesSelf
        ? receiver === 'SELF'
          ? 'i_lent'
          : 'they_lent'
        : undefined,
      note,
    };

    updateData((prev) => ({
      ...prev,
      transactions: [repayTx, ...prev.transactions],
    }));

    if (involvesSelf) {
      showToast(
        receiver === 'SELF'
          ? `已收款 ${formatTWD(amount)} 存入「${accName}」`
          : `已付款 ${formatTWD(amount)} 自「${accName}」扣除`
      );
    } else {
      showToast(
        `已記錄「${formatPartyDisplayName(payer)} 還給 ${formatPartyDisplayName(
          receiver
        )}」${formatTWD(amount)}`
      );
    }
  };

  const handleWriteOffBadDebt = (relation: PairwiseDebtRelation) => {
    if (!relation.involvesSelf || relation.creditor !== 'SELF' || !relation.debtor) return;
    const absAmount = relation.absNetAmount;
    const targetPerson = relation.debtor;

    setConfirmConfig({
      isOpen: true,
      title: `將「${targetPerson}」列為呆帳？`,
      description: `沖銷應收 ${formatTWD(absAmount)}，不影響現金餘額。`,
      confirmLabel: '核銷',
      danger: true,
      onConfirm: () => {
        const writeOffTx: Transaction = {
          id: `tx_baddebt_${Date.now()}`,
          type: 'repay',
          amount: absAmount,
          date: getTodayDateString(),
          accountId: '',
          payerName: targetPerson,
          debtorName: 'SELF',
          personName: targetPerson,
          debtDirection: 'i_lent',
          isBadDebtWriteOff: true,
          note: '呆帳核銷',
        };
        updateData((prev) => ({
          ...prev,
          transactions: [writeOffTx, ...prev.transactions],
        }));
        showToast(`已核銷呆帳 ${formatTWD(absAmount)}`, 'warning');
      },
    });
  };

  // Handlers for Settings & Data Export/Import
  const handleAddCategory = (cat: Category) => {
    updateData((prev) => ({
      ...prev,
      categories: [...prev.categories, cat],
    }));
    showToast(`已新增「${cat.name}」`);
  };

  const handleToggleArchiveCategory = (cat: Category) => {
    updateData((prev) => ({
      ...prev,
      categories: prev.categories.map((c) =>
        c.id === cat.id ? { ...c, archived: !c.archived } : c
      ),
    }));
    showToast(cat.archived ? `已解封「${cat.name}」` : `已封存「${cat.name}」`, 'info');
  };

  const handleExportCSV = () => {
    const csvContent = StorageService.exportTransactionsCSV(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ledger_${getTodayDateString()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('已匯出 CSV');
  };

  const handleExportJSON = () => {
    const jsonContent = StorageService.exportJSON(data);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ledger_backup_${getTodayDateString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('已匯出備份檔');
  };

  const handleImportJSON = (jsonStr: string) => {
    try {
      const restored = StorageService.importJSON(jsonStr);
      setData(restored);
      showToast('已還原備份資料');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '檔案格式錯誤', 'error');
    }
  };

  const handleResetDemoData = () => {
    setConfirmConfig({
      isOpen: true,
      title: '載入範例資料？',
      description: '將覆蓋目前本機紀錄。',
      confirmLabel: '載入',
      danger: true,
      onConfirm: () => {
        const demo = StorageService.resetToDemo();
        setData(demo);
        showToast('已載入範例資料');
      },
    });
  };

  const handleClearAllData = () => {
    setConfirmConfig({
      isOpen: true,
      title: '清空所有資料？',
      description: '所有紀錄將歸零且無法復原。',
      confirmLabel: '清空',
      danger: true,
      onConfirm: () => {
        const empty = StorageService.clearAll();
        setData(empty);
        showToast('已清空資料', 'warning');
      },
    });
  };

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: boolean;
  }[] = [
    { id: 'overview', label: '總覽', icon: PieChart },
    { id: 'ledger', label: '明細', icon: ListOrdered },
    ...(enableBusinessModule
      ? [{ id: 'business' as ActiveTab, label: '機台', icon: Store }]
      : []),
    { id: 'debts', label: '代墊', icon: ArrowLeftRight },
    {
      id: 'recurring',
      label: '定期',
      icon: CalendarClock,
      badge: pendingRules.length > 0,
    },
    { id: 'settings', label: '設定', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-md mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 md:border-x md:border-slate-200/90 dark:md:border-slate-800/90 md:shadow-xl flex flex-col relative">
        <OfflineIndicator />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <ConfirmModal
          config={confirmConfig}
          onClose={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
        />

        {/* Minimal Top App Bar with iOS Notch / Dynamic Island Safe-Area Top Padding */}
        <header className="sticky top-0 z-30 pt-[env(safe-area-inset-top)] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 select-none">
          <div className="h-13 px-4 flex items-center justify-between">
            <BrandLogo />

            <button
              type="button"
              onClick={() => handleOpenQuickAdd()}
              className="h-8 px-3 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-xs hover:opacity-95 active:scale-[0.98] transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>記帳</span>
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 p-3.5 pb-[calc(5.25rem+env(safe-area-inset-bottom))]">
          {activeTab === 'overview' && (
            <OverviewTab
              monthKey={monthKey}
              onMonthChange={setMonthKey}
              enableBusinessModule={enableBusinessModule}
              overview={overviewMetrics}
              accountsWithBalance={accountsWithBalance}
              categories={data.categories}
              transactions={data.transactions}
              pendingRules={pendingRules}
              onExecuteRecurring={handleExecuteRecurring}
              onSkipRecurring={handleSkipRecurring}
              onSaveAccount={handleSaveAccount}
              onArchiveAccount={handleArchiveAccount}
              onDeleteAccount={handleDeleteAccount}
              onAdjustBalance={handleAdjustBalance}
            />
          )}

          {activeTab === 'ledger' && (
            <LedgerTab
              monthKey={monthKey}
              onMonthChange={setMonthKey}
              enableBusinessModule={enableBusinessModule}
              accounts={data.accounts}
              categories={data.categories}
              transactions={data.transactions}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onRecordNextInstallment={handleRecordNextInstallment}
            />
          )}

          {activeTab === 'business' && enableBusinessModule && (
            <BusinessTab
              monthKey={monthKey}
              onMonthChange={setMonthKey}
              accountsWithBalance={accountsWithBalance}
              categories={data.categories}
              transactions={data.transactions}
              businessSummary={businessSummary}
              onOpenQuickAdd={handleOpenQuickAdd}
            />
          )}

          {activeTab === 'debts' && (
            <DebtsTab
              debtOverview={multiPartyDebtOverview}
              accounts={data.accounts}
              enableBusinessModule={enableBusinessModule}
              onOpenQuickAdd={handleOpenQuickAdd}
              onConfirmPairRepayment={handleConfirmPairRepayment}
              onWriteOffBadDebt={handleWriteOffBadDebt}
            />
          )}

          {activeTab === 'recurring' && (
            <RecurringTab
              monthKey={monthKey}
              enableBusinessModule={enableBusinessModule}
              rulesWithMetrics={recurringWithMetrics}
              accounts={data.accounts}
              categories={data.categories}
              onExecuteRule={handleExecuteRecurring}
              onSkipRule={handleSkipRecurring}
              onTogglePauseRule={handleTogglePauseRule}
              onSaveRule={handleSaveRule}
              onDeleteRule={handleDeleteRule}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              categories={data.categories}
              monthStartDay={monthStartDay}
              onChangeMonthStartDay={handleChangeMonthStartDay}
              templates={templates}
              onAddTemplate={handleAddTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode(!darkMode)}
              enableBusinessModule={enableBusinessModule}
              onToggleBusinessModule={() => setEnableBusinessModule(!enableBusinessModule)}
              onAddCategory={handleAddCategory}
              onToggleArchiveCategory={handleToggleArchiveCategory}
              onExportCSV={handleExportCSV}
              onExportJSON={handleExportJSON}
              onImportJSON={handleImportJSON}
              onResetDemoData={handleResetDemoData}
              onClearAllData={handleClearAllData}
            />
          )}
        </main>

        {/* Fixed Bottom Navigation Bar with iOS Safe Area Padding */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
          <div
            className={`grid items-center h-14 px-1 ${
              enableBusinessModule ? 'grid-cols-6' : 'grid-cols-5'
            }`}
          >
            {navItems.map((item) => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`py-1.5 flex flex-col items-center justify-center relative transition ${
                    isActive
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium'
                  }`}
                >
                  <div className="relative">
                    <IconComp className="w-4.5 h-4.5" />
                    {item.badge && (
                      <span className="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* QuickAdd Bottom Sheet Drawer */}
        <QuickAddDrawer
          isOpen={isQuickAddOpen}
          onClose={() => setIsQuickAddOpen(false)}
          accounts={data.accounts}
          categories={data.categories}
          existingPeople={existingPeople}
          templates={templates}
          enableBusinessModule={enableBusinessModule}
          editingTransaction={editingTx}
          preset={quickAddPreset}
          onSaveTransactions={handleSaveTransactions}
        />
      </div>
    </div>
  );
}
