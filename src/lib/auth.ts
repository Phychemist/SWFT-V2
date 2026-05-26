import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import { createServiceClient } from './supabase-server'
import type { SessionUser, UserRole, TicketDiagnostic } from './types'

const SESSION_COOKIE_NAME = 'seragen_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface SessionData {
    userId: string
    username: string
    fullName: string
    role: UserRole
    expiresAt: number
}

// Simple session encoding (in production, use proper JWT)
function encodeSession(data: SessionData): string {
    return Buffer.from(JSON.stringify(data)).toString('base64')
}

function decodeSession(token: string): SessionData | null {
    try {
        const data = JSON.parse(Buffer.from(token, 'base64').toString())
        if (data.expiresAt < Date.now()) {
            return null // Session expired
        }
        return data as SessionData
    } catch {
        return null
    }
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
}

export async function createSession(user: {
    id: string
    username: string
    full_name: string
    role: UserRole
}): Promise<void> {
    const sessionData: SessionData = {
        userId: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
        expiresAt: Date.now() + SESSION_MAX_AGE * 1000,
    }

    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, encodeSession(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
        path: '/',
    })
}

export async function getSession(): Promise<SessionUser | null> {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

    if (!sessionCookie) return null

    const sessionData = decodeSession(sessionCookie.value)
    if (!sessionData) return null

    return {
        id: sessionData.userId,
        username: sessionData.username,
        full_name: sessionData.fullName,
        role: sessionData.role,
    }
}

/**
 * Validates a session against the database to ensure the user is still active
 * and their role hasn't changed. This is critical for high security.
 */
export async function validateSessionInDb(): Promise<SessionUser | null> {
    const session = await getSession()
    if (!session) return null

    const supabase = createServiceClient()
    const { data: user, error } = await supabase
        .from('users')
        .select('id, username, full_name, role, is_active')
        .eq('id', session.id)
        .single()

    if (error || !user || !user.is_active) {
        return null
    }

    // High security check: If the role stored in the session cookie 
    // doesn't match the database, the session is invalid.
    if (user.role !== session.role) {
        return null
    }

    return {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role as UserRole,
    }
}

export async function destroySession(): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function validateUser(
    username: string,
    password: string
): Promise<{ id: string; username: string; full_name: string; role: UserRole } | null> {
    const supabase = createServiceClient()

    const { data: user, error } = await supabase
        .from('users')
        .select('id, username, password_hash, full_name, role, is_active')
        .eq('username', username)
        .single()

    if (error || !user || !user.is_active) {
        return null
    }

    const isValid = await verifyPassword(password, user.password_hash)
    if (!isValid) {
        return null
    }

    return {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role as UserRole,
    }
}

// ============================================
// ROLE-BASED ACCESS CONTROL HELPERS
// ============================================

/**
 * Can access manager-level dashboard features
 * Used for: Settings pages, workflow configuration
 */
export function canAccessManagerDashboard(role: UserRole): boolean {
    return role === 'admin' || role === 'manager'
}

/**
 * Can delete tickets (destructive action - limited to admin/manager)
 * Used in: DELETE /api/tickets/[id]
 */
export function canEditTickets(role: UserRole): boolean {
    return role === 'admin' || role === 'manager'
}

/**
 * Can create new tickets
 * Used in: POST /api/tickets
 */
export function canCreateTickets(role: UserRole): boolean {
    return role === 'admin' || role === 'manager' || role === 'customer_success'
}

// ============================================
// USER MANAGEMENT PERMISSION HELPERS
// ============================================

/**
 * Privileged roles that only admins can manage (create/edit/delete)
 * These roles have elevated permissions and should be protected
 */
const PRIVILEGED_ROLES: UserRole[] = ['admin', 'manager']

/**
 * Check if a role is a privileged role (admin/manager)
 * Used to determine if special restrictions apply
 */
export function isPrivilegedRole(role: UserRole): boolean {
    return PRIVILEGED_ROLES.includes(role)
}

/**
 * Can access user management page
 * Used in: Sidebar, middleware route protection
 */
export function canManageUsers(role: UserRole): boolean {
    return role === 'admin' || role === 'manager'
}

/**
 * Can manage a specific target user based on their role
 * - Admins can manage ALL users
 * - Managers can only manage non-privileged users (not admin/manager)
 * 
 * Used in: PATCH /api/users (editing users)
 */
export function canManageUserWithRole(
    currentUserRole: UserRole,
    targetUserRole: UserRole
): boolean {
    if (currentUserRole === 'admin') return true
    if (currentUserRole === 'manager') {
        return !isPrivilegedRole(targetUserRole)
    }
    return false
}

/**
 * Can assign a specific role to a user (new or existing)
 * - Admins can assign ANY role
 * - Managers can only assign non-privileged roles
 * 
 * Used in: POST /api/users (creating users), PATCH /api/users (changing role)
 */
export function canAssignRole(
    currentUserRole: UserRole,
    targetRole: UserRole
): boolean {
    if (currentUserRole === 'admin') return true
    if (currentUserRole === 'manager') {
        return !isPrivilegedRole(targetRole)
    }
    return false
}

/**
 * Can manage workflow settings (stages, columns, etc.)
 * Used in: Settings pages
 */
export function canManageWorkflowSettings(role: UserRole): boolean {
    return role === 'admin' || role === 'manager'
}

// ============================================
// GRANULAR TICKET PERMISSION HELPERS
// ============================================

/**
 * Can edit ticket metadata (patient info, hospital, doctor, message)
 */
export function canEditTicketMetadata(role: UserRole): boolean {
    return role === 'admin' || role === 'manager' || role === 'customer_success'
}

/**
 * Can edit ticket workflow fields (status, assignment, collection details)
 */
export function canEditTicketWorkflow(role: UserRole): boolean {
    return role === 'admin' || role === 'manager'
}

/**
 * Can change ticket status via status-transitions API
 */
export function canChangeTicketStatus(role: UserRole): boolean {
    return role === 'admin' || role === 'manager'
}

/**
 * Check if role is field_executive (requires ownership checks)
 * Used for: Conditional logic where FE needs special handling
 */
export function isFieldExecutive(role: UserRole): boolean {
    return role === 'field_executive'
}

/**
 * Check if role is officer_backoffice
 * Used for: Future permission checks for backoffice operations
 */
export function isOfficerBackoffice(role: UserRole): boolean {
    return role === 'officer_backoffice'
}

/**
 * Check if role is scientist
 * Used for: Future permission checks for scientific/lab operations
 */
export function isScientist(role: UserRole): boolean {
    return role === 'scientist'
}

/**
 * Check if role is accountant
 * Used for: Future permission checks for financial operations
 */
export function isAccountant(role: UserRole): boolean {
    return role === 'accountant'
}

// ============================================
// BACKOFFICE ROLE PERMISSIONS
// ============================================

/**
 * Stages that backoffice can see (tickets at these stages are visible to them)
 * These are the stages where tickets are waiting for backoffice action
 */
export const BACKOFFICE_ACTIONABLE_STAGES = ['sample collected', 'sample received', 'sample sent to']

/**
 * Stages that backoffice can transition TO
 */
export const BACKOFFICE_TARGET_STAGES = ['sample received', 'sample sent to', 'report received']

/**
 * Check if role can access backoffice dashboard
 */
export function canAccessBackoffice(role: UserRole): boolean {
    return role === 'officer_backoffice'
}

/**
 * Check if a stage name is one that backoffice can transition TO
 */
export function canBackofficeChangeToStage(stageName: string): boolean {
    return BACKOFFICE_TARGET_STAGES.includes(stageName.toLowerCase())
}

/**
 * Check if a stage name is one that backoffice can see/act on
 */
export function isBackofficeActionableStage(stageName: string): boolean {
    return BACKOFFICE_ACTIONABLE_STAGES.includes(stageName.toLowerCase())
}

// ============================================
// SCIENTIST ROLE PERMISSIONS
// ============================================

/**
 * Stages that scientist can see (tickets at these stages are visible to them)
 * Scientists see tickets that have raw reports ready for analysis
 */
export const SCIENTIST_VISIBLE_STAGES = ['report received']

/**
 * Check if role can access scientist dashboard
 */
export function canAccessScientistDashboard(role: UserRole): boolean {
    return role === 'scientist'
}

/**
 * Check if a stage name is one that scientist can see
 */
export function isScientistVisibleStage(stageName: string): boolean {
    return SCIENTIST_VISIBLE_STAGES.includes(stageName.toLowerCase())
}

/**
 * Stages that scientist can transition TO
 */
export const SCIENTIST_TARGET_STAGES = ['final report generated']

/**
 * Check if a stage name is one that scientist can transition TO
 */
export function canScientistChangeToStage(stageName: string): boolean {
    return SCIENTIST_TARGET_STAGES.includes(stageName.toLowerCase())
}

// ============================================
// DIAGNOSTIC-LEVEL PERMISSIONS
// ============================================

/**
 * Check if a scientist should see a ticket based on its stage and diagnostics.
 * For multi-diagnostic tickets, the ticket is visible if ANY active diagnostic
 * has a raw report uploaded, even if the ticket-level stage hasn't advanced yet.
 */
export function shouldScientistSeeTicket(
    stageName: string,
    diagnostics?: TicketDiagnostic[]
): boolean {
    if (isScientistVisibleStage(stageName)) return true
    if (!diagnostics || diagnostics.length === 0) return false
    return diagnostics.some(
        (d) => !d.is_cancelled && d.raw_report_url
    )
}

/**
 * Role-based field protection for diagnostic updates.
 * Returns true if the given role is allowed to update the specified diagnostic field.
 */
export function canUpdateDiagnosticField(
    role: UserRole,
    field: string
): boolean {
    const fieldPermissions: Record<string, UserRole[]> = {
        // Field executive fields
        sample_image_url: ['field_executive', 'admin', 'manager'],
        courier_image_url: ['field_executive', 'admin', 'manager'],
        // Backoffice fields
        status: ['field_executive', 'officer_backoffice', 'scientist', 'admin', 'manager'],
        sample_received_at: ['officer_backoffice', 'admin', 'manager'],
        label_code: ['officer_backoffice', 'admin', 'manager'],
        sent_to_lab_id: ['officer_backoffice', 'admin', 'manager'],
        tagged_sample_image_url: ['officer_backoffice', 'admin', 'manager'],
        backoffice_courier_image_url: ['officer_backoffice', 'admin', 'manager'],
        raw_report_url: ['officer_backoffice', 'admin', 'manager'],
        // Scientist fields
        final_report_url: ['scientist', 'admin', 'manager'],
        // Cancellation
        is_cancelled: ['admin', 'manager', 'customer_success'],
        cancelled_at: ['admin', 'manager', 'customer_success'],
    }

    const allowedRoles = fieldPermissions[field]
    if (!allowedRoles) return false
    return allowedRoles.includes(role)
}

// ============================================
// DOCUMENT REPLACE PERMISSION (re-export for server/API use)
// ============================================
export {
    canReplaceDocumentByRole,
    type DocumentTypeForReplace,
} from './document-replace-permission'

