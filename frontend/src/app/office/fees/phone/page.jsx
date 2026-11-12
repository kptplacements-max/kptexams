"use client";

// Scan with phone: the office person opens this page on the mobile (signed in
// with the same account as on the computer), photographs the challan, and
// presses Send. The reference number, amount and date are filled in the fee
// window open on the computer. Only the text read is sent – not the photo.

import { useRef, useState } from "react";

import { errMsg, useApi } from "../../../components/exams/shared";
import { scanChallanFast, scanReceipt } from "../../../components/exams/receiptScan";
import { useToast } from "../../../components/ui/Feedback";

const today = () => new Date().toISOString().slice(0, 10);
const box = "h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";

export default function PhoneScanPage() {
  const api = useApi();
  const toast = useToast();
  const fileRef = useRef(null);
  const [reading, setReading] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState(null); // { txnNo, amount, paidOn } after a photo
  const [last, setLast] = useState(""); // last number sent

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setReading(true);
    try {
      // the fixed places on the challan first (quick), the whole page if not found
      const r = (await scanChallanFast(file).catch(() => null)) || (await scanReceipt(file));
      setForm({ txnNo: r.txnNo || "", amount: r.amount || "", paidOn: r.paidOn || "" });
      if (!r.txnNo) toast.info("Could not read the reference number. Take the photo again (whole challan, straight, good light) or type it.");
    } catch {
      toast.error("Could not read the photo. Please take it again.");
    }
    setReading(false);
  };

  const send = async () => {
    setSending(true);
    try {
      const r = await api("post", "/phone-scans", form);
      toast.success(r.data.message || "Sent.");
      setLast(form.txnNo);
      setForm(null);
    } catch (e) {
      toast.error(errMsg(e, "Could not send. Please try again."));
    }
    setSending(false);
  };

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="text-xl font-bold tracking-tight text-slate-950">Scan with phone</h1>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        On the computer, open the student&apos;s fee window (<b>Details</b>). Then take the photo of the challan here and press <b>Send</b>. The details appear in
        that window.
      </p>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />

      {!form && (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={reading}
          className="mt-5 flex h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 text-blue-800 active:bg-blue-100 disabled:opacity-60"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-10 w-10" aria-hidden="true">
            <path d="M4 8h3l1.5-2h7L17 8h3v11H4z" strokeLinejoin="round" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          <span className="text-base font-bold">{reading ? "Reading the challan…" : "Take photo of the challan"}</span>
          {!reading && <span className="text-xs text-blue-700">Whole challan, upright, in good light</span>}
        </button>
      )}

      {form && (
        <div className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Challan ref. / UTR / receipt no.</span>
            <input value={form.txnNo} onChange={(e) => setForm({ ...form, txnNo: e.target.value })} spellCheck={false} className={`${box} mt-1 font-mono`} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">Amount (₹)</span>
              <input type="number" inputMode="decimal" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={`${box} mt-1`} />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">Paid on</span>
              <input
                type="date"
                value={form.paidOn}
                max={today()}
                onChange={(e) => setForm({ ...form, paidOn: e.target.value })}
                className={`${box} mt-1 ${form.paidOn ? "" : "border-amber-500 bg-amber-50"}`}
              />
            </label>
          </div>
          {!form.paidOn && <p className="text-xs font-semibold text-amber-700">The date could not be read – enter it, or enter it on the computer.</p>}
          {!form.amount && <p className="text-xs text-slate-500">Amount not read – the balance to pay is filled in on the computer.</p>}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button onClick={() => setForm(null)} disabled={sending} className="h-12 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700">
              Take again
            </button>
            <button
              onClick={send}
              disabled={sending || (!form.txnNo.trim() && form.amount === "")}
              className="h-12 rounded-xl bg-slate-950 text-sm font-bold text-white disabled:opacity-40"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}

      {last && !form && (
        <p className="mt-4 text-center text-sm text-emerald-700">
          Last sent: <b className="font-mono">{last}</b>
        </p>
      )}
    </div>
  );
}
