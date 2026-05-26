import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession, canManageUsers, canAssignRole, canManageUserWithRole, hashPassword, isPrivilegedRole } from '@/lib/auth'
import type { ApiResponse, User, CreateUserForm, UserRole } from '@/lib/types'

// GET - List all users
export async function GET() {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const supabase = createServiceClient()

        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, full_name, role, is_active, created_at')
            .order('created_at', { ascending: false })

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<User[]>>({
            success: true,
            data: users,
        })
    } catch (error) {
        console.error('Error fetching users:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch users' },
            { status: 500 }
        )
    }
}

// POST - Create a new user
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session || !canManageUsers(session.role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            )
        }

        const body: CreateUserForm = await request.json()
        const { username, password, full_name, role } = body

        if (!username || !password || !full_name || !role) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'All fields are required' },
                { status: 400 }
            )
        }

        const validRoles = ['admin', 'manager', 'customer_success', 'field_executive', 'officer_backoffice', 'scientist', 'accountant']
        if (!validRoles.includes(role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Invalid role' },
                { status: 400 }
            )
        }

        // Check if current user can assign this role
        // Managers cannot create admin or manager users
        if (!canAssignRole(session.role, role as UserRole)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'You do not have permission to create users with this role' },
                { status: 403 }
            )
        }

        const supabase = createServiceClient()

        // Check if username exists
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single()

        if (existing) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Username already exists' },
                { status: 400 }
            )
        }

        // Hash password
        const password_hash = await hashPassword(password)

        const { data: user, error } = await supabase
            .from('users')
            .insert({
                username,
                password_hash,
                full_name,
                role,
                is_active: true,
            })
            .select('id, username, full_name, role, is_active, created_at')
            .single()

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<User>>({
            success: true,
            data: user,
        })
    } catch (error) {
        console.error('Error creating user:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to create user' },
            { status: 500 }
        )
    }
}

// PATCH - Update user
export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session || !canManageUsers(session.role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { id, password, ...updates } = body

        if (!id) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'User ID is required' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // Get the target user's current role to check permissions
        const { data: targetUser, error: fetchError } = await supabase
            .from('users')
            .select('role')
            .eq('id', id)
            .single()

        if (fetchError || !targetUser) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'User not found' },
                { status: 404 }
            )
        }

        // Check if current user can manage this user (based on target's current role)
        // Managers cannot edit admin or manager users
        if (!canManageUserWithRole(session.role, targetUser.role as UserRole)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'You do not have permission to edit this user' },
                { status: 403 }
            )
        }

        // Admin Self-Protection: Admins cannot deactivate themselves or change their own role
        const isSelfUpdate = session.id === id
        if (isSelfUpdate && session.role === 'admin') {
            if (updates.is_active === false) {
                return NextResponse.json<ApiResponse<null>>(
                    { success: false, error: 'Admins cannot deactivate their own account' },
                    { status: 400 }
                )
            }
            if (updates.role && updates.role !== 'admin') {
                return NextResponse.json<ApiResponse<null>>(
                    { success: false, error: 'Admins cannot change their own role' },
                    { status: 400 }
                )
            }
        }

        // If role is being changed, check if current user can assign the new role
        if (updates.role && !canAssignRole(session.role, updates.role as UserRole)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'You do not have permission to assign this role' },
                { status: 403 }
            )
        }

        // If password is being updated, hash it
        if (password) {
            updates.password_hash = await hashPassword(password)
        }

        const { data: user, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', id)
            .select('id, username, full_name, role, is_active, created_at')
            .single()

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<User>>({
            success: true,
            data: user,
        })
    } catch (error) {
        console.error('Error updating user:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to update user' },
            { status: 500 }
        )
    }
}

// DELETE - Delete user
export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session || !canManageUsers(session.role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'User ID is required' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // Get target user role
        const { data: targetUser, error: fetchError } = await supabase
            .from('users')
            .select('role')
            .eq('id', id)
            .single()

        if (fetchError || !targetUser) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'User not found' },
                { status: 404 }
            )
        }

        const targetRole = targetUser.role as UserRole

        // Role Restrictions for Deletion:
        // 1. Managers cannot delete admins or managers
        if (session.role === 'manager' && isPrivilegedRole(targetRole)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Managers cannot delete privileged users' },
                { status: 403 }
            )
        }

        // 2. Admins cannot delete any admins (including self)
        if (session.role === 'admin' && targetRole === 'admin') {
            const isSelf = session.id === id
            return NextResponse.json<ApiResponse<null>>(
                {
                    success: false,
                    error: isSelf ? 'Admins cannot delete their own account' : 'Admins cannot delete other admins'
                },
                { status: 403 }
            )
        }

        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id)

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<null>>({
            success: true,
        })
    } catch (error) {
        console.error('Error deleting user:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to delete user' },
            { status: 500 }
        )
    }
}
