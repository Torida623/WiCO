import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPENSE_STORAGE_KEY = 'wico:expense-entries';
const LIVING_COST_STORAGE_KEY = 'wico:living-costs';

export type ExpenseCategory = 'food' | 'other';

export type ExpenseEntry = {
  id: string;
  amount: number;
  category: ExpenseCategory;
  memo?: string;
  createdAt: string;
};

export type NewExpenseEntryInput = {
  amount: number;
  category: ExpenseCategory;
  memo?: string;
  /** Defaults to now. Pass this when the spend actually happened earlier (e.g. a receipt scanned days after the purchase), so it lands in the correct month. */
  occurredAt?: Date;
};

// 毎月1日の「リセット」は明示的な操作としては行わない。月ごとにレコードを分けて
// 持つことで、新しい月に入った瞬間、自然と入力欄が空(＝前月のプレースホルダーだけ
// 見える状態)になる。
export type LivingCostRecord = {
  month: string;
  amounts: Record<string, number>;
};

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getPreviousMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return getMonthKey(new Date(year, month - 2, 1));
}

async function readExpenseEntries(): Promise<ExpenseEntry[]> {
  const raw = await AsyncStorage.getItem(EXPENSE_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ExpenseEntry[];
  } catch {
    return [];
  }
}

async function writeExpenseEntries(entries: ExpenseEntry[]): Promise<void> {
  await AsyncStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(entries));
}

export async function listExpenseEntries(monthKey: string): Promise<ExpenseEntry[]> {
  const entries = await readExpenseEntries();
  return entries
    .filter((entry) => getMonthKey(new Date(entry.createdAt)) === monthKey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addExpenseEntry(input: NewExpenseEntryInput): Promise<ExpenseEntry> {
  const entry: ExpenseEntry = {
    id: generateId(),
    amount: input.amount,
    category: input.category,
    memo: input.memo,
    createdAt: (input.occurredAt ?? new Date()).toISOString(),
  };
  const entries = await readExpenseEntries();
  entries.push(entry);
  await writeExpenseEntries(entries);
  return entry;
}

export async function deleteExpenseEntry(id: string): Promise<void> {
  const entries = await readExpenseEntries();
  await writeExpenseEntries(entries.filter((entry) => entry.id !== id));
}

async function readLivingCostRecords(): Promise<LivingCostRecord[]> {
  const raw = await AsyncStorage.getItem(LIVING_COST_STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LivingCostRecord[];
  } catch {
    return [];
  }
}

async function writeLivingCostRecords(records: LivingCostRecord[]): Promise<void> {
  await AsyncStorage.setItem(LIVING_COST_STORAGE_KEY, JSON.stringify(records));
}

export async function getLivingCostRecord(monthKey: string): Promise<LivingCostRecord | undefined> {
  const records = await readLivingCostRecords();
  return records.find((record) => record.month === monthKey);
}

export async function setLivingCostAmount(
  monthKey: string,
  itemId: string,
  amount: number,
): Promise<LivingCostRecord> {
  const records = await readLivingCostRecords();
  const existing = records.find((record) => record.month === monthKey);
  if (existing) {
    existing.amounts = { ...existing.amounts, [itemId]: amount };
  } else {
    records.push({ month: monthKey, amounts: { [itemId]: amount } });
  }
  await writeLivingCostRecords(records);
  return (await getLivingCostRecord(monthKey))!;
}

export type MonthSummary = {
  monthKey: string;
  foodTotal: number;
  otherTotal: number;
  livingCostTotal: number;
  totalSpent: number;
  engelRatio: number | null;
};

function sumAmounts(record: LivingCostRecord | undefined): number {
  if (!record) return 0;
  return Object.values(record.amounts).reduce((sum, value) => sum + value, 0);
}

export async function getMonthSummary(monthKey: string): Promise<MonthSummary> {
  const [entries, livingCostRecord] = await Promise.all([
    listExpenseEntries(monthKey),
    getLivingCostRecord(monthKey),
  ]);
  const foodTotal = entries.filter((entry) => entry.category === 'food').reduce((sum, e) => sum + e.amount, 0);
  const otherTotal = entries.filter((entry) => entry.category === 'other').reduce((sum, e) => sum + e.amount, 0);
  const livingCostTotal = sumAmounts(livingCostRecord);
  const totalSpent = foodTotal + otherTotal + livingCostTotal;

  return {
    monthKey,
    foodTotal,
    otherTotal,
    livingCostTotal,
    totalSpent,
    engelRatio: totalSpent > 0 ? foodTotal / totalSpent : null,
  };
}

export function formatYen(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  const digits = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${digits}円`;
}

export function formatYenDiff(diff: number): string {
  const rounded = Math.round(diff);
  if (rounded === 0) return '±0円';
  const sign = rounded > 0 ? '＋' : '−';
  return `${sign}${formatYen(Math.abs(rounded))}`;
}
