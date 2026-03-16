import { COLOUR_SCHEMES } from '../../types';
import type { MeshUser } from '../../types';
import { supabase } from '../../lib/supabase';
import './Settings.css';

interface SettingsModuleProps {
  user: MeshUser;
  onLogout: () => void;
  onSchemeChange: (scheme: string) => void;
  currentScheme: string;
  customColour: string;
  onCustomColourChange: (colour: string) => void;
}

export function SettingsModule({ user, onLogout, onSchemeChange, currentScheme, customColour, onCustomColourChange }: SettingsModuleProps) {
  const handleSchemeChange = async (scheme: string) => {
    onSchemeChange(scheme);
    await supabase.from('mesh_users').update({ colour_scheme: scheme }).eq('id', user.id);
  };

  return (
    <div className="settings-module">
      <div className="settings-section">
        <div className="settings-section-header">COLOUR SCHEME</div>
        <div className="scheme-options">
          {Object.entries(COLOUR_SCHEMES).map(([key, config]) => (
            <button
              key={key}
              className={`scheme-btn ${currentScheme === key ? 'active' : ''}`}
              onClick={() => handleSchemeChange(key)}
            >
              <span className="scheme-preview" style={{ background: config.primary }} />
              <span className="scheme-name">{config.name}</span>
            </button>
          ))}
          <button
            className={`scheme-btn ${currentScheme === 'custom' ? 'active' : ''}`}
            onClick={() => handleSchemeChange('custom')}
          >
            <span className="scheme-preview" style={{ background: customColour }} />
            <span className="scheme-name">Custom</span>
          </button>
        </div>
        {currentScheme === 'custom' && (
          <div className="custom-colour-picker">
            <label>CUSTOM COLOUR:</label>
            <input
              type="color"
              value={customColour}
              onChange={e => onCustomColourChange(e.target.value)}
              className="colour-input"
            />
            <span className="colour-hex">{customColour}</span>
          </div>
        )}
      </div>

      <div className="settings-section">
        <div className="settings-section-header">TERMINAL INFO</div>
        <div className="settings-info">
          <div className="info-row">
            <span className="label">VERSION:</span> MESH v1.0.3
          </div>
          <div className="info-row">
            <span className="label">HANDLE:</span> {user.handle}
          </div>
          <div className="info-row">
            <span className="label">NAME:</span> {user.display_name}
          </div>
          <div className="info-row">
            <span className="label">ROLE:</span> {user.role}
          </div>
          <div className="info-row">
            <span className="label">ACCESS:</span> {user.is_gm ? 'GM (Elevated)' : 'Standard User'}
          </div>
          <div className="info-row">
            <span className="label">SERVER:</span> MetroNet Auckland Node 7
          </div>
          <div className="info-row">
            <span className="label">STATUS:</span> <span className="online-text">CONNECTED</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-header">SESSION</div>
        <button className="logout-btn" onClick={onLogout}>[ DISCONNECT / LOGOUT ]</button>
      </div>

      <div className="settings-footer">
        <pre className="settings-ascii">{`
  MESH PERSONAL TERMINAL
  (c) 2045 Parallax Devices
  Tāmaki Makaurau, Aotearoa
  All rights reserved.`}</pre>
      </div>
    </div>
  );
}
