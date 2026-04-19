import { useEffect, useRef, useState } from 'react';
import { ContextInfoCard, FormIconButton, SidebarNavButton, TwoPanePage } from '../components/ui';

const WORKSPACE_LINKS = [
  {
    id: 'view-projects',
    label: 'View projects',
    panelHeading: 'Your projects',
    panelDescription: 'Projects you add with Create new project appear here.',
    emoji: '📂',
  },
  {
    id: 'view-groups',
    label: 'View groups',
    panelHeading: 'Groups in this workspace',
    panelDescription: 'Placeholder for teams, channels, and access groups.',
    emoji: '👥',
  },
  {
    id: 'workspace-activity',
    label: 'Workspace activity',
    panelHeading: 'Recent workspace activity',
    panelDescription: 'Placeholder for audit-style events and notifications.',
    emoji: '📈',
  },
];

const LINGER_MS = 2500;
const RAPID_SWITCH_MS = 2000;
const RAPID_SWITCHES_NEEDED = 3;
const WORKSPACE_LINK_IDS = new Set(WORKSPACE_LINKS.map((l) => l.id));

function NewProjectForm({ name, onNameChange, onSave, onCancel }) {
  return (
    <div className="workspace-create-panel">
      <label htmlFor="workspace-new-project-name" className="visually-hidden">
        Project name
      </label>
      <input
        id="workspace-new-project-name"
        type="text"
        className="workspace-project-name-input"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Project name"
        autoComplete="off"
      />
      <div className="workspace-create-actions">
        <FormIconButton variant="add" onClick={onSave} aria-label="Add project" title="Add">
          +
        </FormIconButton>
        <FormIconButton variant="cancel" onClick={onCancel} aria-label="Cancel" title="Cancel">
          ×
        </FormIconButton>
      </div>
    </div>
  );
}

function rowLabel(link, buttonsVersion) {
  if (buttonsVersion !== 'v2') return link.label;
  return `${link.emoji} ${link.label}`;
}

function createButtonLabel(buttonsVersion) {
  return buttonsVersion === 'v2' ? '🔨 Create new project' : 'Create new project';
}

const DETAIL_LABEL_PREFIX = {
  'view-groups': 'Groups',
  'workspace-activity': 'Activity',
};

function WorkspaceProjectsPanel({ link, projects }) {
  return (
    <div className="workspace-option-detail">
      <ContextInfoCard title={link.panelHeading} description={link.panelDescription} />
      {projects.length === 0 ? (
        <p className="workspace-projects-empty">
          No projects yet. Use <strong>Create new project</strong> in the sidebar to add one.
        </p>
      ) : (
        <div className="workspace-project-list" role="list">
          {projects.map((p) => (
            <article key={p.id} className="workspace-project-card" role="listitem">
              <h3 className="workspace-project-card-title">{p.name}</h3>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/** Tall placeholder blocks (space, not copy) so the main workspace area scrolls. */
function WorkspaceOptionDetail({ link }) {
  const prefix = DETAIL_LABEL_PREFIX[link.id] ?? 'Preview';
  return (
    <div className="workspace-option-detail">
      <ContextInfoCard title={link.panelHeading} description={link.panelDescription} />
      <div className="workspace-detail-stack" aria-label="Sample workspace content">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className={`workspace-detail-block workspace-detail-block--${link.id.replace(/[^a-z0-9-]/g, '')}`}
          >
            <span className="workspace-detail-block-label">
              {prefix} · sample region {i}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkspacePage({ buttonsVersion = 'v1', onWorkspaceAdaptiveSignal }) {
  const [projects, setProjects] = useState([]);
  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [activeLinkId, setActiveLinkId] = useState('view-projects');

  const lingerTimerRef = useRef(null);
  const lastClickRef = useRef(null);
  const rapidSwitchCountRef = useRef(0);

  useEffect(() => {
    return () => {
      if (lingerTimerRef.current) window.clearTimeout(lingerTimerRef.current);
    };
  }, []);

  function startLinger() {
    if (lingerTimerRef.current) window.clearTimeout(lingerTimerRef.current);
    lingerTimerRef.current = window.setTimeout(() => {
      lingerTimerRef.current = null;
      onWorkspaceAdaptiveSignal?.('linger');
    }, LINGER_MS);
  }

  function clearLinger() {
    if (lingerTimerRef.current) window.clearTimeout(lingerTimerRef.current);
    lingerTimerRef.current = null;
  }

  function noteClick(clickId) {
    const now = Date.now();
    const prev = lastClickRef.current;
    if (prev && now - prev.t < RAPID_SWITCH_MS) {
      if (
        WORKSPACE_LINK_IDS.has(prev.id) &&
        WORKSPACE_LINK_IDS.has(clickId) &&
        prev.id !== clickId
      ) {
        rapidSwitchCountRef.current += 1;
        if (rapidSwitchCountRef.current >= RAPID_SWITCHES_NEEDED) {
          onWorkspaceAdaptiveSignal?.('rapid_switch');
          rapidSwitchCountRef.current = 0;
        }
      }
    } else if (prev) {
      rapidSwitchCountRef.current = 0;
    }
    lastClickRef.current = { id: clickId, t: now };
  }

  const activeLink = WORKSPACE_LINKS.find((l) => l.id === activeLinkId) ?? null;

  function saveProject() {
    const name = draftName.trim();
    if (!name) return;
    setProjects((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, name }]);
    setDraftName('');
    setCreating(false);
  }

  function cancelCreate() {
    setDraftName('');
    setCreating(false);
  }

  return (
    <TwoPanePage
      ariaLabel="Workspace preferences page content"
      mainClassName="workspace-main"
      pageClassName="workspace-page"
      left={
        <div className="workspace-sidebar" data-ui-element-id="Workspace_Left_Buttons">
          <button
            type="button"
            className="workspace-create-trigger"
            onMouseEnter={startLinger}
            onMouseLeave={clearLinger}
            onClick={() => {
              noteClick('create');
              setCreating(true);
            }}
          >
            {createButtonLabel(buttonsVersion)}
          </button>

          {creating ? (
            <NewProjectForm
              name={draftName}
              onNameChange={setDraftName}
              onSave={saveProject}
              onCancel={cancelCreate}
            />
          ) : null}

          <div className="workspace-sidebar-links" role="group" aria-label="Workspace shortcuts">
            {WORKSPACE_LINKS.map((link) => (
              <SidebarNavButton
                key={link.id}
                isSelected={link.id === activeLinkId}
                onClick={() => {
                  noteClick(link.id);
                  setActiveLinkId(link.id);
                }}
                onMouseEnter={startLinger}
                onMouseLeave={clearLinger}
                className="workspace-link-button"
                selectedClassName="workspace-link-button--active"
                selectionMode="pressed"
              >
                {rowLabel(link, buttonsVersion)}
              </SidebarNavButton>
            ))}
          </div>
        </div>
      }
      right={
        <div className="workspace-projects" aria-label="Workspace content">
          <div className="workspace-projects-inner">
            {activeLink?.id === 'view-projects' ? (
              <WorkspaceProjectsPanel link={activeLink} projects={projects} />
            ) : activeLink ? (
              <WorkspaceOptionDetail link={activeLink} />
            ) : null}
          </div>
        </div>
      }
    />
  );
}

export default WorkspacePage;
