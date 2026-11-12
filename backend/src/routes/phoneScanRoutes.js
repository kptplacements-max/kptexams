// "Scan with phone": the office person photographs the challan on the phone
// (signed in with the same account); the computer's open fee window picks it up.
//
//   POST /api/phone-scans        { txnNo, amount, paidOn }  – from the phone
//   POST /api/phone-scans/next                              – the computer: the oldest
//        waiting scan of this person (then marked taken), or null

import express from "express";

import { authenticateUser } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/requireRole.js";
import PhoneScan from "../models/PhoneScan.js";

const router = express.Router();
const FEES = requireRole("office", "coe", "acoe", "admin");

router.post("/", authenticateUser, FEES, async (req, res) => {
  const txnNo = String(req.body?.txnNo || "").trim().toUpperCase();
  const raw = req.body?.amount;
  const amount = raw === "" || raw == null ? null : Number(raw);
  const paidOn = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.paidOn || "")) ? String(req.body.paidOn) : "";
  if (!txnNo && amount === null) return res.status(400).json({ error: "Nothing was read – type the number or take the photo again." });
  if (txnNo.length > 60) return res.status(400).json({ error: "Transaction number is too long." });
  if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 1000000)) return res.status(400).json({ error: "Amount is not valid." });
  // a scan not picked up yet is replaced, so the computer never fills an old one
  await PhoneScan.deleteMany({ user: req.user.id, taken: false });
  await PhoneScan.create({ user: req.user.id, txnNo, amount, paidOn });
  res.json({ message: "Sent. It is filled in on the computer's open fee window." });
});

router.post("/next", authenticateUser, FEES, async (req, res) => {
  const scan = await PhoneScan.findOneAndUpdate(
    { user: req.user.id, taken: false, at: { $gt: new Date(Date.now() - 10 * 60 * 1000) } },
    { $set: { taken: true } },
    { sort: { at: 1 }, new: true }
  ).lean();
  res.json({ data: scan ? { txnNo: scan.txnNo, amount: scan.amount, paidOn: scan.paidOn } : null });
});

export default router;
