// Single source of truth for a bill's total.
//
// A bill can be NIL in two ways:
//  1. Waived  - admin switched on "NIL bill" (bill.nilTotal). Items keep their GM/fees,
//               but the payable total is NIL (no money is charged to the client).
//  2. All-NIL - every item's GM/fees was typed as "NIL".

export const isNilValue = (v) => typeof v === 'string' && v.trim().toLowerCase() === 'nil';

// An item printed as NIL on the bill
export const isNilItem = (item) => !!item && item.itemType !== 'remarks' && (isNilValue(item.gm) || isNilValue(item.fees));

const toNum = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, '').trim());
  return isNaN(n) ? 0 : n;
};

// Admin-only: the real value recorded against NIL items. Never printed on bills.
export const getActualFees = (item) => (isNilItem(item) ? toNum(item.actualFees) : 0);
// Value not charged for one item:
//  - a NIL item         -> its admin-recorded actual fees
//  - any item on a bill marked "NIL Bill" (waived) -> the fees entered for it
export const getForgoneFees = (item, waived = false) => {
  if (!item || item.itemType === 'remarks') return 0;
  if (isNilItem(item)) return getActualFees(item);
  return waived ? toNum(item.fees) : 0;
};
// Items that belong in the admin "NIL Actual" view
export const getForgoneItems = (bill = {}) =>
  (bill.items || []).filter(it => it && it.itemType !== 'remarks' && (isNilItem(it) || (bill.nilTotal && toNum(it.fees) > 0)));

export const sumUnbilled = (items = [], waived = false) => items.reduce((acc, item) => acc + getForgoneFees(item, waived), 0);

export const sumFees = (items = []) =>
  items.reduce((acc, item) => acc + (item?.itemType === 'remarks' ? 0 : (Number(item?.fees) || 0)), 0);

export const getBillTotals = (bill = {}) => {
  const items = Array.isArray(bill.items) ? bill.items : [];
  const itemsTotal = sumFees(items);
  const waived = !!bill.nilTotal;
  const allNilItems = items.length > 0 && items.every(i => isNilValue(i.gm) || isNilValue(i.fees));
  const isNil = waived || (itemsTotal === 0 && allNilItems);
  return {
    itemsTotal,                    // sum of the fees as entered
    total: waived ? 0 : itemsTotal, // amount actually payable
    isNil,                         // show "NIL" instead of a number
    waived,                        // NIL because admin waived the fees
    unbilled: sumUnbilled(items, waived) // admin-only: full value not charged (NIL items + waived bill)
  };
};
