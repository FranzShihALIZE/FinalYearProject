import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './App.css';
import { API_BASE, UI_ELEMENT_LABELS } from './appConfig';
import { ZOOM_IN_THRESHOLD } from './zoomConstants';
import { AppHeader, MenuDropdown } from './components/AppChrome';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import RegisterPage from './pages/RegisterPage';
import SearchPage from './pages/SearchPage';
import WorkspacePage from './pages/WorkspacePage';

const PAGE_TITLE = {
  home: 'AUI Showcase',
  search: 'Browse projects',
  profile: 'Profile & settings',
  workspace: 'Workspace preferences',
  signOut: 'Sign out',
};

const MENU_ROUTES = [
  { page: 'home', label: 'Home' },
  { page: 'search', label: 'Community' },
  { page: 'profile', label: 'Profile' },
  { page: 'workspace', label: 'Workspace' },
  { page: 'signOut', label: 'Sign out' },
];

const HOME_ELEMENT_ID = 'Home_Page_Text_Content';
const GRID_ELEMENT_ID = 'Community_Project_Grid';
const WORKSPACE_ELEMENT_ID = 'Workspace_Left_Buttons';
const PROFILE_DISPLAY_ELEMENT_ID = 'Profile_Display_Info';

function proposalQuestion(pending) {
  if (!pending) return '';
  if (pending.elementId === GRID_ELEMENT_ID) {
    if (pending.toVersion === 'v2') return 'Would you like to reduce how many projects are shown in each row?';
    if (pending.toVersion === 'v3') return 'Would you like to show one project per row?';
  }
  if (pending.elementId === WORKSPACE_ELEMENT_ID) {
    return 'Would you like to add icons to the workspace buttons?';
  }
  if (pending.elementId === PROFILE_DISPLAY_ELEMENT_ID) {
    return 'Would you like to show profile settings permanently?';
  }
  const label = UI_ELEMENT_LABELS[pending.elementId] ?? pending.elementId;
  return `Change ${label} to ${pending.toVersion}?`;
}

function confirmQuestion(confirm) {
  if (!confirm) return '';
  if (confirm.elementId === GRID_ELEMENT_ID) {
    if (confirm.toVersion === 'v2') return 'Keep the grid with fewer projects per row?';
    if (confirm.toVersion === 'v3') return 'Keep the single-column project list?';
    return 'Keep this project grid layout?';
  }
  if (confirm.elementId === WORKSPACE_ELEMENT_ID) {
    return 'Keep icons on the workspace buttons?';
  }
  if (confirm.elementId === PROFILE_DISPLAY_ELEMENT_ID) {
    return 'Keep showing profile settings permanently?';
  }
  const label = UI_ELEMENT_LABELS[confirm.elementId] ?? confirm.elementId;
  return `Confirm ${label} change to ${confirm.toVersion}?`;
}

/** Which UI element receives per-second time attribution on this page (home / search / workspace). */
function getTimeTrackElementId(activePage) {
  if (activePage === 'home') return HOME_ELEMENT_ID;
  if (activePage === 'search') return GRID_ELEMENT_ID;
  if (activePage === 'workspace') return WORKSPACE_ELEMENT_ID;
  return null;
}

function dwellZoomPayload(trackingPayload, elementId) {
  return {
    element_id: elementId,
    dwell_time_seconds: trackingPayload.dwell_time_seconds,
    zoom_level: trackingPayload.zoom_level,
    zoom_in_threshold: ZOOM_IN_THRESHOLD,
  };
}

function appendChangeLog(element, logEntry) {
  return {
    ...element,
    change_log: [...element.change_log, logEntry],
  };
}

function silentPutSession(session) {
  fetch(`${API_BASE}/api/user_session/${session.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  }).catch(() => {});
}

function createDefaultUIChanges() {
  return {
    Menu_Dropdown_Button: {
      allowed_versions: ['small', 'medium', 'large'],
      default: 'small',
      active: 'small',
      change_log: [],
      time_spent_by_version_seconds: { small: 0, medium: 0, large: 0 },
    },
    Home_Page_Text_Content: {
      allowed_versions: ['small', 'medium', 'large'],
      default: 'small',
      active: 'small',
      change_log: [],
      time_spent_by_version_seconds: { small: 0, medium: 0, large: 0 },
    },
    Community_Project_Grid: {
      allowed_versions: ['v1', 'v2', 'v3'],
      default: 'v1',
      active: 'v1',
      change_log: [],
      time_spent_by_version_seconds: { v1: 0, v2: 0, v3: 0 },
    },
    Workspace_Left_Buttons: {
      allowed_versions: ['v1', 'v2'],
      default: 'v1',
      active: 'v1',
      change_log: [],
      time_spent_by_version_seconds: { v1: 0, v2: 0 },
    },
    Profile_Display_Info: {
      allowed_versions: ['v1', 'v2'],
      default: 'v1',
      active: 'v1',
      change_log: [],
      time_spent_by_version_seconds: { v1: 0, v2: 0 },
    },
  };
}

function BlankPage() {
  return <main className="home-main" aria-label="Page content" />;
}

function PageBody({
  page,
  homeTextSize,
  communityGridVersion,
  workspaceButtonsVersion,
  profileDisplayVersion,
  onHomeTrack,
  onCommunityGridTrack,
  onWorkspaceAdaptiveSignal,
  onProfileDisplayAdaptiveSignal,
  sessionId,
}) {
  switch (page) {
    case 'home':
      return (
        <main className="home-main">
          <HomePage textSize={homeTextSize} onTrack={onHomeTrack} />
        </main>
      );
    case 'profile':
      return (
        <ProfilePage
          sessionId={sessionId}
          displayVersion={profileDisplayVersion}
          onProfileDisplayAdaptiveSignal={onProfileDisplayAdaptiveSignal}
        />
      );
    case 'workspace':
      return (
        <WorkspacePage
          buttonsVersion={workspaceButtonsVersion}
          onWorkspaceAdaptiveSignal={onWorkspaceAdaptiveSignal}
        />
      );
    case 'search':
      return <SearchPage gridVersion={communityGridVersion} onTrack={onCommunityGridTrack} />;
    default:
      return <BlankPage />;
  }
}

function App() {
  const [page, setPage] = useState('home');
  const [sessionData, setSessionData] = useState(null);
  const [sessionStartMs, setSessionStartMs] = useState(null);
  const [registerError, setRegisterError] = useState('');
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);
  const [isEndingTest, setIsEndingTest] = useState(false);
  const [pendingProposal, setPendingProposal] = useState(null);
  const [confirmProposal, setConfirmProposal] = useState(null);
  const menuNearMissCountRef = useRef(0);
  const sessionRef = useRef(sessionData);
  const pageRef = useRef(page);
  const lastPersistMsRef = useRef(0);

  useEffect(() => {
    sessionRef.current = sessionData;
  }, [sessionData]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  function go(next) {
    setPage(next);
  }

  const menuItems = useMemo(() => {
    const routes = page === 'home' ? MENU_ROUTES.filter((item) => item.page !== 'home') : MENU_ROUTES;
    const items = [];
    for (const route of routes) {
      const target = route.page;
      items.push({
        label: route.label,
        onClick() {
          go(target);
        },
      });
    }
    return items;
  }, [page]);

  async function requestAdaptationProposal(eventType, payload = {}, context = {}) {
    if (!sessionData || pendingProposal || confirmProposal) return null;
    try {
      const res = await fetch(`${API_BASE}/api/adaptation/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionData.id,
          event: eventType,
          payload,
          context: { page, ...context },
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.should_propose && data.element_id && data.from_version && data.to_version) {
        setPendingProposal({
          elementId: data.element_id,
          fromVersion: data.from_version,
          toVersion: data.to_version,
        });
      }
      return data;
    } catch {
      return null;
    }
  }

  async function saveSession(nextSessionData) {
    if (!nextSessionData) return;
    await fetch(`${API_BASE}/api/user_session/${nextSessionData.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextSessionData),
    });
    setSessionData(nextSessionData);
  }

  function makeLog(fromVersion, toVersion, changeRejected, rolledBack = false) {
    return {
      changed_at: new Date().toISOString(),
      from_version: fromVersion,
      to_version: toVersion,
      suggested_by_app: true,
      change_rejected: changeRejected,
      rolled_back: rolledBack,
    };
  }

  async function applyElementUpdate(elementId, updateElement) {
    if (!sessionData) return;
    const currentElement = sessionData.ui_changes[elementId];
    const updatedElement = updateElement(currentElement);
    const nextSessionData = {
      ...sessionData,
      ui_changes: { ...sessionData.ui_changes, [elementId]: updatedElement },
    };
    await saveSession(nextSessionData);
  }

  async function beginSession(formValues) {
    const id = Date.now();
    const payload = {
      id,
      age: formValues.age,
      sex: formValues.sex,
      conditions_affect_use: formValues.conditions_affect_use,
      conditions: formValues.conditions,
      ui_changes: createDefaultUIChanges(),
      total_time_spent_seconds: 0,
    };

    setIsSubmittingRegistration(true);
    setRegisterError('');
    try {
      const createResponse = await fetch(`${API_BASE}/api/user_session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!createResponse.ok) {
        const errBody = await createResponse.text();
        throw new Error(
          `Session create failed (${createResponse.status}): ${errBody.slice(0, 300) || createResponse.statusText}`,
        );
      }
      const sessionResponse = await fetch(`${API_BASE}/api/user_session/${id}`);
      const createdSession = sessionResponse.ok ? await sessionResponse.json() : payload;
      setSessionData(createdSession);
      setSessionStartMs(Date.now());
      lastPersistMsRef.current = Date.now();
      setPage('home');
    } catch (error) {
      setRegisterError(error.message || 'Failed to create user test session.');
    } finally {
      setIsSubmittingRegistration(false);
    }
  }

  useEffect(() => {
    if (!sessionStartMs || !sessionData) return;
    const tickId = window.setInterval(() => {
      const current = sessionRef.current;
      if (!current) return;
      const activePage = pageRef.current;
      const targetId =
        activePage === 'home'
          ? HOME_ELEMENT_ID
          : activePage === 'search'
            ? GRID_ELEMENT_ID
            : activePage === 'workspace'
              ? WORKSPACE_ELEMENT_ID
              : null;
      if (!targetId) {
        const idleSession = {
          ...current,
          total_time_spent_seconds: (current.total_time_spent_seconds ?? 0) + 1,
        };
        sessionRef.current = idleSession;
        setSessionData(idleSession);
        const nowIdle = Date.now();
        if (nowIdle - lastPersistMsRef.current >= 5000) {
          lastPersistMsRef.current = nowIdle;
          fetch(`${API_BASE}/api/user_session/${idleSession.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(idleSession),
          }).catch(() => {});
        }
        return;
      }
      const element = current.ui_changes[targetId];
      const activeVersion = element.active;
      const nextTimeSpent = {
        ...element.time_spent_by_version_seconds,
        [activeVersion]: (element.time_spent_by_version_seconds[activeVersion] ?? 0) + 1,
      };
      const nextSessionData = {
        ...current,
        total_time_spent_seconds: (current.total_time_spent_seconds ?? 0) + 1,
        ui_changes: {
          ...current.ui_changes,
          [targetId]: { ...element, time_spent_by_version_seconds: nextTimeSpent },
        },
      };
      sessionRef.current = nextSessionData;
      setSessionData(nextSessionData);

      const now = Date.now();
      if (now - lastPersistMsRef.current >= 5000) {
        lastPersistMsRef.current = now;
        silentPutSession(nextSessionData);
      }
    }, 1000);
    return () => window.clearInterval(tickId);
    // sessionData is read via sessionRef so the timer is not torn down on every session tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStartMs]);

  async function endTest() {
    if (!sessionData || isEndingTest) return;
    setIsEndingTest(true);

    const elapsedSeconds = sessionStartMs ? Math.max(0, Math.floor((Date.now() - sessionStartMs) / 1000)) : 0;
    const updatedPayload = {
      ...sessionData,
      total_time_spent_seconds: elapsedSeconds,
    };

    try {
      await fetch(`${API_BASE}/api/user_session/${sessionData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload),
      });
    } catch (error) {
      // Keep reset behavior even if update fails; test can still be ended by facilitator.
    } finally {
      setSessionData(null);
      setSessionStartMs(null);
      setRegisterError('');
      setPage('home');
      setIsEndingTest(false);
      setPendingProposal(null);
      setConfirmProposal(null);
    }
  }

  async function handleHomeTrack(trackingPayload) {
    if (page !== 'home') return;
    await requestAdaptationProposal('dwell_zoom', dwellZoomPayload(trackingPayload, HOME_ELEMENT_ID));
  }

  async function handleCommunityGridTrack(trackingPayload) {
    if (page !== 'search') return;
    await requestAdaptationProposal('dwell_zoom', dwellZoomPayload(trackingPayload, GRID_ELEMENT_ID));
  }

  function handleMenuHoverLong() {
    if (!sessionData) return;
    requestAdaptationProposal('menu_linger_complete');
  }

  async function handleMenuNearMissClick() {
    if (!sessionData || pendingProposal || confirmProposal) return;
    menuNearMissCountRef.current += 1;
    const data = await requestAdaptationProposal('menu_near_miss', {
      count: menuNearMissCountRef.current,
    });
    if (data?.should_propose) menuNearMissCountRef.current = 0;
  }

  function handleWorkspaceAdaptiveSignal(kind) {
    if (!sessionData || page !== 'workspace' || pendingProposal || confirmProposal) return;
    if (kind === 'linger') {
      requestAdaptationProposal('workspace_linger');
    } else if (kind === 'rapid_switch') {
      requestAdaptationProposal('workspace_rapid_switch', { count: 3 });
    }
  }

  function handleProfileDisplayAdaptiveSignal(struggleCount) {
    if (!sessionData || page !== 'profile' || pendingProposal || confirmProposal) return;
    requestAdaptationProposal('profile_struggle', { count: struggleCount });
  }

  async function rejectProposal() {
    if (!pendingProposal) return;
    const p = pendingProposal;
    await applyElementUpdate(p.elementId, (element) =>
      appendChangeLog(element, makeLog(p.fromVersion, p.toVersion, true)),
    );
    setPendingProposal(null);
  }

  async function acceptProposal() {
    if (!pendingProposal) return;
    const proposal = pendingProposal;
    await applyElementUpdate(proposal.elementId, (element) => ({
      ...appendChangeLog(element, makeLog(proposal.fromVersion, proposal.toVersion, false)),
      active: proposal.toVersion,
    }));
    setPendingProposal(null);
    setConfirmProposal(proposal);
  }

  async function confirmAcceptedChange() {
    if (!confirmProposal) return;
    const c = confirmProposal;
    await applyElementUpdate(c.elementId, (element) =>
      appendChangeLog(element, makeLog(c.toVersion, c.toVersion, false)),
    );
    setConfirmProposal(null);
  }

  async function rollbackAcceptedChange() {
    if (!confirmProposal) return;
    const proposal = confirmProposal;
    await applyElementUpdate(proposal.elementId, (element) => ({
      ...appendChangeLog(element, makeLog(proposal.toVersion, proposal.fromVersion, false, true)),
      active: proposal.fromVersion,
    }));
    setConfirmProposal(null);
    setPendingProposal(proposal);
  }

  const title = PAGE_TITLE[page] ?? PAGE_TITLE.home;
  const homeTextSize = sessionData?.ui_changes?.Home_Page_Text_Content?.active ?? 'small';
  const communityGridVersion = sessionData?.ui_changes?.Community_Project_Grid?.active ?? 'v1';
  const workspaceButtonsVersion = sessionData?.ui_changes?.Workspace_Left_Buttons?.active ?? 'v1';
  const profileDisplayVersion = sessionData?.ui_changes?.Profile_Display_Info?.active ?? 'v1';
  const menuButtonSize = sessionData?.ui_changes?.Menu_Dropdown_Button?.active ?? 'small';
  const alertRoot = typeof document !== 'undefined' ? document.body : null;

  if (!sessionData) {
    return (
      <div className="App">
        <RegisterPage
          onContinue={beginSession}
          isSubmitting={isSubmittingRegistration}
          errorMessage={registerError}
        />
      </div>
    );
  }

  return (
    <div className="App">
      <AppHeader
        title={title}
        left={
          <MenuDropdown
            buttonLabel={`Menu \u25BC`}
            menuButtonId={page === 'home' ? 'home-menu-button' : 'page-menu-button'}
            items={menuItems}
            size={menuButtonSize}
            onHoverLong={handleMenuHoverLong}
            onNearMissClick={handleMenuNearMissClick}
          />
        }
      />

      {alertRoot && pendingProposal
        ? createPortal(
            <div className="adapt-alert">
              <p>{proposalQuestion(pendingProposal)}</p>
              <div className="adapt-alert-actions">
                <button type="button" className="adapt-btn adapt-btn--yes" onClick={acceptProposal}>Yes</button>
                <button type="button" className="adapt-btn adapt-btn--no" onClick={rejectProposal}>No</button>
              </div>
            </div>,
            alertRoot,
          )
        : null}
      {alertRoot && confirmProposal
        ? createPortal(
            <div className="adapt-alert">
              <p>{confirmQuestion(confirmProposal)}</p>
              <div className="adapt-alert-actions">
                <button type="button" className="adapt-btn adapt-btn--yes" onClick={confirmAcceptedChange}>
                  Confirm
                </button>
                <button type="button" className="adapt-btn adapt-btn--no" onClick={rollbackAcceptedChange}>
                  Revert
                </button>
              </div>
            </div>,
            alertRoot,
          )
        : null}

      <PageBody
        page={page}
        homeTextSize={homeTextSize}
        communityGridVersion={communityGridVersion}
        workspaceButtonsVersion={workspaceButtonsVersion}
        profileDisplayVersion={profileDisplayVersion}
        onHomeTrack={handleHomeTrack}
        onCommunityGridTrack={handleCommunityGridTrack}
        onWorkspaceAdaptiveSignal={handleWorkspaceAdaptiveSignal}
        onProfileDisplayAdaptiveSignal={handleProfileDisplayAdaptiveSignal}
        sessionId={sessionData.id}
      />
      <button type="button" className="end-test-button" onClick={endTest} disabled={isEndingTest}>
        {isEndingTest ? 'ENDING TEST...' : 'END TEST'}
      </button>
    </div>
  );
}

export default App;
