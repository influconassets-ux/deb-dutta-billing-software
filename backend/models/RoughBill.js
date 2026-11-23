const mongoose = require('mongoose');

const roughBillSchema = new mongoose.Schema({
  date: { type: String, required: true },
  court: { type: String },
  briefedBy: { type: String },
  client: { type: String },
  caseName: { type: String },
  caseNumber: { type: String },
  cor: { type: String },
  forum: { type: String },
  items: [{
    nature: { type: String },
    gm: { type: String },
    fees: { type: Number },
    actualGm: { type: String },
    actualFees: { type: Number },
    itemType: { type: String, enum: ['item', 'remarks'], default: 'item' }
  }],
  nilTotal: { type: Boolean, default: false },
  remarks: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RoughBill', roughBillSchema);
