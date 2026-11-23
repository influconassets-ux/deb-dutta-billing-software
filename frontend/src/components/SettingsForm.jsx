import React, { useState } from 'react';
import { toTitleCase } from '../utils/caseHelper';

export default function SettingsForm({ settings, onChange, onSave, onResetPassword }) {
  const [activeTab, setActiveTab] = useState('advocate'); // 'advocate' or 'clerk'

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Fields that should NOT be title-cased
    const excludeFields = ['email', 'phone', 'accountNo', 'ifsc', 'micr', 'pan', 'clerkPhone', 'clerkAccountNo', 'clerkIfsc', 'clerkMicr', 'clerkPan', 'forgotPasswordPhone'];
    
    let finalValue = value;
    if (!excludeFields.includes(name) && typeof value === 'string') {
      finalValue = toTitleCase(value);
    }
    
    onChange({ ...settings, [name]: finalValue });
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Advocate / Clerk Tab Switch */}
      <div style={{ display: 'flex', borderBottom: '1px solid #333', gap: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('advocate')}
          style={{
            padding: '10px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'advocate' ? '2px solid #D4AF37' : '2px solid transparent',
            color: activeTab === 'advocate' ? '#D4AF37' : '#888',
            fontWeight: activeTab === 'advocate' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Advocate
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('clerk')}
          style={{
            padding: '10px 24px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'clerk' ? '2px solid #D4AF37' : '2px solid transparent',
            color: activeTab === 'clerk' ? '#D4AF37' : '#888',
            fontWeight: activeTab === 'clerk' ? '700' : '500',
            cursor: 'pointer',
            fontSize: '1rem'
          }}
        >
          Clerk
        </button>
      </div>

      {activeTab === 'advocate' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>

          {/* Advocate Identity Card */}
          <div className="glass-card">
            <h2 className="section-title">Advocate Identity</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="form-group">
                <label>Advocate Name</label>
                <input type="text" name="advocateName" value={settings.advocateName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Designation</label>
                <input type="text" name="designation" value={settings.designation} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Court</label>
                <input type="text" name="court" value={settings.court} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Contact & Residence Card */}
          <div className="glass-card">
            <h2 className="section-title">Contact & Residence</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <div className="form-group">
                <label>Residence Address</label>
                <textarea name="residence" value={settings.residence} onChange={handleChange} rows={3} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="text" name="phone" value={settings.phone} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="text" name="email" value={settings.email} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Forgot Password OTP Phone</label>
                  <input type="text" name="forgotPasswordPhone" value={settings.forgotPasswordPhone || ''} onChange={handleChange} placeholder="+919339919973" />
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details Card */}
          <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
            <h2 className="section-title">Bank Details & Tax Info</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Bank Name</label>
                <input type="text" name="bankName" value={settings.bankName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Branch</label>
                <input type="text" name="branch" value={settings.branch} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Account Number</label>
                <input type="text" name="accountNo" value={settings.accountNo} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>IFSC Code</label>
                <input type="text" name="ifsc" value={settings.ifsc} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>MICR Code</label>
                <input type="text" name="micr" value={settings.micr} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>PAN No.</label>
                <input type="text" name="pan" value={settings.pan} onChange={handleChange} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>

          {/* Clerk Details Card */}
          <div className="glass-card">
            <h2 className="section-title">Clerk Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
              <div className="form-group">
                <label>Clerk Name</label>
                <input type="text" name="clerkName" value={settings.clerkName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Clerk Designation</label>
                <input type="text" name="clerkDesignation" value={settings.clerkDesignation} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Mobile No.</label>
                <input type="text" name="clerkPhone" value={settings.clerkPhone} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Clerk Bank Details Card */}
          <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
            <h2 className="section-title">Clerk Bank Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Bank Name</label>
                <input type="text" name="clerkBankName" value={settings.clerkBankName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Branch</label>
                <input type="text" name="clerkBranch" value={settings.clerkBranch} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Account Number</label>
                <input type="text" name="clerkAccountNo" value={settings.clerkAccountNo} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>IFSC Code</label>
                <input type="text" name="clerkIfsc" value={settings.clerkIfsc} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>MICR Code</label>
                <input type="text" name="clerkMicr" value={settings.clerkMicr} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>PAN No.</label>
                <input type="text" name="clerkPan" value={settings.clerkPan} onChange={handleChange} />
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '1rem' }}>
        <button type="button" className="btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onResetPassword(); }} style={{ padding: '1rem 3rem', fontSize: '1.1rem', backgroundColor: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          Reset Password
        </button>
        <button className="btn btn-primary" onClick={onSave} style={{ padding: '1rem 3rem', fontSize: '1.1rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          Save Settings
        </button>
      </div>
    </div>
  );
}
