import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession, canManageWorkflowSettings } from '@/lib/auth'
import type { ApiResponse, WorkflowStage, CreateWorkflowStageForm } from '@/lib/types'

// GET - List all workflow stages
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

        const { data: stages, error } = await supabase
            .from('workflow_stages')
            .select('*')
            .order('sort_order', { ascending: true })

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<WorkflowStage[]>>({
            success: true,
            data: stages,
        })
    } catch (error) {
        console.error('Error fetching workflow stages:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch workflow stages' },
            { status: 500 }
        )
    }
}

// POST - Create a new workflow stage
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session || !canManageWorkflowSettings(session.role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            )
        }

        const body: CreateWorkflowStageForm = await request.json()
        const { name, color } = body

        if (!name || !color) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Name and color are required' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // Get the max sort_order
        const { data: maxOrder } = await supabase
            .from('workflow_stages')
            .select('sort_order')
            .order('sort_order', { ascending: false })
            .limit(1)
            .single()

        const newSortOrder = (maxOrder?.sort_order ?? -1) + 1

        const { data: stage, error } = await supabase
            .from('workflow_stages')
            .insert({
                name,
                color,
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

        return NextResponse.json<ApiResponse<WorkflowStage>>({
            success: true,
            data: stage,
        })
    } catch (error) {
        console.error('Error creating workflow stage:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to create workflow stage' },
            { status: 500 }
        )
    }
}

// PATCH - Update workflow stages (reorder, update, toggle active)
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
                { success: false, error: 'Stage ID is required' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        const { data: stage, error } = await supabase
            .from('workflow_stages')
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

        return NextResponse.json<ApiResponse<WorkflowStage>>({
            success: true,
            data: stage,
        })
    } catch (error) {
        console.error('Error updating workflow stage:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to update workflow stage' },
            { status: 500 }
        )
    }
}

// DELETE - Delete a workflow stage
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
                { success: false, error: 'Stage ID is required' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        const { error } = await supabase
            .from('workflow_stages')
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
            message: 'Stage deleted successfully',
        })
    } catch (error) {
        console.error('Error deleting workflow stage:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to delete workflow stage' },
            { status: 500 }
        )
    }
}
