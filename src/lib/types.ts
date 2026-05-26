// ============================================
// USER & AUTHENTICATION TYPES
// ============================================

export type UserRole = 'admin' | 'manager' | 'customer_success' | 'field_executive' | 'officer_backoffice' | 'scientist' | 'accountant'

export interface User {
    id: string
    username: string
    full_name: string
    role: UserRole
    is_active: boolean
    created_at: string
}

export interface SessionUser {
    id: string
    username: string
    full_name: string
    role: UserRole
}

// ============================================
// DOCTOR & HOSPITAL TYPES
// ============================================

export interface Hospital {
    id: string
    name: string
    address: string
    city: string
    location: string
    contact: string
    is_active: boolean
    created_at: string
}

export interface Doctor {
    id: string
    name: string
    phone: string
    hospital_id: string
    hospital?: Hospital
    is_active: boolean
    created_at: string
}

export interface Lab {
    id: string
    name: string
    address?: string | null
    city?: string | null
    is_active: boolean
    created_at: string
}

// ============================================
// TICKET TYPES
// ============================================

export type TicketType = 'action' | 'query' | 'info'
export type QueryCategory = 'report_related' | 'scientific' | 'billing_related' | 'others'

// Per-diagnostic status lifecycle
export type DiagnosticStatus =
    | 'pending'
    | 'sample_collected'
    | 'sample_received'
    | 'sent_to_lab'
    | 'raw_report_received'
    | 'final_report_generated'

export interface TicketDiagnostic {
    id: string
    ticket_id: string
    service_type_id: string
    service_type?: ServiceType
    status: DiagnosticStatus
    sample_image_url?: string | null
    courier_image_url?: string | null
    sample_received_at?: string | null
    label_code?: string | null
    sent_to_lab_id?: string | null
    lab?: Lab
    tagged_sample_image_url?: string | null
    backoffice_courier_image_url?: string | null
    raw_report_url?: string | null
    final_report_url?: string | null
    is_cancelled?: boolean
    cancelled_at?: string | null
    created_at: string
    updated_at: string
}

export interface Ticket {
    id: string
    uid: string // Auto-generated: TKT-YYYYMMDD-XXXX
    type: TicketType
    original_message: string
    action_subtype?: 'diagnostics' | 'therapeutics'
    query_category?: QueryCategory
    patient_name?: string      // Patient 1 (e.g., Husband)
    patient_name_2?: string    // Patient 2 (e.g., Wife)
    patient_age_1?: number     // Age of Patient 1
    patient_age_2?: number     // Age of Patient 2
    doctor_id: string
    doctor?: Doctor
    hospital_id: string
    hospital?: Hospital
    assigned_to: string | null
    assigned_user?: User
    current_stage_id: string | null
    current_stage?: WorkflowStage
    collection_location: 'hospital' | 'home' | null
    collection_address: string | null
    service_type_id: string | null
    service_type?: ServiceType
    created_by: string
    creator?: User
    created_at: string
    updated_at: string
    // System Status Fields
    status_new_at?: string
    status_sample_collected_at?: string
    status_sample_received_at?: string
    status_sample_sent_at?: string
    status_analyzed_at?: string
    status_report_received_at?: string
    status_report_submitted_at?: string
    status_transitions?: StatusTransition[]
    sent_to_lab_id?: string
    lab?: Lab
    // Dynamic custom values
    custom_values?: TicketCustomValue[]
    // WhatsApp Screenshot
    screenshot_url?: string
    // Test Requisition Form (TRF) document
    trf_image_url?: string
    trf_image_urls?: string[]
    sample_image_url?: string
    courier_image_url?: string
    // Backoffice images (when sending to lab)
    tagged_sample_image_url?: string
    backoffice_courier_image_url?: string

    // Raw Lab Report document
    raw_report_url?: string
    // Final Report document (uploaded by scientist)
    final_report_url?: string
    // Final report generated timestamp
    status_final_report_generated_at?: string
    // Scheduled Pickup
    scheduled_date?: string
    scheduled_time?: string
    // Label Code (Secret code for labs)
    label_code?: string
    // Cancellation Status
    is_cancelled?: boolean
    cancelled_at?: string
    cancelled_by?: string
    cancellation_reason?: string
    // Multiple diagnostics per ticket
    diagnostics?: TicketDiagnostic[]
}

// ============================================
// WORKFLOW STAGE TYPES (Manager Configurable)
// ============================================

export type ModalFieldType = 'date' | 'time' | 'datetime' | 'text' | 'system_dropdown'
export type SystemDropdownSource = 'users' | 'labs'

export interface ModalFieldConfig {
    id: string
    type: ModalFieldType
    label: string
    required: boolean
    source?: SystemDropdownSource  // For system_dropdown type
}

export interface WorkflowStage {
    id: string
    name: string
    color: string // Hex color for badge
    sort_order: number
    is_active: boolean
    requires_modal: boolean
    modal_fields: ModalFieldConfig[]
    created_at: string
}

export interface StatusTransition {
    id: string
    ticket_id: string
    from_stage_id: string | null
    to_stage_id: string
    from_stage?: WorkflowStage
    to_stage?: WorkflowStage
    transition_date: string
    transition_time: string | null
    field_data: Record<string, any>
    changed_by: string
    changer?: User
    created_at: string
}

// ============================================
// CUSTOM COLUMN TYPES (Dynamic Column Builder)
// ============================================

export type CustomColumnType = 'tag' | 'text' | 'date' | 'number' | 'dropdown'

export interface CustomColumnOption {
    value: string
    label: string
    color?: string // For tag type
}

export interface CustomColumn {
    id: string
    name: string // Internal name (snake_case)
    display_name: string // User-friendly name
    column_type: CustomColumnType
    options: CustomColumnOption[] | null // For tag/dropdown types
    sort_order: number
    is_active: boolean
    created_at: string
}

export interface TicketCustomValue {
    id: string
    ticket_id: string
    column_id: string
    column?: CustomColumn
    value: string
    updated_at: string
}

// ============================================
// SERVICE TYPES (Diagnostics & Therapeutics)
// ============================================

export type ServiceCategory = 'diagnostics' | 'therapeutics'

// Patient type configuration for service types
// Controls which patient fields are shown in ticket creation form
export type PatientType = 'couple' | 'female_only' | 'male_only'

export interface ServiceType {
    id: string
    category: ServiceCategory
    name: string
    kit: string | null
    requirements: string | null
    protocol: string | null
    patient_type: PatientType  // Which patient fields to display
    is_active: boolean
    sort_order: number
    created_at: string
    updated_at: string
}

export interface CreateServiceTypeForm {
    category: ServiceCategory
    name: string
    kit?: string
    requirements?: string
    protocol?: string
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
    success: boolean
    data?: T
    error?: string
    message?: string
}

export interface PaginatedResponse<T> {
    success: boolean
    data: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

// ============================================
// FORM TYPES
// ============================================

export interface CreateTicketForm {
    type: TicketType
    original_message: string
    doctor_id: string
    hospital_id: string
    service_type_id?: string        // For therapeutics (single)
    service_type_ids?: string[]     // For diagnostics (multiple)
}

export interface UpdateTicketForm {
    type?: TicketType
    action_subtype?: 'diagnostics' | 'therapeutics'
    query_category?: QueryCategory
    patient_name?: string
    patient_name_2?: string
    patient_age_1?: number
    patient_age_2?: number
    doctor_id?: string
    hospital_id?: string
    original_message?: string
    current_stage_id?: string
    assigned_to?: string
    collection_location?: 'hospital' | 'home'
    collection_address?: string
    service_type_id?: string
    scheduled_date?: string
    scheduled_time?: string
    screenshot_url?: string
    trf_image_url?: string
    trf_image_urls?: string[]
    add_diagnostic_ids?: string[]   // Add diagnostics to existing ticket
    custom_values?: Record<string, string> // column_id -> value
}

export interface CreateUserForm {
    username: string
    password: string
    full_name: string
    role: UserRole
}

export interface CreateWorkflowStageForm {
    name: string
    color: string
    requires_modal?: boolean
    modal_fields?: ModalFieldConfig[]
}

export interface CreateCustomColumnForm {
    name: string
    display_name: string
    column_type: CustomColumnType
    options?: CustomColumnOption[]
}

// ============================================
// TICKET COMMENT TYPES
// ============================================

export interface TicketComment {
    id: string
    ticket_id: string
    comment: string
    created_by: string
    author?: {
        id: string
        full_name: string
        role: UserRole
    }
    created_at: string
    updated_at: string
}
