import { Account, Category, RecurringRule, Transaction } from './types';

export interface AccountWithBalance extends Account {
  currentBalance: number;
  transactionCount: number;
}

export interface PersonDebtSummary {
  personName: string;
  iLentTotal: number;        // 我幫墊 / 借出總額
  theyLentTotal: number;     // 對方幫墊 / 我借入總額
  repaidToMeTotal: number;   // 對方已還我
  iRepaidTotal: number;      // 我已還對方
  badDebtWrittenOff: number; // 呆帳核銷總額
  netBalance: number;        // > 0 代表對方欠我(應收)，< 0 代表我欠對方(應付)，0 代表已結清
  transactions: Transaction[];
}

export interface BusinessSummary {
  monthKey: string;
  workingCapitalTotal: number; // 所有營運周轉金錢箱目前總餘額
  monthlyRevenue: number;      // 本月機台總營收
  monthlyExpense: number;      // 本月機台總支出（場租+貨款+維修）
  monthlyRent: number;         // 本月場租
  monthlyGoods: number;        // 本月貨款
  monthlyOtherCost: number;    // 本月零件耗材與其他
  monthlyNetProfit: number;    // 本月機台淨利
  profitMargin: number;        // 淨利率 (%)
}

export interface RecurringRuleWithMetrics extends RecurringRule {
  isExecutedThisMonth: boolean;
  isSkippedThisMonth: boolean;
  isPendingThisMonth: boolean;
  pausedMonthsCount: number;
  // 長期投入統計
  recordedPeriodsCount: number;
  recordedInvestedAmount: number;
  totalCumulativePeriods: number;
  totalCumulativeAmount: number;
}

export interface InstallmentGroupSummary {
  groupId: string;
  title: string;
  accountId: string;
  categoryId?: string;
  monthlyAmount: number;
  totalPeriods: number;
  paidPeriods: number;
  totalAmount: number;
  remainingAmount: number;
  transactions: Transaction[];
}

export interface MonthlyOverviewMetrics {
  monthKey: string;
  totalNetWorth: number;           // 總資產淨值（含個人、周轉金、投資、加密、扣除卡債、加上應收減應付）
  personalLiquidAssets: number;    // 個人可用現金與銀行（不含副業周轉金）
  businessWorkingCapital: number;  // 副業營運周轉金
  investmentAndCrypto: number;     // 投資與加密資產
  creditCardDebt: number;          // 信用卡待繳帳款（正數表示負債額）
  netReceivable: number;           // 應收代墊總額
  netPayable: number;              // 應付欠款總額
  // 本月個人+總體收支
  monthlyPersonalIncome: number;
  monthlyFixedIncome: number;
  monthlyVariableIncome: number;
  monthlyPersonalExpense: number;
  monthlyBusinessIncome: number;
  monthlyBusinessExpense: number;
  monthlyNetSavings: number;
}

/**
 * 計算單一帳戶的動態餘額與交易筆數
 */
export function calculateAccountBalances(
  accounts: Account[],
  transactions: Transaction[]
): AccountWithBalance[] {
  const balanceMap = new Map<string, number>();
  const countMap = new Map<string, number>();

  for (const acc of accounts) {
    balanceMap.set(acc.id, acc.initialBalance);
    countMap.set(acc.id, 0);
  }

  for (const tx of transactions) {
    const incCount = (id?: string) => {
      if (id && countMap.has(id)) {
        countMap.set(id, (countMap.get(id) || 0) + 1);
      }
    };

    const addBal = (id: string | undefined, delta: number) => {
      if (id && balanceMap.has(id)) {
        balanceMap.set(id, (balanceMap.get(id) || 0) + delta);
      }
    };

    incCount(tx.accountId);
    if (tx.toAccountId && tx.toAccountId !== tx.accountId) {
      incCount(tx.toAccountId);
    }

    switch (tx.type) {
      case 'expense':
        addBal(tx.accountId, -tx.amount);
        break;
      case 'income':
        addBal(tx.accountId, tx.amount);
        break;
      case 'transfer':
        addBal(tx.accountId, -tx.amount);
        addBal(tx.toAccountId, tx.amount);
        break;
      case 'debt':
        // 我幫人代墊或借錢給人：錢從我的帳戶流出
        if (tx.debtDirection === 'i_lent') {
          addBal(tx.accountId, -tx.amount);
        }
        // 別人幫我代墊 (they_lent)：當下我的帳戶餘額不變，但產生一筆應付欠款
        break;
      case 'repay':
        if (tx.isBadDebtWriteOff) {
          // 呆帳核銷：僅沖銷應收帳款，無實際金流入帳
          break;
        }
        if (tx.debtDirection === 'i_lent') {
          // 對方還我錢：資金流入我的帳戶
          addBal(tx.accountId, tx.amount);
        } else if (tx.debtDirection === 'they_lent') {
          // 我還對方錢：資金從我的帳戶流出
          addBal(tx.accountId, -tx.amount);
        }
        break;
      case 'adjustment':
        // 若 toAccountId === accountId 代表調增 (+amount)，否則代表調減 (-amount)
        if (tx.toAccountId === tx.accountId) {
          addBal(tx.accountId, tx.amount);
        } else {
          addBal(tx.accountId, -tx.amount);
        }
        break;
    }
  }

  return accounts.map((acc) => ({
    ...acc,
    currentBalance: balanceMap.get(acc.id) ?? acc.initialBalance,
    transactionCount: countMap.get(acc.id) ?? 0,
  }));
}

/**
 * 計算所有往來對象的雙向代墊互抵與淨欠款
 */
export function calculatePersonDebts(transactions: Transaction[]): PersonDebtSummary[] {
  const personMap = new Map<string, PersonDebtSummary>();

  for (const tx of transactions) {
    if ((tx.type !== 'debt' && tx.type !== 'repay') || !tx.personName?.trim()) {
      continue;
    }
    const name = tx.personName.trim();
    if (!personMap.has(name)) {
      personMap.set(name, {
        personName: name,
        iLentTotal: 0,
        theyLentTotal: 0,
        repaidToMeTotal: 0,
        iRepaidTotal: 0,
        badDebtWrittenOff: 0,
        netBalance: 0,
        transactions: [],
      });
    }
    const summary = personMap.get(name)!;
    summary.transactions.push(tx);

    if (tx.type === 'debt') {
      if (tx.debtDirection === 'i_lent') {
        summary.iLentTotal += tx.amount;
      } else if (tx.debtDirection === 'they_lent') {
        summary.theyLentTotal += tx.amount;
      }
    } else if (tx.type === 'repay') {
      if (tx.isBadDebtWriteOff) {
        summary.badDebtWrittenOff += tx.amount;
      } else if (tx.debtDirection === 'i_lent') {
        summary.repaidToMeTotal += tx.amount;
      } else if (tx.debtDirection === 'they_lent') {
        summary.iRepaidTotal += tx.amount;
      }
    }
  }

  const results: PersonDebtSummary[] = [];
  for (const summary of personMap.values()) {
    // 淨額 = (我借出 - 對方已還 - 呆帳核銷) - (對方借我 - 我已還)
    const myReceivable = summary.iLentTotal - summary.repaidToMeTotal - summary.badDebtWrittenOff;
    const myPayable = summary.theyLentTotal - summary.iRepaidTotal;
    summary.netBalance = myReceivable - myPayable;
    summary.transactions.sort((a, b) => b.date.localeCompare(a.date));
    results.push(summary);
  }

  // 未結清的排前面，並依絕對金額大小排序
  return results.sort((a, b) => {
    const aActive = a.netBalance !== 0 ? 1 : 0;
    const bActive = b.netBalance !== 0 ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return Math.abs(b.netBalance) - Math.abs(a.netBalance);
  });
}

/**
 * 計算副業機台營運周轉與當月損益
 */
export function calculateBusinessSummary(
  accountsWithBalance: AccountWithBalance[],
  categories: Category[],
  transactions: Transaction[],
  monthKey: string
): BusinessSummary {
  const workingCapitalTotal = accountsWithBalance
    .filter((a) => !a.archived && (a.isBusinessWorkingCapital || a.type === 'business_cashbox'))
    .reduce((sum, a) => sum + a.currentBalance, 0);

  const bizCatMap = new Map<string, Category>();
  for (const c of categories) {
    if (c.isBusiness) bizCatMap.set(c.id, c);
  }

  const bizAccIds = new Set(
    accountsWithBalance
      .filter((a) => a.isBusinessWorkingCapital || a.type === 'business_cashbox')
      .map((a) => a.id)
  );

  let monthlyRevenue = 0;
  let monthlyExpense = 0;
  let monthlyRent = 0;
  let monthlyGoods = 0;
  let monthlyOtherCost = 0;

  for (const tx of transactions) {
    if (!tx.date.startsWith(monthKey)) continue;
    const isBizCat = tx.categoryId ? bizCatMap.has(tx.categoryId) : false;
    const isBizAcc = bizAccIds.has(tx.accountId);

    if (!isBizCat && !isBizAcc) continue;

    if (tx.type === 'income') {
      monthlyRevenue += tx.amount;
    } else if (tx.type === 'expense') {
      monthlyExpense += tx.amount;
      const cat = tx.categoryId ? bizCatMap.get(tx.categoryId) : undefined;
      if (cat?.id === 'cat_biz_rent' || cat?.name.includes('租')) {
        monthlyRent += tx.amount;
      } else if (cat?.id === 'cat_biz_goods' || cat?.name.includes('貨')) {
        monthlyGoods += tx.amount;
      } else {
        monthlyOtherCost += tx.amount;
      }
    }
  }

  const monthlyNetProfit = monthlyRevenue - monthlyExpense;
  const profitMargin = monthlyRevenue > 0 ? Math.round((monthlyNetProfit / monthlyRevenue) * 100) : 0;

  return {
    monthKey,
    workingCapitalTotal,
    monthlyRevenue,
    monthlyExpense,
    monthlyRent,
    monthlyGoods,
    monthlyOtherCost,
    monthlyNetProfit,
    profitMargin,
  };
}

/**
 * 計算定期規則狀態、當月待入帳與長期投入累計期數/金額
 */
export function calculateRecurringMetrics(
  rules: RecurringRule[],
  transactions: Transaction[],
  currentMonthKey: string
): RecurringRuleWithMetrics[] {
  return rules.map((rule) => {
    const linkedTxs = transactions.filter((tx) => tx.recurringRuleId === rule.id);

    const isExecutedThisMonth = linkedTxs.some(
      (tx) => tx.periodKey === currentMonthKey || tx.date.startsWith(currentMonthKey)
    );
    const isSkippedThisMonth = rule.skippedPeriods.includes(currentMonthKey);
    const isPendingThisMonth =
      rule.status === 'active' && !isExecutedThisMonth && !isSkippedThisMonth;

    let pausedMonthsCount = 0;
    if (rule.status === 'paused' && rule.pausedSince) {
      const [py, pm] = rule.pausedSince.split('-').map(Number);
      const [cy, cm] = currentMonthKey.split('-').map(Number);
      if (py && pm && cy && cm) {
        pausedMonthsCount = Math.max(1, (cy - py) * 12 + (cm - pm) + 1);
      }
    }

    const recordedPeriodsCount = linkedTxs.length;
    const recordedInvestedAmount = linkedTxs.reduce((sum, tx) => sum + tx.amount, 0);

    const initPeriods = rule.initialInvestedPeriods || 0;
    const initAmount = rule.initialInvestedAmount || 0;

    return {
      ...rule,
      isExecutedThisMonth,
      isSkippedThisMonth,
      isPendingThisMonth,
      pausedMonthsCount,
      recordedPeriodsCount,
      recordedInvestedAmount,
      totalCumulativePeriods: initPeriods + recordedPeriodsCount,
      totalCumulativeAmount: initAmount + recordedInvestedAmount,
    };
  });
}

/**
 * 計算分期付款群組進度
 */
export function calculateInstallmentGroups(transactions: Transaction[]): InstallmentGroupSummary[] {
  const groupMap = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    if (tx.installmentGroupId && tx.installmentTotal) {
      const list = groupMap.get(tx.installmentGroupId) || [];
      list.push(tx);
      groupMap.set(tx.installmentGroupId, list);
    }
  }

  const summaries: InstallmentGroupSummary[] = [];
  for (const [groupId, txs] of groupMap.entries()) {
    txs.sort((a, b) => (a.installmentIndex || 0) - (b.installmentIndex || 0));
    const first = txs[0];
    const totalPeriods = first.installmentTotal || txs.length;
    const paidPeriods = txs.length;
    const monthlyAmount = first.amount;
    const totalAmount = monthlyAmount * totalPeriods;
    const paidAmount = txs.reduce((s, t) => s + t.amount, 0);
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    summaries.push({
      groupId,
      title: first.note.replace(/\s*\(\d+\/\d+期\)$/, ''),
      accountId: first.accountId,
      categoryId: first.categoryId,
      monthlyAmount,
      totalPeriods,
      paidPeriods,
      totalAmount,
      remainingAmount,
      transactions: txs,
    });
  }

  return summaries;
}

/**
 * 計算總覽頁面的所有核心財務指標
 */
export function calculateMonthlyOverview(
  accountsWithBalance: AccountWithBalance[],
  categories: Category[],
  transactions: Transaction[],
  personDebts: PersonDebtSummary[],
  monthKey: string
): MonthlyOverviewMetrics {
  const activeAccounts = accountsWithBalance.filter((a) => !a.archived);

  let personalLiquidAssets = 0;
  let businessWorkingCapital = 0;
  let investmentAndCrypto = 0;
  let creditCardDebt = 0;

  for (const acc of activeAccounts) {
    if (acc.isBusinessWorkingCapital || acc.type === 'business_cashbox') {
      businessWorkingCapital += acc.currentBalance;
    } else if (acc.type === 'bank' || acc.type === 'cash') {
      personalLiquidAssets += acc.currentBalance;
    } else if (acc.type === 'investment' || acc.type === 'crypto') {
      investmentAndCrypto += acc.currentBalance;
    } else if (acc.type === 'credit_card') {
      // 信用卡餘額通常為負數代表待繳，若為負數則轉為正數顯示待繳金額
      creditCardDebt += acc.currentBalance < 0 ? Math.abs(acc.currentBalance) : 0;
    }
  }

  const netReceivable = personDebts
    .filter((p) => p.netBalance > 0)
    .reduce((sum, p) => sum + p.netBalance, 0);

  const netPayable = personDebts
    .filter((p) => p.netBalance < 0)
    .reduce((sum, p) => sum + Math.abs(p.netBalance), 0);

  const rawAccountsSum = activeAccounts.reduce((sum, a) => sum + a.currentBalance, 0);
  const totalNetWorth = rawAccountsSum + netReceivable - netPayable;

  const catMap = new Map(categories.map((c) => [c.id, c]));
  const bizAccIds = new Set(
    accountsWithBalance
      .filter((a) => a.isBusinessWorkingCapital || a.type === 'business_cashbox')
      .map((a) => a.id)
  );

  let monthlyPersonalIncome = 0;
  let monthlyFixedIncome = 0;
  let monthlyVariableIncome = 0;
  let monthlyPersonalExpense = 0;
  let monthlyBusinessIncome = 0;
  let monthlyBusinessExpense = 0;

  for (const tx of transactions) {
    if (!tx.date.startsWith(monthKey)) continue;
    const cat = tx.categoryId ? catMap.get(tx.categoryId) : undefined;
    const isBiz = Boolean(cat?.isBusiness || bizAccIds.has(tx.accountId));

    if (tx.type === 'income') {
      if (isBiz) {
        monthlyBusinessIncome += tx.amount;
      } else {
        monthlyPersonalIncome += tx.amount;
        if (tx.incomeKind === 'fixed') {
          monthlyFixedIncome += tx.amount;
        } else {
          monthlyVariableIncome += tx.amount;
        }
      }
    } else if (tx.type === 'expense') {
      if (isBiz) {
        monthlyBusinessExpense += tx.amount;
      } else {
        monthlyPersonalExpense += tx.amount;
      }
    }
  }

  const monthlyNetSavings =
    monthlyPersonalIncome +
    monthlyBusinessIncome -
    monthlyPersonalExpense -
    monthlyBusinessExpense;

  return {
    monthKey,
    totalNetWorth,
    personalLiquidAssets,
    businessWorkingCapital,
    investmentAndCrypto,
    creditCardDebt,
    netReceivable,
    netPayable,
    monthlyPersonalIncome,
    monthlyFixedIncome,
    monthlyVariableIncome,
    monthlyPersonalExpense,
    monthlyBusinessIncome,
    monthlyBusinessExpense,
    monthlyNetSavings,
  };
}

/**
 * 計算當月支出分類佔比（供圓餅圖與排行使用）
 */
export function calculateCategoryBreakdown(
  categories: Category[],
  transactions: Transaction[],
  monthKey: string,
  scope: 'personal' | 'business' | 'all'
): { categoryId: string; name: string; amount: number; percentage: number; isBusiness: boolean }[] {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const totals = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.type !== 'expense' || !tx.date.startsWith(monthKey)) continue;
    const cat = tx.categoryId ? catMap.get(tx.categoryId) : undefined;
    const isBiz = Boolean(cat?.isBusiness);

    if (scope === 'personal' && isBiz) continue;
    if (scope === 'business' && !isBiz) continue;

    const cid = tx.categoryId || 'uncategorized';
    totals.set(cid, (totals.get(cid) || 0) + tx.amount);
  }

  const grandTotal = Array.from(totals.values()).reduce((s, v) => s + v, 0);
  if (grandTotal === 0) return [];

  return Array.from(totals.entries())
    .map(([categoryId, amount]) => {
      const cat = catMap.get(categoryId);
      return {
        categoryId,
        name: cat?.name || '未分類',
        amount,
        percentage: Math.round((amount / grandTotal) * 100),
        isBusiness: Boolean(cat?.isBusiness),
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

/**
 * 格式化台幣金額
 */
export function formatTWD(amount: number, showSign = false): string {
  const abs = Math.abs(Math.round(amount));
  const formatted = abs.toLocaleString('zh-TW');
  if (amount < 0) return `-NT$ ${formatted}`;
  if (showSign && amount > 0) return `+NT$ ${formatted}`;
  return `NT$ ${formatted}`;
}
