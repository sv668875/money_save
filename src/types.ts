export type AccountType = 'bank' | 'cash' | 'business_cashbox' | 'investment' | 'crypto' | 'credit_card';
export type TransactionType = 'expense' | 'income' | 'transfer' | 'debt' | 'repay' | 'adjustment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number;
  isBusinessWorkingCapital: boolean; // true 代表營運周轉金（如娃娃機錢箱）
  archived: boolean;                 // 封存保護，已有交易禁止硬刪除
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  isBusiness: boolean;               // true 代表機台營運收支（貨款/台租/營收）
  icon: string;
  archived: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;                    // 正數金額（NT$）
  date: string;                      // YYYY-MM-DD
  accountId: string;                 // 主帳戶（支出/借出/轉出/校正）
  toAccountId?: string;              // 轉帳目標帳戶（若為 adjustment 且 toAccountId === accountId 代表調增，否則代表調減）
  categoryId?: string;
  incomeKind?: 'fixed' | 'variable'; // 區分固定 / 不固定收入
  note: string;
  // 代墊與雙向互抵欄位
  personName?: string;               // 對象姓名
  debtDirection?: 'i_lent' | 'they_lent'; // 我幫人墊(應收) / 別人幫我墊(應付)
  isBadDebtWriteOff?: boolean;       // 呆帳核銷標記
  // 定期 / 分期防重複與追蹤
  recurringRuleId?: string;
  periodKey?: string;                // 格式 YYYY-MM，搭配 ruleId 防止重複入帳
  installmentGroupId?: string;
  installmentIndex?: number;         // 第幾期
  installmentTotal?: number;         // 總期數
}

export interface RecurringRule {
  id: string;
  title: string;
  kind: 'fixed_income' | 'fixed_expense' | 'long_term_invest';
  amount: number;
  dayOfMonth: number;                // 每月扣款/轉帳日 (1-28)
  accountId: string;
  toAccountId?: string;              // 長期投入轉入帳戶（選填）
  categoryId?: string;
  paymentMode: 'auto' | 'manual';    // 自動扣款 / 手動轉帳
  status: 'active' | 'paused' | 'cancelled';
  pausedSince?: string;              // YYYY-MM-DD，用於計算「已暫停 X 個月」
  // 長期投入歷史接軌欄位
  initialInvestedAmount?: number;    // 既有已投入金額
  initialInvestedPeriods?: number;   // 既有已繳期數
  skippedPeriods: string[];          // 跳過的月份陣列 ['2026-11']
}

export interface LedgerData {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  recurringRules: RecurringRule[];
}

export type ActiveTab = 'overview' | 'ledger' | 'business' | 'debts' | 'recurring' | 'settings';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export interface ConfirmModalConfig {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}
