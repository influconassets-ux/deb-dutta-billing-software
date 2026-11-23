import React, { useRef } from 'react';
import { numberToWords } from '../utils/numberToWords';
import { getBillTotals } from '../utils/billTotals';
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

const readField = (root, field, { preserveNewlines = false } = {}) => {
  const el = root.querySelector(`[data-field="${field}"]`);
  if (!el) return '';
  const text = el.innerText || '';
  return (preserveNewlines ? text : text.replace(/\s*\n+\s*/g, ' ')).trim();
};

export default function ClerkBillPreview({ settings, bill, onFieldClick = null, onSave = null }) {
  const containerRef = useRef(null);

  const handleBlurSave = async () => {
    if (!onSave) return;
    const root = containerRef.current;
    if (!root) return;

    const updated = {
      ...bill,
      date: readField(root, 'date'),
      client: readField(root, 'client', { preserveNewlines: true }),
      caseName: readField(root, 'caseName'),
      caseNumber: readField(root, 'caseNumber')
    };

    await onSave(updated);
  };

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

  // Calculate total fees from main bill and find 10% clerkage
  const { total, isNil: allNil } = getBillTotals(bill);
  const clerkageFee = Math.round(total * 0.10);
  const totalInWords = numberToWords(clerkageFee);

  let clerkMemoNo = bill.memoNo || '';
  if (bill.memoNo) {
    const parts = bill.memoNo.split('/');
    if (parts.length === 4) {
      // Assuming format: {yearlyCount}/{monthlyCount}/{monthName}/{yyyy}
      clerkMemoNo = `${parts[0]}/${parts[3]}`;
    }
  }

  return (
    <>
      <style>
        {`
          .clerk-bill-paper, .clerk-bill-paper * {
            font-family: "Georgia", "Times New Roman", Times, serif;
            font-variant-numeric: lining-nums;
            line-height: 1.15;
            color: black;
            text-transform: capitalize;
          }
          .small-caps {
            font-variant: small-caps;
            font-size: 16px;
            font-weight: 900;
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
            .clerk-bill-paper {
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
        id={`clerk-bill-content-${bill._id || bill.id}`}
        className="clerk-bill-paper"
        contentEditable={true}
        suppressContentEditableWarning={true}
        onBlur={handleBlurSave}
        style={{
          padding: '1.5cm 2cm',
          backgroundColor: 'white',
          width: '210mm',
          minWidth: '210mm',
          maxWidth: '210mm',
          minHeight: '290mm',
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

        {/* Top right mobile number */}
      <div style={{ textAlign: 'right', marginBottom: '30px', fontSize: '16px', fontWeight: 'normal', color: 'black' }}>
        <span>MOBILE NO: {settings.clerkPhone || '70447 79122'}</span>
      </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '55px', fontFamily: '"Times New Roman", Times, serif' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', textDecoration: 'underline', marginBottom: '15px' }}>
            BILL FOR CLERKAGE
          </div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>
            Clerk to: Mr. {settings.advocateName || 'Rhiddhiman Mukherjee'}, {settings.designation || 'Advocate'}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px' }}>
            The Bar Library Club, 2<sup>nd</sup> Floor High Court Main Building,
          </div>
          <div style={{ fontSize: '15px', fontWeight: 'bold' }}>
            {settings.court || 'The High Court at Calcutta'} – 700 001
          </div>
        </div>

        {/* Client and Date info */}
        <div style={{ display: 'flex', marginBottom: '25px', fontSize: '15px' }}>
          <div {...interactiveProps('client', 'Client')} style={{ width: '50%', paddingLeft: '20px', borderRadius: '4px' }}>
            <span style={{ fontWeight: 'bold' }}>Client: </span>
            <span data-field="client">{bill.client ? bill.client.split('\n')[0] : ''}</span>
          </div>
          <div style={{ width: '50%', paddingLeft: '30%', display: 'flex', flexDirection: 'column', gap: '8px', whiteSpace: 'nowrap' }}>
            <div {...interactiveProps('date', 'Date')} style={{ borderRadius: '4px' }}>
              <span style={{ fontWeight: 'bold' }}>Date: </span>
              <span data-field="date">{bill.date}</span>
            </div>
            <div {...interactiveProps('memoNo', 'Memo No.')} style={{ fontWeight: 'bold', borderRadius: '4px' }}>
              Memo No. {clerkMemoNo}
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ flexGrow: 1, marginBottom: '25px', display: 'flex', flexDirection: 'column' }}>
          <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', border: '1px solid black' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid black', padding: '5px', textAlign: 'center' }}>
                  <span className="small-caps">Particulars</span>
                </th>
                <th style={{ border: '1px solid black', padding: '5px', textAlign: 'center', width: '120px' }}>
                  <span className="small-caps">Amount</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ border: '1px solid black', padding: '0', textAlign: 'center', height: '100%', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '300px', padding: '15px 10px' }}>
                    <div {...interactiveProps('caseName', 'Case Details')} style={{ marginTop: '10px', marginBottom: '15px', borderRadius: '4px' }}>
                      <span className="small-caps" style={{ fontSize: '16px' }}>Case Details:</span>
                    </div>


                    {(bill.caseName || bill.caseNumber) && (
                      <div {...interactiveProps('caseName', 'Case Details')} style={{ fontSize: '16px', marginBottom: '40px', whiteSpace: 'pre-line', borderRadius: '4px' }}>
                        <span data-field="caseName">{renderCaseName(bill.caseName)}</span>
                        {bill.caseNumber && (
                          <>
                            <br />
                            <span data-field="caseNumber">{bill.caseNumber}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Spacer to push the bottom text down */}
                    <div style={{ flexGrow: 1 }}></div>

                    <div style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '14px', fontVariant: 'small-caps', marginTop: '40px' }}>
                      <div style={{ whiteSpace: 'nowrap' }}>
                        To Clerkage In Respect Of Memo No. &nbsp;&nbsp;&nbsp; {bill.memoNo}. &nbsp;&nbsp;&nbsp; Dated: {bill.date}
                      </div>
                      <div style={{ marginTop: '8px' }}>Of Mr. {toTitleCase(settings.advocateName || 'Rhiddhiman Mukherjee')}, Advocate</div>
                    </div>
                  </div>
                </td>
                <td style={{ border: '1px solid black', padding: '15px', textAlign: 'center', verticalAlign: 'middle', fontSize: '15px' }}>
                  {clerkageFee > 0 ? clerkageFee : (allNil ? 'NIL' : '')}
                </td>
              </tr>
              {/* Total Row */}
              <tr>
                <td style={{ border: '1px solid black', padding: '5px 10px', fontSize: '14px', fontVariant: 'small-caps' }}>
                  {clerkageFee > 0 ? `Total (in words): Rupees ${totalInWords} Only` : (allNil ? 'Total (in words): NIL' : 'Total (in words): ')}
                </td>
                <td style={{ border: '1px solid black', padding: '5px 15px', textAlign: 'center', fontSize: '15px' }}>
                  {clerkageFee > 0 ? clerkageFee : (allNil ? 'NIL' : '')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Instruction */}
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '14px', marginBottom: '40px' }}>
          Please Pay The Bill Amount By Cash/ Draft/ A/C Payee Cheque Drawn<br />
          <div style={{ marginTop: '5px' }}>
            in Favour Of <span style={{ textTransform: 'uppercase' }}>{settings.clerkName || 'SUBHENDU MAL'}</span>
          </div>
        </div>

        {/* Clerk To section above line */}
        <div style={{ textAlign: 'right', marginBottom: '5px' }}>
          <span className="small-caps" style={{ fontSize: '14px' }}>
            Clerk To: Mr. {toTitleCase(settings.advocateName || 'Rhiddhiman Mukherjee')}, Advocate
          </span>
        </div>

        {/* Full width line */}
        <div style={{ borderBottom: '1.5px solid black', width: '100%', marginBottom: '10px' }}></div>

        {/* Bottom section: Bank details and Signature */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '14px', fontWeight: 'bold' }}>

          {/* Bank Details Box */}
          <div style={{ border: '1px solid black', padding: '10px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2px', fontWeight: '900' }}>
            <div>BANK DETAILS:</div>
            <div style={{ textTransform: 'uppercase' }}>{settings.clerkBankName || 'INDIAN BANK'}, {settings.clerkBranch ? settings.clerkBranch.split(',')[0] : 'MADHUSUDANPUR'}</div>
            {settings.clerkBranch && settings.clerkBranch.includes(',') && <div style={{ textTransform: 'uppercase' }}>{settings.clerkBranch.split(',').slice(1).join(',')}</div>}
            <div style={{ textTransform: 'uppercase' }}>
              A/C NO. : {settings.clerkAccountNo}
            </div>
            <div style={{ textTransform: 'uppercase' }}>
              IFSC CODE : {settings.clerkIfsc}
            </div>
            <div style={{ textTransform: 'uppercase' }}>
              MICR : {settings.clerkMicr}
            </div>
            <div style={{ textTransform: 'uppercase' }}>PAN NO. {settings.clerkPan}</div>
          </div>

          {/* Signature */}
          <div style={{ width: '200px', marginTop: '15px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <img
              src="/sign.png"
              alt="Signature"
              style={{
                height: '65px',
                objectFit: 'contain',
                marginBottom: '5px'
              }}
            />
            <div style={{ borderBottom: '1px solid black', width: '100%', marginBottom: '5px' }}></div>
            <div style={{ textAlign: 'right', fontWeight: '900', fontSize: '13px', width: '100%' }}>SIGNATURE</div>
          </div>
        </div>

      </div>
    </>
  );
}
