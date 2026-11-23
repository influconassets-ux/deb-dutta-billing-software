import React, { useState, useEffect } from 'react';
import SettingsForm from '../components/SettingsForm';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { getSettings, saveSettings, getCachedSettings } from '../utils/storage';
import { useAlert } from '../context/AlertContext';

export default function SettingsPage() {
  const { showAlert } = useAlert();
  const [settings, setSettings] = useState(getCachedSettings());
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    try {
      await saveSettings(settings);
      showAlert('Settings saved successfully!', 'success');
    } catch (err) {
      showAlert('Failed to save settings.', 'error');
    }
  };

  return (
    <div className="page-wrapper fade-in" style={{ backgroundColor: '#111111', padding: '2rem' }}>
      <style>{`
        .settings-page .glass-card { background-color: #1C1C1E; border: none; padding: 2rem; border-radius: 8px; box-shadow: none; }
        .settings-page .section-title { color: white; font-size: 1.1rem; font-weight: 700; margin-top: 0; border: none; padding-bottom: 0; }
        .settings-page .form-group { display: flex; flex-direction: column; gap: 5px; }
        .settings-page .form-group label { color: #a1a1aa; font-size: 0.85rem; font-weight: normal; margin-bottom: 0; }
        .settings-page .form-group input, .settings-page .form-group textarea { background-color: #111111; border: 1px solid #333; padding: 10px; border-radius: 4px; color: white; width: 100%; box-sizing: border-box; outline: none; }
        .settings-page .form-group input:focus, .settings-page .form-group textarea:focus { border-color: #D4AF37; }
        .settings-page .btn-primary { background-color: #D4AF37; color: white; font-weight: bold; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: opacity 0.2s; }
        .settings-page .btn-primary:hover { background-color: #D4AF37; opacity: 0.9; transform: none; box-shadow: none; }
      `}</style>
      <div className="settings-page" style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '40px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem', color: '#D4AF37' }}>
          <div style={{ backgroundColor: 'white', border: '1px solid #D4AF37', padding: '4px', borderRadius: '4px', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </div>
          Global Settings
        </h2>
        <SettingsForm settings={settings} onChange={setSettings} onSave={handleSave} onResetPassword={() => setShowPasswordModal(true)} />
      </div>
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </div>
  );
}
