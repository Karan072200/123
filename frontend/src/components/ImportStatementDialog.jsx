import React, { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, http, formatMoney, formatApiError } from "@/lib/api";
import { UploadCloud, FileText, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function ImportStatementDialog({ open, onOpenChange, accounts, onDone }) {
  const fileRef = useRef(null);
  const [accountId, setAccountId] = useState("");
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState(null); // null = not parsed yet
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null);
      setRows(null);
      setAccountId(accounts?.[0]?.id || "");
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [open, accounts]);

  const parse = async () => {
    if (!accountId) return toast.error("Pehle account choose karo");
    if (!file) return toast.error("Statement file choose karo (CSV ya PDF)");
    setParsing(true);
    try {
      const form = new FormData();
      form.append("account_id", accountId);
      form.append("file", file);
      const { data } = await http.post("/transactions/parse-statement", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!data.transactions || data.transactions.length === 0) {
        toast(data.message || "Koi transaction nahi mila is file mein", { duration: 5000 });
        setRows([]);
        return;
      }
      setRows(
        data.transactions.map((t, i) => ({
          ...t,
          _id: i,
          include: !t.possible_duplicate,
        }))
      );
      toast.success(`${data.count} transactions mile — check kar ke import karo`);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Parse nahi ho paya. File format check karo.");
    } finally {
      setParsing(false);
    }
  };

  const updateRow = (id, field, value) =>
    setRows((r) => r.map((row) => (row._id === id ? { ...row, [field]: value } : row)));

  const confirmImport = async () => {
    const selected = rows.filter((r) => r.include);
    if (selected.length === 0) return toast.error("Kam se kam ek transaction select karo");
    setSaving(true);
    try {
      const { data } = await http.post("/transactions/confirm-import", {
        account_id: accountId,
        transactions: selected.map(({ date, type, amount, category, note }) => ({
          date, type, amount: Number(amount), category, note,
        })),
      });
      toast.success(`${data.inserted} transactions import ho gaye! 🎉`);
      onOpenChange(false);
      onDone?.();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Import nahi ho paya");
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = rows?.filter((r) => r.include).length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Bank Statement Import Karo</DialogTitle>
          <DialogDescription>
            Kisi bhi bank ka CSV ya PDF statement upload karo — transactions apne aap detect ho jayenge.
          </DialogDescription>
        </DialogHeader>

        {rows === null ? (
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger data-testid="import-account-select" className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(accounts || []).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold tracking-widest uppercase text-[#78716C]">Statement File</Label>
              <label
                htmlFor="statement-file-input"
                className="mt-1.5 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#E7E5DF] rounded-xl p-8 cursor-pointer hover:border-[#2A4F4F]/40 hover:bg-[#F2F0EA] transition-colors"
              >
                {file ? (
                  <>
                    <FileText className="w-8 h-8 text-[#2A4F4F]" />
                    <span className="text-sm font-medium text-[#1C1917]">{file.name}</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-[#A8A29E]" />
                    <span className="text-sm text-[#57534E]">CSV ya PDF file yahan upload karo</span>
                  </>
                )}
              </label>
              <input
                id="statement-file-input"
                ref={fileRef}
                type="file"
                accept=".csv,.pdf"
                data-testid="import-file-input"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <Button onClick={parse} disabled={parsing}
              data-testid="import-parse-btn"
              className="w-full bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-11">
              {parsing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Parse ho raha…</> : "Statement Parse Karo"}
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-[#78716C] bg-[#F2F0EA] rounded-xl p-8 text-center mt-2">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-[#A8A29E]" />
            Koi transaction detect nahi hua. Ek alag file try karo ya manually add karo.
            <div className="mt-3">
              <Button variant="outline" size="sm" onClick={() => setRows(null)} className="rounded-full">
                Wapas jao
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 mt-1">
            <div className="text-sm text-[#57534E]">
              <span className="font-semibold text-[#1C1917]">{selectedCount}</span> / {rows.length} transactions select kiye hain
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {rows.map((r) => (
                <div key={r._id}
                  data-testid={`import-row-${r._id}`}
                  className={`border rounded-lg p-3 space-y-2 ${r.include ? "border-[#E7E5DF] bg-white" : "border-[#E7E5DF] bg-[#F2F0EA]/60 opacity-60"}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={r.include}
                      data-testid={`import-row-include-${r._id}`}
                      onChange={(e) => updateRow(r._id, "include", e.target.checked)}
                      className="w-4 h-4 accent-[#2A4F4F]" />
                    <span className="text-xs text-[#78716C] flex-1">{r.date}</span>
                    {r.possible_duplicate && (
                      <Badge className="bg-[#D96C52]/10 text-[#B15039] border border-[#D96C52]/30 text-xs">
                        Possible Duplicate
                      </Badge>
                    )}
                    <span className={`text-sm font-semibold ${r.type === "income" ? "text-[#3B6446]" : "text-[#B15039]"}`}>
                      {r.type === "income" ? "+" : "-"}{formatMoney(r.amount)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Select value={r.type} onValueChange={(v) => updateRow(r._id, "type", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Aaya</SelectItem>
                        <SelectItem value="expense">Gaya</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={r.category} onValueChange={(v) => updateRow(r._id, "category", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES[r.type].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input value={r.note} onChange={(e) => updateRow(r._id, "note", e.target.value)}
                      className="h-8 text-xs" placeholder="Note" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRows(null)} className="rounded-full">
                Wapas
              </Button>
              <Button onClick={confirmImport} disabled={saving || selectedCount === 0}
                data-testid="import-confirm-btn"
                className="flex-1 bg-[#2A4F4F] hover:bg-[#1F3B3B] text-white rounded-full h-11">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Import ho raha…</>
                  : <><CheckCircle2 className="w-4 h-4 mr-2" /> {selectedCount} Transactions Import Karo</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
