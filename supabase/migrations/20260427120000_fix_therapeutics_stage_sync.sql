-- Fix therapeutics ticket stage sync.
--
-- Root cause: tickets with action_subtype = 'therapeutics' have no ticket_diagnostics rows,
-- so the diagnostic-based auto-advance (maybeAdvanceTicketStatus) never runs for them.
-- Stage changes made via direct PATCH on tickets.current_stage_id (without creating a
-- status_transitions record) left current_stage_id out of sync with the timeline.
--
-- This migration:
--   1. Re-runs reconcile_ticket_stage_from_transitions for every ticket that has
--      status_transitions records so current_stage_id matches the highest recorded stage.
--   2. For tickets whose current_stage_id is AHEAD of their status_transitions history
--      (direct PATCH was used), inserts a synthetic status_transitions record so the
--      timeline reflects what current_stage_id shows.
--
-- Safe to re-run: reconcile is idempotent; the INSERT uses a guard to avoid duplicates.

do $$
declare
    r record;
    v_highest_stage_id uuid;
    v_highest_sort integer;
    v_current_sort integer;
    v_stage_name text;
begin
    -- Pass 1: advance current_stage_id to match the highest stage ever recorded in transitions.
    -- This is the same backfill that already runs for diagnostics; running it again for all
    -- tickets is safe and idempotent.
    for r in
        select distinct st.ticket_id
          from public.status_transitions st
         where st.ticket_id is not null
    loop
        perform public.reconcile_ticket_stage_from_transitions(r.ticket_id);
    end loop;

    -- Pass 2: for tickets where current_stage_id is AHEAD of status_transitions
    -- (meaning a direct PATCH set it further than any recorded transition),
    -- insert a synthetic transition so the timeline matches.
    for r in
        select t.id                         as ticket_id,
               t.current_stage_id,
               t.created_by,
               ws_cur.sort_order            as current_sort,
               ws_cur.name                  as current_stage_name,
               coalesce(max(ws_st.sort_order), -1) as max_transition_sort
          from public.tickets t
          join public.workflow_stages ws_cur on ws_cur.id = t.current_stage_id
          left join public.status_transitions st on st.ticket_id = t.id
          left join public.workflow_stages ws_st on ws_st.id = st.to_stage_id and ws_st.is_active = true
         where t.is_cancelled = false
         group by t.id, t.current_stage_id, t.created_by, ws_cur.sort_order, ws_cur.name
        having coalesce(max(ws_st.sort_order), -1) < ws_cur.sort_order
    loop
        -- Insert a synthetic transition that records the gap so the timeline is complete.
        -- Use the earliest possible "from_stage" that makes sense (the previous highest transition).
        insert into public.status_transitions (
            ticket_id,
            from_stage_id,
            to_stage_id,
            transition_date,
            transition_time,
            field_data,
            changed_by
        )
        select
            r.ticket_id,
            (
                select st2.to_stage_id
                  from public.status_transitions st2
                  join public.workflow_stages ws2 on ws2.id = st2.to_stage_id
                 where st2.ticket_id = r.ticket_id
                 order by ws2.sort_order desc
                 limit 1
            ),
            r.current_stage_id,
            current_date,
            current_time,
            jsonb_build_object('synthetic', true, 'reason', 'backfill_stage_sync'),
            r.created_by
        where not exists (
            select 1
              from public.status_transitions st3
             where st3.ticket_id = r.ticket_id
               and st3.to_stage_id = r.current_stage_id
        );
    end loop;
end;
$$;
