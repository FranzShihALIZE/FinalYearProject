import { useEffect, useRef, useState } from 'react';
import { UI_ELEMENT_IDS_IN_ORDER, UI_ELEMENT_LABELS, fetchUserSession } from '../appConfig';
import { SidebarNavList, TwoPanePage } from '../components/ui';

const PROFILE_ACTIONS = ['Security', 'Settings', 'Manage subscriptions', 'View UI Data'];

const DEFAULT_SETTING = 'Security';
const VIEW_UI = 'View UI Data';

const RAPID_ROW_MS = 2000;
const PROFILE_STRUGGLE_EVENTS_NEEDED = 3;

/** One object per setting: text under title + row defs (null = no panel). */
const SETTINGS_DETAIL = {
  Security: {
    lead: 'Manage sign-in, credentials, and how your account is protected.',
    rows: [
      { id: 'account-details', label: 'View account details' },
      { id: 'credentials', label: 'Change credentials' },
      { id: 'two-factor', label: 'Two-factor authentication' },
    ],
  },
  Settings: {
    lead: 'Customize language, notifications, appearance, and workspace defaults.',
    rows: [
      { id: 'language', label: 'Language & region' },
      { id: 'notifications', label: 'Notifications' },
      { id: 'appearance', label: 'Appearance' },
      { id: 'workspace-defaults', label: 'Workspace defaults' },
    ],
  },
  'Manage subscriptions': {
    lead: 'Review your plan, billing history, and payment options.',
    rows: [
      { id: 'current-plan', label: 'View current plan' },
      { id: 'payment-method', label: 'Payment method' },
      { id: 'billing-history', label: 'Billing history' },
    ],
  },
  [VIEW_UI]: { lead: null, rows: null },
};

function ProfileGhostButton({ children }) {
  return (
    <button type="button" className="profile-ghost-button">
      {children}
    </button>
  );
}

function ProfileRowExtendedBody({ section, rowId }) {
  switch (section) {
    case 'Security':
      switch (rowId) {
        case 'account-details':
          return (
            <div className="profile-row-extended" aria-label="Account details placeholder">
              <p className="profile-placeholder-text">
                Sample account summary: display name, member since date, and last sign-in are shown here in a
                full product.
              </p>
            </div>
          );
        case 'credentials':
          return (
            <div className="profile-row-extended profile-credential-fields" aria-label="Change credentials">
              <label className="profile-field-label">
                <span className="profile-field-caption">Username</span>
                <input type="text" className="profile-text-field" placeholder="New username" autoComplete="off" />
              </label>
              <label className="profile-field-label">
                <span className="profile-field-caption">Password</span>
                <input type="password" className="profile-text-field" placeholder="New password" autoComplete="off" />
              </label>
              <label className="profile-field-label">
                <span className="profile-field-caption">Confirm password</span>
                <input
                  type="password"
                  className="profile-text-field"
                  placeholder="Confirm password"
                  autoComplete="off"
                />
              </label>
              <label className="profile-field-label">
                <span className="profile-field-caption">Email</span>
                <input type="email" className="profile-text-field" placeholder="New email address" autoComplete="off" />
              </label>
            </div>
          );
        case 'two-factor':
          return (
            <div className="profile-row-extended profile-2fa-block" aria-label="Two-factor authentication">
              <input
                type="text"
                className="profile-text-field profile-text-field--sample"
                readOnly
                defaultValue="Authenticator app linked · backup codes available"
              />
              <ProfileGhostButton>Change two-factor settings</ProfileGhostButton>
            </div>
          );
        default:
          return null;
      }
    case 'Settings':
      switch (rowId) {
        case 'language':
          return (
            <div className="profile-row-extended profile-settings-inline" aria-label="Language">
              <p className="profile-placeholder-text profile-placeholder-text--compact">Current language: English</p>
              <ProfileGhostButton>Change language</ProfileGhostButton>
            </div>
          );
        case 'notifications':
          return <NotificationsSliderPlaceholder />;
        case 'appearance':
          return (
            <div className="profile-row-extended" aria-label="Appearance">
              <ProfileGhostButton>Change theme</ProfileGhostButton>
            </div>
          );
        case 'workspace-defaults':
          return (
            <div className="profile-row-extended profile-settings-inline" aria-label="Workspace defaults">
              <p className="profile-placeholder-text profile-placeholder-text--compact">
                Default project visibility: team only · New items inherit workspace layout · Weekly digest: on
              </p>
              <ProfileGhostButton>Change workspace defaults</ProfileGhostButton>
            </div>
          );
        default:
          return null;
      }
    case 'Manage subscriptions':
      switch (rowId) {
        case 'current-plan':
          return (
            <div className="profile-row-extended profile-settings-inline" aria-label="Current plan">
              <div className="profile-sample-region">
                <span className="profile-sample-region-title">Plan</span>
                <p className="profile-placeholder-text profile-placeholder-text--compact">Free plan · core features</p>
              </div>
              <ProfileGhostButton>Change plan</ProfileGhostButton>
            </div>
          );
        case 'payment-method':
          return (
            <div className="profile-row-extended profile-settings-inline" aria-label="Payment method">
              <div className="profile-sample-region">
                <span className="profile-sample-region-title">Billing</span>
                <p className="profile-placeholder-text profile-placeholder-text--compact">
                  Visa ·••• 4242 · expires 12/28 · billing zip 10001
                </p>
              </div>
              <ProfileGhostButton>Change billing info</ProfileGhostButton>
            </div>
          );
        case 'billing-history':
          return (
            <div className="profile-row-extended" aria-label="Billing history">
              <div className="profile-sample-region profile-billing-history">
                <span className="profile-sample-region-title">Recent activity</span>
                <ul className="profile-billing-list">
                  <li>Apr 2, 2026 — Renewal — $0.00 (Free plan)</li>
                  <li>Mar 2, 2026 — Renewal — $0.00 (Free plan)</li>
                  <li>Feb 2, 2026 — Renewal — $0.00 (Free plan)</li>
                </ul>
              </div>
            </div>
          );
        default:
          return null;
      }
    default:
      return null;
  }
}

function ViewUiDataPanel({ sessionId }) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setSnapshot(null);
    setError(null);
    fetchUserSession(sessionId)
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Failed to load session.');
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="profile-detail" aria-label="Current UI settings from database">
      <div className="profile-detail-inner">
        <header className="profile-detail-header">
          <h2 className="profile-detail-title">{VIEW_UI}</h2>
          <p className="profile-detail-lead profile-detail-lead--muted">
            Current versions stored for your session (from the database).
          </p>
        </header>
        {!snapshot && !error ? <p className="profile-ui-data-status">Loading…</p> : null}
        {error ? (
          <p className="profile-ui-data-status profile-ui-data-status--error" role="alert">
            {error}
          </p>
        ) : null}
        {snapshot?.ui_changes ? (
          <ul className="profile-ui-data-list">
            {UI_ELEMENT_IDS_IN_ORDER.map((elementId) => {
              const row = snapshot.ui_changes[elementId];
              if (!row) return null;
              return (
                <li key={elementId} className="profile-ui-data-row">
                  <span className="profile-ui-data-label">{UI_ELEMENT_LABELS[elementId] ?? elementId}</span>
                  <code className="profile-ui-data-version">{String(row.active ?? '—')}</code>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function NotificationsSliderPlaceholder() {
  const [enabled, setEnabled] = useState(true);
  return (
    <div className="profile-row-extended" aria-label="Notifications">
      <div className="profile-notifications-row">
        <span className="profile-notifications-label">{enabled ? 'Enabled' : 'Disabled'}</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          className={`profile-notify-slider ${enabled ? 'profile-notify-slider--on' : 'profile-notify-slider--off'}`}
          onClick={() => setEnabled((v) => !v)}
        >
          <span className="profile-notify-slider-thumb" />
        </button>
      </div>
    </div>
  );
}

function ProfileMainPanel({ settingLabel, displayVersion, onProfileDisplayAdaptiveSignal, sessionId }) {
  const detail = SETTINGS_DETAIL[settingLabel];
  const rows = detail?.rows;
  const lead = detail?.lead;
  const isV2 = displayVersion === 'v2';

  const [expandedRowKey, setExpandedRowKey] = useState(null);
  const struggleCountRef = useRef(0);
  const lastRowClickRef = useRef(null);

  useEffect(() => {
    setExpandedRowKey(null);
    struggleCountRef.current = 0;
    lastRowClickRef.current = null;
  }, [settingLabel]);

  function handleRowActivate(row) {
    if (isV2 || !onProfileDisplayAdaptiveSignal) return;
    const rowId = row.id;
    const rowLabel = row.label;

    const now = Date.now();
    const prev = lastRowClickRef.current;
    const wasExpanded = expandedRowKey === rowId;

    if (prev && now - prev.t < RAPID_ROW_MS) {
      if (prev.rowId === rowId && wasExpanded) {
        struggleCountRef.current += 1;
      } else if (prev.rowId !== rowId) {
        struggleCountRef.current += 1;
      }
    } else if (prev) {
      struggleCountRef.current = 0;
    }

    setExpandedRowKey((k) => (k === rowId ? null : rowId));
    lastRowClickRef.current = { rowId, rowLabel, t: now };

    if (struggleCountRef.current >= PROFILE_STRUGGLE_EVENTS_NEEDED) {
      onProfileDisplayAdaptiveSignal?.(struggleCountRef.current);
      struggleCountRef.current = 0;
    }
  }

  if (settingLabel === VIEW_UI) {
    return <ViewUiDataPanel sessionId={sessionId} />;
  }

  return (
    <div className="profile-detail" aria-label={`${settingLabel} placeholder`}>
      <div className="profile-detail-inner">
        <header className="profile-detail-header">
          <h2 className="profile-detail-title">{settingLabel}</h2>
          {lead ? <p className="profile-detail-lead">{lead}</p> : null}
        </header>
        {rows ? (
          <div className="profile-detail-panel">
            {isV2 ? (
              <div
                className="profile-detail-rows profile-detail-rows--v2"
                data-ui-element-id="Profile_Display_Info"
                role="region"
                aria-label={`${settingLabel} settings (expanded)`}
              >
                {rows.map((row) => (
                  <section key={row.id} className="profile-detail-v2-section">
                    <h3 className="profile-detail-v2-heading">{row.label}</h3>
                    <ProfileRowExtendedBody section={settingLabel} rowId={row.id} />
                  </section>
                ))}
              </div>
            ) : (
              <div
                className="profile-detail-rows"
                data-ui-element-id="Profile_Display_Info"
                role="group"
                aria-label={`${settingLabel} actions`}
              >
                {rows.map((row) => (
                  <div key={row.id} className="profile-detail-row-group">
                    <button
                      type="button"
                      className="profile-detail-row-button"
                      aria-expanded={expandedRowKey === row.id}
                      onClick={() => handleRowActivate(row)}
                    >
                      {row.label}
                    </button>
                    {expandedRowKey === row.id ? (
                      <ProfileRowExtendedBody section={settingLabel} rowId={row.id} />
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProfileSidebar({ activeSetting, onSelect }) {
  return (
    <div className="profile-sidebar">
      <div className="profile-avatar-placeholder" aria-label="Profile picture placeholder">
        Profile Picture
      </div>
      <SidebarNavList
        items={PROFILE_ACTIONS}
        getKey={(label) => label}
        getLabel={(label) => label}
        isSelected={(label) => label === activeSetting}
        onSelect={onSelect}
        className="profile-action-button"
        selectedClassName="profile-action-button--active"
        selectionMode="current"
        containerClassName="profile-action-list"
        ariaLabel="Profile options"
      />
    </div>
  );
}

function ProfilePage({ sessionId, displayVersion = 'v1', onProfileDisplayAdaptiveSignal }) {
  const [activeSetting, setActiveSetting] = useState(DEFAULT_SETTING);

  return (
    <TwoPanePage
      ariaLabel="Profile and settings page content"
      mainClassName="profile-main"
      pageClassName="profile-page"
      left={<ProfileSidebar activeSetting={activeSetting} onSelect={setActiveSetting} />}
      right={
        <ProfileMainPanel
          sessionId={sessionId}
          settingLabel={activeSetting}
          displayVersion={displayVersion}
          onProfileDisplayAdaptiveSignal={onProfileDisplayAdaptiveSignal}
        />
      }
    />
  );
}

export default ProfilePage;
