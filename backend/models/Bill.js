const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  date: { type: String, required: true },
  memoNo: { type: String },
  court: { type: String },
  briefedBy: { type: String },
  client: { type: String },
  caseName: { type: String },
  caseType: { type: String },
  party1: { type: String },
  party2: { type: String },
  othersText: { type: String },
  caseNumber: { type: String },
  cor: { type: String },
  forum: { type: String },
  items: [{
    nature: { type: String },
    gm: { type: String },
    fees: { type: Number },
    // Admin-only record of the real value of an item billed as NIL. Never printed.
    actualGm: { type: String },
    actualFees: { type: Number },
    itemType: { type: String, enum: ['item', 'remarks'], default: 'item' }
  }],
  // Fees stay listed item-wise, but the bill total is shown as NIL (client is not charged)
  nilTotal: { type: Boolean, default: false },
  status: { type: String, default: 'Due' },
  amountReceived: { type: Number, default: 0 },
  billsProvided: { type: String, default: 'No' },
  remarks: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

billSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Bill', billSchema);
