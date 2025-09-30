type Invoice = {
  id: string;
  amount_cents: number;
  currency: string;
  customer_email?: string;
  status: "unpaid" | "paid";
  stripe_session_id?: string;
};

// ⚠️ Demo in-memory store. Replace with your DB (Prisma, Postgres, etc.)
const store = new Map<string, Invoice>();

export function upsertInvoice(inv: Invoice) {
  store.set(inv.id, inv);
}

export function getInvoice(id: string) {
  return store.get(id);
}

export function markInvoicePaid(id: string) {
  const inv = store.get(id);
  if (!inv) return;
  inv.status = "paid";
  store.set(id, inv);
}