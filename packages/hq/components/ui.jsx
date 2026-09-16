'use client';

export function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontWeight: 600 }}>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 18, height: 18, accentColor: '#ff1f4b', cursor: 'pointer', flexShrink: 0 }}
      />
      <span>{label}</span>
    </label>
  );
}

export function Select({ value, onChange, options, placeholder = 'Select...' }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function SaveBar({ state, message, onSave, onReset }) {
  return (
    <div className="save-bar">
      <button className="btn btn-primary" onClick={onSave} disabled={state === 'saving'}>
        {state === 'saving' ? 'Saving...' : 'Save changes'}
      </button>
      {onReset && <button className="btn btn-ghost" onClick={onReset}>Reset</button>}
      {state === 'saved' && <span className="saved-msg">✓ Saved</span>}
      {state === 'error' && <span className="error-msg">{message || 'Failed to save — try again.'}</span>}
    </div>
  );
}