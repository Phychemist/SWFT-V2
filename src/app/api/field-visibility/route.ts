import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { getSession, canManageWorkflowSettings } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

// Default built-in field visibility
const defaultFieldVisibility: Record<string, boolean> = {
    type: true,
    doctor: true,
    hospital: true,
    hospital_city: true,
    hospital_address: true,
    hospital_location: true,
    hospital_contact: true,
    status: true,
    assigned_to: true,
    collection_location: true,
    collection_address: true,
    created_at: true,
}

export interface FieldVisibility {
    field_id: string
    is_visible: boolean
}

// GET - Get field visibility settings
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

        const { data: settings, error } = await supabase
            .from('field_visibility')
            .select('*')

        if (error) {
            // Table might not exist yet, return defaults
            console.error('Error fetching field visibility:', error)
            return NextResponse.json<ApiResponse<FieldVisibility[]>>({
                success: true,
                data: Object.entries(defaultFieldVisibility).map(([field_id, is_visible]) => ({
                    field_id,
                    is_visible,
                })),
            })
        }

        // Merge with defaults (in case new fields were added)
        const visibility: FieldVisibility[] = Object.entries(defaultFieldVisibility).map(
            ([field_id, defaultVisible]) => {
                const saved = settings?.find((s) => s.field_id === field_id)
                return {
                    field_id,
                    is_visible: saved?.is_visible ?? defaultVisible,
                }
            }
        )

        return NextResponse.json<ApiResponse<FieldVisibility[]>>({
            success: true,
            data: visibility,
        })
    } catch (error) {
        console.error('Error fetching field visibility:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to fetch field visibility' },
            { status: 500 }
        )
    }
}

// POST - Update field visibility (upsert)
export async function POST(request: NextRequest) {
    try {
        const session = await getSession()
        if (!session || !canManageWorkflowSettings(session.role)) {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { field_id, is_visible } = body

        if (!field_id || typeof is_visible !== 'boolean') {
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: 'field_id and is_visible are required' },
                { status: 400 }
            )
        }

        const supabase = createServiceClient()

        // Upsert the visibility setting
        const { error } = await supabase.from('field_visibility').upsert(
            {
                field_id,
                is_visible,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'field_id' }
        )

        if (error) {
            console.error('Error updating field visibility:', error)
            return NextResponse.json<ApiResponse<null>>(
                { success: false, error: error.message },
                { status: 500 }
            )
        }

        return NextResponse.json<ApiResponse<{ field_id: string; is_visible: boolean }>>({
            success: true,
            data: { field_id, is_visible },
        })
    } catch (error) {
        console.error('Error updating field visibility:', error)
        return NextResponse.json<ApiResponse<null>>(
            { success: false, error: 'Failed to update field visibility' },
            { status: 500 }
        )
    }
}
