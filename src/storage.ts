import { Account, Category, LedgerData, RecurringRule, Transaction } from './types';

const STORAGE_KEY = 'simple_ledger_v3_data';

export interface IStorageRepository {
  loadAll(): LedgerData;
  saveAll(data: LedgerData): void;
  resetToDemo(): LedgerData;
  clearAll(): LedgerData;
  exportJSON(data: LedgerData): string;
  importJSON(jsonStr: string): LedgerData;
  exportTransactionsCSV(data: LedgerData): string;
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentMonthKey(): string {
  return getTodayDateString().slice(0, 7);
}

function getRelativeMonthKey(offsetMonths: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function createDefaultCategories(): Category[] {
  return [
    // 個人日常支出
    { id: 'cat_food', name: '餐飲伙食', type: 'expense', isBusiness: false, icon: 'Utensils', archived: false },
    { id: 'cat_transport', name: '交通通勤', type: 'expense', isBusiness: false, icon: 'Train', archived: false },
    { id: 'cat_home', name: '居家生活', type: 'expense', isBusiness: false, icon: 'Home', archived: false },
    { id: 'cat_fun', name: '娛樂購物', type: 'expense', isBusiness: false, icon: 'ShoppingBag', archived: false },
    { id: 'cat_sub', name: '數位訂閱', type: 'expense', isBusiness: false, icon: 'Smartphone', archived: false },
    // 副業機台支出
    { id: 'cat_biz_rent', name: '機台場租', type: 'expense', isBusiness: true, icon: 'Store', archived: false },
    { id: 'cat_biz_goods', name: '機台貨款', type: 'expense', isBusiness: true, icon: 'Package', archived: false },
    { id: 'cat_biz_maint', name: '零件耗材', type: 'expense', isBusiness: true, icon: 'Wrench', archived: false },
    // 個人收入
    { id: 'cat_salary', name: '本業薪資', type: 'income', isBusiness: false, icon: 'Briefcase', archived: false },
    { id: 'cat_dividend', name: '股息獎金', type: 'income', isBusiness: false, icon: 'TrendingUp', archived: false },
    { id: 'cat_side_inc', name: '外快兼職', type: 'income', isBusiness: false, icon: 'Zap', archived: false },
    // 副業機台收入
    { id: 'cat_biz_rev', name: '機台收幣', type: 'income', isBusiness: true, icon: 'Coins', archived: false },
    { id: 'cat_biz_clear', name: '清庫存轉賣', type: 'income', isBusiness: true, icon: 'RefreshCw', archived: false },
  ];
}

export function createDemoData(): LedgerData {
  const m0 = getRelativeMonthKey(0);   // 本月 e.g. 2026-11
  const m1 = getRelativeMonthKey(-1);  // 上月 e.g. 2026-10
  const m2 = getRelativeMonthKey(-2);  // 前兩月 e.g. 2026-09

  // 讓國泰 CUBE 卡的繳款截止日預設落在 3 天後 (1~28 號之間)，方便在首頁立即看到「待繳卡費提醒」與「繳卡費」按鈕
  const nearDueDay = Math.min(28, Math.max(1, ((new Date().getDate() + 2) % 28) + 1));

  const accounts: Account[] = [
    {
      id: 'acc_richart',
      name: '台新 Richart',
      type: 'bank',
      initialBalance: 85000,
      isBusinessWorkingCapital: false,
      archived: false,
    },
    {
      id: 'acc_cash',
      name: '隨身錢包',
      type: 'cash',
      initialBalance: 4500,
      isBusinessWorkingCapital: false,
      archived: false,
    },
    {
      id: 'acc_claw_box',
      name: '西門町娃娃機錢箱',
      type: 'business_cashbox',
      initialBalance: 25000,
      isBusinessWorkingCapital: true,
      archived: false,
    },
    {
      id: 'acc_cube',
      name: '國泰 CUBE 卡',
      type: 'credit_card',
      initialBalance: -6800,
      isBusinessWorkingCapital: false,
      archived: false,
      billingDay: 12,
      paymentDueDay: nearDueDay,
    },
    {
      id: 'acc_sinopac',
      name: '永豐大戶投',
      type: 'investment',
      initialBalance: 260000,
      isBusinessWorkingCapital: false,
      archived: false,
    },
    {
      id: 'acc_max',
      name: 'MAX 加密帳戶',
      type: 'crypto',
      initialBalance: 42000,
      isBusinessWorkingCapital: false,
      archived: false,
    },
  ];

  const categories = createDefaultCategories();

  const recurringRules: RecurringRule[] = [
    {
      id: 'rule_salary',
      title: '本業薪資入帳',
      kind: 'fixed_income',
      amount: 54000,
      dayOfMonth: 5,
      accountId: 'acc_richart',
      categoryId: 'cat_salary',
      paymentMode: 'auto',
      status: 'active',
      skippedPeriods: [],
    },
    {
      id: 'rule_claw_rent',
      title: '西門町雙機台場租',
      kind: 'fixed_expense',
      amount: 7000,
      dayOfMonth: 10,
      accountId: 'acc_claw_box',
      categoryId: 'cat_biz_rent',
      paymentMode: 'manual',
      status: 'active',
      skippedPeriods: [],
    },
    {
      id: 'rule_0050',
      title: '0050 定期定額',
      kind: 'long_term_invest',
      assetKind: 'stock_etf',
      amount: 10000,
      dayOfMonth: 15,
      accountId: 'acc_richart',
      toAccountId: 'acc_sinopac',
      paymentMode: 'auto',
      status: 'active',
      initialInvestedAmount: 180000,
      initialInvestedPeriods: 18,
      skippedPeriods: [],
    },
    {
      id: 'rule_netflix',
      title: 'Netflix 與 iCloud',
      kind: 'fixed_expense',
      amount: 480,
      dayOfMonth: 18,
      accountId: 'acc_cube',
      categoryId: 'cat_sub',
      paymentMode: 'auto',
      status: 'active',
      skippedPeriods: [],
    },
    {
      id: 'rule_btc',
      title: 'BTC 定期定額',
      kind: 'long_term_invest',
      assetKind: 'crypto',
      amount: 3000,
      dayOfMonth: 25,
      accountId: 'acc_richart',
      toAccountId: 'acc_max',
      paymentMode: 'manual',
      status: 'paused',
      pausedSince: `${m2}-25`,
      initialInvestedAmount: 36000,
      initialInvestedPeriods: 12,
      skippedPeriods: [],
    },
  ];

  const transactions: Transaction[] = [
    // 前兩月 (m2)
    {
      id: 'tx_m2_1',
      type: 'income',
      amount: 54000,
      date: `${m2}-05`,
      accountId: 'acc_richart',
      categoryId: 'cat_salary',
      incomeKind: 'fixed',
      note: '9月本業薪資',
      recurringRuleId: 'rule_salary',
      periodKey: m2,
    },
    {
      id: 'tx_m2_2',
      type: 'expense',
      amount: 7000,
      date: `${m2}-10`,
      accountId: 'acc_claw_box',
      categoryId: 'cat_biz_rent',
      note: '西門町雙機台場租',
      recurringRuleId: 'rule_claw_rent',
      periodKey: m2,
    },
    {
      id: 'tx_m2_3',
      type: 'expense',
      amount: 9500,
      date: `${m2}-12`,
      accountId: 'acc_claw_box',
      categoryId: 'cat_biz_goods',
      note: '海賊王公仔與零食批發一箱',
    },
    {
      id: 'tx_m2_4',
      type: 'income',
      amount: 21800,
      date: `${m2}-28`,
      accountId: 'acc_claw_box',
      categoryId: 'cat_biz_rev',
      incomeKind: 'variable',
      note: '月底開箱收幣結算',
    },
    {
      id: 'tx_m2_5',
      type: 'transfer',
      amount: 10000,
      date: `${m2}-15`,
      accountId: 'acc_richart',
      toAccountId: 'acc_sinopac',
      note: '0050 定期定額扣款',
      recurringRuleId: 'rule_0050',
      periodKey: m2,
    },
    // 上月 (m1)
    {
      id: 'tx_m1_1',
      type: 'income',
      amount: 54000,
      date: `${m1}-05`,
      accountId: 'acc_richart',
      categoryId: 'cat_salary',
      incomeKind: 'fixed',
      note: '10月本業薪資',
      recurringRuleId: 'rule_salary',
      periodKey: m1,
    },
    {
      id: 'tx_m1_2',
      type: 'expense',
      amount: 7000,
      date: `${m1}-10`,
      accountId: 'acc_claw_box',
      categoryId: 'cat_biz_rent',
      note: '西門町雙機台場租',
      recurringRuleId: 'rule_claw_rent',
      periodKey: m1,
    },
    {
      id: 'tx_m1_3',
      type: 'expense',
      amount: 11200,
      date: `${m1}-14`,
      accountId: 'acc_claw_box',
      categoryId: 'cat_biz_goods',
      note: '吉伊卡哇正版吊飾補貨',
    },
    {
      id: 'tx_m1_4',
      type: 'income',
      amount: 26400,
      date: `${m1}-29`,
      accountId: 'acc_claw_box',
      categoryId: 'cat_biz_rev',
      incomeKind: 'variable',
      note: '連假檔期機台收幣',
    },
    {
      id: 'tx_m1_5',
      type: 'transfer',
      amount: 10000,
      date: `${m1}-15`,
      accountId: 'acc_richart',
      toAccountId: 'acc_sinopac',
      note: '0050 定期定額扣款',
      recurringRuleId: 'rule_0050',
      periodKey: m1,
    },
    {
      id: 'tx_m1_inst_1',
      type: 'expense',
      amount: 3300,
      date: `${m1}-20`,
      accountId: 'acc_cube',
      categoryId: 'cat_fun',
      note: 'iPhone 16 Pro 12期零利率',
      installmentGroupId: 'inst_iphone16',
      installmentIndex: 1,
      installmentTotal: 12,
    },
    // 單筆買進投資範例
    {
      id: 'tx_oneoff_1',
      type: 'transfer',
      amount: 45000,
      date: `${m1}-22`,
      accountId: 'acc_richart',
      toAccountId: 'acc_sinopac',
      isOneOffInvestment: true,
      assetKind: 'stock_etf',
      assetTitle: '台積電 (2330) 零股加碼',
      note: '回檔單筆加碼 45 股',
    },
    {
      id: 'tx_oneoff_2',
      type: 'transfer',
      amount: 20000,
      date: `${m0}-10`,
      accountId: 'acc_richart',
      toAccountId: 'acc_sinopac',
      isOneOffInvestment: true,
      assetKind: 'fund',
      assetTitle: '安聯台灣科技基金',
      note: '單筆申購科技基金',
    },
    // 本月 (m0)
    {
      id: 'tx_m0_1',
      type: 'income',
      amount: 54000,
      date: `${m0}-05`,
      accountId: 'acc_richart',
      categoryId: 'cat_salary',
      incomeKind: 'fixed',
      note: '本月本業薪資',
      recurringRuleId: 'rule_salary',
      periodKey: m0,
    },
    {
      id: 'tx_m0_2',
      type: 'expense',
      amount: 1200,
      date: `${m0}-03`,
      accountId: 'acc_richart',
      categoryId: 'cat_transport',
      note: 'TPASS 基北北桃都會通月票',
    },
    {
      id: 'tx_m0_3',
      type: 'expense',
      amount: 185,
      date: `${m0}-08`,
      accountId: 'acc_cash',
      categoryId: 'cat_food',
      note: '雞腿便當＋五十嵐四季春',
    },
    {
      id: 'tx_m0_4',
      type: 'expense',
      amount: 8600,
      date: `${m0}-11`,
      accountId: 'acc_claw_box',
      categoryId: 'cat_biz_goods',
      note: '五股倉庫批發盒玩與夾物',
    },
    {
      id: 'tx_m0_5',
      type: 'expense',
      amount: 650,
      date: `${m0}-13`,
      accountId: 'acc_claw_box',
      categoryId: 'cat_biz_maint',
      note: '更換爪子線圈與防甩片',
    },
    {
      id: 'tx_m0_6',
      type: 'income',
      amount: 14800,
      date: `${m0}-16`,
      accountId: 'acc_claw_box',
      categoryId: 'cat_biz_rev',
      incomeKind: 'variable',
      note: '上半月機台開箱收幣',
    },
    {
      id: 'tx_m0_7',
      type: 'income',
      amount: 3200,
      date: `${m0}-17`,
      accountId: 'acc_claw_box',
      categoryId: 'cat_biz_clear',
      incomeKind: 'variable',
      note: '臉書社團盤出滯銷盒玩',
    },
    {
      id: 'tx_m0_inst_2',
      type: 'expense',
      amount: 3300,
      date: `${m0}-20`,
      accountId: 'acc_cube',
      categoryId: 'cat_fun',
      note: 'iPhone 16 Pro 12期零利率',
      installmentGroupId: 'inst_iphone16',
      installmentIndex: 2,
      installmentTotal: 12,
    },
    {
      id: 'tx_m0_8',
      type: 'expense',
      amount: 1450,
      date: `${m0}-21`,
      accountId: 'acc_cube',
      categoryId: 'cat_home',
      note: '全聯採買日用品與鮮奶',
    },
    // 1. 與「我 ('SELF')」相關的代墊與雙向互抵範例
    {
      id: 'tx_debt_1',
      type: 'debt',
      amount: 2600,
      date: `${m0}-09`,
      accountId: 'acc_cube',
      payerName: 'SELF',
      debtorName: '阿哲',
      personName: '阿哲',
      debtDirection: 'i_lent',
      note: '幫墊居酒屋聚餐刷卡',
    },
    {
      id: 'tx_debt_2',
      type: 'debt',
      amount: 1100,
      date: `${m0}-14`,
      accountId: '',
      payerName: '阿哲',
      debtorName: 'SELF',
      personName: '阿哲',
      debtDirection: 'they_lent',
      categoryId: 'cat_home',
      note: '阿哲幫買日本合利他命',
    },
    {
      id: 'tx_debt_3',
      type: 'debt',
      amount: 3800,
      date: `${m0}-06`,
      accountId: 'acc_richart',
      payerName: 'SELF',
      debtorName: '小美',
      personName: '小美',
      debtDirection: 'i_lent',
      note: '代墊大巨蛋演唱會門票',
    },
    {
      id: 'tx_debt_4',
      type: 'repay',
      amount: 1800,
      date: `${m0}-12`,
      accountId: 'acc_richart',
      payerName: '小美',
      debtorName: 'SELF',
      personName: '小美',
      debtDirection: 'i_lent',
      note: '小美 LINE Pay 先還部分票款',
    },
    {
      id: 'tx_debt_5',
      type: 'debt',
      amount: 1500,
      date: `${m1}-18`,
      accountId: 'acc_cash',
      payerName: 'SELF',
      debtorName: '前場主阿凱',
      personName: '前場主阿凱',
      debtDirection: 'i_lent',
      note: '代墊機台搬運推車押金',
    },
    // 2. 他人之間 (A ↔ B) 第三方代墊範例
    {
      id: 'tx_debt_3p_1',
      type: 'debt',
      amount: 900,
      date: `${m0}-15`,
      accountId: '',
      payerName: '阿哲',
      debtorName: '小美',
      note: '聚餐續攤 KTV 阿哲先幫小美墊付',
    },
    {
      id: 'tx_debt_3p_2',
      type: 'debt',
      amount: 650,
      date: `${m0}-18`,
      accountId: '',
      payerName: '小華',
      debtorName: '阿哲',
      note: '露營食材與烤肉網分攤（小華先墊）',
    },
  ];

  return {
    accounts,
    categories,
    transactions,
    recurringRules,
  };
}

class LocalStorageRepository implements IStorageRepository {
  loadAll(): LedgerData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const demo = createDemoData();
        this.saveAll(demo);
        return demo;
      }
      const parsed = JSON.parse(raw) as LedgerData;
      if (!parsed.accounts || !parsed.categories || !parsed.transactions || !parsed.recurringRules) {
        const demo = createDemoData();
        this.saveAll(demo);
        return demo;
      }
      return parsed;
    } catch {
      const demo = createDemoData();
      this.saveAll(demo);
      return demo;
    }
  }

  saveAll(data: LedgerData): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save LedgerData to localStorage:', e);
    }
  }

  resetToDemo(): LedgerData {
    const demo = createDemoData();
    this.saveAll(demo);
    return demo;
  }

  clearAll(): LedgerData {
    const empty: LedgerData = {
      accounts: [
        {
          id: 'acc_default_cash',
          name: '隨身現金',
          type: 'cash',
          initialBalance: 0,
          isBusinessWorkingCapital: false,
          archived: false,
        },
      ],
      categories: createDefaultCategories(),
      transactions: [],
      recurringRules: [],
    };
    this.saveAll(empty);
    return empty;
  }

  exportJSON(data: LedgerData): string {
    return JSON.stringify(
      {
        app: 'SimpleLedger',
        version: '3.0.0',
        exportedAt: new Date().toISOString(),
        data,
      },
      null,
      2
    );
  }

  importJSON(jsonStr: string): LedgerData {
    const parsed = JSON.parse(jsonStr);
    const payload: LedgerData = parsed.data ? parsed.data : parsed;
    if (
      !Array.isArray(payload.accounts) ||
      !Array.isArray(payload.categories) ||
      !Array.isArray(payload.transactions) ||
      !Array.isArray(payload.recurringRules)
    ) {
      throw new Error('JSON 格式不符，缺少必要資料欄位');
    }
    this.saveAll(payload);
    return payload;
  }

  exportTransactionsCSV(data: LedgerData): string {
    const accountMap = new Map(data.accounts.map((a) => [a.id, a.name]));
    const categoryMap = new Map(data.categories.map((c) => [c.id, c.name]));

    const typeLabels: Record<string, string> = {
      expense: '支出',
      income: '收入',
      transfer: '轉帳',
      debt: '代墊/借貸',
      repay: '還款/核銷',
      adjustment: '餘額校正',
    };

    const headers = [
      '日期',
      '類型',
      '金額(NT$)',
      '主帳戶',
      '目標帳戶',
      '分類',
      '收入性質',
      '出錢方(Payer)',
      '分攤/欠款方(Debtor)',
      '單筆投資標的',
      '呆帳核銷',
      '分期進度',
      '備註',
    ];

    const escapeCSV = (val: string | number | undefined) => {
      if (val === undefined || val === null) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const sorted = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date));

    const rows = sorted.map((t) => {
      const instText =
        t.installmentTotal && t.installmentIndex
          ? `${t.installmentIndex}/${t.installmentTotal}`
          : '';
      const incText =
        t.incomeKind === 'fixed' ? '固定收入' : t.incomeKind === 'variable' ? '浮動收入' : '';
      const payerText =
        t.payerName === 'SELF' ? '我' : t.payerName || (t.debtDirection === 'i_lent' ? '我' : t.personName || '');
      const debtorText =
        t.debtorName === 'SELF' ? '我' : t.debtorName || (t.debtDirection === 'they_lent' ? '我' : t.personName || '');

      return [
        t.date,
        typeLabels[t.type] || t.type,
        t.amount,
        t.accountId ? accountMap.get(t.accountId) || t.accountId : '無(非本人帳戶)',
        t.toAccountId ? accountMap.get(t.toAccountId) || t.toAccountId : '',
        t.categoryId ? categoryMap.get(t.categoryId) || t.categoryId : '',
        incText,
        payerText,
        debtorText,
        t.isOneOffInvestment ? t.assetTitle || '單筆投入' : '',
        t.isBadDebtWriteOff ? '是' : '',
        instText,
        t.note,
      ]
        .map(escapeCSV)
        .join(',');
    });

    return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  }
}

export const StorageService: IStorageRepository = new LocalStorageRepository();
