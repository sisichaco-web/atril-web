import React, { useCallback, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { showToast } from '../utils/app/toast'
import Button from '../components/ui/layout-kit/Button'
import { ROLES_BY_RANK_DESC } from '../lib/roles'
import '../styles/admin-portal.css'

function formatTime(date) {
  if (!date) return ''
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// Roles this page can assign, highest first. Deliberately NOT ROLES_BY_RANK_DESC:
// 'owner' is excluded because update_user_role() rejects it outright ("Invalid
// role: owner"). There is exactly one owner and it is set by direct SQL only, so
// offering it here produced a dropdown entry that always threw.
const ASSIGNABLE_ROLES = ROLES_BY_RANK_DESC.filter(r => r !== 'owner')

function RolePill({ role }) {
  return (
    <span className={`gc-role-pill gc-role-pill--${role}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  )
}

function formatAccountAge(createdAt) {
  if (!createdAt) return '—'
  const ms = Date.now() - new Date(createdAt).getTime()
  const days = Math.floor(ms / 86400000)
  if (days < 1) return 'Today'
  if (days === 1) return '1 day'
  if (days < 30) return `${days} days`
  const months = Math.floor(days / 30)
  if (months === 1) return '1 month'
  if (months < 12) return `${months} months`
  const years = Math.floor(months / 12)
  return years === 1 ? '1 year' : `${years} years`
}

// Role matrix data
const MATRIX_ROWS = [
  { labelKey: 'matrixBasicAccess',       user: true,  editor: true,  admin: true,             owner: true          },
  { labelKey: 'matrixCreateSongs',       user: true,  editor: true,  admin: true,             owner: true          },
  { labelKey: 'matrixManageContent',     user: false, editor: true,  admin: true,             owner: true          },
  { labelKey: 'matrixDeleteContent',     user: false, editor: false, admin: true,             owner: true          },
  { labelKey: 'matrixPromoteUsers',      user: false, editor: false, admin: 'upToEditor',      owner: 'upToAdmin'   },
  { labelKey: 'matrixManageAccounts',    user: false, editor: false, admin: false,            owner: true          },
]

export default function AdminPage() {
  const { t } = useTranslation('admin')
  const { session, isOwner } = useAuth()
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [changingRole, setChangingRole] = useState({}) // { userId: true }
  const [expandedUserId, setExpandedUserId] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    const { data, error } = await supabase.rpc('get_users_with_email')
    if (error) {
      showToast(t('loadUsersFailed'))
      console.error('[AdminPage] loadUsers:', error)
    } else {
      setUsers(data || [])
    }
    setUsersLoading(false)
  }, [t])

  useEffect(() => {
    loadUsers().then(() => setLastUpdated(new Date()))
  }, [loadUsers])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadUsers()
    setLastUpdated(new Date())
    setRefreshing(false)
  }, [loadUsers])

  // Mirrors update_user_role()'s server-side rules exactly: an owner may assign
  // admin, editor or user; an admin may assign editor or user. Nobody may assign
  // owner. Keep these in step — the RPC is the authority and will throw if this
  // list ever offers something it rejects.
  function getAvailableRoles() {
    if (isOwner) return ASSIGNABLE_ROLES
    return ['editor', 'user']
  }

  async function handleRoleChange(userId, newRole) {
    if (!userId || !newRole) return
    setChangingRole(prev => ({ ...prev, [userId]: true }))
    const { error } = await supabase.rpc('update_user_role', {
      target_user_id: userId,
      new_role: newRole,
    })
    if (error) {
      showToast(`Failed to update role: ${error.message}`)
      console.error('[AdminPage] handleRoleChange:', error)
    } else {
      showToast('Role updated.')
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
    setChangingRole(prev => ({ ...prev, [userId]: false }))
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return
    setDeleting(true)
    const { error } = await supabase.rpc('admin_delete_user', {
      target_user_id: deleteTarget.id,
    })
    if (error) {
      showToast(`Failed to delete user: ${error.message}`)
      console.error('[AdminPage] handleDeleteUser:', error)
    } else {
      showToast(`${deleteTarget.display_name || 'User'} deleted.`)
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id))
    }
    setDeleting(false)
    setDeleteTarget(null)
  }

  const currentUserId = session?.user?.id

  return (
    <div className="gc-portal-page container">
      <Helmet><title>{t('adminPortal')}</title></Helmet>

      <h1>{t('adminPortal')}</h1>
      <p className="gc-portal-page__subtitle">
        {t('adminPortalSubtitle')}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--gc-space-3)', marginBottom: 'var(--gc-space-4)' }}>
        <Button
          size="sm"
          variant="secondary"
          loading={refreshing}
          onClick={handleRefresh}
          aria-label={t('refreshAriaLabel')}
        >
          {t('refresh')}
        </Button>
        {lastUpdated && (
          <span style={{ color: 'var(--gc-text-secondary)', fontSize: 'var(--gc-text-sm)' }}>
            {t('updatedAt', { time: formatTime(lastUpdated) })}
          </span>
        )}
      </div>

      {/* ── 4a. User Management Table ─────────────────────────────── */}
      <section className="gc-portal-section">
        <h2>{t('userManagement')}</h2>
        {usersLoading ? (
          <p className="gc-portal-empty">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="gc-portal-empty">No users found.</p>
        ) : (
          <div className="gc-user-table-wrap">
            <table className="gc-user-table">
              <thead>
                <tr>
                  <th>{t('name')}</th>
                  <th className="gc-user-table__col--desktop">{t('email')}</th>
                  <th>{t('role')}</th>
                  <th className="gc-user-table__col--desktop">{t('accountAge')}</th>
                  <th className="gc-user-table__col--desktop">{t('actions')}</th>
                  <th className="gc-user-table__col--mobile" aria-hidden="true"></th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const isSelf = user.id === currentUserId
                  const isTargetOwner = user.role === 'owner'
                  const canChangeRole = !isSelf && (!isTargetOwner || isOwner)
                  const availableRoles = getAvailableRoles()
                  const isChanging = !!changingRole[user.id]
                  const isExpanded = expandedUserId === user.id

                  const actionButtons = (
                    <div className="gc-user-actions">
                      <select
                        className="gc-role-select"
                        value={user.role || 'user'}
                        disabled={!canChangeRole || isChanging}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        aria-label={`Change role for ${user.display_name || 'user'}`}
                      >
                        {availableRoles.map(r => (
                          <option key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>
                      {isOwner && !isSelf && (
                        <button
                          className="gc-btn gc-btn--danger gc-btn--sm"
                          onClick={e => { e.stopPropagation(); setDeleteTarget(user) }}
                          style={{ fontSize: 'var(--gc-font-cap)', padding: '4px 10px' }}
                        >
                          Delete
                        </button>
                      )}
                      {isSelf && (
                        <span style={{ color: 'var(--gc-text-tertiary)', fontSize: 'var(--gc-font-cap)' }}>
                          (you)
                        </span>
                      )}
                    </div>
                  )

                  return (
                    <React.Fragment key={user.id}>
                      <tr
                        className="gc-user-table__row"
                        onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                      >
                        <td>{user.display_name || <span style={{ color: 'var(--gc-text-tertiary)' }}>—</span>}</td>
                        <td className="gc-user-table__col--desktop" style={{ fontSize: 'var(--gc-text-sm)', color: 'var(--gc-text-secondary)' }}>
                          {user.email || <span style={{ color: 'var(--gc-text-tertiary)' }}>—</span>}
                        </td>
                        <td><RolePill role={user.role || 'user'} /></td>
                        <td className="gc-user-table__col--desktop">
                          <span className="gc-account-age">
                            {formatAccountAge(user.account_created_at)}
                          </span>
                        </td>
                        <td className="gc-user-table__col--desktop" onClick={e => e.stopPropagation()}>
                          {actionButtons}
                        </td>
                        <td className="gc-user-table__col--mobile" aria-hidden="true">
                          <span className={`gc-chevron${isExpanded ? ' gc-chevron--open' : ''}`} />
                        </td>
                      </tr>
                      <tr className={`gc-user-table__expand-row${isExpanded ? ' gc-user-table__expand-row--open' : ''}`}>
                        <td colSpan={6}>
                          <div className="gc-user-table__expand-panel">
                            <div>
                              <span style={{ fontWeight: '500', marginRight: 'var(--gc-space-2)' }}>Email:</span>
                              <span style={{ color: 'var(--gc-text-secondary)', fontSize: 'var(--gc-text-sm)' }}>
                                {user.email || '—'}
                              </span>
                            </div>
                            <span className="gc-account-age" style={{ marginTop: 'var(--gc-space-2)' }}>
                              {formatAccountAge(user.account_created_at)}
                            </span>
                            <div style={{ marginTop: 'var(--gc-space-3)' }}>
                              {actionButtons}
                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── 4b. Role & Privilege Matrix ───────────────────────────── */}
      <section className="gc-portal-section">
        <h2>{t('rolePrivilegeMatrix')}</h2>
        <div className="gc-matrix-wrap">
          <table className="gc-matrix-table">
            <thead>
              <tr>
                <th>{t('capability')}</th>
                <th><RolePill role="user" /></th>
                <th><RolePill role="editor" /></th>
                <th><RolePill role="admin" /></th>
                <th><RolePill role="owner" /></th>
              </tr>
            </thead>
            <tbody>
              {MATRIX_ROWS.map(row => {
                const cell = (val) => typeof val === 'string'
                  ? <span className="gc-matrix-yes">{val}</span>
                  : <span className={val ? 'gc-matrix-yes' : 'gc-matrix-no'}>{val ? '✓' : '—'}</span>
                return (
                  <tr key={row.labelKey}>
                    <td>{t(row.labelKey)}</td>
                    <td>{cell(row.user)}</td>
                    <td>{cell(row.editor)}</td>
                    <td>{cell(row.admin)}</td>
                    <td>{cell(row.owner)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="gc-matrix-scroll-hint">Scroll →</p>
      </section>

      {/* ── Delete confirm dialog ──────────────────────────────────── */}
      {deleteTarget && (
        <div className="gc-confirm-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="gc-confirm-dialog" onClick={e => e.stopPropagation()}>
            <h3>Delete account</h3>
            <p>
              Permanently delete{' '}
              <strong>{deleteTarget.display_name || 'this user'}</strong>
              ? This cannot be undone. All their data will be removed.
            </p>
            <div className="gc-confirm-dialog__actions">
              <button
                className="gc-btn gc-btn--ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="gc-btn gc-btn--danger"
                onClick={handleDeleteUser}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete user'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
