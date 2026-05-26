-- Enforce ticket stage consistency from status transitions.
-- This prevents drift between:
--   - tickets.current_stage_id
--   - status_transitions
--   - ticket_diagnostics.status

create or replace function public.reconcile_ticket_stage_from_transitions(p_ticket_id uuid)
returns void
language plpgsql
as $$
declare
    v_current_sort integer := -1;
    v_current_stage_id uuid;
    v_target_stage_id uuid;
    v_target_stage_name text;
    v_target_sort integer;
    v_target_transition_ts timestamptz;
    v_target_diag_status text;
    v_target_diag_order integer;
begin
    -- Current ticket stage
    select t.current_stage_id, coalesce(ws.sort_order, -1)
      into v_current_stage_id, v_current_sort
      from public.tickets t
      left join public.workflow_stages ws on ws.id = t.current_stage_id
     where t.id = p_ticket_id;

    if not found then
        return;
    end if;

    -- Highest stage this ticket has ever reached in transition history
    select s.id,
           s.name,
           s.sort_order,
           (
             st.transition_date::text || ' ' || coalesce(st.transition_time::text, '00:00')
           )::timestamptz
      into v_target_stage_id, v_target_stage_name, v_target_sort, v_target_transition_ts
      from public.status_transitions st
      join public.workflow_stages s on s.id = st.to_stage_id
     where st.ticket_id = p_ticket_id
       and s.is_active = true
     order by s.sort_order desc, st.created_at desc
     limit 1;

    -- No transitions recorded yet; nothing to reconcile.
    if v_target_stage_id is null then
        return;
    end if;

    -- Only advance, never force a backward move.
    if v_target_sort <= v_current_sort then
        return;
    end if;

    update public.tickets
       set current_stage_id = v_target_stage_id,
           updated_at = now(),
           status_sample_collected_at = case
               when lower(v_target_stage_name) = 'sample collected' then coalesce(v_target_transition_ts, now())
               else status_sample_collected_at
           end,
           status_sample_received_at = case
               when lower(v_target_stage_name) = 'sample received' then coalesce(v_target_transition_ts, now())
               else status_sample_received_at
           end,
           status_sample_sent_at = case
               when lower(v_target_stage_name) = 'sample sent to' then coalesce(v_target_transition_ts, now())
               else status_sample_sent_at
           end,
           status_report_received_at = case
               when lower(v_target_stage_name) = 'report received' then coalesce(v_target_transition_ts, now())
               else status_report_received_at
           end,
           status_final_report_generated_at = case
               when lower(v_target_stage_name) = 'final report generated' then coalesce(v_target_transition_ts, now())
               else status_final_report_generated_at
           end,
           status_report_submitted_at = case
               when lower(v_target_stage_name) in ('report submission', 'submitted and closed') then coalesce(v_target_transition_ts, now())
               else status_report_submitted_at
           end
     where id = p_ticket_id;

    -- Stage -> diagnostic mapping for cross-entity consistency.
    v_target_diag_status := case lower(v_target_stage_name)
        when 'new' then 'pending'
        when 'assigned' then 'pending'
        when 'sample collected' then 'sample_collected'
        when 'sample received' then 'sample_received'
        when 'sample sent to' then 'sent_to_lab'
        when 'report received' then 'raw_report_received'
        when 'final report generated' then 'final_report_generated'
        when 'report submission' then 'final_report_generated'
        when 'submitted and closed' then 'final_report_generated'
        else null
    end;

    if v_target_diag_status is null then
        return;
    end if;

    v_target_diag_order := case v_target_diag_status
        when 'pending' then 0
        when 'sample_collected' then 1
        when 'sample_received' then 2
        when 'sent_to_lab' then 3
        when 'raw_report_received' then 4
        when 'final_report_generated' then 5
        else -1
    end;

    -- Advance any non-cancelled diagnostics that are behind.
    update public.ticket_diagnostics td
       set status = v_target_diag_status,
           updated_at = now()
     where td.ticket_id = p_ticket_id
       and coalesce(td.is_cancelled, false) = false
       and (
            case td.status
                when 'pending' then 0
                when 'sample_collected' then 1
                when 'sample_received' then 2
                when 'sent_to_lab' then 3
                when 'raw_report_received' then 4
                when 'final_report_generated' then 5
                else -1
            end
       ) < v_target_diag_order;
end;
$$;

-- Keep tickets aligned every time a transition is recorded or edited.
create or replace function public.trg_reconcile_ticket_stage_after_transition()
returns trigger
language plpgsql
as $$
begin
    perform public.reconcile_ticket_stage_from_transitions(
        case
            when tg_op = 'DELETE' then old.ticket_id
            else new.ticket_id
        end
    );
    return null;
end;
$$;

drop trigger if exists trg_reconcile_ticket_stage_after_transition on public.status_transitions;

create trigger trg_reconcile_ticket_stage_after_transition
after insert or update of to_stage_id, transition_date, transition_time or delete
on public.status_transitions
for each row
execute function public.trg_reconcile_ticket_stage_after_transition();

-- Ensure new diagnostics added mid-flow start at least at ticket stage level.
create or replace function public.trg_set_new_diagnostic_status_from_ticket_stage()
returns trigger
language plpgsql
as $$
declare
    v_stage_name text;
begin
    if new.ticket_id is null then
        return new;
    end if;

    select ws.name
      into v_stage_name
      from public.tickets t
      left join public.workflow_stages ws on ws.id = t.current_stage_id
     where t.id = new.ticket_id;

    if v_stage_name is null then
        return new;
    end if;

    new.status := case lower(trim(v_stage_name))
        when 'sample collected' then 'sample_collected'
        when 'sample received' then 'sample_received'
        when 'sample sent to' then 'sent_to_lab'
        when 'report received' then 'raw_report_received'
        when 'final report generated' then 'final_report_generated'
        when 'report submission' then 'final_report_generated'
        when 'submitted and closed' then 'final_report_generated'
        else coalesce(new.status, 'pending')
    end;

    return new;
end;
$$;

drop trigger if exists trg_set_new_diagnostic_status_from_ticket_stage on public.ticket_diagnostics;

create trigger trg_set_new_diagnostic_status_from_ticket_stage
before insert on public.ticket_diagnostics
for each row
execute function public.trg_set_new_diagnostic_status_from_ticket_stage();

-- One-time backfill for existing production data.
do $$
declare
    r record;
begin
    for r in
        select distinct st.ticket_id
        from public.status_transitions st
        where st.ticket_id is not null
    loop
        perform public.reconcile_ticket_stage_from_transitions(r.ticket_id);
    end loop;
end;
$$;

