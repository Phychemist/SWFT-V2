import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession } from '@/lib/auth'
import type { ApiResponse, TicketComment } from '@/lib/types'

// GET - Fetch all comments for a ticket
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { id } = await params
        const supabase = createServiceClient()

        let query = supabase
            .from('ticket_comments')
            .select(`
                *,
                author:users!created_by(id, full_name, role)
            `)
            .eq('ticket_id', id)

        // If field executive, only show their own comments
        if (session.role === 'field_executive') {
            query = query.eq('created_by', session.id)
        }

        const { data: comments, error } = await query
            .order('created_at', { ascending: false })

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<TicketComment[]>>({
            success: true,
            data: comments,
        })
    } catch (error: any) {
        console.error('Error fetching comments:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch comments' },
            { status: 500 }
        )
    }
}

// POST - Add a new comment
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession()
        if (!session) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Only admin, manager, field_executive, and scientist can add comments
        if (session.role !== 'admin' && session.role !== 'manager' && session.role !== 'field_executive' && session.role !== 'scientist') {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized to add comments' },
                { status: 403 }
            )
        }

        const { id } = await params
        const body = await request.json()
        const { comment } = body

        if (!comment || comment.trim().length === 0) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Comment cannot be empty' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        const { data: newComment, error } = await supabase
            .from('ticket_comments')
            .insert({
                ticket_id: id,
                comment: comment.trim(),
                created_by: session.id,
            })
            .select(`
                *,
                author:users!created_by(id, full_name, role)
            `)
            .single()

        if (error) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<TicketComment>>({
            success: true,
            data: newComment,
        })
    } catch (error: any) {
        console.error('Error adding comment:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to add comment' },
            { status: 500 }
        )
    }
}
