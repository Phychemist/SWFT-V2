import { createServiceClient } from '@/lib/supabase-server'

/**
 * Automatically creates inventory consumption records when a ticket transitions to 'completed' / 'submitted and closed'.
 * Parses the 'service_types.kit' text string, matches it to inventory items, and logs consumption under the assigned FE.
 */
export async function autoCreateConsumptions(ticketId: string): Promise<boolean> {
  try {
    const supabase = createServiceClient()

    // 1. Fetch ticket details (including assigned FE and service type kit description)
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id, 
        assigned_to, 
        service_type_id, 
        service_type:service_types(kit)
      `)
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      console.error(`[autoCreateConsumptions] Ticket ${ticketId} not found.`, ticketError)
      return false
    }

    const feId = ticket.assigned_to
    const kitText = ticket.service_type?.kit

    // If no FE is assigned or there's no kit required, do nothing
    if (!feId || !kitText || kitText.trim() === '') {
      return true
    }

    // 2. Fetch active inventory items
    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id, name')

    if (itemsError || !items) {
      console.error('[autoCreateConsumptions] Failed to fetch inventory items.', itemsError)
      return false
    }

    const cleanedKitText = kitText.toLowerCase().trim()

    // 3. Match items and parse quantities
    for (const item of items) {
      const itemNameLower = item.name.toLowerCase()

      // Check if kit text contains the item name
      if (cleanedKitText.includes(itemNameLower)) {
        let quantityUsed = 1

        // Regex 1: "SGN-RML-0024 x 2" or "SGN-RML-0024 x2"
        const regexMultiplier = new RegExp(`${escapeRegExp(itemNameLower)}\\s*x\\s*(\\d+)`, 'i')
        const matchMultiplier = kitText.match(regexMultiplier)

        if (matchMultiplier && matchMultiplier[1]) {
          quantityUsed = parseInt(matchMultiplier[1], 10)
        } else {
          // Regex 2: "2 EDTA tubes" or "2x EDTA tubes"
          const regexPreMultiplier = new RegExp(`(\\d+)\\s*(?:x\\s*)?${escapeRegExp(itemNameLower)}`, 'i')
          const matchPre = kitText.match(regexPreMultiplier)
          if (matchPre && matchPre[1]) {
            quantityUsed = parseInt(matchPre[1], 10)
          }
        }

        if (isNaN(quantityUsed) || quantityUsed <= 0) {
          quantityUsed = 1
        }

        // 4. Prevent duplicate key violation: check if consumption row already exists
        const { data: existing, error: existError } = await supabase
          .from('inventory_consumptions')
          .select('id')
          .eq('item_id', item.id)
          .eq('fe_id', feId)
          .eq('ticket_id', ticketId)
          .maybeSingle()

        if (existError) {
          console.error('[autoCreateConsumptions] Error checking existing consumption.', existError)
          continue
        }

        if (!existing) {
          // Insert the consumption record
          const { error: insertError } = await supabase
            .from('inventory_consumptions')
            .insert({
              item_id: item.id,
              fe_id: feId,
              ticket_id: ticketId,
              quantity_used: quantityUsed,
              kit_default_quantity: quantityUsed,
              overridden: false,
              override_reason: null
            })

          if (insertError) {
            console.error(`[autoCreateConsumptions] Failed to log consumption for item ${item.name}.`, insertError)
          } else {
            console.log(`[autoCreateConsumptions] Automatically consumed ${quantityUsed} units of ${item.name} for ticket ${ticketId}.`)
          }
        }
      }
    }

    return true
  } catch (error) {
    console.error('[autoCreateConsumptions] Unhandled error:', error)
    return false
  }
}

// Utility to escape regex characters safely
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
