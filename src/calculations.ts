import { Account, Category, RecurringRule, Transaction } from './types';

export interface AccountWithBalance extends Account {
  currentBalance: number;
  transactionCount: number;
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

export interface MonthlyOverviewMetrics {
  monthKey: string;
  totalNetWorth: number;           // 總資產淨值（含個人、周轉金、投資、加密、扣除卡債、加上我的應收減應付）
  personalLiquidAssets: number;    // 個人可用現金與銀行（不含副業周轉金）
  businessWorkingCapital: number;  // 副業營運周轉金
  investmentAndCrypto: number;     // 投資與加密資產
  creditCardDebt: number;          // 信用卡待繳帳款（正數表示負債額）
  netReceivable: number;           // 我的應收代墊總額
  netPayable: number;              // 我的應付欠款總額
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
 * 將任意代墊或還款交易正規化為 { payer, debtor }
 * - 對於 type === 'debt': payer 為實際出錢代墊者，debtor 為欠錢應分攤者
 * - 對於 type === 'repay': payer 為實際掏錢還款者(原債務人)，debtor 為收到還款者(原債權人)
 */
export function resolveDebtParties(tx: Transaction): { payer: string; debtor: string } | null {
  if (tx.type !== 'debt' && tx.type !== 'repay') return null;

  const rawPayer = tx.payerName?.trim();
  const rawDebtor = tx.debtorName?.trim();

  if (rawPayer && rawDebtor && rawPayer !== rawDebtor) {
    return { payer: rawPayer, debtor: rawDebtor };
  }

  // 向下相容舊格式 personName + debtDirection
  const legacyPerson = tx.personName?.trim();
  if (!legacyPerson) return null;

  if (tx.type === 'debt') {
    if (tx.debtDirection === 'they_lent') {
      return { payer: legacyPerson, debtor: 'SELF' };
    }
    return { payer: 'SELF', debtor: legacyPerson };
  } else {
    // tx.type === 'repay'
    if (tx.debtDirection === 'they_lent') {
      // 我還對方錢 -> payer: 'SELF', debtor: legacyPerson
      return { payer: 'SELF', debtor: legacyPerson };
    }
    // 對方還我錢 (或呆帳核銷) -> payer: legacyPerson, debtor: 'SELF'
    return { payer: legacyPerson, debtor: 'SELF' };
  }
}

export function formatPartyDisplayName(name: string): string {
  return name === 'SELF' ? '我' : name;
}

/**
 * 計算單一帳戶的動態餘額與交易筆數
 * 嚴格遵守帳務隔離原則：
 * - 只有當 payerName === 'SELF'（我付錢）或還款涉及 'SELF' 時，才影響我的帳戶動態餘額。
 * - 第三方代墊（A 幫 B 墊錢，雙方皆非 'SELF'）完全不影響我的個人帳戶餘額。
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
        incCount(tx.accountId);
        addBal(tx.accountId, -tx.amount);
        break;
      case 'income':
        incCount(tx.accountId);
        addBal(tx.accountId, tx.amount);
        break;
      case 'transfer':
        incCount(tx.accountId);
        if (tx.toAccountId && tx.toAccountId !== tx.accountId) {
          incCount(tx.toAccountId);
        }
        addBal(tx.accountId, -tx.amount);
        addBal(tx.toAccountId, tx.amount);
        break;
      case 'debt': {
        const parties = resolveDebtParties(tx);
        if (!parties) break;
        // 只有「我」先出錢幫別人代墊時，我的帳戶餘額才會扣款
        if (parties.payer === 'SELF' && parties.debtor !== 'SELF') {
          incCount(tx.accountId);
          addBal(tx.accountId, -tx.amount);
        }
        // 若別人幫我墊 (payer !== 'SELF', debtor === 'SELF')：我當下沒出錢，而是產生應付負債
        // 若自己分攤 (payer === 'SELF', debtor === 'SELF')：若不小心以此型別傳入，視同支出扣款
        else if (parties.payer === 'SELF' && parties.debtor === 'SELF') {
          incCount(tx.accountId);
          addBal(tx.accountId, -tx.amount);
        }
        // 若第三方 A 幫 B 代墊 (payer !== 'SELF' && debtor !== 'SELF')：完全不影響我的帳戶
        break;
      }
      case 'repay': {
        if (tx.isBadDebtWriteOff) {
          break;
        }
        const parties = resolveDebtParties(tx);
        if (!parties) break;
        if (parties.debtor === 'SELF' && parties.payer !== 'SELF') {
          // 別人還我錢 -> 我的收款帳戶餘額增加
          incCount(tx.accountId);
          addBal(tx.accountId, tx.amount);
        } else if (parties.payer === 'SELF' && parties.debtor !== 'SELF') {
          // 我還別人錢 -> 我的付款帳戶餘額減少
          incCount(tx.accountId);
          addBal(tx.accountId, -tx.amount);
        }
        // 若第三方 B 還錢給 A (雙方皆非 'SELF') -> 完全不影響我的帳戶
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

  return accounts.map((acc) => ({
    ...acc,
    currentBalance: balanceMap.get(acc.id) ?? acc.initialBalance,
    transactionCount: countMap.get(acc.id) ?? 0,
  }));
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

    // 建立固定順序的 pairKey：若包含 'SELF' 則 'SELF' 固定為 partyA；否則依字母/字元排序
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
        // A 幫 B 代墊 -> B 欠 A 增加
        rel.aPaidForBTotal += tx.amount;
      } else if (payer === partyB && debtor === partyA) {
        // B 幫 A 代墊 -> A 欠 B 增加
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
        // B 還錢給 A
        rel.bRepaidATotal += tx.amount;
      } else if (payer === partyA && debtor === partyB) {
        // A 還錢給 B
        rel.aRepaidBTotal += tx.amount;
      }
    }
  }

  const allRelations: PairwiseDebtRelation[] = [];
  for (const rel of pairMap.values()) {
    const bOwesA = rel.aPaidForBTotal - rel.bRepaidATotal - rel.badDebtWrittenOff;
    const aOwesB = rel.bPaidForATotal - rel.aRepaidBTotal;
    const net = bOwesA - aOwesB; // > 0 代表 B 欠 A；< 0 代表 A 欠 B

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

  // 計算所有參與者（含 'SELF' 與所有聯絡人）的總應收、總應付與最終淨額
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
 * 計算與「我 ('SELF')」相關的往來對象摘要（提供總覽淨值與向下相容使用）
 * 嚴格隔離：第三方 A <-> B 代墊絕不會混入我的個人應收應付！
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
 * 嚴格遵守帳務隔離原則：
 * - 只有本人的收入與本人的支出（含他人墊付中屬於「我 ('SELF')」分攤到的個人支出）計入月收支。
 * - 第三方代墊 (A <-> B) 完全不影響我的淨值與月收支。
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
      // 當別人幫我代墊 (debtor === 'SELF', payer !== 'SELF') 時，若該筆為我自己分攤到的消費，計入我的個人支出
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
