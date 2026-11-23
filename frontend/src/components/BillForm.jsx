import React, { useState, useEffect, useRef } from 'react';
import { generateMemoNo, getLedger, getCachedLedger, getCachedSettings, getSettings, saveSettings } from '../utils/storage';
import { toTitleCase, splitCaseName } from '../utils/caseHelper';
import { getBillTotals, isNilItem } from '../utils/billTotals';
import { expandJudgeAbbreviations } from '../utils/judgeAbbreviations';
import JudgeAbbreviationsGuide from './JudgeAbbreviationsGuide';
import { useAlert } from '../context/AlertContext';
import { Search, ChevronDown, FileText, Briefcase, Plus, Trash2, Calendar, Hash, Building, User, GripVertical, Eye, Lock } from 'lucide-react';

export default function BillForm({ bill, onChange, isRough = false, highlightField = null }) {
  const { showAlert } = useAlert();
  const dropdownRef = useRef(null);
  const [showJudgeGuide, setShowJudgeGuide] = useState(false);
  const [customAbbreviations, setCustomAbbreviations] = useState(getCachedSettings()?.customAbbreviations || []);
  const [hiddenBuiltinAbbreviations, setHiddenBuiltinAbbreviations] = useState(getCachedSettings()?.hiddenBuiltinAbbreviations || []);

  useEffect(() => {
    getSettings().then(s => {
      if (s && Array.isArray(s.customAbbreviations)) setCustomAbbreviations(s.customAbbreviations);
      if (s && Array.isArray(s.hiddenBuiltinAbbreviations)) setHiddenBuiltinAbbreviations(s.hiddenBuiltinAbbreviations);
    }).catch(() => {});
  }, []);

  const handleAddCustomAbbreviation = async (abbr, full) => {
    const updated = [...customAbbreviations, { abbr, full }];
    setCustomAbbreviations(updated);
    try {
      const saved = await saveSettings({ ...getCachedSettings(), customAbbreviations: updated });
      setCustomAbbreviations(saved.customAbbreviations || updated);
      showAlert('Abbreviation saved', 'success');
    } catch (err) {
      setCustomAbbreviations(customAbbreviations);
      showAlert('Failed to save abbreviation', 'error');
    }
  };

  const handleRemoveCustomAbbreviation = async (index) => {
    const updated = customAbbreviations.filter((_, i) => i !== index);
    setCustomAbbreviations(updated);
    try {
      const saved = await saveSettings({ ...getCachedSettings(), customAbbreviations: updated });
      setCustomAbbreviations(saved.customAbbreviations || updated);
    } catch (err) {
      setCustomAbbreviations(customAbbreviations);
      showAlert('Failed to remove abbreviation', 'error');
    }
  };

  // "Deleting" a built-in abbreviation hides it from the reference list and stops it
  // from being auto-expanded, by remembering it (case-insensitive) in Settings.
  const handleHideBuiltinAbbreviations = async (abbrs) => {
    const toHide = abbrs.filter(a => !hiddenBuiltinAbbreviations.some(h => h.toLowerCase() === a.toLowerCase()));
    if (toHide.length === 0) return;
    const updated = [...hiddenBuiltinAbbreviations, ...toHide];
    setHiddenBuiltinAbbreviations(updated);
    try {
      const saved = await saveSettings({ ...getCachedSettings(), hiddenBuiltinAbbreviations: updated });
      setHiddenBuiltinAbbreviations(saved.hiddenBuiltinAbbreviations || updated);
    } catch (err) {
      setHiddenBuiltinAbbreviations(hiddenBuiltinAbbreviations);
      showAlert('Failed to remove abbreviation', 'error');
    }
  };
  const [pastCaseNames, setPastCaseNames] = useState([]);
  const [pastParty1s, setPastParty1s] = useState([]);
  const [pastParty2s, setPastParty2s] = useState([]);
  const [pastOthersText, setPastOthersText] = useState([]);
  const [pastClients, setPastClients] = useState([]);
  const [pastBriefedBys, setPastBriefedBys] = useState([]);
  const [pastCaseNumbers, setPastCaseNumbers] = useState([]);
  const [ledger, setLedger] = useState(getCachedLedger());
  const [isLedgerLoaded, setIsLedgerLoaded] = useState(true); // Treat as loaded instantly from cache
  const dateRef = useRef(null);
  const memoNoRef = useRef(null);
  const corRef = useRef(null);
  const courtRef = useRef(null);
  const forumRef = useRef(null);
  const caseNameRef = useRef(null);
  const party1Ref = useRef(null);
  const party2Ref = useRef(null);
  const othersTextRef = useRef(null);
  const clientRef = useRef(null);
  const briefedByRef = useRef(null);
  const caseNumberRef = useRef(null);
  const itemsRef = useRef(null);
  const [activeHighlight, setActiveHighlight] = useState(null);
  
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === dropIndex) {
      setDraggedItemIndex(null);
      return;
    }

    const newItems = [...bill.items];
    const draggedItem = newItems[draggedItemIndex];
    newItems.splice(draggedItemIndex, 1);
    newItems.splice(dropIndex, 0, draggedItem);

    onChange({ ...bill, items: newItems });
    setDraggedItemIndex(null);
  };

  useEffect(() => {
    getLedger().then(bills => {
      const cases = bills.map(b => b.caseName).filter(Boolean);
      setPastCaseNames([...new Set(cases)]);

      const allParties = [];
      cases.forEach(c => {
        if (c.toLowerCase().startsWith('in re:')) {
          allParties.push(c.substring(6).trim());
        } else {
          const split = splitCaseName(c);
          if (split) {
            if (split.p1) allParties.push(split.p1);
            if (split.p2) allParties.push(split.p2);
          } else {
            allParties.push(c.trim());
          }
        }
      });
      const uniqueParties = [...new Set(allParties)];
      setPastParty1s(uniqueParties);
      setPastParty2s(uniqueParties);
      setPastOthersText(uniqueParties);

      const clients = bills.map(b => b.client).filter(Boolean);
      setPastClients([...new Set(clients)]);
      const briefedBys = bills.map(b => b.briefedBy).filter(Boolean);
      setPastBriefedBys([...new Set(briefedBys)]);
      const caseNumbers = bills.map(b => b.caseNumber).filter(Boolean);
      setPastCaseNumbers([...new Set(caseNumbers)]);
      setLedger(bills);
      setIsLedgerLoaded(true);
    });
  }, []);

  // Auto-generate Memo No for new bills when date or ledger changes
  useEffect(() => {
    if (!isLedgerLoaded) return;

    if (isRough) return;
    if (!bill._id && !bill.id && bill.date && bill.date.includes('-')) {
      const parts = bill.date.split('-');
      if (parts.length === 3) {
        const mm = parts[1];
        const yyyy = parts[2];
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const monthIndex = parseInt(mm, 10) - 1;
        const monthName = monthNames[monthIndex];

        const billsThisYear = ledger.filter(b => b.date && b.date.endsWith(`-${yyyy}`));
        const billsThisMonth = ledger.filter(b => b.date && b.date.endsWith(`-${mm}-${yyyy}`));

        const yearlyCount = billsThisYear.length + 1;
        const monthlyCount = billsThisMonth.length + 1;

        const formattedYearly = String(yearlyCount).padStart(2, '0');
        const formattedMonthly = String(monthlyCount).padStart(2, '0');

        const generatedMemo = `${formattedYearly}/${formattedMonthly}/${monthName}/${yyyy}`;
        if (bill.memoNo !== generatedMemo) {
          onChange({ ...bill, memoNo: generatedMemo });
        }
      }
    }
  }, [bill.date, ledger, isLedgerLoaded, isRough]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const excludeFields = ['date', 'memoNo', 'caseNumber', 'cor', 'remarks'];
    let finalValue = value;
    if (!excludeFields.includes(name) && typeof value === 'string') {
      finalValue = toTitleCase(value);
    }
    onChange({ ...bill, [name]: finalValue });
  };

  // Tracks, per field, how much of the text is already "settled" (expanded and
  // never to be reprocessed again) so repeatedly pressing space - or blurring,
  // or reopening a bill that already has text in it - can't re-run expansion
  // over text it already expanded. Some abbreviations' own expansion still
  // matches the same (or another) pattern (e.g. custom "hon" -> "The Hon'ble"
  // still contains "Hon" as a clean token), so re-running expansion on text
  // that was already expanded compounds forever unless that region is never
  // touched again once settled.
  const abbrevSettledLengthRef = useRef({});
  const lastBillIdentityRef = useRef(undefined);

  // Whenever a *different* bill is loaded (or on first mount), treat whatever
  // text it already has as settled/historical - never run it through expansion,
  // only text typed from this point on. This is what stops already-saved
  // (possibly already-corrupted) text from being re-expanded further just by
  // opening it or clicking away from the field.
  useEffect(() => {
    const identity = bill._id || bill.id || bill.roughId || 'new';
    if (lastBillIdentityRef.current !== identity) {
      lastBillIdentityRef.current = identity;
      abbrevSettledLengthRef.current = {
        cor: (bill.cor || '').length,
        forum: (bill.forum || '').length
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bill._id, bill.id, bill.roughId]);

  // Expand abbreviations as soon as the user finishes a token with a space/newline
  const makeAbbrevFieldChangeHandler = (field) => (e) => {
    const raw = e.target.value;
    let finalValue = raw;

    const settledLenRaw = abbrevSettledLengthRef.current[field] || 0;
    const settledLen = Math.min(settledLenRaw, raw.length); // clamp in case text was deleted

    if (/[ \n]$/.test(raw)) {
      const settledPart = raw.slice(0, settledLen);
      const pendingTail = raw.slice(settledLen, -1); // unsettled text since the last successful expansion
      const trailingChar = raw.slice(-1);
      const expandedTail = expandJudgeAbbreviations(pendingTail, customAbbreviations, hiddenBuiltinAbbreviations);

      if (expandedTail !== pendingTail) {
        // A match fired - lock this portion in as settled so it's never re-expanded.
        finalValue = settledPart + expandedTail + trailingChar;
        abbrevSettledLengthRef.current[field] = settledPart.length + expandedTail.length + 1;
      } else {
        // No match yet - leave pendingTail accumulating across further spaces
        // (needed for multi-word abbreviations like "JM 1st Class").
        finalValue = raw;
        abbrevSettledLengthRef.current[field] = settledLen;
      }
    } else {
      abbrevSettledLengthRef.current[field] = settledLen;
    }

    onChange({ ...bill, [field]: finalValue });
  };

  const makeAbbrevFieldBlurHandler = (field) => (e) => {
    const raw = e.target.value;
    const settledLen = Math.min(abbrevSettledLengthRef.current[field] || 0, raw.length);
    const settledPart = raw.slice(0, settledLen);
    const pendingTail = raw.slice(settledLen); // only catches a trailing word typed without a trailing space
    const expandedTail = expandJudgeAbbreviations(pendingTail, customAbbreviations, hiddenBuiltinAbbreviations);
    const finalValue = settledPart + expandedTail;

    if (finalValue !== bill[field]) onChange({ ...bill, [field]: finalValue });
    abbrevSettledLengthRef.current[field] = finalValue.length;
  };

  const handleCorChange = makeAbbrevFieldChangeHandler('cor');
  const handleForumChange = makeAbbrevFieldChangeHandler('forum');

  const getCaseDetails = () => {
    if (bill.caseType) {
      return { type: bill.caseType, p1: bill.party1 || '', p2: bill.party2 || '', ot: bill.othersText || '' };
    }
    if (bill.caseName) {
      const split = splitCaseName(bill.caseName);
      if (split) {
        return { type: 'Appearance', p1: split.p1 || '', p2: split.p2 || '', ot: '' };
      } else {
        return { type: 'Others', p1: '', p2: '', ot: bill.caseName };
      }
    }
    return { type: 'Appearance', p1: '', p2: '', ot: '' };
  };

  const { type: currentCaseType, p1: currentParty1, p2: currentParty2, ot: currentOthersText } = getCaseDetails();

  const handleCaseTypeSelect = (e) => {
    const type = e.target.value;
    let newCaseName = '';
    let newOthersText = currentOthersText;
    let newP1 = currentParty1;
    let newP2 = currentParty2;

    if (type === 'Appearance') {
      if (!newP1 && !newP2 && (currentOthersText || bill.caseName)) {
        const split = splitCaseName(currentOthersText || bill.caseName);
        if (split) {
          newP1 = split.p1;
          newP2 = split.p2;
        }
      }
      newCaseName = (newP1 || newP2) ? `${newP1} -Vs- ${newP2}` : '';
    } else {
      if (!currentOthersText) {
        newOthersText = bill.caseName || 'In Re: ';
      }
      newCaseName = newOthersText;
    }
    onChange({
      ...bill,
      caseType: type,
      party1: newP1,
      party2: newP2,
      caseName: newCaseName,
      othersText: newOthersText
    });
  };

  // Scroll to and highlight field triggered from preview clicks
  useEffect(() => {
    if (!highlightField) return;
    setActiveHighlight(highlightField);
    let target = null;
    switch (highlightField) {
      case 'date':
        target = dateRef.current;
        break;
      case 'memoNo':
      case 'memo':
        target = memoNoRef.current;
        break;
      case 'cor':
        target = corRef.current;
        break;
      case 'court':
        target = courtRef.current;
        break;
      case 'forum':
        target = forumRef.current;
        break;
      case 'briefedBy':
        target = briefedByRef.current;
        break;
      case 'client':
        target = clientRef.current;
        break;
      case 'caseName':
      case 'case':
        target = currentCaseType === 'Appearance' ? (party1Ref.current || party2Ref.current) : othersTextRef.current;
        break;
      case 'party1':
        target = party1Ref.current;
        break;
      case 'party2':
        target = party2Ref.current;
        break;
      case 'caseNumber':
        target = caseNumberRef.current;
        break;
      case 'items':
        target = itemsRef.current;
        break;
      default:
        break;
    }

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (typeof target.focus === 'function') {
        target.focus();
      }
    }

    const timer = setTimeout(() => {
      setActiveHighlight(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [highlightField, currentCaseType]);

  const getHighlightStyle = (fieldName) => {
    if (activeHighlight === fieldName || (activeHighlight === 'caseName' && ['party1', 'party2', 'othersText'].includes(fieldName))) {
      return {
        boxShadow: '0 0 0 2px #D4AF37, 0 0 16px rgba(212, 175, 55, 0.6)',
        borderColor: '#D4AF37',
        transition: 'all 0.3s ease'
      };
    }
    return {};
  };

  const handleParty1Change = (e) => {
    let val = toTitleCase(e.target.value);
    e.target.value = val;
    const isInsertion = e.nativeEvent.inputType === 'insertText' || !e.nativeEvent.inputType;
    
    if (isInsertion && val.length > 0) {
      const match = pastParty1s.find(c => c.toLowerCase().startsWith(val.toLowerCase()));
      if (match) {
        const isUserUpper = val.length >= 2 && val === val.toUpperCase() && /[A-Z]/.test(val);
        const matchToUse = isUserUpper ? match.toUpperCase() : match;
        onChange({ ...bill, caseType: 'Appearance', party1: matchToUse, party2: currentParty2, othersText: currentOthersText, caseName: `${matchToUse} -Vs- ${currentParty2}` });
        setTimeout(() => {
          if (party1Ref.current) party1Ref.current.setSelectionRange(val.length, matchToUse.length);
        }, 0);
        return;
      }
    }
    onChange({ ...bill, caseType: 'Appearance', party1: val, party2: currentParty2, othersText: currentOthersText, caseName: `${val} -Vs- ${currentParty2}` });
  };

  const handleParty2Change = (e) => {
    let val = toTitleCase(e.target.value);
    e.target.value = val;
    const isInsertion = e.nativeEvent.inputType === 'insertText' || !e.nativeEvent.inputType;
    
    if (isInsertion && val.length > 0) {
      const match = pastParty2s.find(c => c.toLowerCase().startsWith(val.toLowerCase()));
      if (match) {
        const isUserUpper = val.length >= 2 && val === val.toUpperCase() && /[A-Z]/.test(val);
        const matchToUse = isUserUpper ? match.toUpperCase() : match;
        onChange({ ...bill, caseType: 'Appearance', party1: currentParty1, party2: matchToUse, othersText: currentOthersText, caseName: `${currentParty1} -Vs- ${matchToUse}` });
        setTimeout(() => {
          if (party2Ref.current) party2Ref.current.setSelectionRange(val.length, matchToUse.length);
        }, 0);
        return;
      }
    }
    onChange({ ...bill, caseType: 'Appearance', party1: currentParty1, party2: val, othersText: currentOthersText, caseName: `${currentParty1} -Vs- ${val}` });
  };

  const handleOthersTextChange = (e) => {
    let val = toTitleCase(e.target.value);
    e.target.value = val;
    const isInsertion = e.nativeEvent.inputType === 'insertText' || !e.nativeEvent.inputType;
    
    if (isInsertion && val.length > 0) {
      let searchVal = val;
      let prefix = '';
      if (val.toLowerCase().startsWith('in re: ')) {
        searchVal = val.substring(7);
        prefix = val.substring(0, 7);
      } else if (val.toLowerCase().startsWith('in re:')) {
        searchVal = val.substring(6);
        prefix = val.substring(0, 6);
      }

      if (searchVal.length > 0) {
        const match = pastOthersText.find(c => c.toLowerCase().startsWith(searchVal.toLowerCase()));
        if (match) {
          const isUserUpper = searchVal.length >= 2 && searchVal === searchVal.toUpperCase() && /[A-Z]/.test(searchVal);
          const matchToUse = isUserUpper ? match.toUpperCase() : match;
          const fullMatch = prefix + matchToUse;
          onChange({ ...bill, caseType: 'Others', party1: currentParty1, party2: currentParty2, othersText: fullMatch, caseName: fullMatch });
          setTimeout(() => {
            if (othersTextRef.current) othersTextRef.current.setSelectionRange(val.length, fullMatch.length);
          }, 0);
          return;
        }
      } else {
        // If they just typed "In Re: " and haven't typed a name yet, don't trigger match on everything
      }
    }
    onChange({ ...bill, caseType: 'Others', party1: currentParty1, party2: currentParty2, othersText: val, caseName: val });
  };

  const handleClientChange = (e) => {
    let val = toTitleCase(e.target.value);
    e.target.value = val;
    const isInsertion = e.nativeEvent.inputType === 'insertText' || !e.nativeEvent.inputType;
    
    if (isInsertion && val.length > 0) {
      const match = pastClients.find(c => c.toLowerCase().startsWith(val.toLowerCase()));
      if (match) {
        const isUserUpper = val.length >= 2 && val === val.toUpperCase() && /[A-Z]/.test(val);
        const matchToUse = isUserUpper ? match.toUpperCase() : match;
        onChange({ ...bill, client: matchToUse });
        setTimeout(() => {
          if (clientRef.current) {
            clientRef.current.setSelectionRange(val.length, matchToUse.length);
          }
        }, 0);
        return;
      }
    }
    handleChange(e);
  };

  const handleBriefedByChange = (e) => {
    let val = toTitleCase(e.target.value);
    e.target.value = val;
    const isInsertion = e.nativeEvent.inputType === 'insertText' || !e.nativeEvent.inputType;
    
    if (isInsertion && val.length > 0) {
      const match = pastBriefedBys.find(c => c.toLowerCase().startsWith(val.toLowerCase()));
      if (match) {
        const isUserUpper = val.length >= 2 && val === val.toUpperCase() && /[A-Z]/.test(val);
        const matchToUse = isUserUpper ? match.toUpperCase() : match;
        onChange({ ...bill, briefedBy: matchToUse });
        setTimeout(() => {
          if (briefedByRef.current) {
            briefedByRef.current.setSelectionRange(val.length, matchToUse.length);
          }
        }, 0);
        return;
      }
    }
    handleChange(e);
  };

  const handleCaseNumberChange = (e) => {
    let val = e.target.value;
    e.target.value = val;
    const isInsertion = e.nativeEvent.inputType === 'insertText' || !e.nativeEvent.inputType;
    
    if (isInsertion && val.length > 0) {
      const match = pastCaseNumbers.find(c => c.toLowerCase().startsWith(val.toLowerCase()));
      if (match) {
        const isUserUpper = val.length >= 2 && val === val.toUpperCase() && /[A-Z]/.test(val);
        const matchToUse = isUserUpper ? match.toUpperCase() : match;
        onChange({ ...bill, caseNumber: matchToUse });
        setTimeout(() => {
          if (caseNumberRef.current) {
            caseNumberRef.current.setSelectionRange(val.length, matchToUse.length);
          }
        }, 0);
        return;
      }
    }
    handleChange(e);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...bill.items];
    let finalValue = value;
    if (typeof value === 'string' && field === 'nature' && newItems[index]?.itemType !== 'remarks') {
      finalValue = toTitleCase(value);
    }
    const updatedItem = { ...newItems[index], [field]: finalValue };
    
    // Auto-calculate fees when GM is entered (1 GM = 17 Rs)
    if (field === 'gm') {
      if (String(value).trim().toLowerCase() === 'nil') {
        updatedItem.gm = 'NIL';
        updatedItem.fees = 'NIL';
      } else {
        const gmValue = parseFloat(value);
        if (!isNaN(gmValue)) {
          updatedItem.fees = (gmValue * 17).toString();
        } else if (value === '') {
          updatedItem.fees = '';
        }
      }
    }

    // "NIL" typed in the fees box marks the whole item as NIL
    if (field === 'fees' && String(value).trim().toLowerCase() === 'nil') {
      updatedItem.gm = 'NIL';
      updatedItem.fees = 'NIL';
    }

    // Admin-only actual value: same 1 GM = 17 Rs rule
    if (field === 'actualGm') {
      const gmValue = parseFloat(value);
      if (!isNaN(gmValue)) updatedItem.actualFees = (gmValue * 17).toString();
      else if (value === '') updatedItem.actualFees = '';
    }

    newItems[index] = updatedItem;
    onChange({ ...bill, items: newItems });
  };

  const addItem = () => {
    onChange({ ...bill, items: [...bill.items, { nature: '', gm: '', fees: '', itemType: 'item' }] });
  };

  const addRemarksItem = () => {
    onChange({ ...bill, items: [...bill.items, { nature: '', gm: '', fees: '', itemType: 'remarks' }] });
  };

  const removeItem = (index) => {
    const newItems = bill.items.filter((_, i) => i !== index);
    onChange({ ...bill, items: newItems });
  };

  return (
    <>
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Top Combined Card for Meta, Client, Case */}
      <div style={{ backgroundColor: '#1C1C1E', padding: '2rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Meta Info Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>Bill Meta Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Date</label>
            <input 
              ref={dateRef}
              type="date" 
              name="date" 
              value={(() => {
                if (!bill.date || !bill.date.includes('-')) return bill.date;
                const parts = bill.date.split('-');
                if (parts.length === 3 && parts[0].length === 2) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                return bill.date;
              })()} 
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return handleChange(e);
                const parts = val.split('-');
                if (parts.length === 3 && parts[0].length === 4) {
                  onChange({ ...bill, date: `${parts[2]}-${parts[1]}-${parts[0]}` });
                } else {
                  handleChange(e);
                }
              }}
              style={{ backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white', colorScheme: 'dark', ...getHighlightStyle('date') }}
            />
          </div>
          {!isRough && (
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Memo No.</label>
              <input ref={memoNoRef} type="text" name="memoNo" value={bill.memoNo} onChange={handleChange} style={{ backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white', ...getHighlightStyle('memoNo') }} />
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', lineHeight: '1' }}>
                <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Honorable Judge (Coram)</label>
                <button
                  type="button"
                  onClick={() => setShowJudgeGuide(true)}
                  title="View abbreviation guide"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    background: 'transparent', border: 'none', padding: 0, margin: 0,
                    color: '#D4AF37', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600',
                    lineHeight: '1', whiteSpace: 'nowrap', flexShrink: 0
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                >
                  <Eye size={12} /> Glossary of Abbreviations
                </button>
              </div>
              <textarea
                ref={corRef}
                name="cor"
                value={bill.cor || ''}
                onChange={handleCorChange}
                onBlur={makeAbbrevFieldBlurHandler('cor')}
                placeholder="Enter judge name"
                rows={2}
                style={{ resize: 'vertical', backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white', ...getHighlightStyle('cor') }}
              />
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Court No.</label>
              <input ref={courtRef} type="text" name="court" value={bill.court || ''} onChange={handleChange} placeholder="Enter court no." style={{ backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white', ...getHighlightStyle('court') }} />
            </div>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Forum</label>
              <textarea ref={forumRef} name="forum" value={bill.forum || ''} onChange={handleForumChange} onBlur={makeAbbrevFieldBlurHandler('forum')} placeholder="Enter forum" rows={2} style={{ resize: 'vertical', backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white', ...getHighlightStyle('forum') }} />
            </div>
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Briefed by</label>
            <input ref={briefedByRef} type="text" name="briefedBy" value={bill.briefedBy || ''} onChange={handleBriefedByChange} placeholder="Enter advocate name" style={{ backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white', ...getHighlightStyle('briefedBy') }} />
          </div>
        </div>
      </div>
        
      {/* Client Details Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>Client Details</h3>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Client Name</label>
            <textarea ref={clientRef} name="client" value={bill.client} onChange={handleClientChange} rows={3} style={{ resize: 'vertical', backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white', ...getHighlightStyle('client') }} />
          </div>
        </div>

        {/* Case Info Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>Case Information</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Case Type</label>
              <select 
                value={currentCaseType}
                onChange={handleCaseTypeSelect}
                style={{ backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white', outline: 'none' }}
              >
                <option value="Appearance">Appearance</option>
                <option value="Others">Others</option>
              </select>
            </div>
            
            {currentCaseType === 'Appearance' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Petitioner/Complainant/Appellant/Plaintiff</label>
                  <textarea 
                    ref={party1Ref}
                    value={currentParty1}
                    onChange={handleParty1Change}
                    rows={2}
                    style={{ resize: 'vertical', backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white', ...getHighlightStyle('party1') }} 
                    placeholder="Enter name"
                  />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Respondent/Opposite Party/Defendant</label>
                  <textarea 
                    ref={party2Ref}
                    value={currentParty2}
                    onChange={handleParty2Change}
                    rows={2}
                    style={{ resize: 'vertical', backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white', ...getHighlightStyle('party2') }} 
                    placeholder="Enter name"
                  />
                </div>
              </div>
            ) : (
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Case Details</label>
                <textarea 
                  ref={othersTextRef}
                  value={currentOthersText}
                  onChange={handleOthersTextChange}
                  rows={2}
                  style={{ resize: 'vertical', backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white', ...getHighlightStyle('othersText') }} 
                  placeholder="Enter details"
                />
              </div>
            )}
          </div>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Case Number</label>
            <input ref={caseNumberRef} type="text" name="caseNumber" value={bill.caseNumber || ''} onChange={handleCaseNumberChange} placeholder="e.g. WPA/20/25" style={{ backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white', ...getHighlightStyle('caseNumber') }} />
          </div>
        </div>
      </div>

        {/* Ledger Items Section */}
        <div ref={itemsRef} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '10px', borderRadius: '6px', ...getHighlightStyle('items') }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'white' }}>Ledger Items</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {bill.items.map((item, index) => (
              <div 
                key={index} 
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={() => setDraggedItemIndex(null)}
                style={{
                  padding: '15px',
                  paddingLeft: '40px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '15px',
                  position: 'relative',
                  backgroundColor: draggedItemIndex === index ? '#2C2C2E' : (item.itemType === 'remarks' ? 'rgba(212, 175, 55, 0.04)' : 'transparent'),
                  border: draggedItemIndex === index ? '1px dashed #666' : (item.itemType === 'remarks' ? '1px solid rgba(212, 175, 55, 0.35)' : '1px solid #333'),
                  borderRadius: '8px',
                  opacity: draggedItemIndex === index ? 0.5 : 1
                }}
              >

                {/* Drag Handle */}
                <div style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', cursor: 'grab', color: '#555', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <GripVertical size={20} />
                </div>

                {bill.items.length > 1 && (
                  <button
                    onClick={() => removeItem(index)}
                    title="Remove Item"
                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                {item.itemType === 'remarks' && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', width: 'fit-content',
                    fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.04em', textTransform: 'uppercase',
                    color: '#D4AF37', background: 'rgba(212, 175, 55, 0.12)', border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: '4px', padding: '2px 8px'
                  }}>
                    Remarks
                  </span>
                )}

                {item.itemType === 'remarks' ? (
                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Remarks</label>
                    <textarea
                      value={item.nature}
                      onChange={(e) => handleItemChange(index, 'nature', e.target.value)}
                      placeholder="Enter remarks"
                      rows={2}
                      style={{ resize: 'vertical', backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white' }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Nature of Brief</label>
                      <input type="text" value={item.nature} onChange={(e) => handleItemChange(index, 'nature', e.target.value)} placeholder="Enter nature of brief" style={{ backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>GM</label>
                        <input type="text" value={item.gm} onChange={(e) => handleItemChange(index, 'gm', e.target.value)} placeholder="Enter GM value or Nil" style={{ backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white' }} />
                      </div>
                      <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Fees (Rs.)</label>
                        <input type="text" value={item.fees} onChange={(e) => handleItemChange(index, 'fees', e.target.value)} placeholder="Enter fee amount" style={{ backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white', fontWeight: '600' }} />
                      </div>
                    </div>

                    {/* Admin-only record of the real value of a NIL item — never printed */}
                    {isNilItem(item) && (
                      <div
                        className="fade-in"
                        style={{
                          display: 'flex', flexDirection: 'column', gap: '12px',
                          padding: '14px', borderRadius: '8px',
                          background: 'rgba(96, 165, 250, 0.06)',
                          border: '1px dashed rgba(96, 165, 250, 0.45)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <Lock size={13} color="#93c5fd" />
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#93c5fd' }}>
                            Admin record
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#a1a1aa', padding: '2px 8px', borderRadius: '999px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            Not printed on the bill
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Actual GM</label>
                            <input type="text" inputMode="decimal" value={item.actualGm || ''} onChange={(e) => handleItemChange(index, 'actualGm', e.target.value)} placeholder="e.g. 75" style={{ backgroundColor: '#111111', border: '1px solid rgba(96, 165, 250, 0.3)', padding: '10px', borderRadius: '4px', color: 'white' }} />
                          </div>
                          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>Actual Fees (Rs.)</label>
                            <input type="text" inputMode="decimal" value={item.actualFees ?? ''} onChange={(e) => handleItemChange(index, 'actualFees', e.target.value)} placeholder="e.g. 1275" style={{ backgroundColor: '#111111', border: '1px solid rgba(96, 165, 250, 0.3)', padding: '10px', borderRadius: '4px', color: 'white', fontWeight: '600' }} />
                          </div>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#71717a' }}>
                          The bill shows <b style={{ color: '#a1a1aa' }}>NIL</b> for this item. The actual value is saved only for your records in the Bills Ledger.
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '20px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={addRemarksItem}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#a1a1aa', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#D4AF37'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1aa'; }}
              >
                + Add Remarks
              </button>
              <button
                type="button"
                onClick={addItem}
                style={{ backgroundColor: 'transparent', border: 'none', color: '#D4AF37', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.9rem' }}
              >
                + Add Item
              </button>
            </div>

            {/* Bill Total + NIL switch */}
            {(() => {
              const { itemsTotal, waived, isNil, unbilled } = getBillTotals(bill);
              const toggleNil = () => onChange({ ...bill, nilTotal: !waived });
              return (
                <div
                  className={`bf-total${waived ? ' bf-total-nil' : ''}`}
                  style={{
                    marginTop: '6px', padding: '18px 20px', borderRadius: '10px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap',
                    background: waived ? 'linear-gradient(135deg, rgba(212,175,55,0.14), rgba(212,175,55,0.04))' : '#141416',
                    border: `1px solid ${waived ? 'rgba(212,175,55,0.6)' : '#333'}`,
                    transition: 'background 0.25s ease, border-color 0.25s ease'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a1a1aa' }}>
                      Bill Total
                    </span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
                      {waived ? (
                        <>
                          <span style={{ fontSize: '1.9rem', fontWeight: 800, color: '#D4AF37', letterSpacing: '0.04em', lineHeight: 1 }}>NIL</span>
                          {itemsTotal > 0 && (
                            <span style={{ fontSize: '1rem', color: '#71717a', textDecoration: 'line-through', fontVariantNumeric: 'tabular-nums' }}>
                              ₹{itemsTotal.toLocaleString('en-IN')}
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: '1.9rem', fontWeight: 800, color: 'white', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                          {isNil ? 'NIL' : `₹${itemsTotal.toLocaleString('en-IN')}`}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: waived ? '#e5d18f' : '#71717a', marginTop: '2px' }}>
                      {waived
                        ? 'Item fees stay on the bill, but the client sees Total: NIL.'
                        : 'Sum of all item fees.'}
                    </span>
                    {unbilled > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#93c5fd', marginTop: '2px' }}>
                        <Lock size={12} /> Not charged (admin record): ₹{unbilled.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={waived}
                    onClick={toggleNil}
                    title={waived ? 'Charge the fees again' : 'Show total as NIL — client is not charged'}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                      background: 'transparent', border: 'none', padding: '6px 4px', color: 'inherit', textAlign: 'left'
                    }}
                  >
                    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: waived ? '#D4AF37' : '#e4e4e7' }}>NIL Bill</span>
                      <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>No fee charged</span>
                    </span>
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'relative', width: '46px', height: '26px', borderRadius: '999px', flexShrink: 0,
                        background: waived ? '#D4AF37' : '#3f3f46',
                        boxShadow: waived ? '0 0 0 3px rgba(212,175,55,0.2)' : 'none',
                        transition: 'background 0.2s ease, box-shadow 0.2s ease'
                      }}
                    >
                      <span style={{
                        position: 'absolute', top: '3px', left: waived ? '23px' : '3px',
                        width: '20px', height: '20px', borderRadius: '50%', background: waived ? '#111' : '#e4e4e7',
                        transition: 'left 0.2s cubic-bezier(0.16, 1, 0.3, 1), background 0.2s ease'
                      }} />
                    </span>
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Remarks Section - highlighted so it catches the eye, e.g. after converting a rough bill */}
      <div
        className="form-group"
        style={{
          display: 'flex', flexDirection: 'column', gap: '5px',
          padding: '15px', borderRadius: '8px',
          backgroundColor: bill.remarks ? 'rgba(212, 175, 55, 0.08)' : 'transparent',
          border: bill.remarks ? '1px solid rgba(212, 175, 55, 0.5)' : '1px solid #333',
          boxShadow: bill.remarks ? '0 0 0 1px rgba(212, 175, 55, 0.15)' : 'none'
        }}
      >
        <label style={{ fontSize: '0.9rem', color: bill.remarks ? '#D4AF37' : '#a1a1aa', fontWeight: bill.remarks ? '700' : '400' }}>
          Remarks {bill.remarks && '⚠'}
        </label>
        <textarea
          name="remarks"
          value={bill.remarks || ''}
          onChange={handleChange}
          placeholder="Add remarks..."
          rows={2}
          style={{ resize: 'vertical', backgroundColor: '#111111', border: '1px solid #333', padding: '10px', borderRadius: '4px', color: 'white' }}
        />
      </div>
    </div>
    {showJudgeGuide && (
      <JudgeAbbreviationsGuide
        onClose={() => setShowJudgeGuide(false)}
        customAbbreviations={customAbbreviations}
        onAddCustom={handleAddCustomAbbreviation}
        onRemoveCustom={handleRemoveCustomAbbreviation}
        hiddenBuiltinAbbreviations={hiddenBuiltinAbbreviations}
        onHideBuiltin={handleHideBuiltinAbbreviations}
      />
    )}
    </>
  );
}
