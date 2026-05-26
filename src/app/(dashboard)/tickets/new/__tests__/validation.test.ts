/**
 * Test Suite: Ticket Form Validation
 * 
 * Tests for client-side form validation using Zod schema
 */

import { z } from 'zod'

// Recreate the schema from the form component for testing
const ticketSchema = z.object({
    type: z.enum(['action', 'query', 'info'], { message: 'Please select a ticket type' }),
    action_subtype: z.enum(['diagnostics', 'therapeutics']).optional(),
    service_type_id: z.string().optional(),
    patient_name: z.string().optional(),
    patient_name_2: z.string().optional(),
    patient_age_1: z.string().optional(),
    patient_age_2: z.string().optional(),
    original_message: z.string().max(5000).optional(),
    doctor_id: z.string().optional(),
    hospital_id: z.string().min(1, 'Hospital is required'),
    screenshot_url: z.string().optional(),
}).refine((data) => {
    // If ticket type is 'action', action_subtype is required
    if (data.type === 'action' && !data.action_subtype) {
        return false
    }
    // If action_subtype is selected, service_type_id is required
    if (data.action_subtype && !data.service_type_id) {
        return false
    }
    return true
}, {
    message: 'Service type is required for diagnostic/therapeutic tickets',
    path: ['service_type_id']
})

describe('Ticket Form Validation Schema', () => {
    describe('Type field', () => {
        it('should accept valid ticket types', () => {
            const validTypes = ['action', 'query', 'info']

            validTypes.forEach(type => {
                const result = ticketSchema.safeParse({
                    type,
                    hospital_id: 'hospital-123',
                    original_message: 'Test message',
                    ...(type === 'action' ? { action_subtype: 'diagnostics', service_type_id: 'service-1' } : {}),
                })

                expect(result.success).toBe(true)
            })
        })

        it('should reject invalid ticket types', () => {
            const result = ticketSchema.safeParse({
                type: 'invalid_type',
                hospital_id: 'hospital-123',
                original_message: 'Test message',
            })

            expect(result.success).toBe(false)
        })
    })

    describe('Hospital field', () => {
        it('should require hospital_id', () => {
            const result = ticketSchema.safeParse({
                type: 'query',
                original_message: 'Test message',
                // No hospital_id
            })

            expect(result.success).toBe(false)
            if (!result.success) {
                // Check that there's an error related to hospital_id
                const hospitalError = result.error.issues.find(i => i.path.includes('hospital_id'))
                expect(hospitalError).toBeDefined()
            }
        })

        it('should reject empty hospital_id', () => {
            const result = ticketSchema.safeParse({
                type: 'query',
                hospital_id: '',
                original_message: 'Test message',
            })

            expect(result.success).toBe(false)
        })

        it('should accept valid hospital_id', () => {
            const result = ticketSchema.safeParse({
                type: 'query',
                hospital_id: 'hospital-123',
                original_message: 'Test message',
            })

            expect(result.success).toBe(true)
        })
    })

    describe('Action subtype requirement', () => {
        it('should require action_subtype when type is action', () => {
            const result = ticketSchema.safeParse({
                type: 'action',
                hospital_id: 'hospital-123',
                original_message: 'Test message',
                // No action_subtype
            })

            expect(result.success).toBe(false)
        })

        it('should accept action type with valid action_subtype and service_type_id', () => {
            const result = ticketSchema.safeParse({
                type: 'action',
                action_subtype: 'diagnostics',
                service_type_id: 'service-123',
                hospital_id: 'hospital-123',
                original_message: 'Test message',
            })

            expect(result.success).toBe(true)
        })

        it('should not require action_subtype for query type', () => {
            const result = ticketSchema.safeParse({
                type: 'query',
                hospital_id: 'hospital-123',
                original_message: 'Test message',
            })

            expect(result.success).toBe(true)
        })
    })

    describe('Service type requirement', () => {
        it('should require service_type_id when action_subtype is set', () => {
            const result = ticketSchema.safeParse({
                type: 'action',
                action_subtype: 'therapeutics',
                hospital_id: 'hospital-123',
                original_message: 'Test message',
                // No service_type_id
            })

            expect(result.success).toBe(false)
        })
    })

    describe('Message/Screenshot validation', () => {
        it('should accept ticket with only original_message', () => {
            const result = ticketSchema.safeParse({
                type: 'info',
                hospital_id: 'hospital-123',
                original_message: 'This is the message content',
            })

            expect(result.success).toBe(true)
        })

        it('should accept ticket with only screenshot_url', () => {
            const result = ticketSchema.safeParse({
                type: 'info',
                hospital_id: 'hospital-123',
                screenshot_url: 'https://example.com/screenshot.jpg',
            })

            expect(result.success).toBe(true)
        })

        it('should accept ticket with both message and screenshot', () => {
            const result = ticketSchema.safeParse({
                type: 'query',
                hospital_id: 'hospital-123',
                original_message: 'Additional notes',
                screenshot_url: 'https://example.com/screenshot.jpg',
            })

            expect(result.success).toBe(true)
        })

        it('should reject message exceeding 5000 characters', () => {
            const longMessage = 'x'.repeat(5001)

            const result = ticketSchema.safeParse({
                type: 'info',
                hospital_id: 'hospital-123',
                original_message: longMessage,
            })

            expect(result.success).toBe(false)
        })

        it('should accept message of exactly 5000 characters', () => {
            const maxMessage = 'x'.repeat(5000)

            const result = ticketSchema.safeParse({
                type: 'info',
                hospital_id: 'hospital-123',
                original_message: maxMessage,
            })

            expect(result.success).toBe(true)
        })
    })

    describe('Patient information', () => {
        it('should accept optional patient fields', () => {
            const result = ticketSchema.safeParse({
                type: 'info',
                hospital_id: 'hospital-123',
                original_message: 'Test',
                patient_name: 'John Doe',
                patient_name_2: 'Jane Doe',
                patient_age_1: '35',
                patient_age_2: '32',
            })

            expect(result.success).toBe(true)
        })

        it('should accept ticket without patient fields', () => {
            const result = ticketSchema.safeParse({
                type: 'info',
                hospital_id: 'hospital-123',
                original_message: 'Test message',
            })

            expect(result.success).toBe(true)
        })
    })
})
