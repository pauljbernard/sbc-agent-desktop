import type {
  EnvironmentImageRegistryDto,
  FileSystemDirectoryListingDto,
  IncidentRemediationPlanDto,
  ProjectProfileDto
} from "../../shared/contracts";
import { PanelHeader } from "./surface-support";

const EDITOR_SOURCE_FILE_EXTENSIONS = new Set([".lisp", ".lsp", ".cl", ".l", ".asd", ".fasl", ".el"]);

function isEditorLoadableSourcePath(path: string): boolean {
  const normalized = path.trim().toLowerCase();
  return Array.from(EDITOR_SOURCE_FILE_EXTENSIONS).some((extension) => normalized.endsWith(extension));
}

export function ProjectOpenDialog({
  currentProjectId,
  onClose,
  onOpenProject,
  projects
}: {
  currentProjectId: string | null;
  onClose: () => void;
  onOpenProject: (projectId: string) => void;
  projects: ProjectProfileDto[];
}) {
  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Open Project"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Open Project</p>
            <h3>Choose a saved project</h3>
            <p className="project-dialog-copy">
              Projects remain the user-facing object. The bound environment image is restored underneath the project.
            </p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        {projects.length > 0 ? (
          <div className="project-dialog-list">
            {projects.map((project) => (
              <button
                className={project.projectId === currentProjectId ? "project-dialog-item active" : "project-dialog-item"}
                key={project.projectId}
                onClick={() => onOpenProject(project.projectId)}
                type="button"
              >
                <div className="project-dialog-item-copy">
                  <strong>{project.title}</strong>
                  <p>{project.summary}</p>
                </div>
                <div className="project-dialog-item-meta">
                  <span className="context-label">Environment</span>
                  <span>{project.environmentId}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state project-dialog-empty">
            <p className="eyebrow">No Projects</p>
            <h3>No saved projects are available yet.</h3>
          </div>
        )}
      </section>
    </div>
  );
}

export function ProjectCreateDialog({
  environmentId,
  onClose,
  onCreateProject,
  setTitleDraft,
  titleDraft
}: {
  environmentId: string | null;
  onClose: () => void;
  onCreateProject: () => void;
  setTitleDraft: (value: string) => void;
  titleDraft: string;
}) {
  const canCreate = Boolean(environmentId && titleDraft.trim().length > 0);

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="New Project"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">New Project</p>
            <h3>Create a project from the current environment</h3>
            <p className="project-dialog-copy">
              Projects are the user-facing container. The currently bound environment image remains the runtime state behind it.
            </p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Project Name</span>
          <input
            autoFocus
            onChange={(event) => setTitleDraft(event.target.value)}
            placeholder="Enter project name"
            value={titleDraft}
          />
        </label>
        <div className="project-dialog-binding">
          <span className="context-label">Bound Environment</span>
          <strong>{environmentId ?? "No environment bound"}</strong>
        </div>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" disabled={!canCreate} onClick={onCreateProject} type="button">
            Create Project
          </button>
        </div>
      </section>
    </div>
  );
}

export function EditorSourceFileLoadDialog({
  currentPathDraft,
  directoryListing,
  onChangePathDraft,
  onClose,
  onLoadDirectory,
  onLoadSelectedFile,
  onNavigateDirectory,
  onNavigateParent,
  selectedFilePath,
  pathDraft,
  setPathDraft
}: {
  currentPathDraft: string;
  directoryListing: FileSystemDirectoryListingDto | null;
  onChangePathDraft: (value: string) => void;
  onClose: () => void;
  onLoadDirectory: () => void;
  onLoadSelectedFile: () => void;
  onNavigateDirectory: (path: string) => void;
  onNavigateParent: () => void;
  selectedFilePath: string;
  pathDraft: string;
  setPathDraft: (value: string) => void;
}) {
  const canLoad = pathDraft.trim().length > 0 && isEditorLoadableSourcePath(pathDraft);
  const canLoadSelected = selectedFilePath.trim().length > 0 && isEditorLoadableSourcePath(selectedFilePath);

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Load Source File Into Editor"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Load Source File</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="project-dialog-actions project-dialog-actions-compact">
          <button className="project-dialog-close" disabled={!directoryListing?.parentPath} onClick={onNavigateParent} type="button">
            Up
          </button>
          <label className="project-dialog-field project-dialog-field-inline">
            <span className="context-label">Directory</span>
            <input
              autoFocus
              onChange={(event) => onChangePathDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onLoadDirectory();
                }
              }}
              value={currentPathDraft}
            />
          </label>
          <button className="project-dialog-primary" onClick={onLoadDirectory} type="button">
            Open Directory
          </button>
        </div>
        <div className="file-picker-grid">
          <div className="file-picker-pane">
            <div className="file-picker-pane-header">
              <strong>Directories</strong>
              <span>{directoryListing?.directories.length ?? 0}</span>
            </div>
            <div className="file-picker-list">
              {directoryListing?.directories.length ? (
                directoryListing.directories.map((entry) => (
                  <button className="file-picker-entry" key={entry.path} onClick={() => onNavigateDirectory(entry.path)} type="button">
                    <strong>{entry.name}</strong>
                    <span>{entry.path}</span>
                  </button>
                ))
              ) : (
                <p className="inspector-copy">No subdirectories.</p>
              )}
            </div>
          </div>
          <div className="file-picker-pane">
            <div className="file-picker-pane-header">
              <strong>Files</strong>
              <span>{directoryListing?.files.length ?? 0}</span>
            </div>
            <div className="file-picker-list">
              {directoryListing?.files.length ? (
                directoryListing.files.map((entry) => (
                  <button
                    className={
                      entry.path === selectedFilePath
                        ? "file-picker-entry active"
                        : isEditorLoadableSourcePath(entry.path)
                          ? "file-picker-entry"
                          : "file-picker-entry file-picker-entry-disabled"
                    }
                    disabled={!isEditorLoadableSourcePath(entry.path)}
                    key={entry.path}
                    onClick={() => setPathDraft(entry.path)}
                    type="button"
                  >
                    <strong>{entry.name}</strong>
                    <span>{entry.path}</span>
                  </button>
                ))
              ) : (
                <p className="inspector-copy">No files.</p>
              )}
            </div>
          </div>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Selected File</span>
          <input
            onChange={(event) => setPathDraft(event.target.value)}
            placeholder="/absolute/path/to/source.lisp"
            value={pathDraft}
          />
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-close" disabled={!canLoadSelected} onClick={onLoadSelectedFile} type="button">
            Load Selected
          </button>
          <button className="project-dialog-primary" disabled={!canLoad} onClick={onLoadSelectedFile} type="button">
            Load Source File
          </button>
        </div>
      </section>
    </div>
  );
}

export function EditorSourceFileSaveDialog({
  currentPathDraft,
  directoryListing,
  fileNameDraft,
  onChangeFileNameDraft,
  onChangePathDraft,
  onClose,
  onNavigateDirectory,
  onNavigateParent,
  onOpenDirectory,
  onSave,
  selectedFilePath
}: {
  currentPathDraft: string;
  directoryListing: FileSystemDirectoryListingDto | null;
  fileNameDraft: string;
  onChangeFileNameDraft: (value: string) => void;
  onChangePathDraft: (value: string) => void;
  onClose: () => void;
  onNavigateDirectory: (path: string) => void;
  onNavigateParent: () => void;
  onOpenDirectory: () => void;
  onSave: () => void;
  selectedFilePath: string;
}) {
  const canSave = fileNameDraft.trim().length > 0 && isEditorLoadableSourcePath(selectedFilePath);

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Save Source File From Editor"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Save Source File</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="project-dialog-actions project-dialog-actions-compact">
          <button className="project-dialog-close" disabled={!directoryListing?.parentPath} onClick={onNavigateParent} type="button">
            Up
          </button>
          <label className="project-dialog-field project-dialog-field-inline">
            <span className="context-label">Directory</span>
            <input
              autoFocus
              onChange={(event) => onChangePathDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onOpenDirectory();
                }
              }}
              value={currentPathDraft}
            />
          </label>
          <button className="project-dialog-primary" onClick={onOpenDirectory} type="button">
            Open Directory
          </button>
        </div>
        <div className="file-picker-grid">
          <div className="file-picker-pane">
            <div className="file-picker-pane-header">
              <strong>Directories</strong>
              <span>{directoryListing?.directories.length ?? 0}</span>
            </div>
            <div className="file-picker-list">
              {directoryListing?.directories.length ? (
                directoryListing.directories.map((entry) => (
                  <button className="file-picker-entry" key={entry.path} onClick={() => onNavigateDirectory(entry.path)} type="button">
                    <strong>{entry.name}</strong>
                    <span>{entry.path}</span>
                  </button>
                ))
              ) : (
                <p className="inspector-copy">No subdirectories.</p>
              )}
            </div>
          </div>
          <div className="file-picker-pane">
            <div className="file-picker-pane-header">
              <strong>Files</strong>
              <span>{directoryListing?.files.length ?? 0}</span>
            </div>
            <div className="file-picker-list">
              {directoryListing?.files.length ? (
                directoryListing.files.map((entry) => (
                  <button
                    className={
                      entry.path === selectedFilePath
                        ? "file-picker-entry active"
                        : isEditorLoadableSourcePath(entry.path)
                          ? "file-picker-entry"
                          : "file-picker-entry file-picker-entry-disabled"
                    }
                    disabled={!isEditorLoadableSourcePath(entry.path)}
                    key={entry.path}
                    onClick={() => onChangeFileNameDraft(entry.name)}
                    type="button"
                  >
                    <strong>{entry.name}</strong>
                    <span>{entry.path}</span>
                  </button>
                ))
              ) : (
                <p className="inspector-copy">No files.</p>
              )}
            </div>
          </div>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">File Name</span>
          <input
            onChange={(event) => onChangeFileNameDraft(event.target.value)}
            placeholder="source-file.lisp"
            value={fileNameDraft}
          />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Target File</span>
          <input onChange={() => undefined} readOnly value={selectedFilePath} />
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" disabled={!canSave} onClick={onSave} type="button">
            Save Source File
          </button>
        </div>
      </section>
    </div>
  );
}

export function ProjectConstitutionEditDialog({
  constitutionDraft,
  onClose,
  onSave,
  setConstitutionDraft,
  projectTitle
}: {
  constitutionDraft: string;
  onClose: () => void;
  onSave: () => void;
  setConstitutionDraft: (value: string) => void;
  projectTitle: string;
}) {
  const canSave = constitutionDraft.trim().length > 0;

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Edit Project Constitution"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Constitution</p>
            <h3>Edit the governed project constitution</h3>
            <p className="project-dialog-copy">Update the persisted constitution record for {projectTitle}.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Constitution JSON</span>
          <textarea
            autoFocus
            className="project-dialog-textarea"
            onChange={(event) => setConstitutionDraft(event.target.value)}
            spellCheck={false}
            value={constitutionDraft}
          />
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" disabled={!canSave} onClick={onSave} type="button">
            Save Constitution
          </button>
        </div>
      </section>
    </div>
  );
}

export function WorkItemSteerDialog({
  nextStepDraft,
  noteDraft,
  onClose,
  onSave,
  phaseDraft,
  setNextStepDraft,
  setNoteDraft,
  setPhaseDraft,
  workItemTitle
}: {
  nextStepDraft: string;
  noteDraft: string;
  onClose: () => void;
  onSave: () => void;
  phaseDraft: string;
  setNextStepDraft: (value: string) => void;
  setNoteDraft: (value: string) => void;
  setPhaseDraft: (value: string) => void;
  workItemTitle: string;
}) {
  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Steer Work Item"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Steer Work</p>
            <h3>Update governed execution direction</h3>
            <p className="project-dialog-copy">Set the next execution direction for {workItemTitle}.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Phase</span>
          <input autoFocus onChange={(event) => setPhaseDraft(event.target.value)} value={phaseDraft} />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Next Step</span>
          <textarea className="project-dialog-textarea" onChange={(event) => setNextStepDraft(event.target.value)} value={nextStepDraft} />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Operator Note</span>
          <textarea className="project-dialog-textarea" onChange={(event) => setNoteDraft(event.target.value)} value={noteDraft} />
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" onClick={onSave} type="button">
            Steer Work
          </button>
        </div>
      </section>
    </div>
  );
}

export function WorkItemResumeDialog({
  noteDraft,
  onClose,
  onSave,
  setNoteDraft,
  workItemTitle
}: {
  noteDraft: string;
  onClose: () => void;
  onSave: () => void;
  setNoteDraft: (value: string) => void;
  workItemTitle: string;
}) {
  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Resume Work Item"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Resume Work</p>
            <h3>Resume governed execution</h3>
            <p className="project-dialog-copy">Resume {workItemTitle} with an explicit note.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Resume Note</span>
          <textarea autoFocus className="project-dialog-textarea" onChange={(event) => setNoteDraft(event.target.value)} value={noteDraft} />
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" onClick={onSave} type="button">
            Resume Work
          </button>
        </div>
      </section>
    </div>
  );
}

export function WorkItemQuarantineDialog({
  onClose,
  onSave,
  reasonDraft,
  setReasonDraft,
  workItemTitle
}: {
  onClose: () => void;
  onSave: () => void;
  reasonDraft: string;
  setReasonDraft: (value: string) => void;
  workItemTitle: string;
}) {
  const canSave = reasonDraft.trim().length > 0;

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Quarantine Work Item"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Quarantine Work</p>
            <h3>Block execution behind explicit recovery review</h3>
            <p className="project-dialog-copy">Quarantine {workItemTitle} with a governed reason.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Reason</span>
          <textarea autoFocus className="project-dialog-textarea" onChange={(event) => setReasonDraft(event.target.value)} value={reasonDraft} />
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" disabled={!canSave} onClick={onSave} type="button">
            Quarantine Work
          </button>
        </div>
      </section>
    </div>
  );
}

export function WorkItemRollbackDialog({
  noteDraft,
  onClose,
  onSave,
  reasonDraft,
  setNoteDraft,
  setReasonDraft,
  workItemTitle
}: {
  noteDraft: string;
  onClose: () => void;
  onSave: () => void;
  reasonDraft: string;
  setNoteDraft: (value: string) => void;
  setReasonDraft: (value: string) => void;
  workItemTitle: string;
}) {
  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Rollback Work Item"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Rollback Work</p>
            <h3>Send execution back for governed rollback review</h3>
            <p className="project-dialog-copy">Record why {workItemTitle} needs rollback.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Reason</span>
          <textarea autoFocus className="project-dialog-textarea" onChange={(event) => setReasonDraft(event.target.value)} value={reasonDraft} />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Operator Note</span>
          <textarea className="project-dialog-textarea" onChange={(event) => setNoteDraft(event.target.value)} value={noteDraft} />
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" onClick={onSave} type="button">
            Roll Back Work
          </button>
        </div>
      </section>
    </div>
  );
}

export function WorkItemValidationDialog({
  onClose,
  onSave,
  setStatusDraft,
  statusDraft,
  workItemTitle
}: {
  onClose: () => void;
  onSave: () => void;
  setStatusDraft: (value: string) => void;
  statusDraft: string;
  workItemTitle: string;
}) {
  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Complete Work Item Validations"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Validations</p>
            <h3>Record validation outcome</h3>
            <p className="project-dialog-copy">Update validation status for {workItemTitle}.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Validation Status</span>
          <select autoFocus value={statusDraft} onChange={(event) => setStatusDraft(event.target.value)}>
            <option value="passed">passed</option>
            <option value="failed">failed</option>
          </select>
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" onClick={onSave} type="button">
            Save Validation
          </button>
        </div>
      </section>
    </div>
  );
}

export function IncidentRemediationPlanDialog({
  actionDraft,
  blockerDraft,
  onClose,
  onSave,
  ownerDraft,
  setActionDraft,
  setBlockerDraft,
  setOwnerDraft,
  setStatusDraft,
  setSummaryDraft,
  setValidationDraft,
  statusDraft,
  summaryDraft,
  validationDraft,
  incidentTitle
}: {
  actionDraft: string;
  blockerDraft: string;
  onClose: () => void;
  onSave: () => void;
  ownerDraft: string;
  setActionDraft: (value: string) => void;
  setBlockerDraft: (value: string) => void;
  setOwnerDraft: (value: string) => void;
  setStatusDraft: (value: IncidentRemediationPlanDto["status"]) => void;
  setSummaryDraft: (value: string) => void;
  setValidationDraft: (value: string) => void;
  statusDraft: IncidentRemediationPlanDto["status"];
  summaryDraft: string;
  validationDraft: string;
  incidentTitle: string;
}) {
  const canSave = summaryDraft.trim().length > 0;

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Edit Incident Remediation Plan"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Remediation Plan</p>
            <h3>Edit governed recovery remediation</h3>
            <p className="project-dialog-copy">Attach explicit remediation steps to {incidentTitle}.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Status</span>
          <select autoFocus value={statusDraft} onChange={(event) => setStatusDraft(event.target.value as IncidentRemediationPlanDto["status"])}>
            <option value="draft">draft</option>
            <option value="active">active</option>
            <option value="blocked">blocked</option>
            <option value="completed">completed</option>
          </select>
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Owner</span>
          <input onChange={(event) => setOwnerDraft(event.target.value)} value={ownerDraft} />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Summary</span>
          <textarea className="project-dialog-textarea" onChange={(event) => setSummaryDraft(event.target.value)} value={summaryDraft} />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Actions</span>
          <textarea className="project-dialog-textarea" onChange={(event) => setActionDraft(event.target.value)} value={actionDraft} />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Validation Steps</span>
          <textarea className="project-dialog-textarea" onChange={(event) => setValidationDraft(event.target.value)} value={validationDraft} />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Blockers</span>
          <textarea className="project-dialog-textarea" onChange={(event) => setBlockerDraft(event.target.value)} value={blockerDraft} />
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" disabled={!canSave} onClick={onSave} type="button">
            Save Remediation Plan
          </button>
        </div>
      </section>
    </div>
  );
}

export function ProjectRequirementCreateDialog({
  onClose,
  onCreateRequirement,
  projectTitle,
  requirementPriority,
  requirementStatus,
  requirementSummary,
  requirementTitle,
  setRequirementPriority,
  setRequirementStatus,
  setRequirementSummary,
  setRequirementTitle
}: {
  onClose: () => void;
  onCreateRequirement: () => void;
  projectTitle: string;
  requirementPriority: string;
  requirementStatus: string;
  requirementSummary: string;
  requirementTitle: string;
  setRequirementPriority: (value: string) => void;
  setRequirementStatus: (value: string) => void;
  setRequirementSummary: (value: string) => void;
  setRequirementTitle: (value: string) => void;
}) {
  const canCreate = requirementTitle.trim().length > 0 && requirementSummary.trim().length > 0;

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Add Project Requirement"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Requirement</p>
            <h3>Add a governed project requirement</h3>
            <p className="project-dialog-copy">Create a new requirement record for {projectTitle}.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Title</span>
          <input autoFocus onChange={(event) => setRequirementTitle(event.target.value)} value={requirementTitle} />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Summary</span>
          <textarea
            className="project-dialog-textarea"
            onChange={(event) => setRequirementSummary(event.target.value)}
            value={requirementSummary}
          />
        </label>
        <div className="project-dialog-grid">
          <label className="project-dialog-field">
            <span className="context-label">Priority</span>
            <select value={requirementPriority} onChange={(event) => setRequirementPriority(event.target.value)}>
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </label>
          <label className="project-dialog-field">
            <span className="context-label">Status</span>
            <select value={requirementStatus} onChange={(event) => setRequirementStatus(event.target.value)}>
              <option value="proposed">proposed</option>
              <option value="active">active</option>
              <option value="draft">draft</option>
            </select>
          </label>
        </div>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" disabled={!canCreate} onClick={onCreateRequirement} type="button">
            Add Requirement
          </button>
        </div>
      </section>
    </div>
  );
}

export function ProjectFeatureSpecificationCreateDialog({
  acceptanceCriteriaDraft,
  featureStatus,
  featureSummary,
  featureTitle,
  onClose,
  onCreateFeatureSpecification,
  projectTitle,
  setAcceptanceCriteriaDraft,
  setFeatureStatus,
  setFeatureSummary,
  setFeatureTitle
}: {
  acceptanceCriteriaDraft: string;
  featureStatus: string;
  featureSummary: string;
  featureTitle: string;
  onClose: () => void;
  onCreateFeatureSpecification: () => void;
  projectTitle: string;
  setAcceptanceCriteriaDraft: (value: string) => void;
  setFeatureStatus: (value: string) => void;
  setFeatureSummary: (value: string) => void;
  setFeatureTitle: (value: string) => void;
}) {
  const canCreate = featureTitle.trim().length > 0 && featureSummary.trim().length > 0;

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Add Project Feature Specification"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Feature Specification</p>
            <h3>Add a governed feature specification</h3>
            <p className="project-dialog-copy">Create a new feature specification for {projectTitle}.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Title</span>
          <input autoFocus onChange={(event) => setFeatureTitle(event.target.value)} value={featureTitle} />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Summary</span>
          <textarea className="project-dialog-textarea" onChange={(event) => setFeatureSummary(event.target.value)} value={featureSummary} />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Acceptance Criteria</span>
          <textarea className="project-dialog-textarea" onChange={(event) => setAcceptanceCriteriaDraft(event.target.value)} value={acceptanceCriteriaDraft} />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Status</span>
          <select value={featureStatus} onChange={(event) => setFeatureStatus(event.target.value)}>
            <option value="proposed">proposed</option>
            <option value="active">active</option>
            <option value="accepted">accepted</option>
            <option value="draft">draft</option>
          </select>
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" disabled={!canCreate} onClick={onCreateFeatureSpecification} type="button">
            Add Feature Specification
          </button>
        </div>
      </section>
    </div>
  );
}

export function ProjectUserJourneyCreateDialog({
  actorsDraft,
  edgeCasesDraft,
  entrypointsDraft,
  journeySummary,
  journeyTitle,
  onClose,
  onCreateUserJourney,
  outcomesDraft,
  projectTitle,
  setActorsDraft,
  setEdgeCasesDraft,
  setEntrypointsDraft,
  setJourneySummary,
  setJourneyTitle,
  setOutcomesDraft,
  setStepsDraft,
  stepsDraft
}: {
  actorsDraft: string;
  edgeCasesDraft: string;
  entrypointsDraft: string;
  journeySummary: string;
  journeyTitle: string;
  onClose: () => void;
  onCreateUserJourney: () => void;
  outcomesDraft: string;
  projectTitle: string;
  setActorsDraft: (value: string) => void;
  setEdgeCasesDraft: (value: string) => void;
  setEntrypointsDraft: (value: string) => void;
  setJourneySummary: (value: string) => void;
  setJourneyTitle: (value: string) => void;
  setOutcomesDraft: (value: string) => void;
  setStepsDraft: (value: string) => void;
  stepsDraft: string;
}) {
  const canCreate = journeyTitle.trim().length > 0 && journeySummary.trim().length > 0;

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Add Project User Journey"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">User Journey</p>
            <h3>Add a governed user journey</h3>
            <p className="project-dialog-copy">Create a new user journey for {projectTitle}.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Title</span>
          <input autoFocus onChange={(event) => setJourneyTitle(event.target.value)} value={journeyTitle} />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Summary</span>
          <textarea className="project-dialog-textarea" onChange={(event) => setJourneySummary(event.target.value)} value={journeySummary} />
        </label>
        <div className="project-dialog-grid">
          <label className="project-dialog-field">
            <span className="context-label">Actors</span>
            <textarea className="project-dialog-textarea" onChange={(event) => setActorsDraft(event.target.value)} value={actorsDraft} />
          </label>
          <label className="project-dialog-field">
            <span className="context-label">Entrypoints</span>
            <textarea className="project-dialog-textarea" onChange={(event) => setEntrypointsDraft(event.target.value)} value={entrypointsDraft} />
          </label>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Steps</span>
          <textarea className="project-dialog-textarea" onChange={(event) => setStepsDraft(event.target.value)} value={stepsDraft} />
        </label>
        <div className="project-dialog-grid">
          <label className="project-dialog-field">
            <span className="context-label">Outcomes</span>
            <textarea className="project-dialog-textarea" onChange={(event) => setOutcomesDraft(event.target.value)} value={outcomesDraft} />
          </label>
          <label className="project-dialog-field">
            <span className="context-label">Edge Cases</span>
            <textarea className="project-dialog-textarea" onChange={(event) => setEdgeCasesDraft(event.target.value)} value={edgeCasesDraft} />
          </label>
        </div>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" disabled={!canCreate} onClick={onCreateUserJourney} type="button">
            Add User Journey
          </button>
        </div>
      </section>
    </div>
  );
}

export function ProjectArchitectureDecisionCreateDialog({
  consequencesDraft,
  decisionStatus,
  decisionSummary,
  decisionTitle,
  driversDraft,
  onClose,
  onCreateArchitectureDecision,
  projectTitle,
  setConsequencesDraft,
  setDecisionStatus,
  setDecisionSummary,
  setDecisionTitle,
  setDriversDraft,
  setStackChoicesDraft,
  stackChoicesDraft
}: {
  consequencesDraft: string;
  decisionStatus: string;
  decisionSummary: string;
  decisionTitle: string;
  driversDraft: string;
  onClose: () => void;
  onCreateArchitectureDecision: () => void;
  projectTitle: string;
  setConsequencesDraft: (value: string) => void;
  setDecisionStatus: (value: string) => void;
  setDecisionSummary: (value: string) => void;
  setDecisionTitle: (value: string) => void;
  setDriversDraft: (value: string) => void;
  setStackChoicesDraft: (value: string) => void;
  stackChoicesDraft: string;
}) {
  const canCreate = decisionTitle.trim().length > 0 && decisionSummary.trim().length > 0;

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Add Project Architecture Decision"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Architecture Decision</p>
            <h3>Add a governed architecture decision</h3>
            <p className="project-dialog-copy">Create a new architecture decision for {projectTitle}.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Title</span>
          <input autoFocus onChange={(event) => setDecisionTitle(event.target.value)} value={decisionTitle} />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Summary</span>
          <textarea className="project-dialog-textarea" onChange={(event) => setDecisionSummary(event.target.value)} value={decisionSummary} />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Status</span>
          <select value={decisionStatus} onChange={(event) => setDecisionStatus(event.target.value)}>
            <option value="proposed">proposed</option>
            <option value="accepted">accepted</option>
            <option value="active">active</option>
            <option value="draft">draft</option>
          </select>
        </label>
        <div className="project-dialog-grid">
          <label className="project-dialog-field">
            <span className="context-label">Drivers</span>
            <textarea className="project-dialog-textarea" onChange={(event) => setDriversDraft(event.target.value)} value={driversDraft} />
          </label>
          <label className="project-dialog-field">
            <span className="context-label">Consequences</span>
            <textarea className="project-dialog-textarea" onChange={(event) => setConsequencesDraft(event.target.value)} value={consequencesDraft} />
          </label>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Stack Choices</span>
          <textarea className="project-dialog-textarea" onChange={(event) => setStackChoicesDraft(event.target.value)} value={stackChoicesDraft} />
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" disabled={!canCreate} onClick={onCreateArchitectureDecision} type="button">
            Add Architecture Decision
          </button>
        </div>
      </section>
    </div>
  );
}

export function ProjectRecordEditDialog({
  draft,
  fieldLabel,
  onClose,
  onSave,
  projectTitle,
  recordLabel,
  setDraft
}: {
  draft: string;
  fieldLabel: string;
  onClose: () => void;
  onSave: () => void;
  projectTitle: string;
  recordLabel: string;
  setDraft: (value: string) => void;
}) {
  const canSave = draft.trim().length > 0;

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label={`Edit Project ${recordLabel}`}
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">{recordLabel}</p>
            <h3>Edit the governed {recordLabel.toLowerCase()}</h3>
            <p className="project-dialog-copy">Update the persisted {recordLabel.toLowerCase()} record for {projectTitle}.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">{fieldLabel}</span>
          <textarea
            autoFocus
            className="project-dialog-textarea"
            onChange={(event) => setDraft(event.target.value)}
            spellCheck={false}
            value={draft}
          />
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" disabled={!canSave} onClick={onSave} type="button">
            Save {recordLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function ProjectReleaseReadinessEditDialog({
  onClose,
  onSave,
  openRisksDraft,
  observationPlanDraft,
  projectTitle,
  requiredApproversDraft,
  setOpenRisksDraft,
  setObservationPlanDraft,
  setProjectReleaseReadinessSignoffStatusDraft,
  setProjectReleaseReadinessStageDraft,
  setProjectReleaseReadinessTargetWindowDraft,
  setRequiredApproversDraft,
  signoffStatusDraft,
  stageDraft,
  targetWindowDraft
}: {
  onClose: () => void;
  onSave: () => void;
  openRisksDraft: string;
  observationPlanDraft: string;
  projectTitle: string;
  requiredApproversDraft: string;
  setOpenRisksDraft: (value: string) => void;
  setObservationPlanDraft: (value: string) => void;
  setProjectReleaseReadinessSignoffStatusDraft: (value: string) => void;
  setProjectReleaseReadinessStageDraft: (value: string) => void;
  setProjectReleaseReadinessTargetWindowDraft: (value: string) => void;
  setRequiredApproversDraft: (value: string) => void;
  signoffStatusDraft: string;
  stageDraft: string;
  targetWindowDraft: string;
}) {
  const canSave =
    stageDraft.trim().length > 0 ||
    signoffStatusDraft.trim().length > 0 ||
    targetWindowDraft.trim().length > 0 ||
    requiredApproversDraft.trim().length > 0 ||
    observationPlanDraft.trim().length > 0 ||
    openRisksDraft.trim().length > 0;

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Edit Project Release Readiness"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Release Readiness</p>
            <h3>Edit the governed release-readiness record</h3>
            <p className="project-dialog-copy">Define closure posture, signoff, and observation planning for {projectTitle}.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="project-dialog-grid">
          <label className="project-dialog-field">
            <span className="context-label">Stage</span>
            <input autoFocus onChange={(event) => setProjectReleaseReadinessStageDraft(event.target.value)} value={stageDraft} />
          </label>
          <label className="project-dialog-field">
            <span className="context-label">Signoff Status</span>
            <input onChange={(event) => setProjectReleaseReadinessSignoffStatusDraft(event.target.value)} value={signoffStatusDraft} />
          </label>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Target Window</span>
          <input onChange={(event) => setProjectReleaseReadinessTargetWindowDraft(event.target.value)} value={targetWindowDraft} />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Required Approvers</span>
          <textarea
            className="project-dialog-textarea"
            onChange={(event) => setRequiredApproversDraft(event.target.value)}
            value={requiredApproversDraft}
          />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Observation Plan</span>
          <textarea
            className="project-dialog-textarea"
            onChange={(event) => setObservationPlanDraft(event.target.value)}
            value={observationPlanDraft}
          />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Open Risks</span>
          <textarea
            className="project-dialog-textarea"
            onChange={(event) => setOpenRisksDraft(event.target.value)}
            value={openRisksDraft}
          />
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" disabled={!canSave} onClick={onSave} type="button">
            Save Release Readiness
          </button>
        </div>
      </section>
    </div>
  );
}

export function ProjectReadinessObligationsEditDialog({
  obligationsDraft,
  onAddObligation,
  onClose,
  onRemoveObligation,
  onSave,
  onUpdateObligation,
  projectTitle
}: {
  obligationsDraft: Array<{
    obligationId: string;
    title: string;
    summary: string;
    status: string;
    owner: string;
    dueWindow: string;
    blocking: boolean;
    evidenceKindsDraft: string;
  }>;
  onAddObligation: () => void;
  onClose: () => void;
  onRemoveObligation: (index: number) => void;
  onSave: () => void;
  onUpdateObligation: (
    index: number,
    patch: Partial<{
      obligationId: string;
      title: string;
      summary: string;
      status: string;
      owner: string;
      dueWindow: string;
      blocking: boolean;
      evidenceKindsDraft: string;
    }>
  ) => void;
  projectTitle: string;
}) {
  const canSave = obligationsDraft.some((item) => item.title.trim().length > 0);

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Edit Project Readiness Obligations"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Readiness Obligations</p>
            <h3>Edit governed readiness obligations</h3>
            <p className="project-dialog-copy">Define explicit closure obligations for {projectTitle}.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <div className="project-dialog-stack">
          {obligationsDraft.map((obligation, index) => (
            <section className="project-dialog-subcard" key={`${obligation.obligationId || "obligation"}-${index}`}>
              <div className="project-dialog-subcard-header">
                <strong>Obligation {index + 1}</strong>
                <button className="starter-chip" onClick={() => onRemoveObligation(index)} type="button">
                  Remove
                </button>
              </div>
              <div className="project-dialog-grid">
                <label className="project-dialog-field">
                  <span className="context-label">Id</span>
                  <input
                    onChange={(event) => onUpdateObligation(index, { obligationId: event.target.value })}
                    value={obligation.obligationId}
                  />
                </label>
                <label className="project-dialog-field">
                  <span className="context-label">Status</span>
                  <input onChange={(event) => onUpdateObligation(index, { status: event.target.value })} value={obligation.status} />
                </label>
              </div>
              <label className="project-dialog-field">
                <span className="context-label">Title</span>
                <input
                  autoFocus={index === 0}
                  onChange={(event) => onUpdateObligation(index, { title: event.target.value })}
                  value={obligation.title}
                />
              </label>
              <label className="project-dialog-field">
                <span className="context-label">Summary</span>
                <textarea
                  className="project-dialog-textarea"
                  onChange={(event) => onUpdateObligation(index, { summary: event.target.value })}
                  value={obligation.summary}
                />
              </label>
              <div className="project-dialog-grid">
                <label className="project-dialog-field">
                  <span className="context-label">Owner</span>
                  <input onChange={(event) => onUpdateObligation(index, { owner: event.target.value })} value={obligation.owner} />
                </label>
                <label className="project-dialog-field">
                  <span className="context-label">Due Window</span>
                  <input
                    onChange={(event) => onUpdateObligation(index, { dueWindow: event.target.value })}
                    value={obligation.dueWindow}
                  />
                </label>
              </div>
              <label className="project-dialog-field">
                <span className="context-label">Evidence Kinds</span>
                <textarea
                  className="project-dialog-textarea"
                  onChange={(event) => onUpdateObligation(index, { evidenceKindsDraft: event.target.value })}
                  value={obligation.evidenceKindsDraft}
                />
              </label>
              <label className="project-dialog-checkbox">
                <input
                  checked={obligation.blocking}
                  onChange={(event) => onUpdateObligation(index, { blocking: event.target.checked })}
                  type="checkbox"
                />
                <span>Blocking obligation</span>
              </label>
            </section>
          ))}
        </div>
        <div className="project-dialog-actions">
          <button className="starter-chip" onClick={onAddObligation} type="button">
            Add Obligation
          </button>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" disabled={!canSave} onClick={onSave} type="button">
            Save Readiness Obligations
          </button>
        </div>
      </section>
    </div>
  );
}


export function ProjectTestingStrategyEditDialog({
  availableHarnesses,
  maximumEnvironmentSaveLoadSecondsDraft,
  maximumFailedTestsDraft,
  maximumSayTurnLatencySecondsDraft,
  onAddSuiteExpectation,
  onClose,
  onRemoveSuiteExpectation,
  onSave,
  projectTitle,
  requiredEvidenceDraft,
  requireCoverageDraft,
  requireRecoveryReadyDraft,
  setMaximumEnvironmentSaveLoadSecondsDraft,
  setMaximumFailedTestsDraft,
  setMaximumSayTurnLatencySecondsDraft,
  setRequiredEvidenceDraft,
  setRequireCoverageDraft,
  setRequireRecoveryReadyDraft,
  suiteExpectationsDraft,
  updateSuiteExpectation
}: {
  availableHarnesses: Array<{
    harnessId: string;
    label: string;
    entrypoint: string;
    kind: string;
    categories: string[];
  }>;
  maximumEnvironmentSaveLoadSecondsDraft: string;
  maximumFailedTestsDraft: string;
  maximumSayTurnLatencySecondsDraft: string;
  onAddSuiteExpectation: () => void;
  onClose: () => void;
  onRemoveSuiteExpectation: (index: number) => void;
  onSave: () => void;
  projectTitle: string;
  requiredEvidenceDraft: string;
  requireCoverageDraft: boolean;
  requireRecoveryReadyDraft: boolean;
  setMaximumEnvironmentSaveLoadSecondsDraft: (value: string) => void;
  setMaximumFailedTestsDraft: (value: string) => void;
  setMaximumSayTurnLatencySecondsDraft: (value: string) => void;
  setRequiredEvidenceDraft: (value: string) => void;
  setRequireCoverageDraft: (value: boolean) => void;
  setRequireRecoveryReadyDraft: (value: boolean) => void;
  suiteExpectationsDraft: Array<{
    harnessId: string;
    purpose: string;
    evidenceKindsDraft: string;
  }>;
  updateSuiteExpectation: (index: number, patch: Partial<{
    harnessId: string;
    purpose: string;
    evidenceKindsDraft: string;
  }>) => void;
}) {
  const canSave =
    requiredEvidenceDraft.trim().length > 0 ||
    suiteExpectationsDraft.some(
      (entry) =>
        entry.harnessId.trim().length > 0 || entry.purpose.trim().length > 0 || entry.evidenceKindsDraft.trim().length > 0
    ) ||
    maximumFailedTestsDraft.trim().length > 0 ||
    maximumSayTurnLatencySecondsDraft.trim().length > 0 ||
    maximumEnvironmentSaveLoadSecondsDraft.trim().length > 0 ||
    requireCoverageDraft ||
    requireRecoveryReadyDraft;

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Edit Project Testing Strategy"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Testing Strategy</p>
            <h3>Edit the governed testing strategy</h3>
            <p className="project-dialog-copy">Define expected evidence, suite posture, and thresholds for {projectTitle}.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Required Evidence</span>
          <textarea
            autoFocus
            className="project-dialog-textarea"
            onChange={(event) => setRequiredEvidenceDraft(event.target.value)}
            value={requiredEvidenceDraft}
          />
        </label>
        <div className="browser-action-strip">
          <button className="starter-chip" onClick={onAddSuiteExpectation} type="button">
            Add Suite Expectation
          </button>
        </div>
        {suiteExpectationsDraft.map((entry, index) => {
          const selectedHarness = availableHarnesses.find((harness) => harness.harnessId === entry.harnessId) ?? null;
          return (
            <section className="linked-entities-panel" key={`testing-strategy-suite-${index}`}>
              <PanelHeader title={`Suite Expectation ${index + 1}`} subtitle="" />
              {availableHarnesses.length > 0 ? (
                <label className="project-dialog-field">
                  <span className="context-label">Known Harness</span>
                  <select
                    onChange={(event) => updateSuiteExpectation(index, { harnessId: event.target.value })}
                    value={entry.harnessId}
                  >
                    <option value="">Select a testing harness</option>
                    {availableHarnesses.map((harness) => (
                      <option key={harness.harnessId} value={harness.harnessId}>
                        {harness.label} ({harness.harnessId})
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div className="project-dialog-grid">
                <label className="project-dialog-field">
                  <span className="context-label">Harness ID</span>
                  <input
                    onChange={(event) => updateSuiteExpectation(index, { harnessId: event.target.value })}
                    value={entry.harnessId}
                  />
                </label>
                <label className="project-dialog-field">
                  <span className="context-label">Purpose</span>
                  <input
                    onChange={(event) => updateSuiteExpectation(index, { purpose: event.target.value })}
                    value={entry.purpose}
                  />
                </label>
              </div>
              <label className="project-dialog-field">
                <span className="context-label">Evidence Kinds</span>
                <input
                  onChange={(event) => updateSuiteExpectation(index, { evidenceKindsDraft: event.target.value })}
                  value={entry.evidenceKindsDraft}
                />
              </label>
              {selectedHarness ? (
                <div className="thread-row active">
                  <div className="thread-row-top">
                    <strong>{selectedHarness.label}</strong>
                    <span>{selectedHarness.kind}</span>
                  </div>
                  <p>{selectedHarness.entrypoint}</p>
                </div>
              ) : null}
              <div className="browser-action-strip">
                <button className="project-dialog-close" onClick={() => onRemoveSuiteExpectation(index)} type="button">
                  Remove Suite Expectation
                </button>
              </div>
            </section>
          );
        })}
        <section className="linked-entities-panel">
          <PanelHeader title="Threshold Policy" subtitle="" />
          <div className="project-dialog-grid">
            <label className="project-dialog-field">
              <span className="context-label">Max Failed Tests</span>
              <input
                inputMode="numeric"
                onChange={(event) => setMaximumFailedTestsDraft(event.target.value)}
                value={maximumFailedTestsDraft}
              />
            </label>
            <label className="project-dialog-field">
              <span className="context-label">Max Say Turn Latency (s)</span>
              <input
                inputMode="decimal"
                onChange={(event) => setMaximumSayTurnLatencySecondsDraft(event.target.value)}
                value={maximumSayTurnLatencySecondsDraft}
              />
            </label>
            <label className="project-dialog-field">
              <span className="context-label">Max Save/Load Latency (s)</span>
              <input
                inputMode="decimal"
                onChange={(event) => setMaximumEnvironmentSaveLoadSecondsDraft(event.target.value)}
                value={maximumEnvironmentSaveLoadSecondsDraft}
              />
            </label>
          </div>
          <div className="project-dialog-grid">
            <label className="project-dialog-field project-dialog-checkbox">
              <input
                checked={requireCoverageDraft}
                onChange={(event) => setRequireCoverageDraft(event.target.checked)}
                type="checkbox"
              />
              <span className="context-label">Coverage required</span>
            </label>
            <label className="project-dialog-field project-dialog-checkbox">
              <input
                checked={requireRecoveryReadyDraft}
                onChange={(event) => setRequireRecoveryReadyDraft(event.target.checked)}
                type="checkbox"
              />
              <span className="context-label">Recovery ready required</span>
            </label>
          </div>
        </section>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" disabled={!canSave} onClick={onSave} type="button">
            Save Testing Strategy
          </button>
        </div>
      </section>
    </div>
  );
}

export function ProjectSourceRootCreateDialog({
  onClose,
  onCreateSourceRoot,
  projectTitle,
  setSourceRootDraft,
  sourceRootDraft
}: {
  onClose: () => void;
  onCreateSourceRoot: () => void;
  projectTitle: string;
  setSourceRootDraft: (value: string) => void;
  sourceRootDraft: string;
}) {
  const canCreate = sourceRootDraft.trim().length > 0;

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section aria-label="Add Project Source Root" aria-modal="true" className="project-dialog" role="dialog" onClick={(event) => event.stopPropagation()}>
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Source Root</p>
            <h3>Add a governed source root</h3>
            <p className="project-dialog-copy">Attach a source root to {projectTitle}.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">Close</button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Source Root Path</span>
          <input autoFocus onChange={(event) => setSourceRootDraft(event.target.value)} value={sourceRootDraft} />
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">Cancel</button>
          <button className="project-dialog-primary" disabled={!canCreate} onClick={onCreateSourceRoot} type="button">Add Source Root</button>
        </div>
      </section>
    </div>
  );
}

export function ProjectTestingHarnessBindDialog({
  availableHarnesses,
  harnessIdDraft,
  onBindTestingHarness,
  onClose,
  projectTitle,
  setHarnessIdDraft
}: {
  availableHarnesses: Array<{
    harnessId: string;
    label: string;
    entrypoint: string;
    kind: string;
    categories: string[];
  }>;
  harnessIdDraft: string;
  onBindTestingHarness: () => void;
  onClose: () => void;
  projectTitle: string;
  setHarnessIdDraft: (value: string) => void;
}) {
  const canBind = harnessIdDraft.trim().length > 0;
  const selectedHarness = availableHarnesses.find((harness) => harness.harnessId === harnessIdDraft) ?? null;

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section aria-label="Bind Project Testing Harness" aria-modal="true" className="project-dialog" role="dialog" onClick={(event) => event.stopPropagation()}>
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Testing Harness</p>
            <h3>Bind a governed testing harness</h3>
            <p className="project-dialog-copy">Attach a known testing harness to {projectTitle}.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">Close</button>
        </div>
        {availableHarnesses.length > 0 ? (
          <label className="project-dialog-field">
            <span className="context-label">Known Harness</span>
            <select autoFocus onChange={(event) => setHarnessIdDraft(event.target.value)} value={harnessIdDraft}>
              <option value="">Select a testing harness</option>
              {availableHarnesses.map((harness) => (
                <option key={harness.harnessId} value={harness.harnessId}>
                  {harness.label} ({harness.harnessId})
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="project-dialog-field">
          <span className="context-label">Harness ID</span>
          <input autoFocus={availableHarnesses.length === 0} onChange={(event) => setHarnessIdDraft(event.target.value)} value={harnessIdDraft} />
        </label>
        {selectedHarness ? (
          <div className="thread-row active">
            <div className="thread-row-top">
              <strong>{selectedHarness.label}</strong>
              <span>{selectedHarness.kind}</span>
            </div>
            <p>{selectedHarness.entrypoint}</p>
            {selectedHarness.categories.length > 0 ? (
              <div className="thread-row-meta">
                {selectedHarness.categories.map((category) => (
                  <span key={category}>{category}</span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">Cancel</button>
          <button className="project-dialog-primary" disabled={!canBind} onClick={onBindTestingHarness} type="button">Bind Harness</button>
        </div>
      </section>
    </div>
  );
}

export function ProjectQualityGateCreateDialog({
  availableHarnesses,
  gateTitleDraft,
  gateSummaryDraft,
  gateStatusDraft,
  maximumEnvironmentSaveLoadSecondsDraft,
  maximumFailedTestsDraft,
  maximumSayTurnLatencySecondsDraft,
  minimumLinkedIncidentsDraft,
  minimumLinkedWorkItemsDraft,
  onClose,
  onCreateQualityGate,
  projectTitle,
  requiredHarnessIdsDraft,
  requireCoverageDraft,
  requireRecoveryReadyDraft,
  requireSourceRootsDraft,
  setGateStatusDraft,
  setGateSummaryDraft,
  setGateTitleDraft,
  setMaximumEnvironmentSaveLoadSecondsDraft,
  setMaximumFailedTestsDraft,
  setMaximumSayTurnLatencySecondsDraft,
  setMinimumLinkedIncidentsDraft,
  setMinimumLinkedWorkItemsDraft,
  setRequiredHarnessIdsDraft,
  setRequireCoverageDraft,
  setRequireRecoveryReadyDraft,
  setRequireSourceRootsDraft
}: {
  availableHarnesses: Array<{
    harnessId: string;
    label: string;
    entrypoint: string;
    kind: string;
    categories: string[];
  }>;
  gateTitleDraft: string;
  gateSummaryDraft: string;
  gateStatusDraft: string;
  maximumEnvironmentSaveLoadSecondsDraft: string;
  maximumFailedTestsDraft: string;
  maximumSayTurnLatencySecondsDraft: string;
  minimumLinkedIncidentsDraft: string;
  minimumLinkedWorkItemsDraft: string;
  onClose: () => void;
  onCreateQualityGate: () => void;
  projectTitle: string;
  requiredHarnessIdsDraft: string;
  requireCoverageDraft: boolean;
  requireRecoveryReadyDraft: boolean;
  requireSourceRootsDraft: boolean;
  setGateStatusDraft: (value: string) => void;
  setGateSummaryDraft: (value: string) => void;
  setGateTitleDraft: (value: string) => void;
  setMaximumEnvironmentSaveLoadSecondsDraft: (value: string) => void;
  setMaximumFailedTestsDraft: (value: string) => void;
  setMaximumSayTurnLatencySecondsDraft: (value: string) => void;
  setMinimumLinkedIncidentsDraft: (value: string) => void;
  setMinimumLinkedWorkItemsDraft: (value: string) => void;
  setRequiredHarnessIdsDraft: (value: string) => void;
  setRequireCoverageDraft: (value: boolean) => void;
  setRequireRecoveryReadyDraft: (value: boolean) => void;
  setRequireSourceRootsDraft: (value: boolean) => void;
}) {
  const canCreate = gateTitleDraft.trim().length > 0;
  const requiredHarnessIds = requiredHarnessIdsDraft
    .split("\n")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  function appendRequiredHarnessId(harnessId: string): void {
    if (!harnessId || requiredHarnessIds.includes(harnessId)) {
      return;
    }
    setRequiredHarnessIdsDraft([...requiredHarnessIds, harnessId].join("\n"));
  }

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section aria-label="Add Project Quality Gate" aria-modal="true" className="project-dialog" role="dialog" onClick={(event) => event.stopPropagation()}>
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Quality Gate</p>
            <h3>Add a governed quality gate</h3>
            <p className="project-dialog-copy">Create a quality gate for {projectTitle}.</p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">Close</button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Title</span>
          <input autoFocus onChange={(event) => setGateTitleDraft(event.target.value)} value={gateTitleDraft} />
        </label>
        <label className="project-dialog-field">
          <span className="context-label">Summary</span>
          <textarea className="project-dialog-textarea" onChange={(event) => setGateSummaryDraft(event.target.value)} value={gateSummaryDraft} />
        </label>
        <div className="project-dialog-grid">
          <label className="project-dialog-field">
            <span className="context-label">Status</span>
            <select value={gateStatusDraft} onChange={(event) => setGateStatusDraft(event.target.value)}>
              <option value="proposed">proposed</option>
              <option value="active">active</option>
              <option value="accepted">accepted</option>
            </select>
          </label>
          <label className="project-dialog-field">
            <span className="context-label">Max Failed Tests</span>
            <input onChange={(event) => setMaximumFailedTestsDraft(event.target.value)} value={maximumFailedTestsDraft} />
          </label>
          <label className="project-dialog-field">
            <span className="context-label">Min Linked Work Items</span>
            <input onChange={(event) => setMinimumLinkedWorkItemsDraft(event.target.value)} value={minimumLinkedWorkItemsDraft} />
          </label>
          <label className="project-dialog-field">
            <span className="context-label">Min Linked Incidents</span>
            <input onChange={(event) => setMinimumLinkedIncidentsDraft(event.target.value)} value={minimumLinkedIncidentsDraft} />
          </label>
          <label className="project-dialog-field">
            <span className="context-label">Max Say Turn Latency (s)</span>
            <input onChange={(event) => setMaximumSayTurnLatencySecondsDraft(event.target.value)} value={maximumSayTurnLatencySecondsDraft} />
          </label>
          <label className="project-dialog-field">
            <span className="context-label">Max Save/Load Latency (s)</span>
            <input onChange={(event) => setMaximumEnvironmentSaveLoadSecondsDraft(event.target.value)} value={maximumEnvironmentSaveLoadSecondsDraft} />
          </label>
        </div>
        {availableHarnesses.length > 0 ? (
          <label className="project-dialog-field">
            <span className="context-label">Known Required Harness</span>
            <select
              defaultValue=""
              onChange={(event) => {
                appendRequiredHarnessId(event.target.value);
                event.target.value = "";
              }}
            >
              <option value="">Add a required harness</option>
              {availableHarnesses.map((harness) => (
                <option key={harness.harnessId} value={harness.harnessId}>
                  {harness.label} ({harness.harnessId})
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="project-dialog-field">
          <span className="context-label">Required Harness Ids</span>
          <textarea
            className="project-dialog-textarea"
            onChange={(event) => setRequiredHarnessIdsDraft(event.target.value)}
            placeholder="one harness id per line"
            value={requiredHarnessIdsDraft}
          />
        </label>
        {requiredHarnessIds.length > 0 ? (
          <div className="thread-row-meta">
            {requiredHarnessIds.map((harnessId) => (
              <span key={harnessId}>{harnessId}</span>
            ))}
          </div>
        ) : null}
        <div className="project-dialog-checkboxes">
          <label><input checked={requireSourceRootsDraft} onChange={(event) => setRequireSourceRootsDraft(event.target.checked)} type="checkbox" /> Source roots required</label>
          <label><input checked={requireCoverageDraft} onChange={(event) => setRequireCoverageDraft(event.target.checked)} type="checkbox" /> Coverage required</label>
          <label><input checked={requireRecoveryReadyDraft} onChange={(event) => setRequireRecoveryReadyDraft(event.target.checked)} type="checkbox" /> Recovery ready required</label>
        </div>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">Cancel</button>
          <button className="project-dialog-primary" disabled={!canCreate} onClick={onCreateQualityGate} type="button">Add Quality Gate</button>
        </div>
      </section>
    </div>
  );
}

export function ConversationSessionCreateDialog({
  onClose,
  onCreateSession,
  setTitleDraft,
  titleDraft
}: {
  onClose: () => void;
  onCreateSession: () => void;
  setTitleDraft: (value: string) => void;
  titleDraft: string;
}) {
  const canCreate = titleDraft.trim().length > 0;

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="New Conversation Session"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">New Conversation Session</p>
            <h3>Name the new conversation thread</h3>
            <p className="project-dialog-copy">
              Conversation sessions are durable work objects. Name the thread before creating it.
            </p>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Session Name</span>
          <input autoFocus onChange={(event) => setTitleDraft(event.target.value)} value={titleDraft} />
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" disabled={!canCreate} onClick={onCreateSession} type="button">
            Create Session
          </button>
        </div>
      </section>
    </div>
  );
}

export function ConversationThreadRenameDialog({
  onClose,
  onRenameThread,
  setTitleDraft,
  titleDraft
}: {
  onClose: () => void;
  onRenameThread: () => void;
  setTitleDraft: (value: string) => void;
  titleDraft: string;
}) {
  const canRename = titleDraft.trim().length > 0;

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Rename Conversation Session"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Rename Conversation Session</p>
            <h3>Edit the conversation thread name</h3>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Close
          </button>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Session Name</span>
          <input autoFocus onChange={(event) => setTitleDraft(event.target.value)} value={titleDraft} />
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="project-dialog-primary" disabled={!canRename} onClick={onRenameThread} type="button">
            Rename Session
          </button>
        </div>
      </section>
    </div>
  );
}

export function EnvironmentImageChooserDialog({
  onClose,
  onOpenImage,
  registry
}: {
  onClose: () => void;
  onOpenImage: (imageIdOrName: string) => void;
  registry: EnvironmentImageRegistryDto;
}) {
  const currentImageId = registry.currentImageId ?? null;

  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Open Environment Image"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Environment Images</p>
            <h3>Select a saved image</h3>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Continue
          </button>
        </div>
        {registry.images.length > 0 ? (
          <div className="project-dialog-list">
            {registry.images.map((image) => (
              <button
                className={image.imageId === currentImageId ? "project-dialog-item active" : "project-dialog-item"}
                key={image.imageId}
                onClick={() => onOpenImage(image.imageId)}
                type="button"
              >
                <div className="project-dialog-item-copy">
                  <strong>{image.name}</strong>
                  <p>{image.summary ?? image.path}</p>
                </div>
                <div className="project-dialog-item-meta">
                  <span className="context-label">Updated</span>
                  <span>
                    {image.updatedAt
                      ? new Date(image.updatedAt * 1000).toLocaleString()
                      : "Saved image"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state project-dialog-empty">
            <p className="eyebrow">No Images</p>
            <h3>No saved images are available yet.</h3>
          </div>
        )}
      </section>
    </div>
  );
}

export function EnvironmentExitDialog({
  canOverwriteCurrentImage,
  currentImageName,
  onClose,
  onDiscard,
  onSaveAsNew,
  onSaveCurrent,
  saveAsName,
  setSaveAsName
}: {
  canOverwriteCurrentImage: boolean;
  currentImageName: string | null;
  onClose: () => void;
  onDiscard: () => void;
  onSaveAsNew: () => void;
  onSaveCurrent: () => void;
  saveAsName: string;
  setSaveAsName: (value: string) => void;
}) {
  return (
    <div className="project-dialog-overlay" role="presentation" onClick={onClose}>
      <section
        aria-label="Exit IntentOS Shell"
        aria-modal="true"
        className="project-dialog"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="project-dialog-header">
          <div>
            <p className="eyebrow">Exit</p>
            <h3>Choose what to do with the current work image</h3>
          </div>
          <button className="project-dialog-close" onClick={onClose} type="button">
            Cancel
          </button>
        </div>
        <div className="project-dialog-binding">
          <span className="context-label">Current Image</span>
          <strong>{currentImageName ?? "Transient work image"}</strong>
        </div>
        <label className="project-dialog-field">
          <span className="context-label">Save As</span>
          <input
            onChange={(event) => setSaveAsName(event.target.value)}
            placeholder="Enter image name"
            value={saveAsName}
          />
        </label>
        <div className="project-dialog-actions">
          <button className="project-dialog-close" onClick={onDiscard} type="button">
            Discard
          </button>
          <button
            className="project-dialog-close"
            disabled={!canOverwriteCurrentImage}
            onClick={onSaveCurrent}
            type="button"
          >
            Save Current
          </button>
          <button
            className="project-dialog-primary"
            disabled={saveAsName.trim().length === 0}
            onClick={onSaveAsNew}
            type="button"
          >
            Save As New
          </button>
        </div>
      </section>
    </div>
  );
}
