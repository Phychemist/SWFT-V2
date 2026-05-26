import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession, canManageWorkflowSettings } from '@/lib/auth'
import type { ApiResponse, CustomColumn, CreateCustomColumnForm } from '@/lib/types'

// GET - List all custom columns
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

        const { data: columns, error } = await supabase
            .from('custom_columns')
            .select('*')
            .order('sort_order', { ascending: true })

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<CustomColumn[]>>({
            success: true,
            data: columns,
        })
    } catch (error) {
        console.error('Error fetching custom columns:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch custom columns' },
            { status: 500 }
        )
    }
}

// POST - Create a new custom column
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session || !canManageWorkflowSettings(session.role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            )
        }

        const body: CreateCustomColumnForm = await request.json()
        const { name, display_name, column_type, options } = body

        if (!name || !display_name || !column_type) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Name, display name, and column type are required' },
                { status: 400 }
            )
        }

        // Validate column type
        const validTypes = ['tag', 'text', 'date', 'number', 'dropdown']
        if (!validTypes.includes(column_type)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Invalid column type' },
                { status: 400 }
            )
        }

        // For tag/dropdown types, options are required
        if ((column_type === 'tag' || column_type === 'dropdown') && (!options || options.length === 0)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Options are required for tag and dropdown column types' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // Get the max sort_order
        const { data: maxOrder } = await supabase
            .from('custom_columns')
            .select('sort_order')
            .order('sort_order', { ascending: false })
            .limit(1)
            .single()

        const newSortOrder = (maxOrder?.sort_order ?? -1) + 1

        // Convert name to snake_case
        const snakeCaseName = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_|_$/g, '')

        const { data: column, error } = await supabase
            .from('custom_columns')
            .insert({
                name: snakeCaseName,
                display_name,
                column_type,
                options: options || null,
                sort_order: newSortOrder,
                is_active: true,
            })
            .select()
            .single()

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<CustomColumn>>({
            success: true,
            data: column,
        })
    } catch (error) {
        console.error('Error creating custom column:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to create custom column' },
            { status: 500 }
        )
    }
}

// PATCH - Update a custom column
export async function PATCH(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session || !canManageWorkflowSettings(session.role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Column ID is required' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        const { data: column, error } = await supabase
            .from('custom_columns')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<CustomColumn>>({
            success: true,
            data: column,
        })
    } catch (error) {
        console.error('Error updating custom column:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to update custom column' },
            { status: 500 }
        )
    }
}

// DELETE - Delete a custom column
export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session || !canManageWorkflowSettings(session.role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            )
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Column ID is required' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // Note: This will cascade delete all ticket_custom_values for this column
        const { error } = await supabase
            .from('custom_columns')
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
            message: 'Column deleted successfully',
        })
    } catch (error) {
        console.error('Error deleting custom column:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to delete custom column' },
            { status: 500 }
        )
    }
}
