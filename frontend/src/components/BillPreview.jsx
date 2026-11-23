import React, { useRef } from 'react';
import { numberToWords } from '../utils/numberToWords';
import { getBillTotals, isNilValue } from '../utils/billTotals';
import { toTitleCase, splitCaseName } from '../utils/caseHelper';

const renderCaseName = (caseName) => {
  if (!caseName) return '';
  const titleCased = toTitleCase(caseName);
  const split = splitCaseName(titleCased);
  if (split) {
    return (
      <>
        {split.p1}
        <br />-Vs-<br />
        {split.p2}
      </>
    );
  }
  return titleCased;
};

const splitTextIntoLines = (text, maxChars = 45) => {
  if (!text) return [];
  const rawParagraphs = text.split('\n');
  const result = [];

  rawParagraphs.forEach(para => {
    let current = para.trim();
    if (!current) return;

    while (current.length > maxChars) {
      const slice = current.substring(0, maxChars + 1);

      // 1. Look for comma near the end of slice
      let splitAt = slice.lastIndexOf(',');
      if (splitAt > 18) {
        splitAt = splitAt + 1; // Include the comma on this line
      } else {
        // 2. Look for slash " / "
        splitAt = slice.lastIndexOf('/');
        if (splitAt > 18) {
          splitAt = splitAt + 1;
        } else {
          // 3. Look for space
          splitAt = slice.lastIndexOf(' ');
          if (splitAt <= 12) {
            const nextSpace = current.indexOf(' ', maxChars);
            if (nextSpace !== -1 && nextSpace <= maxChars + 15) {
              splitAt = nextSpace;
            } else {
              splitAt = maxChars;
            }
          }
        }
      }

      const chunk = current.substring(0, splitAt).trim();
      if (chunk) result.push(chunk);
      current = current.substring(splitAt).trim();
    }

    if (current) {
      result.push(current);
    }
  });

  return result;
};

const renderWrappedLines = (text, maxChars = 45) => {
  if (!text || !text.trim()) return '';
  const lines = splitTextIntoLines(text, maxChars);
  return lines.map((line, idx) => (
    <React.Fragment key={idx}>
      {idx > 0 && <br />}
      {line}
    </React.Fragment>
  ));
};

// Reads edited text back out of a data-field tagged element, collapsing any
// line breaks the browser inserted while the user typed into contentEditable.
const readField = (root, field, { preserveNewlines = false } = {}) => {
  const el = root.querySelector(`[data-field="${field}"]`);
  if (!el) return '';
  const text = el.innerText || '';
  return (preserveNewlines ? text : text.replace(/\s*\n+\s*/g, ' ')).trim();
};

export default function BillPreview({ settings, bill, onFieldClick = null, onSave = null }) {
  const containerRef = useRef(null);

  const handleBlurSave = async () => {
    if (!onSave) return;
    const root = containerRef.current;
    if (!root) return;

    const natureEls = root.querySelectorAll('[data-field="item-nature"]');
    const gmEls = root.querySelectorAll('[data-field="item-gm"]');
    const feesEls = root.querySelectorAll('[data-field="item-fees"]');
    const items = Array.from(natureEls).map((el, i) => {
      const feesText = feesEls[i] ? (feesEls[i].innerText || '') : '';
      const feesNum = Number(feesText.replace(/[^\d.]/g, ''));
      // Merge onto the original item so fields that aren't printed (itemType,
      // admin-only actual GM/fees) survive an inline edit.
      return {
        ...(bill.items[i] || {}),
        nature: (el.innerText || '').trim(),
        gm: gmEls[i] ? (gmEls[i].innerText || '').trim() : '',
        fees: isNaN(feesNum) ? 0 : feesNum
      };
    });

    const updated = {
      ...bill,
      briefedBy: readField(root, 'briefedBy'),
      date: readField(root, 'date'),
      cor: readField(root, 'cor'),
      court: readField(root, 'court'),
      memoNo: readField(root, 'memoNo'),
      client: readField(root, 'client', { preserveNewlines: true }),
      caseName: readField(root, 'caseName'),
      caseNumber: readField(root, 'caseNumber'),
      items: items.length > 0 ? items : bill.items
    };

    await onSave(updated);
  };
  // Interactive click-to-edit helper
  const interactiveProps = (fieldKey, title) => {
    if (!onFieldClick) return {};
    return {
      onClick: (e) => {
        e.stopPropagation();
        onFieldClick(fieldKey);
      },
      title: `Click to edit ${title} in form`,
      className: 'interactive-preview-field',
      onMouseEnter: (e) => {
        e.currentTarget.style.backgroundColor = 'rgba(212, 175, 55, 0.15)';
        e.currentTarget.style.outline = '1px dashed #D4AF37';
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
        e.currentTarget.style.outline = 'none';
      }
    };
  };

  // Calculate total fees
  const { total, isNil: allNil } = getBillTotals(bill);
  const totalInWords = numberToWords(total);

  const itemCount = bill.items.length || 0;
  const isCompact = itemCount >= 4;
  const isVeryCompact = itemCount >= 6;

  const verticalPadding = '1.2cm';
  const headerMargin = '10px';
  const tableMargin = '15px';
  const bottomMargin = '15px';
  const rowPadding = '10px 8px';
  const rowSpanPadding = '10px';
  const clerkMarginTop = '10px';
  
  // Only minimize the table dynamically to prevent structure breaks
  let tableZoom = 1;
  if (itemCount >= 6) {
    tableZoom = 0.75;
  } else if (itemCount >= 4) {
    tableZoom = 0.85;
  } else if (itemCount >= 2) {
    tableZoom = 0.92;
  }

  return (
    <>
      <style>
        {`
          .bill-paper, .bill-paper * {
            font-family: "Bookman Old Style", Georgia, serif;
            font-variant-numeric: lining-nums;
            line-height: 1.15;
            text-transform: capitalize;
          }
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body, html {
              margin: 0 !important;
              padding: 0 !important;
              height: 100% !important;
              -webkit-print-color-adjust: exact;
            }
            .bill-paper {
              width: 210mm !important;
              height: 282mm !important;
              max-height: 282mm !important;
              min-height: 282mm !important;
              padding: 1cm 2cm 0.8cm 2cm !important;
              box-sizing: border-box !important;
              margin: 0 auto !important;
              box-shadow: none !important;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
              overflow: visible !important;
            }
          }
        `}
      </style>
      <div
        ref={containerRef}
        id={`bill-content-${bill._id || bill.id}`}
        className="bill-paper"
        contentEditable={true}
        suppressContentEditableWarning={true}
        onBlur={handleBlurSave}
        style={{
          padding: `1.2cm 2.2cm 1cm 2.2cm`,
          backgroundColor: 'white',
          color: 'black',
          width: '210mm',
          minWidth: '210mm',
          maxWidth: '210mm',
          height: '282mm', /* Leaves full margin for browser print header/footer margins */
          margin: '0 auto',
          position: 'relative',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          caretColor: 'black',
          cursor: 'default',
          outline: 'none'
        }}
      >
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: headerMargin, fontFamily: '"Times New Roman", Times, serif' }}>
          <div style={{ fontSize: '20pt', marginBottom: '3pt', color: 'black', fontWeight: 'normal' }}>
            {toTitleCase(settings.advocateName)}
          </div>
          <div style={{ fontSize: '16pt', marginBottom: '3pt', color: 'black', fontWeight: 'normal' }}>
            {toTitleCase(settings.designation)},
          </div>
          <div style={{ fontSize: '20pt', color: 'black', fontWeight: 'normal' }}>
            {toTitleCase(settings.court)}.
          </div>
        </div>

        {/* Thin Horizontal Line */}
        <div style={{ borderBottom: '1px solid black', marginBottom: '15px', width: '100%' }} />

        {/* Briefed by */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px', marginBottom: '15px', fontSize: '13pt' }}>
          <div {...interactiveProps('briefedBy', 'Briefed by')} style={{ textAlign: 'right', padding: '2px 4px', borderRadius: '4px' }}>
            <span>Briefed by:</span>
            <span data-field="briefedBy" style={{ marginLeft: '10px' }}>{toTitleCase(bill.briefedBy)}</span>
            <br />
            <span>Advocate</span>
          </div>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{
            fontSize: '14pt',
            fontFamily: '"Times New Roman", Times, serif',
            fontWeight: '900',
            WebkitTextStroke: '0.3px black',
            letterSpacing: '10px',
            wordSpacing: '40px',
            borderBottom: '2px solid black',
            paddingBottom: '4px',
            paddingLeft: '15px',
            paddingRight: '25px', /* offsets the letterSpacing on the last char and adds extra width */
            display: 'inline-block',
            whiteSpace: 'nowrap'
          }}>
            MEMORANDUM OF FEES
          </span>
        </div>

        {/* Metadata */}
        <div style={{ textAlign: 'right', marginBottom: headerMargin, fontSize: '12pt' }}>
          <div>
            <span {...interactiveProps('date', 'Date')} style={{ display: 'inline-block', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
              <span style={{ paddingRight: '5px' }}>Date:</span>
              <span data-field="date">{bill.date}</span>
            </span>
          </div>
          <div>
            <span {...interactiveProps('cor', 'Honorable Judge / Court')} style={{
              display: 'inline-block',
              maxWidth: '100%',
              lineHeight: '1.25',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'normal',
              textAlign: 'right',
              marginTop: '2px',
              marginBottom: '2px',
              padding: '2px 4px',
              borderRadius: '4px'
            }}>
              <span style={{ paddingRight: '5px' }}>Cor. / Court:</span>
              <span data-field="cor">{renderWrappedLines(bill.cor, 40)}</span>
              {bill.cor && bill.court ? ' / ' : ''}
              <span data-field="court">{renderWrappedLines(bill.court, 40)}</span>
            </span>
          </div>
          <div>
            <span {...interactiveProps('forum', 'Forum')} style={{
              display: 'inline-block',
              maxWidth: '100%',
              lineHeight: '1.25',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'normal',
              textAlign: 'right',
              marginTop: '2px',
              marginBottom: '2px',
              padding: '2px 4px',
              borderRadius: '4px'
            }}>
              <span style={{ paddingRight: '5px' }}>Forum:</span>
              <span data-field="forum">{renderWrappedLines(bill.forum, 40)}</span>
            </span>
          </div>
          <div>
            <span {...interactiveProps('memoNo', 'Memo No.')} style={{ display: 'inline-block', padding: '2px 4px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
              <span style={{ paddingRight: '5px' }}>Memo No.</span>
              <span data-field="memoNo">{bill.memoNo}</span>
            </span>
          </div>
        </div>

        {/* Table Section */}
        <div style={{ marginBottom: tableMargin, display: 'flex', justifyContent: 'center', flexGrow: 1, minHeight: 0 }}>
          <table style={{ zoom: tableZoom, width: '88%', borderCollapse: 'collapse', textAlign: 'center', border: '1px solid black', fontSize: '12pt', height: '100%' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid black', padding: '8px', fontWeight: 'normal' }}>Client</th>
                <th style={{ border: '1px solid black', padding: '8px', fontWeight: 'normal' }}>Name of the case</th>
                <th style={{ border: '1px solid black', padding: '8px', fontWeight: 'normal' }}>Nature of<br />Brief</th>
                <th style={{ border: '1px solid black', padding: '8px', fontWeight: 'normal' }}>GM</th>
                <th style={{ border: '1px solid black', padding: '8px', fontWeight: 'normal' }}>Fees<br />(Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.length > 0 ? (
                <>
                  {bill.items.map((item, index) => {
                    const needsSpacer = true;
                    return (
                      <tr key={index}>
                        {index === 0 && (
                          <td {...interactiveProps('client', 'Client Name')} rowSpan={bill.items.length + (needsSpacer ? 1 : 0)} style={{ borderLeft: '1px solid black', borderRight: '1px solid black', padding: rowSpanPadding, verticalAlign: 'middle', whiteSpace: 'pre-line', textAlign: 'center' }}>
                            <span data-field="client">{toTitleCase(bill.client)}</span>
                          </td>
                        )}
                        {index === 0 && (
                          <td {...interactiveProps('caseName', 'Case Name & Parties')} rowSpan={bill.items.length + (needsSpacer ? 1 : 0)} style={{ borderLeft: '1px solid black', borderRight: '1px solid black', padding: rowSpanPadding, verticalAlign: 'middle', whiteSpace: 'pre-line', textAlign: 'center' }}>
                            <span data-field="caseName">{renderCaseName(bill.caseName)}</span>
                            {bill.caseNumber && (
                              <>
                                <br />
                                <span data-field="caseNumber">{bill.caseNumber}</span>
                              </>
                            )}
                          </td>
                        )}
                        <td {...interactiveProps('items', 'Ledger Items')} style={{ borderLeft: '1px solid black', borderRight: '1px solid black', padding: rowPadding, verticalAlign: 'top', textAlign: 'center', fontStyle: item.itemType === 'remarks' ? 'italic' : 'normal' }}><span data-field="item-nature">{toTitleCase(item.nature)}</span></td>
                        <td {...interactiveProps('items', 'Ledger Items')} style={{ borderLeft: '1px solid black', borderRight: '1px solid black', padding: rowPadding, verticalAlign: 'top', textAlign: 'center' }}><span data-field="item-gm">{item.itemType === 'remarks' ? '' : toTitleCase(item.gm)}</span></td>
                        <td {...interactiveProps('items', 'Ledger Items')} style={{ borderLeft: '1px solid black', borderRight: '1px solid black', padding: rowPadding, verticalAlign: 'top', textAlign: 'center' }}><span data-field="item-fees">{item.itemType === 'remarks' ? '' : (isNilValue(item.gm) || isNilValue(item.fees) ? 'NIL' : (item.fees ? `${item.fees}/-` : ''))}</span></td>
                      </tr>
                    );
                  })}
                  {/* CSS-based spring spacer to maintain minimum table height without hardcoded math */}
                  <tr style={{ height: '100%' }}>
                    <td {...interactiveProps('items', 'Ledger Items')} style={{ borderLeft: '1px solid black', borderRight: '1px solid black', padding: 0 }}></td>
                    <td {...interactiveProps('items', 'Ledger Items')} style={{ borderLeft: '1px solid black', borderRight: '1px solid black', padding: 0 }}></td>
                    <td {...interactiveProps('items', 'Ledger Items')} style={{ borderLeft: '1px solid black', borderRight: '1px solid black', padding: 0 }}></td>
                  </tr>
                </>
              ) : (
                <tr>
                  <td colSpan="5" {...interactiveProps('items', 'Ledger Items')} style={{ border: '1px solid black', padding: '15px' }}>No items added (Click to add)</td>
                </tr>
              )}

              {/* Total Row */}
              <tr>
                <td colSpan="3" style={{ border: '1px solid black', borderRight: '1px solid black' }}></td>
                <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>Total:</td>
                <td style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>{total > 0 ? `${total}/-` : (allNil ? 'NIL' : '')}</td>
              </tr>

              {/* Total in words */}
              <tr>
                <td colSpan="5" style={{ border: '1px solid black', padding: '5px 15px', textAlign: 'left' }}>
                  Total ( in words ) : <span style={{ textTransform: 'capitalize' }}>{total > 0 ? `${totalInWords} Rupees Only` : (allNil ? 'NIL' : '')}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bottom section: Bank details and Clerk info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 'auto', marginBottom: bottomMargin, fontSize: '10pt' }}>

          {/* Bank Details Box */}
          <div style={{ border: '1px solid black', padding: '10px 30px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12pt', fontFamily: '"Bookman Old Style", Georgia, serif', fontWeight: '600', color: 'black', minWidth: '320px' }}>
            <div style={{ textDecoration: 'underline', marginBottom: '2px', fontWeight: 'bold' }}>BANK DETAILS</div>
            <div style={{ textTransform: 'uppercase' }}>{settings.bankName}</div>
            <div style={{ textTransform: 'uppercase' }}>{settings.branch}</div>
            <div style={{ textTransform: 'uppercase' }}>ACCOUNT NO. <span style={{ fontFamily: '"Times New Roman", Times, serif', fontWeight: '600' }}>{settings.accountNo}</span></div>
            <div style={{ textTransform: 'uppercase' }}>IFSC CODE - <span style={{ fontFamily: '"Times New Roman", Times, serif', fontWeight: '600' }}>{settings.ifsc}</span></div>
            <div style={{ textTransform: 'uppercase' }}>MICR CO. <span style={{ fontFamily: '"Times New Roman", Times, serif', fontWeight: '600' }}>{settings.micr}</span></div>
            <div>PAN No. <span style={{ textTransform: 'uppercase', fontFamily: '"Times New Roman", Times, serif', fontWeight: '600' }}>{settings.pan}</span></div>
          </div>

          {/* Clerk Details */}
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', fontFamily: '"Times New Roman", Times, serif', color: 'black', whiteSpace: 'nowrap', marginTop: clerkMarginTop }}>
            <img
              src="/sign.png"
              alt="Signature"
              style={{
                height: '65px',
                objectFit: 'contain',
                marginBottom: '2px'
              }}
            />
            <div style={{ fontWeight: 'bold', fontSize: '12pt', fontFamily: 'Georgia, serif' }}>{settings.clerkName}</div>
            <div style={{ fontStyle: 'italic', marginBottom: '2px' }}>{settings.clerkDesignation}</div>
            <div style={{ fontWeight: 'bold', fontSize: '13pt', marginBottom: '2px' }}>{settings.advocateName}</div>
            <div>{settings.designation}</div>
            <div>{settings.court}</div>
          </div>
        </div>

        {/* Residence Section */}
        <div style={{ width: '100%', borderTop: '1.5px solid black', paddingTop: '5px', textAlign: 'center', fontSize: '12.5pt', color: 'black', lineHeight: '1.35', pageBreakInside: 'avoid' }}>
          <div>Residence:</div>
          <div>{settings.residence}</div>
          <div>
            Ph: {settings.phone} ; E-mail &ndash; <span style={{ textTransform: 'lowercase' }}>{settings.email}</span>
          </div>
        </div>

        </div>
      </div>
    </>
  );
}
