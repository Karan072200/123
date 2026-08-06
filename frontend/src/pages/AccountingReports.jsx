import React, { useState, useEffect, useCallback } from "react";
import { http, formatMoney, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  BookOpen, Calendar, Scale, TrendingUp, FileText, Landmark, Receipt, Download,
} from "lucide-react";

/**
 * Accounting Reports Workspace — Phase 5 MVP.
 *
 * Six reports on top of existing invoices + transactions + bank_payments + udhaar:
 *   1. Trial Balance
 *   2. Profit & Loss
 *   3. Balance Sheet
 *   4. Day Book (single day)
 *   5. Cash Book (period)
 *   6. GSTR-1 (outward supplies) + GSTR-3B (summary)
 */

const REPORTS = [
  { key: "trial-balance", label: "Trial Balance", icon: Scale },
  { key: "pnl", label: "Profit & Loss", icon: TrendingUp },
  { key: "balance-sheet", label: "Balance Sheet", icon: Landmark },
  { key: "day-book", label: "Day Book", icon: Calendar },
  { key: "cash-book", label: "Cash Book", icon: BookOpen },
  { key: "gstr-1", label: "GSTR-1", icon: FileText },
  { key: "gstr-3b", label: "GSTR-3B", icon: Receipt },
];

const today = () => new Date().toISOString().slice(0, 10);
const firstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

export default function AccountingReports() {
  const [reportKey, setReportKey] = useState("trial-balance");
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(today());
  const [asOf, setAsOf] = useState(today());
  const [onDate, setOnDate] = useState(today());
  const [month, setMonth] = useState(today().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const buildParams = useCallback(() => {
    switch (reportKey) {
      case "trial-balance":
      case "pnl":
      case "cash-book":
        return { from, to };
      case "balance-sheet":
        return { as_of: asOf };
      case "day-book":
        return { on: onDate };
      case "gstr-1":
      case "gstr-3b":
        return { month };
      default:
        return {};
    }
  }, [reportKey, from, to, asOf, onDate, month]);

  const runReport = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      const { data } = await http.get(`/reports/${reportKey}`, { params: buildParams() });
      setData(data);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  }, [reportKey, buildParams]);

  useEffect(() => { runReport(); }, [runReport]);

  const exportCsv = () => {
    if (!data) return;
    const rows = flattenForCsv(reportKey, data);
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportKey}-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] dark:bg-[#151312]" data-testid="accounting-reports-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-lg bg-[#2A4F4F] flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1C1917] font-heading">Accounting Reports</h1>
          </div>
          <p className="text-sm text-[#57534E]">Trial Balance, P&amp;L, Balance Sheet, Day Book, Cash Book, GSTR-1 / GSTR-3B</p>
        </div>

        {/* Report picker */}
        <div className="flex flex-wrap gap-2 mb-4">
          {REPORTS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setReportKey(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border transition-colors
                ${reportKey === key
                  ? "bg-[#2A4F4F] text-white border-[#2A4F4F]"
                  : "bg-white dark:bg-[#1E1B1A] text-[#1C1917] border-[#E7E5DF] hover:bg-[#F2F0EA] dark:hover:bg-[#262220]"}`}
              data-testid={`report-tab-${key}`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <Card className="p-4 mb-4 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]">
          <div className="flex flex-wrap items-end gap-3">
            {(reportKey === "trial-balance" || reportKey === "pnl" || reportKey === "cash-book") && (
              <>
                <div><Label className="text-xs text-[#57534E]">From</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-testid="report-from" /></div>
                <div><Label className="text-xs text-[#57534E]">To</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} data-testid="report-to" /></div>
              </>
            )}
            {reportKey === "balance-sheet" && (
              <div><Label className="text-xs text-[#57534E]">As of</Label><Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} data-testid="report-asof" /></div>
            )}
            {reportKey === "day-book" && (
              <div><Label className="text-xs text-[#57534E]">Date</Label><Input type="date" value={onDate} onChange={(e) => setOnDate(e.target.value)} data-testid="report-date" /></div>
            )}
            {(reportKey === "gstr-1" || reportKey === "gstr-3b") && (
              <div><Label className="text-xs text-[#57534E]">Month</Label><Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} data-testid="report-month" /></div>
            )}
            <Button onClick={runReport} className="bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white" data-testid="report-run">Run Report</Button>
            <Button onClick={exportCsv} variant="outline" disabled={!data} data-testid="report-export"><Download className="w-4 h-4 mr-1" /> Export CSV</Button>
          </div>
        </Card>

        {loading ? (
          <div className="text-sm text-[#57534E]">Loading…</div>
        ) : !data ? (
          <div className="text-sm text-[#78716C]">No data.</div>
        ) : (
          <ReportView reportKey={reportKey} data={data} />
        )}
      </div>
    </div>
  );
}

/* ================================ Views ================================ */

function ReportView({ reportKey, data }) {
  if (reportKey === "trial-balance") return <TrialBalanceView data={data} />;
  if (reportKey === "pnl") return <PnLView data={data} />;
  if (reportKey === "balance-sheet") return <BalanceSheetView data={data} />;
  if (reportKey === "day-book") return <DayBookView data={data} />;
  if (reportKey === "cash-book") return <CashBookView data={data} />;
  if (reportKey === "gstr-1") return <GSTR1View data={data} />;
  if (reportKey === "gstr-3b") return <GSTR3BView data={data} />;
  return null;
}

function TrialBalanceView({ data }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <ReportTable
        title={`Debit — ${formatMoney(data.debit_total)}`}
        rows={data.debit_rows}
        cols={[{ k: "account", h: "Account" }, { k: "amount", h: "Amount", money: true, right: true }]}
      />
      <ReportTable
        title={`Credit — ${formatMoney(data.credit_total)}`}
        rows={data.credit_rows}
        cols={[{ k: "account", h: "Account" }, { k: "amount", h: "Amount", money: true, right: true }]}
      />
      <div className="md:col-span-2 text-center text-sm text-[#57534E]" data-testid="tb-difference">
        Difference (Debit − Credit): <span className={`font-bold ${Math.abs(data.difference) < 0.01 ? "text-emerald-600" : "text-rose-600"}`}>{formatMoney(data.difference)}</span>
      </div>
    </div>
  );
}

function PnLView({ data }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Sales" value={formatMoney(data.sales)} tone="emerald" />
        <StatCard label="Purchases" value={formatMoney(data.purchases)} tone="rose" />
        <StatCard label="Gross Profit" value={formatMoney(data.gross_profit)} tone="blue" />
        <StatCard label="Net Profit" value={formatMoney(data.net_profit)} tone={data.net_profit >= 0 ? "emerald" : "rose"} testId="pnl-net-profit" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <ReportTable title={`Other Income · Total ${formatMoney(sum(data.other_income))}`} rows={data.other_income}
          cols={[{ k: "category", h: "Category" }, { k: "amount", h: "Amount", money: true, right: true }]}
        />
        <ReportTable title={`Expenses · Total ${formatMoney(sum(data.expenses))}`} rows={data.expenses}
          cols={[{ k: "category", h: "Category" }, { k: "amount", h: "Amount", money: true, right: true }]}
        />
      </div>
    </div>
  );
}

function BalanceSheetView({ data }) {
  const A = data.assets, L = data.liabilities;
  return (
    <div className="grid md:grid-cols-2 gap-4" data-testid="balance-sheet-view">
      <Card className="p-4 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]">
        <h3 className="font-heading font-semibold text-[#1C1917] mb-3">Assets</h3>
        <table className="w-full text-sm">
          <tbody>
            <BSRow label="Cash" val={A.cash} />
            <BSRow label="Bank" val={A.bank} />
            <BSRow label="Sundry Debtors" val={A.sundry_debtors} />
            <tr className="border-t border-[#E7E5DF] font-bold text-[#1C1917]"><td className="py-2">Total Assets</td><td className="py-2 text-right">{formatMoney(A.total)}</td></tr>
          </tbody>
        </table>
      </Card>
      <Card className="p-4 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]">
        <h3 className="font-heading font-semibold text-[#1C1917] mb-3">Liabilities &amp; Equity</h3>
        <table className="w-full text-sm">
          <tbody>
            <BSRow label="Sundry Creditors" val={L.sundry_creditors} />
            <tr className="border-t border-[#E7E5DF]"><td className="py-1.5">Owner&apos;s Equity</td><td className="py-1.5 text-right">{formatMoney(data.equity)}</td></tr>
            <tr className="border-t border-[#E7E5DF] font-bold text-[#1C1917]"><td className="py-2">Total L &amp; E</td><td className="py-2 text-right">{formatMoney(L.total + data.equity)}</td></tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function BSRow({ label, val }) {
  return <tr className="border-t border-[#E7E5DF]"><td className="py-1.5 text-[#57534E]">{label}</td><td className="py-1.5 text-right text-[#1C1917]">{formatMoney(val)}</td></tr>;
}

function DayBookView({ data }) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-[#57534E]">Date: <span className="font-semibold text-[#1C1917]">{data.date}</span></div>
      <ReportTable title={`Transactions (${data.counts.transactions})`} rows={data.transactions}
        cols={[
          { k: "date", h: "Date" },
          { k: "type", h: "Type" },
          { k: "category", h: "Category" },
          { k: "note", h: "Note" },
          { k: "amount", h: "Amount", money: true, right: true },
        ]}
      />
      <ReportTable title={`Invoices (${data.counts.invoices})`} rows={data.invoices}
        cols={[
          { k: "invoice_number", h: "Inv No" },
          { k: "party_name", h: "Party" },
          { k: "type", h: "Type" },
          { k: "grand_total", h: "Amount", money: true, right: true },
        ]}
      />
      <ReportTable title={`Bank Payments (${data.counts.bank_payments})`} rows={data.bank_payments}
        cols={[
          { k: "date", h: "Date" },
          { k: "party_name", h: "Party" },
          { k: "direction", h: "Direction" },
          { k: "amount", h: "Amount", money: true, right: true },
        ]}
      />
    </div>
  );
}

function CashBookView({ data }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Receipts" value={formatMoney(data.total_receipts)} tone="emerald" />
        <StatCard label="Payments" value={formatMoney(data.total_payments)} tone="rose" />
        <StatCard label="Closing" value={formatMoney(data.closing_balance)} tone="blue" testId="cb-closing" />
      </div>
      <ReportTable title="Movements" rows={data.rows}
        cols={[
          { k: "date", h: "Date" },
          { k: "type", h: "Type" },
          { k: "category", h: "Category" },
          { k: "note", h: "Note" },
          { k: "amount", h: "Amount", money: true, right: true },
        ]}
      />
    </div>
  );
}

function GSTR1View({ data }) {
  const T = data.totals?.all || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Invoices" value={T.count || 0} tone="blue" />
        <StatCard label="Taxable Value" value={formatMoney(T.taxable_value)} tone="emerald" />
        <StatCard label="CGST" value={formatMoney(T.cgst)} tone="amber" />
        <StatCard label="SGST" value={formatMoney(T.sgst)} tone="amber" />
        <StatCard label="IGST" value={formatMoney(T.igst)} tone="amber" />
      </div>
      <ReportTable title={`B2B (${data.b2b?.length || 0})`} rows={data.b2b}
        cols={[
          { k: "invoice_number", h: "Inv No" },
          { k: "date", h: "Date" },
          { k: "party_name", h: "Party" },
          { k: "gstin", h: "GSTIN" },
          { k: "taxable_value", h: "Taxable", money: true, right: true },
          { k: "cgst", h: "CGST", money: true, right: true },
          { k: "sgst", h: "SGST", money: true, right: true },
          { k: "igst", h: "IGST", money: true, right: true },
          { k: "grand_total", h: "Total", money: true, right: true },
        ]}
      />
      <ReportTable title={`B2C (${data.b2c?.length || 0})`} rows={data.b2c}
        cols={[
          { k: "invoice_number", h: "Inv No" },
          { k: "date", h: "Date" },
          { k: "party_name", h: "Party" },
          { k: "taxable_value", h: "Taxable", money: true, right: true },
          { k: "grand_total", h: "Total", money: true, right: true },
        ]}
      />
    </div>
  );
}

function GSTR3BView({ data }) {
  return (
    <div className="grid md:grid-cols-3 gap-4" data-testid="gstr3b-view">
      <Card className="p-4 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]">
        <h3 className="font-heading font-semibold text-[#1C1917] mb-3">Outward Supplies</h3>
        <ThreeRow label="Taxable" val={data.outward.taxable_value} />
        <ThreeRow label="CGST" val={data.outward.cgst} />
        <ThreeRow label="SGST" val={data.outward.sgst} />
        <ThreeRow label="IGST" val={data.outward.igst} />
      </Card>
      <Card className="p-4 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]">
        <h3 className="font-heading font-semibold text-[#1C1917] mb-3">Inward Supplies (ITC)</h3>
        <ThreeRow label="Taxable" val={data.inward_itc.taxable_value} />
        <ThreeRow label="CGST" val={data.inward_itc.cgst} />
        <ThreeRow label="SGST" val={data.inward_itc.sgst} />
        <ThreeRow label="IGST" val={data.inward_itc.igst} />
      </Card>
      <Card className="p-4 bg-[#2A4F4F] border-[#2A4F4F] text-white">
        <h3 className="font-heading font-semibold mb-3">Net Tax Liability</h3>
        <div className="text-3xl font-bold" data-testid="gstr3b-net-tax">{formatMoney(data.net_tax_liability)}</div>
        <div className="text-xs opacity-80 mt-2">= Outward tax − ITC</div>
      </Card>
    </div>
  );
}

function ThreeRow({ label, val }) {
  return (
    <div className="flex justify-between text-sm py-1 border-t border-[#E7E5DF] first:border-t-0">
      <span className="text-[#57534E]">{label}</span>
      <span className="font-semibold text-[#1C1917]">{formatMoney(val)}</span>
    </div>
  );
}

function StatCard({ label, value, tone = "blue", testId }) {
  const tones = {
    emerald: "bg-emerald-500/10 text-emerald-700",
    rose: "bg-rose-500/10 text-rose-700",
    blue: "bg-blue-500/10 text-blue-700",
    amber: "bg-amber-500/10 text-amber-700",
  };
  return (
    <Card className="p-4 bg-white dark:bg-[#1E1B1A] border-[#E7E5DF]" data-testid={testId}>
      <div className={`inline-block px-2 py-0.5 text-xs font-semibold rounded ${tones[tone]}`}>{label}</div>
      <div className="text-xl font-bold text-[#1C1917] mt-2">{value}</div>
    </Card>
  );
}

function ReportTable({ title, rows, cols }) {
  return (
    <Card className="bg-white dark:bg-[#1E1B1A] border-[#E7E5DF] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#E7E5DF] font-semibold text-[#1C1917]">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F2F0EA] dark:bg-[#262220] text-[#57534E]">
            <tr>
              {cols.map((c) => (<th key={c.k} className={`px-3 py-2 font-semibold ${c.right ? "text-right" : "text-left"}`}>{c.h}</th>))}
            </tr>
          </thead>
          <tbody>
            {(rows || []).length === 0 ? (
              <tr><td colSpan={cols.length} className="text-center py-6 text-[#78716C]">No data.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} className="border-t border-[#E7E5DF]">
                {cols.map((c) => (
                  <td key={c.k} className={`px-3 py-1.5 ${c.right ? "text-right" : "text-left"} ${c.money ? "text-[#1C1917] font-medium" : "text-[#57534E]"}`}>
                    {c.money ? formatMoney(r[c.k]) : (r[c.k] ?? "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function sum(rows) { return (rows || []).reduce((s, r) => s + Number(r.amount || 0), 0); }

function flattenForCsv(reportKey, data) {
  const out = [];
  const push = (arr) => out.push(arr);
  push([`Report: ${reportKey}`, new Date().toISOString()]);
  push([]);
  if (reportKey === "trial-balance") {
    push(["--- DEBIT ---"]);
    push(["Account", "Amount"]);
    data.debit_rows?.forEach((r) => push([r.account, r.amount]));
    push([]);
    push(["--- CREDIT ---"]);
    push(["Account", "Amount"]);
    data.credit_rows?.forEach((r) => push([r.account, r.amount]));
  } else if (reportKey === "pnl") {
    push(["Sales", data.sales]);
    push(["Purchases", data.purchases]);
    push(["Gross Profit", data.gross_profit]);
    push(["Net Profit", data.net_profit]);
    push([]);
    push(["--- OTHER INCOME ---"]);
    data.other_income?.forEach((r) => push([r.category, r.amount]));
    push([]);
    push(["--- EXPENSES ---"]);
    data.expenses?.forEach((r) => push([r.category, r.amount]));
  } else if (reportKey === "balance-sheet") {
    push(["Cash", data.assets.cash]);
    push(["Bank", data.assets.bank]);
    push(["Debtors", data.assets.sundry_debtors]);
    push(["Total Assets", data.assets.total]);
    push([]);
    push(["Creditors", data.liabilities.sundry_creditors]);
    push(["Equity", data.equity]);
  } else if (reportKey === "day-book") {
    push(["--- TRANSACTIONS ---"]);
    push(["Type", "Category", "Note", "Amount"]);
    data.transactions?.forEach((r) => push([r.type, r.category, r.note, r.amount]));
    push([]);
    push(["--- INVOICES ---"]);
    push(["Inv No", "Party", "Type", "Total"]);
    data.invoices?.forEach((r) => push([r.invoice_number, r.party_name, r.type, r.grand_total]));
  } else if (reportKey === "cash-book") {
    push(["Receipts", data.total_receipts]);
    push(["Payments", data.total_payments]);
    push(["Closing", data.closing_balance]);
    push([]);
    push(["Date", "Type", "Category", "Amount"]);
    data.rows?.forEach((r) => push([r.date, r.type, r.category, r.amount]));
  } else if (reportKey === "gstr-1") {
    push(["--- B2B ---"]);
    push(["Inv No", "Date", "Party", "GSTIN", "Taxable", "CGST", "SGST", "IGST", "Total"]);
    data.b2b?.forEach((r) => push([r.invoice_number, r.date, r.party_name, r.gstin, r.taxable_value, r.cgst, r.sgst, r.igst, r.grand_total]));
    push([]);
    push(["--- B2C ---"]);
    data.b2c?.forEach((r) => push([r.invoice_number, r.date, r.party_name, "", r.taxable_value, r.cgst, r.sgst, r.igst, r.grand_total]));
  } else if (reportKey === "gstr-3b") {
    push(["--- OUTWARD ---"]);
    Object.entries(data.outward).forEach(([k, v]) => push([k, v]));
    push([]);
    push(["--- INWARD ITC ---"]);
    Object.entries(data.inward_itc).forEach(([k, v]) => push([k, v]));
    push([]);
    push(["Net Tax Liability", data.net_tax_liability]);
  }
  return out;
}
