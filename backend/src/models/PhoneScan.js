import mongoose from "mongoose";

// A challan read on the office person's phone ("Scan with phone"), waiting to
// be filled into the fee window open on the same person's computer. Only the
// text that was read is kept (no photo), and only for a short while.
const phoneScanSchema = new mongoose.Schema(
  {
    user: { type: String, required: true }, // Clerk id – phone and computer signed in as the same person
    txnNo: { type: String, default: "", maxlength: 60 },
    amount: { type: Number, default: null },
    paidOn: { type: String, default: "" }, // yyyy-mm-dd
    taken: { type: Boolean, default: false }, // filled into the computer's window
    at: { type: Date, default: Date.now, expires: 30 * 60 }, // removed after 30 minutes
  },
  { versionKey: false }
);

phoneScanSchema.index({ user: 1, taken: 1, at: 1 });

export default mongoose.models.PhoneScan || mongoose.model("PhoneScan", phoneScanSchema);
