import {
  Account,
  Category,
  InvestmentAssetKind,
  RecurringRule,
  Transaction,
} from './types';

export interface AccountWithBalance extends Account {
  currentBalance: number;
  transactionCount: number;
  // 信用卡專屬動態欄位
  unpaidCardDebt: number;       // 目前未繳卡費（正數表示負債額，若 >=0 則為 0）
  daysUntilDue?: number;        // 距離下一個繳款截止日的天數 (0 ~ 31)
  isDueSoon: boolean;           // 未繳卡費 > 0 且距離截止日 <= 5 天
}

/**
 * 與「我 ('SELF')」相關的單一對象代墊互抵摘要
 */
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

/**
 * 通用兩兩代墊關係摘要（支援「我 ↔ 他人」與「他人 A ↔ 他人 B」）
 */
export interface PairwiseDebtRelation {
  pairKey: string;
  partyA: string;            // 參與方 A ('SELF' 或姓名；若含 'SELF' 固定放 partyA)
  partyB: string;            // 參與方 B (姓名)
  involvesSelf: boolean;     // true 代表與我有關，false 代表他人之間 (A ↔ B)
  aPaidForBTotal: number;    // A 幫 B 代墊總額
  bPaidForATotal: number;    // B 幫 A 代墊總額
  bRepaidATotal: number;     // B 還給 A 總額
  aRepaidBTotal: number;     // A 還給 B 總額
  badDebtWrittenOff: number; // 呆帳核銷總額 (A 核銷 B 的欠款)
  netBalance: number;        // > 0 代表 partyB 欠 partyA；< 0 代表 partyA 欠 partyB；0 代表已結清
  creditor: string | null;   // 債權人（應收方）
  debtor: string | null;     // 債務人（應付欠錢方）
  absNetAmount: number;      // 互抵後淨欠款絕對值
  isSettled: boolean;        // 是否已結清 (absNetAmount === 0)
  transactions: Transaction[];
}

/**
 * 單一參與者（含 'SELF' 與所有聯絡人）在全體關係中的總應收、總應付與最終淨額
 */
export interface ParticipantNetSummary {
  name: string;              // 'SELF' 或聯絡人姓名
  displayName: string;       // '我' 或聯絡人姓名
  isSelf: boolean;
  totalReceivable: number;   // 別人欠該參與者的總和
  totalPayable: number;      // 該參與者欠別人的總和
  netPosition: number;       // totalReceivable - totalPayable
}

/**
 * 多方代墊中心完整儀表板指標
 */
export interface MultiPartyDebtOverview {
  myTotalReceivable: number;          // 別人欠我（應收）
  myTotalPayable: number;             // 我欠別人（應付）
  myNetSettlement: number;            // 我的淨結算金額
  myBadDebtWrittenOff: number;        // 我的呆帳核銷總額
  thirdPartyUnsettledTotal: number;   // 他人之間 (A ↔ B) 未結清總額
  totalUnsettledRelationsCount: number; // 總計未結清關係筆數（含與我有關＋他人之間）
  myRelations: PairwiseDebtRelation[];
  thirdPartyRelations: PairwiseDebtRelation[];
  allRelations: PairwiseDebtRelation[];
  participantSummaries: ParticipantNetSummary[];
  allContactNames: string[];          // 所有出現過的非本人聯絡人姓名清單
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

/**
 * 總資產與配置比例項目
 */
export interface AssetAllocationItem {
  id: 'cash' | 'investment' | 'crypto' | 'business' | 'receivable';
  label: string;
  amount: number;
  percentage: number;
  color: string;
}

export interface MonthlyOverviewMetrics {
  monthKey: string;
  totalAssets: number;             // 總資產（所有正資產加總 + 應收代墊）
  totalLiabilities: number;        // 總負債（信用卡未繳卡費 + 應付欠款 + 透支帳戶）
  totalNetWorth: number;           // 淨資產（totalAssets - totalLiabilities）
  personalLiquidAssets: number;    // 現金類（個人銀行＋錢包）
  businessWorkingCapital: number;  // 副業營運周轉金
  investmentAssetsOnly: number;    // 投資資產（股票/基金帳戶）
  cryptoAssetsOnly: number;        // 虛擬貨幣帳戶
  investmentAndCrypto: number;     // 投資與加密資產合計
  creditCardDebt: number;          // 信用卡待繳帳款（正數表示負債額）
  netReceivable: number;           // 我的應收代墊總額
  netPayable: number;              // 我的應付欠款總額
  assetAllocation: AssetAllocationItem[]; // 視覺化資產配置比例清單
  // 本月個人+總體收支
  monthlyPersonalIncome: number;
  monthlyFixedIncome: number;
  monthlyVariableIncome: number;
  monthlyPersonalExpense: number;
  monthlyBusinessIncome: number;
  monthlyBusinessExpense: number;
  monthlyNetSavings: number;
}

export interface PeriodRowStat {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface YearlyStatistics {
  year: number;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRate: number; // 百分比 (-100 ~ 100)
  quarterlyRows: PeriodRowStat[];
  monthlyRows: PeriodRowStat[];
}

/**
 * 投資與資產投入總覽（整合「定期定額累計」與「單筆買進紀錄」）
 */
export interface InvestmentPortfolioBreakdownItem {
  kind: InvestmentAssetKind;
  label: string;
  recurringTotal: number;
  oneOffTotal: number;
  combinedTotal: number;
  percentage: number;
}

export interface InvestmentPortfolioSummary {
  totalPrincipal: number;            // 總投入本金（定期定額累計 + 單筆買進總額）
  recurringPrincipalTotal: number;   // 定期定額累計總額
  oneOffPrincipalTotal: number;      // 單筆買進累計總額
  byAssetKind: InvestmentPortfolioBreakdownItem[];
  oneOffTransactions: Transaction[]; // 單筆買進歷史明細
}

export const INVESTMENT_ASSET_KIND_LABELS: Record<InvestmentAssetKind, string> = {
  stock_etf: '股票 / ETF',
  fund: '基金',
  crypto: '虛擬貨幣',
  mortgage: '房貸 / 不動產',
  other: '其他資產',
};

export function inferAssetKindFromTitle(
  title: string,
  explicitKind?: InvestmentAssetKind
): InvestmentAssetKind {
  if (explicitKind) return explicitKind;
  const lower = title.toLowerCase();
  if (lower.includes('房貸') || lower.includes('房')) return 'mortgage';
  if (
    lower.includes('btc') ||
    lower.includes('eth') ||
    lower.includes('usdt') ||
    lower.includes('幣') ||
    lower.includes('加密')
  ) {
    return 'crypto';
  }
  if (lower.includes('基金')) return 'fund';
  if (
    lower.includes('0050') ||
    lower.includes('0056') ||
    lower.includes('00878') ||
    lower.includes('etf') ||
    lower.includes('股') ||
    lower.includes('台積')
  ) {
    return 'stock_etf';
  }
  return 'stock_etf';
}

/**
 * 依據規則類型回傳符合台灣用語的操作按鈕文字（區分收入、支出與投資）
 */
export function getRecurringActionButtonLabel(
  kind: RecurringRule['kind']
): { actionLabel: string; doneLabel: string } {
  if (kind === 'fixed_income') {
    return { actionLabel: '已入帳', doneLabel: '本月已收款' };
  }
  if (kind === 'long_term_invest') {
    return { actionLabel: '已投入', doneLabel: '本月已投入' };
  }
  return { actionLabel: '已付款', doneLabel: '本月已付款' };
}

/**
 * 計算距離每月指定日期 (1-28) 的剩餘天數 (0 ~ 31)
 */
export function calculateDaysUntilDayOfMonth(targetDay: number): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let nextDue = new Date(now.getFullYear(), now.getMonth(), targetDay);
  if (nextDue.getTime() < today.getTime()) {
    nextDue = new Date(now.getFullYear(), now.getMonth() + 1, targetDay);
  }
  const diffMs = nextDue.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * 將任意代墊或還款交易正規化為 { payer, debtor }
 */
export function resolveDebtParties(tx: Transaction): { payer: string; debtor: string } | null {
  if (tx.type !== 'debt' && tx.type !== 'repay') return null;

  const rawPayer = tx.payerName?.trim();
  const rawDebtor = tx.debtorName?.trim();

  if (rawPayer && rawDebtor && rawPayer !== rawDebtor) {
    return { payer: rawPayer, debtor: rawDebtor };
  }

  const legacyPerson = tx.personName?.trim();
  if (!legacyPerson) return null;

  if (tx.type === 'debt') {
    if (tx.debtDirection === 'they_lent') {
      return { payer: legacyPerson, debtor: 'SELF' };
    }
    return { payer: 'SELF', debtor: legacyPerson };
  } else {
    if (tx.debtDirection === 'they_lent') {
      return { payer: 'SELF', debtor: legacyPerson };
    }
    return { payer: legacyPerson, debtor: 'SELF' };
  }
}

export function formatPartyDisplayName(name: string): string {
  return name === 'SELF' ? '我' : name;
}

/**
 * 計算單一帳戶的動態餘額、交易筆數與信用卡到期提醒
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

    switch (tx.type) {
      case 'expense':
        if (tx.accountId) {
          incCount(tx.accountId);
          addBal(tx.accountId, -tx.amount);
        }
        break;
      case 'income':
        if (tx.accountId) {
          incCount(tx.accountId);
          addBal(tx.accountId, tx.amount);
        }
        break;
      case 'transfer':
        if (tx.accountId) {
          incCount(tx.accountId);
          addBal(tx.accountId, -tx.amount);
        }
        if (tx.toAccountId && tx.toAccountId !== tx.accountId) {
          incCount(tx.toAccountId);
        }
        if (tx.toAccountId) {
          addBal(tx.toAccountId, tx.amount);
        }
        break;
      case 'debt': {
        const parties = resolveDebtParties(tx);
        if (!parties) break;
        if (parties.payer === 'SELF' && parties.debtor !== 'SELF') {
          incCount(tx.accountId);
          addBal(tx.accountId, -tx.amount);
        } else if (parties.payer === 'SELF' && parties.debtor === 'SELF') {
          incCount(tx.accountId);
          addBal(tx.accountId, -tx.amount);
        }
        break;
      }
      case 'repay': {
        if (tx.isBadDebtWriteOff) {
          break;
        }
        const parties = resolveDebtParties(tx);
        if (!parties) break;
        if (parties.debtor === 'SELF' && parties.payer !== 'SELF') {
          incCount(tx.accountId);
          addBal(tx.accountId, tx.amount);
        } else if (parties.payer === 'SELF' && parties.debtor !== 'SELF') {
          incCount(tx.accountId);
          addBal(tx.accountId, -tx.amount);
        }
        break;
      }
      case 'adjustment':
        incCount(tx.accountId);
        if (tx.toAccountId === tx.accountId) {
          addBal(tx.accountId, tx.amount);
        } else {
          addBal(tx.accountId, -tx.amount);
        }
        break;
    }
  }

  return accounts.map((acc) => {
    const currentBalance = balanceMap.get(acc.id) ?? acc.initialBalance;
    const unpaidCardDebt =
      acc.type === 'credit_card' && currentBalance < 0 ? Math.abs(currentBalance) : 0;
    const daysUntilDue =
      acc.type === 'credit_card' && acc.paymentDueDay
        ? calculateDaysUntilDayOfMonth(acc.paymentDueDay)
        : undefined;
    // 當未繳卡費 > 0 且距離繳款截止日 <= 5 天（或已設定繳款日且在 5 天內）提醒待繳
    const isDueSoon =
      acc.type === 'credit_card' &&
      !acc.archived &&
      unpaidCardDebt > 0 &&
      daysUntilDue !== undefined &&
      daysUntilDue <= 5;

    return {
      ...acc,
      currentBalance,
      transactionCount: countMap.get(acc.id) ?? 0,
      unpaidCardDebt,
      daysUntilDue,
      isDueSoon,
    };
  });
}

/**
 * 計算全方位多方代墊關係（支援「我 ↔ 他人」與「他人 A ↔ 他人 B」）與所有參與者淨額總計
 */
export function calculateMultiPartyDebtOverview(
  transactions: Transaction[]
): MultiPartyDebtOverview {
  const pairMap = new Map<string, PairwiseDebtRelation>();
  const contactSet = new Set<string>();

  for (const tx of transactions) {
    const parties = resolveDebtParties(tx);
    if (!parties) continue;

    const { payer, debtor } = parties;
    if (payer !== 'SELF') contactSet.add(payer);
    if (debtor !== 'SELF') contactSet.add(debtor);

    let partyA: string;
    let partyB: string;
    if (payer === 'SELF' || debtor === 'SELF') {
      partyA = 'SELF';
      partyB = payer === 'SELF' ? debtor : payer;
    } else {
      const sorted = [payer, debtor].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
      partyA = sorted[0];
      partyB = sorted[1];
    }

    const pairKey = `${partyA}__${partyB}`;
    if (!pairMap.has(pairKey)) {
      pairMap.set(pairKey, {
        pairKey,
        partyA,
        partyB,
        involvesSelf: partyA === 'SELF',
        aPaidForBTotal: 0,
        bPaidForATotal: 0,
        bRepaidATotal: 0,
        aRepaidBTotal: 0,
        badDebtWrittenOff: 0,
        netBalance: 0,
        creditor: null,
        debtor: null,
        absNetAmount: 0,
        isSettled: true,
        transactions: [],
      });
    }

    const rel = pairMap.get(pairKey)!;
    rel.transactions.push(tx);

    if (tx.type === 'debt') {
      if (payer === partyA && debtor === partyB) {
        rel.aPaidForBTotal += tx.amount;
      } else if (payer === partyB && debtor === partyA) {
        rel.bPaidForATotal += tx.amount;
      }
    } else if (tx.type === 'repay') {
      if (tx.isBadDebtWriteOff) {
        if (payer === partyB && debtor === partyA) {
          rel.badDebtWrittenOff += tx.amount;
        } else if (payer === partyA && debtor === partyB) {
          rel.badDebtWrittenOff -= tx.amount;
        }
      } else if (payer === partyB && debtor === partyA) {
        rel.bRepaidATotal += tx.amount;
      } else if (payer === partyA && debtor === partyB) {
        rel.aRepaidBTotal += tx.amount;
      }
    }
  }

  const allRelations: PairwiseDebtRelation[] = [];
  for (const rel of pairMap.values()) {
    const bOwesA = rel.aPaidForBTotal - rel.bRepaidATotal - rel.badDebtWrittenOff;
    const aOwesB = rel.bPaidForATotal - rel.aRepaidBTotal;
    const net = bOwesA - aOwesB;

    rel.netBalance = net;
    rel.absNetAmount = Math.abs(net);
    rel.isSettled = net === 0;
    rel.creditor = net > 0 ? rel.partyA : net < 0 ? rel.partyB : null;
    rel.debtor = net > 0 ? rel.partyB : net < 0 ? rel.partyA : null;
    rel.transactions.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    allRelations.push(rel);
  }

  const sortRelations = (list: PairwiseDebtRelation[]) =>
    list.sort((a, b) => {
      const aActive = !a.isSettled ? 1 : 0;
      const bActive = !b.isSettled ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return b.absNetAmount - a.absNetAmount;
    });

  sortRelations(allRelations);

  const myRelations = allRelations.filter((r) => r.involvesSelf);
  const thirdPartyRelations = allRelations.filter((r) => !r.involvesSelf);

  let myTotalReceivable = 0;
  let myTotalPayable = 0;
  let myBadDebtWrittenOff = 0;

  for (const r of myRelations) {
    myBadDebtWrittenOff += Math.max(0, r.badDebtWrittenOff);
    if (r.netBalance > 0) {
      myTotalReceivable += r.netBalance;
    } else if (r.netBalance < 0) {
      myTotalPayable += Math.abs(r.netBalance);
    }
  }

  const myNetSettlement = myTotalReceivable - myTotalPayable;

  const thirdPartyUnsettledTotal = thirdPartyRelations
    .filter((r) => !r.isSettled)
    .reduce((sum, r) => sum + r.absNetAmount, 0);

  const totalUnsettledRelationsCount = allRelations.filter((r) => !r.isSettled).length;

  const participantMap = new Map<string, ParticipantNetSummary>();
  const ensureParticipant = (name: string) => {
    if (!participantMap.has(name)) {
      participantMap.set(name, {
        name,
        displayName: formatPartyDisplayName(name),
        isSelf: name === 'SELF',
        totalReceivable: 0,
        totalPayable: 0,
        netPosition: 0,
      });
    }
    return participantMap.get(name)!;
  };

  if (myRelations.length > 0 || allRelations.length > 0) {
    ensureParticipant('SELF');
  }
  for (const c of contactSet) {
    ensureParticipant(c);
  }

  for (const rel of allRelations) {
    if (rel.isSettled || !rel.creditor || !rel.debtor) continue;
    const cred = ensureParticipant(rel.creditor);
    const debt = ensureParticipant(rel.debtor);
    cred.totalReceivable += rel.absNetAmount;
    debt.totalPayable += rel.absNetAmount;
  }

  const participantSummaries = Array.from(participantMap.values())
    .map((p) => ({
      ...p,
      netPosition: p.totalReceivable - p.totalPayable,
    }))
    .sort((a, b) => {
      if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
      return Math.abs(b.netPosition) - Math.abs(a.netPosition);
    });

  return {
    myTotalReceivable,
    myTotalPayable,
    myNetSettlement,
    myBadDebtWrittenOff,
    thirdPartyUnsettledTotal,
    totalUnsettledRelationsCount,
    myRelations,
    thirdPartyRelations,
    allRelations,
    participantSummaries,
    allContactNames: Array.from(contactSet),
  };
}

/**
 * 計算與「我 ('SELF')」相關的往來對象摘要
 */
export function calculatePersonDebts(transactions: Transaction[]): PersonDebtSummary[] {
  const overview = calculateMultiPartyDebtOverview(transactions);
  return overview.myRelations.map((rel) => ({
    personName: rel.partyB,
    iLentTotal: rel.aPaidForBTotal,
    theyLentTotal: rel.bPaidForATotal,
    repaidToMeTotal: rel.bRepaidATotal,
    iRepaidTotal: rel.aRepaidBTotal,
    badDebtWrittenOff: rel.badDebtWrittenOff,
    netBalance: rel.netBalance,
    transactions: rel.transactions,
  }));
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
 * 計算「投資與資產投入總覽」（整合定期定額累計 ＋ 單筆買進紀錄，依標的類型分組）
 */
export function calculateInvestmentPortfolioSummary(
  rulesWithMetrics: RecurringRuleWithMetrics[],
  transactions: Transaction[]
): InvestmentPortfolioSummary {
  const longTermRules = rulesWithMetrics.filter((r) => r.kind === 'long_term_invest');
  const oneOffTransactions = transactions
    .filter((tx) => tx.isOneOffInvestment)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

  const kindOrder: InvestmentAssetKind[] = [
    'stock_etf',
    'fund',
    'crypto',
    'mortgage',
    'other',
  ];

  const recurringByKind: Record<InvestmentAssetKind, number> = {
    stock_etf: 0,
    fund: 0,
    crypto: 0,
    mortgage: 0,
    other: 0,
  };

  const oneOffByKind: Record<InvestmentAssetKind, number> = {
    stock_etf: 0,
    fund: 0,
    crypto: 0,
    mortgage: 0,
    other: 0,
  };

  for (const rule of longTermRules) {
    const k = inferAssetKindFromTitle(rule.title, rule.assetKind);
    recurringByKind[k] += rule.totalCumulativeAmount;
  }

  for (const tx of oneOffTransactions) {
    const k = inferAssetKindFromTitle(tx.assetTitle || tx.note, tx.assetKind);
    oneOffByKind[k] += tx.amount;
  }

  const recurringPrincipalTotal = Object.values(recurringByKind).reduce((a, b) => a + b, 0);
  const oneOffPrincipalTotal = Object.values(oneOffByKind).reduce((a, b) => a + b, 0);
  const totalPrincipal = recurringPrincipalTotal + oneOffPrincipalTotal;

  const byAssetKind: InvestmentPortfolioBreakdownItem[] = kindOrder
    .map((kind) => {
      const rec = recurringByKind[kind];
      const one = oneOffByKind[kind];
      const combined = rec + one;
      return {
        kind,
        label: INVESTMENT_ASSET_KIND_LABELS[kind],
        recurringTotal: rec,
        oneOffTotal: one,
        combinedTotal: combined,
        percentage: totalPrincipal > 0 ? Math.round((combined / totalPrincipal) * 100) : 0,
      };
    })
    .filter((item) => item.combinedTotal > 0);

  return {
    totalPrincipal,
    recurringPrincipalTotal,
    oneOffPrincipalTotal,
    byAssetKind,
    oneOffTransactions,
  };
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
 * 計算總覽頁面的所有核心財務指標（含總資產、總負債、淨資產與資產配置比例 %）
 */
export function calculateMonthlyOverview(
  accountsWithBalance: AccountWithBalance[],
  categories: Category[],
  transactions: Transaction[],
  personDebts: PersonDebtSummary[],
  monthKey: string,
  includeBusiness = true
): MonthlyOverviewMetrics {
  const activeAccounts = accountsWithBalance.filter(
    (a) =>
      !a.archived &&
      (includeBusiness || (!a.isBusinessWorkingCapital && a.type !== 'business_cashbox'))
  );

  let personalLiquidAssets = 0;
  let businessWorkingCapital = 0;
  let investmentAssetsOnly = 0;
  let cryptoAssetsOnly = 0;
  let creditCardDebt = 0;
  let otherOverdraftDebt = 0;

  for (const acc of activeAccounts) {
    if (acc.isBusinessWorkingCapital || acc.type === 'business_cashbox') {
      if (acc.currentBalance >= 0) {
        businessWorkingCapital += acc.currentBalance;
      } else {
        otherOverdraftDebt += Math.abs(acc.currentBalance);
      }
    } else if (acc.type === 'bank' || acc.type === 'cash') {
      if (acc.currentBalance >= 0) {
        personalLiquidAssets += acc.currentBalance;
      } else {
        otherOverdraftDebt += Math.abs(acc.currentBalance);
      }
    } else if (acc.type === 'investment') {
      if (acc.currentBalance >= 0) {
        investmentAssetsOnly += acc.currentBalance;
      } else {
        otherOverdraftDebt += Math.abs(acc.currentBalance);
      }
    } else if (acc.type === 'crypto') {
      if (acc.currentBalance >= 0) {
        cryptoAssetsOnly += acc.currentBalance;
      } else {
        otherOverdraftDebt += Math.abs(acc.currentBalance);
      }
    } else if (acc.type === 'credit_card') {
      if (acc.currentBalance < 0) {
        creditCardDebt += Math.abs(acc.currentBalance);
      } else {
        personalLiquidAssets += acc.currentBalance;
      }
    }
  }

  const investmentAndCrypto = investmentAssetsOnly + cryptoAssetsOnly;

  const netReceivable = personDebts
    .filter((p) => p.netBalance > 0)
    .reduce((sum, p) => sum + p.netBalance, 0);

  const netPayable = personDebts
    .filter((p) => p.netBalance < 0)
    .reduce((sum, p) => sum + Math.abs(p.netBalance), 0);

  // 總資產（所有正資產加總）與總負債（卡債＋應付代墊＋透支）
  const totalAssets =
    personalLiquidAssets +
    investmentAssetsOnly +
    cryptoAssetsOnly +
    (includeBusiness ? businessWorkingCapital : 0) +
    netReceivable;

  const totalLiabilities = creditCardDebt + netPayable + otherOverdraftDebt;
  const totalNetWorth = totalAssets - totalLiabilities;

  // 計算資產配置比例 (%)
  const rawAllocations: {
    id: AssetAllocationItem['id'];
    label: string;
    amount: number;
    color: string;
  }[] = [
    {
      id: 'cash',
      label: '現金類 (銀行+錢包)',
      amount: personalLiquidAssets,
      color: '#10b981', // emerald-500
    },
    {
      id: 'investment',
      label: '投資資產 (股票/基金)',
      amount: investmentAssetsOnly,
      color: '#0ea5e9', // sky-500
    },
    {
      id: 'crypto',
      label: '虛擬貨幣',
      amount: cryptoAssetsOnly,
      color: '#6366f1', // indigo-500
    },
    ...(includeBusiness
      ? [
          {
            id: 'business' as const,
            label: '營運周轉金',
            amount: businessWorkingCapital,
            color: '#f59e0b', // amber-500
          },
        ]
      : []),
    ...(netReceivable > 0
      ? [
          {
            id: 'receivable' as const,
            label: '應收代墊款',
            amount: netReceivable,
            color: '#14b8a6', // teal-500
          },
        ]
      : []),
  ];

  const positiveAssetsBase = rawAllocations.reduce((s, item) => s + Math.max(0, item.amount), 0);

  const assetAllocation: AssetAllocationItem[] = rawAllocations
    .filter((item) => item.amount > 0)
    .map((item) => ({
      ...item,
      percentage:
        positiveAssetsBase > 0 ? Math.round((item.amount / positiveAssetsBase) * 100) : 0,
    }));

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
    // 單筆投資買進屬於資產配置轉換，不應混入日常消費支出
    if (tx.isOneOffInvestment) continue;

    const cat = tx.categoryId ? catMap.get(tx.categoryId) : undefined;
    const isBiz = Boolean(cat?.isBusiness || (tx.accountId && bizAccIds.has(tx.accountId)));

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
    } else if (tx.type === 'debt') {
      const parties = resolveDebtParties(tx);
      if (parties && parties.debtor === 'SELF' && parties.payer !== 'SELF' && tx.categoryId) {
        if (isBiz) {
          monthlyBusinessExpense += tx.amount;
        } else {
          monthlyPersonalExpense += tx.amount;
        }
      }
    }
  }

  const monthlyNetSavings =
    monthlyPersonalIncome +
    (includeBusiness ? monthlyBusinessIncome : 0) -
    monthlyPersonalExpense -
    (includeBusiness ? monthlyBusinessExpense : 0);

  return {
    monthKey,
    totalAssets,
    totalLiabilities,
    totalNetWorth,
    personalLiquidAssets,
    businessWorkingCapital,
    investmentAssetsOnly,
    cryptoAssetsOnly,
    investmentAndCrypto,
    creditCardDebt,
    netReceivable,
    netPayable,
    assetAllocation,
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
 * 計算年度與季度/月度統計總覽與明細表
 */
export function calculateYearlyStatistics(
  accounts: Account[],
  categories: Category[],
  transactions: Transaction[],
  year: number,
  includeBusiness: boolean
): YearlyStatistics {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const bizAccIds = new Set(
    accounts
      .filter((a) => a.isBusinessWorkingCapital || a.type === 'business_cashbox')
      .map((a) => a.id)
  );

  const monthIncome = new Array(12).fill(0);
  const monthExpense = new Array(12).fill(0);

  const yearPrefix = `${year}-`;

  for (const tx of transactions) {
    if (!tx.date.startsWith(yearPrefix)) continue;
    if (tx.isOneOffInvestment) continue;

    const cat = tx.categoryId ? catMap.get(tx.categoryId) : undefined;
    const isBiz = Boolean(cat?.isBusiness || (tx.accountId && bizAccIds.has(tx.accountId)));
    if (!includeBusiness && isBiz) continue;

    const mIdx = parseInt(tx.date.slice(5, 7), 10) - 1;
    if (mIdx < 0 || mIdx > 11) continue;

    if (tx.type === 'income') {
      monthIncome[mIdx] += tx.amount;
    } else if (tx.type === 'expense') {
      monthExpense[mIdx] += tx.amount;
    } else if (tx.type === 'debt') {
      const parties = resolveDebtParties(tx);
      if (parties && parties.debtor === 'SELF' && parties.payer !== 'SELF' && tx.categoryId) {
        monthExpense[mIdx] += tx.amount;
      }
    }
  }

  const monthlyRows: PeriodRowStat[] = Array.from({ length: 12 }, (_, idx) => {
    const inc = monthIncome[idx];
    const exp = monthExpense[idx];
    return {
      key: `M${idx + 1}`,
      label: `${idx + 1}月`,
      income: inc,
      expense: exp,
      net: inc - exp,
    };
  });

  const quarterlyRows: PeriodRowStat[] = [0, 1, 2, 3].map((qIdx) => {
    const mStart = qIdx * 3;
    const inc = monthIncome[mStart] + monthIncome[mStart + 1] + monthIncome[mStart + 2];
    const exp = monthExpense[mStart] + monthExpense[mStart + 1] + monthExpense[mStart + 2];
    return {
      key: `Q${qIdx + 1}`,
      label: `Q${qIdx + 1} (${mStart + 1}-${mStart + 3}月)`,
      income: inc,
      expense: exp,
      net: inc - exp,
    };
  });

  const totalIncome = monthIncome.reduce((a, b) => a + b, 0);
  const totalExpense = monthExpense.reduce((a, b) => a + b, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

  return {
    year,
    totalIncome,
    totalExpense,
    netSavings,
    savingsRate,
    quarterlyRows,
    monthlyRows,
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
    if (!tx.date.startsWith(monthKey)) continue;
    if (tx.isOneOffInvestment) continue;

    let isMyExpense = tx.type === 'expense';
    if (tx.type === 'debt') {
      const parties = resolveDebtParties(tx);
      if (parties && parties.debtor === 'SELF' && parties.payer !== 'SELF' && tx.categoryId) {
        isMyExpense = true;
      }
    }
    if (!isMyExpense) continue;

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
