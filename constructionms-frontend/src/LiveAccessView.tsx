import { useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  authApi,
  projectsApi,
  usersApi,
  type AssignedProject,
  type CurrentUser,
  type PaginatedResult,
  type Project,
  type UserAccount,
} from './api'
import './live-api.css'

export interface LiveAccessViewProps {
  currentUser: CurrentUser
}

const PORTFOLIO_ROLES = new Set(['CEO', 'Auditor'])

function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message
  }

  return 'Something went wrong. Please try again.'
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function sameIds(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return false

  const rightIds = new Set(right)
  return left.every((id) => rightIds.has(id))
}

async function collectPages<T>(
  loadPage: (page: number) => Promise<PaginatedResult<T>>,
): Promise<T[]> {
  const firstPage = await loadPage(1)
  const items = [...firstPage.items]

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const nextPage = await loadPage(page)
    items.push(...nextPage.items)
  }

  return items
}

export function LiveAccessView({ currentUser }: LiveAccessViewProps) {
  const [users, setUsers] = useState<UserAccount[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [savedProjectIds, setSavedProjectIds] = useState<number[]>([])
  const [draftProjectIds, setDraftProjectIds] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [assignmentsUserId, setAssignmentsUserId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [changingStatus, setChangingStatus] = useState(false)
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null
  const selectedHasPortfolioAccess = selectedUser
    ? PORTFOLIO_ROLES.has(selectedUser.roleName)
    : false
  const selectedIsCurrentUser = selectedUser?.id === currentUser.id
  const assignmentsLoading =
    selectedUserId !== null && assignmentsUserId !== selectedUserId
  const canEditAssignments = Boolean(
    selectedUser?.isActive && !selectedHasPortfolioAccess && !assignmentsLoading,
  )
  const assignmentsChanged = !sameIds(savedProjectIds, draftProjectIds)

  const visibleUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    if (!normalizedSearch) return users

    return users.filter((user) =>
      [user.fullName, user.email, user.roleName].some((value) =>
        value.toLocaleLowerCase().includes(normalizedSearch),
      ),
    )
  }, [search, users])

  useEffect(() => {
    if (currentUser.role !== 'CEO') {
      return
    }

    const controller = new AbortController()

    Promise.all([
      collectPages((page) => usersApi.list({ page, pageSize: 100 }, controller.signal)),
      collectPages((page) => projectsApi.list({ page, pageSize: 100 }, controller.signal)),
    ])
      .then(([loadedUsers, loadedProjects]) => {
        const sortedUsers = [...loadedUsers].sort((left, right) =>
          left.fullName.localeCompare(right.fullName),
        )
        const preferredUser =
          sortedUsers.find(
            (user) => user.isActive && !PORTFOLIO_ROLES.has(user.roleName),
          ) ??
          sortedUsers.find((user) => user.id !== currentUser.id) ??
          sortedUsers[0]

        setUsers(sortedUsers)
        setProjects(
          [...loadedProjects].sort((left, right) => left.name.localeCompare(right.name)),
        )
        setSelectedUserId((current) => {
          if (current && sortedUsers.some((user) => user.id === current)) return current
          return preferredUser?.id ?? null
        })
      })
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
          setError(errorMessage(requestError))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [currentUser.id, currentUser.role, refreshKey])

  useEffect(() => {
    if (currentUser.role !== 'CEO' || selectedUserId === null) {
      return
    }

    const controller = new AbortController()

    authApi
      .getProjectAssignments(selectedUserId, controller.signal)
      .then((assignments) => {
        const projectIds = assignments.map((project) => project.id)
        setSavedProjectIds(projectIds)
        setDraftProjectIds(projectIds)
        setAssignmentError(null)
        setAssignmentsUserId(selectedUserId)
      })
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) {
          setSavedProjectIds([])
          setDraftProjectIds([])
          setAssignmentError(errorMessage(requestError))
          setAssignmentsUserId(selectedUserId)
        }
      })

    return () => controller.abort()
  }, [currentUser.role, selectedUserId])

  function toggleProject(projectId: number) {
    if (!canEditAssignments) return

    setDraftProjectIds((current) =>
      current.includes(projectId)
        ? current.filter((id) => id !== projectId)
        : [...current, projectId],
    )
    setMessage(null)
  }

  async function saveAssignments() {
    if (!selectedUser || !canEditAssignments || !assignmentsChanged) return

    setSaving(true)
    setAssignmentError(null)
    setMessage(null)
    try {
      const assignments = await authApi.replaceProjectAssignments(selectedUser.id, {
        projectIds: draftProjectIds,
      })
      const projectIds = assignments.map((project: AssignedProject) => project.id)
      setSavedProjectIds(projectIds)
      setDraftProjectIds(projectIds)
      setMessage(`Project access saved for ${selectedUser.fullName}.`)
    } catch (requestError) {
      setAssignmentError(errorMessage(requestError))
    } finally {
      setSaving(false)
    }
  }

  async function changeActiveStatus(isActive: boolean) {
    if (!selectedUser || (selectedIsCurrentUser && !isActive)) return

    setChangingStatus(true)
    setAssignmentError(null)
    setMessage(null)
    try {
      const changedUser = await usersApi.setActiveStatus(selectedUser.id, { isActive })
      setUsers((current) =>
        current.map((user) => (user.id === changedUser.id ? changedUser : user)),
      )
      setConfirmingDeactivate(false)
      setMessage(
        isActive
          ? `${changedUser.fullName} can sign in again.`
          : `${changedUser.fullName} can no longer sign in. Existing assignment history was kept.`,
      )
    } catch (requestError) {
      setAssignmentError(errorMessage(requestError))
    } finally {
      setChangingStatus(false)
    }
  }

  if (currentUser.role !== 'CEO') {
    return (
      <div className="lav-view">
        <div className="lav-empty">
          <span aria-hidden="true">—</span>
          <h3>CEO access only</h3>
          <p>Account status and project assignments are managed by the CEO.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="lav-view">
      <header className="lav-page-head">
        <div>
          <span className="lav-kicker">Live access records</span>
          <h1>Team access</h1>
          <p>Choose a person, set their sites, and control whether they can sign in.</p>
        </div>
        <span className="lav-count-chip">
          {users.filter((user) => user.isActive).length} active
        </span>
      </header>

      {error && (
        <div className="lav-notice error" role="alert">
          {error}{' '}
          <button
            type="button"
            onClick={() => {
              setLoading(true)
              setError(null)
              setRefreshKey((value) => value + 1)
            }}
          >
            Try again
          </button>
        </div>
      )}

      {message && (
        <div className="lav-notice success" role="status">
          {message}
        </div>
      )}

      {loading ? (
        <div className="lav-loading" role="status">
          <span aria-hidden="true" />
          <p>Loading team access…</p>
        </div>
      ) : users.length === 0 ? (
        <div className="lav-empty">
          <span aria-hidden="true">0</span>
          <h3>No user accounts found</h3>
          <p>User creation is handled separately. Accounts will appear here once created.</p>
        </div>
      ) : (
        <div className="lav-access-layout">
          <section className="lav-panel lav-access-users" aria-labelledby="access-users-title">
            <header className="lav-panel-head lav-access-users-head">
              <div>
                <span className="lav-kicker">People</span>
                <h2 id="access-users-title">User accounts</h2>
              </div>
              <span className="lav-count-chip">{users.length}</span>
            </header>
            <div className="lav-access-search">
              <label htmlFor="access-user-search">Find a person</label>
              <input
                id="access-user-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, email or role"
              />
            </div>
            <ul className="lav-access-user-list">
              {visibleUsers.length ? (
                visibleUsers.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      className={selectedUserId === user.id ? 'active' : ''}
                      onClick={() => {
                        setSelectedUserId(user.id)
                        setAssignmentError(null)
                        setConfirmingDeactivate(false)
                        setMessage(null)
                      }}
                      aria-current={selectedUserId === user.id ? 'true' : undefined}
                    >
                      <span className="lav-access-avatar" aria-hidden="true">
                        {initials(user.fullName)}
                      </span>
                      <span className="lav-access-user-copy">
                        <strong>{user.fullName}</strong>
                        <small>{user.roleName}</small>
                        <span>{user.email}</span>
                      </span>
                      <i className={`lav-access-state ${user.isActive ? 'active' : 'inactive'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </i>
                    </button>
                  </li>
                ))
              ) : (
                <li className="lav-access-no-results">No accounts match that search.</li>
              )}
            </ul>
          </section>

          {selectedUser && (
            <section className="lav-panel lav-access-detail" aria-labelledby="access-detail-title">
              <header className="lav-access-person-head">
                <span className="lav-access-avatar large" aria-hidden="true">
                  {initials(selectedUser.fullName)}
                </span>
                <div>
                  <span className="lav-kicker">Selected account</span>
                  <h2 id="access-detail-title">{selectedUser.fullName}</h2>
                  <p>
                    {selectedUser.roleName} · {selectedUser.email}
                  </p>
                </div>
                <span
                  className={`lav-status ${selectedUser.isActive ? 'success' : 'danger'}`}
                >
                  {selectedUser.isActive ? 'Can sign in' : 'Sign-in blocked'}
                </span>
              </header>

              {assignmentError && (
                <div className="lav-notice error" role="alert">
                  {assignmentError}
                </div>
              )}

              <div className="lav-access-body">
                <section className="lav-access-section" aria-labelledby="project-access-title">
                  <div className="lav-access-section-head">
                    <div>
                      <h3 id="project-access-title">Project access</h3>
                      <p>
                        {draftProjectIds.length} of {projects.length} projects selected
                      </p>
                    </div>
                    {assignmentsChanged && canEditAssignments && (
                      <span className="lav-count-chip attention">Unsaved</span>
                    )}
                  </div>

                  {selectedHasPortfolioAccess ? (
                    <div className="lav-access-auto">
                      <strong>Portfolio access is automatic</strong>
                      <p>
                        {selectedUser.roleName} can see every project, so individual site
                        assignments are not required.
                      </p>
                    </div>
                  ) : assignmentsLoading ? (
                    <div className="lav-access-inline-loading" role="status">
                      Loading project assignments…
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="lav-access-auto">
                      <strong>No projects are available</strong>
                      <p>Create a project before assigning site access.</p>
                    </div>
                  ) : (
                    <fieldset className="lav-access-projects" disabled={!canEditAssignments}>
                      <legend className="lav-visually-hidden">
                        Projects assigned to {selectedUser.fullName}
                      </legend>
                      {projects.map((project) => {
                        const checked = draftProjectIds.includes(project.id)
                        return (
                          <label key={project.id} className={checked ? 'checked' : ''}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleProject(project.id)}
                            />
                            <span>
                              <strong>{project.name}</strong>
                              <small>{project.location || 'Location not recorded'}</small>
                            </span>
                          </label>
                        )
                      })}
                    </fieldset>
                  )}

                  {!selectedUser.isActive && !selectedHasPortfolioAccess && (
                    <p className="lav-access-help">
                      Activate this account before changing its project access.
                    </p>
                  )}

                  {!selectedHasPortfolioAccess && (
                    <div className="lav-access-save-row">
                      <button
                        type="button"
                        className="lav-button secondary"
                        disabled={!assignmentsChanged || saving || assignmentsLoading}
                        onClick={() => setDraftProjectIds(savedProjectIds)}
                      >
                        Discard changes
                      </button>
                      <button
                        type="button"
                        className="lav-button primary"
                        disabled={!canEditAssignments || !assignmentsChanged || saving}
                        onClick={() => void saveAssignments()}
                      >
                        {saving ? 'Saving…' : 'Save project access'}
                      </button>
                    </div>
                  )}
                </section>

                <section className="lav-access-section lav-access-account" aria-labelledby="account-status-title">
                  <div className="lav-access-section-head">
                    <div>
                      <h3 id="account-status-title">Account status</h3>
                      <p>Blocking sign-in does not erase the person’s audit history.</p>
                    </div>
                  </div>

                  {selectedIsCurrentUser && selectedUser.isActive ? (
                    <div className="lav-access-self-note">
                      <strong>This is your signed-in account</strong>
                      <p>Use another CEO account if this account ever needs to be deactivated.</p>
                    </div>
                  ) : selectedUser.isActive ? (
                    confirmingDeactivate ? (
                      <div className="lav-access-confirm" role="group" aria-label="Confirm deactivation">
                        <div>
                          <strong>Block {selectedUser.fullName} from signing in?</strong>
                          <p>The account can be activated again later.</p>
                        </div>
                        <div>
                          <button
                            type="button"
                            className="lav-button secondary"
                            disabled={changingStatus}
                            onClick={() => setConfirmingDeactivate(false)}
                          >
                            Keep active
                          </button>
                          <button
                            type="button"
                            className="lav-button danger"
                            disabled={changingStatus}
                            onClick={() => void changeActiveStatus(false)}
                          >
                            {changingStatus ? 'Deactivating…' : 'Yes, deactivate'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="lav-button danger-outline"
                        onClick={() => setConfirmingDeactivate(true)}
                      >
                        Review deactivation
                      </button>
                    )
                  ) : (
                    <button
                      type="button"
                      className="lav-button primary"
                      disabled={changingStatus}
                      onClick={() => void changeActiveStatus(true)}
                    >
                      {changingStatus ? 'Activating…' : 'Activate account'}
                    </button>
                  )}
                </section>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
