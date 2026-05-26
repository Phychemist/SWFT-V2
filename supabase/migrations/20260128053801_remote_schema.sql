drop extension if exists "pg_net";


  create table "public"."custom_columns" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" character varying(50) not null,
    "display_name" character varying(100) not null,
    "column_type" character varying(20) not null,
    "options" jsonb,
    "sort_order" integer not null default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."custom_columns" enable row level security;


  create table "public"."doctors" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" character varying(200) not null,
    "phone" character varying(20),
    "hospital_id" uuid,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."doctors" enable row level security;


  create table "public"."field_visibility" (
    "field_id" character varying(50) not null,
    "is_visible" boolean default true,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."field_visibility" enable row level security;


  create table "public"."hospitals" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" character varying(200) not null,
    "address" text,
    "city" character varying(100),
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."hospitals" enable row level security;


  create table "public"."labs" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" character varying(200) not null,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "address" text,
    "city" character varying(100)
      );


alter table "public"."labs" enable row level security;


  create table "public"."service_types" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "category" character varying(20) not null,
    "name" character varying(200) not null,
    "kit" text,
    "requirements" text,
    "protocol" text,
    "is_active" boolean default true,
    "sort_order" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "patient_type" character varying(20) default 'couple'::character varying
      );


alter table "public"."service_types" enable row level security;


  create table "public"."status_transitions" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "ticket_id" uuid not null,
    "from_stage_id" uuid,
    "to_stage_id" uuid,
    "transition_date" date not null,
    "transition_time" time without time zone,
    "field_data" jsonb default '{}'::jsonb,
    "changed_by" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."status_transitions" enable row level security;


  create table "public"."ticket_comments" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "ticket_id" uuid not null,
    "comment" text not null,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."ticket_comments" enable row level security;


  create table "public"."ticket_custom_values" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "ticket_id" uuid not null,
    "column_id" uuid not null,
    "value" text,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."ticket_custom_values" enable row level security;


  create table "public"."tickets" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "uid" character varying(20) not null,
    "type" character varying(10) not null,
    "original_message" text,
    "doctor_id" uuid,
    "hospital_id" uuid,
    "assigned_to" uuid,
    "current_stage_id" uuid,
    "collection_location" character varying(20),
    "collection_address" text,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "action_subtype" character varying(20),
    "patient_name" text,
    "service_type_id" uuid,
    "patient_name_2" character varying(200),
    "patient_age_1" integer,
    "patient_age_2" integer,
    "status_new_at" timestamp with time zone default now(),
    "status_sample_collected_at" timestamp with time zone,
    "status_sample_received_at" timestamp with time zone,
    "status_sample_sent_at" timestamp with time zone,
    "sent_to_lab_id" uuid,
    "status_report_received_at" timestamp with time zone,
    "status_report_submitted_at" timestamp with time zone,
    "status_analyzed_at" timestamp with time zone,
    "screenshot_url" text,
    "trf_image_url" text,
    "raw_report_url" text,
    "final_report_url" text,
    "status_final_report_generated_at" timestamp with time zone,
    "scheduled_date" date,
    "scheduled_time" time without time zone,
    "collection_date" date,
    "collection_time" time without time zone,
    "trf_image_urls" text[] default '{}'::text[],
    "sample_image_url" text,
    "courier_image_url" text,
    "tagged_sample_image_url" text,
    "backoffice_courier_image_url" text,
    "query_category" character varying(20),
    "label_code" text,
    "is_cancelled" boolean default false,
    "cancelled_at" timestamp with time zone,
    "cancelled_by" uuid,
    "cancellation_reason" text
      );


alter table "public"."tickets" enable row level security;


  create table "public"."users" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "username" character varying(50) not null,
    "password_hash" character varying(255) not null,
    "full_name" character varying(100) not null,
    "role" character varying(20) not null,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."users" enable row level security;


  create table "public"."workflow_stages" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" character varying(100) not null,
    "color" character varying(7) not null default '#3b82f6'::character varying,
    "sort_order" integer not null default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "requires_modal" boolean default false,
    "modal_fields" jsonb default '[]'::jsonb
      );


alter table "public"."workflow_stages" enable row level security;

CREATE UNIQUE INDEX custom_columns_pkey ON public.custom_columns USING btree (id);

CREATE UNIQUE INDEX doctors_pkey ON public.doctors USING btree (id);

CREATE UNIQUE INDEX field_visibility_pkey ON public.field_visibility USING btree (field_id);

CREATE UNIQUE INDEX hospitals_pkey ON public.hospitals USING btree (id);

CREATE INDEX idx_custom_columns_order ON public.custom_columns USING btree (sort_order);

CREATE INDEX idx_doctors_hospital ON public.doctors USING btree (hospital_id);

CREATE INDEX idx_doctors_name ON public.doctors USING btree (name);

CREATE INDEX idx_hospitals_city ON public.hospitals USING btree (city);

CREATE INDEX idx_hospitals_name ON public.hospitals USING btree (name);

CREATE INDEX idx_service_types_active ON public.service_types USING btree (is_active);

CREATE INDEX idx_service_types_category ON public.service_types USING btree (category);

CREATE INDEX idx_service_types_sort ON public.service_types USING btree (sort_order);

CREATE INDEX idx_status_transitions_ticket ON public.status_transitions USING btree (ticket_id);

CREATE INDEX idx_ticket_comments_created_at ON public.ticket_comments USING btree (created_at DESC);

CREATE INDEX idx_ticket_comments_ticket ON public.ticket_comments USING btree (ticket_id);

CREATE INDEX idx_ticket_custom_values_column ON public.ticket_custom_values USING btree (column_id);

CREATE INDEX idx_ticket_custom_values_ticket ON public.ticket_custom_values USING btree (ticket_id);

CREATE INDEX idx_tickets_assigned ON public.tickets USING btree (assigned_to);

CREATE INDEX idx_tickets_cancelled ON public.tickets USING btree (is_cancelled);

CREATE INDEX idx_tickets_created_at ON public.tickets USING btree (created_at DESC);

CREATE INDEX idx_tickets_doctor ON public.tickets USING btree (doctor_id);

CREATE INDEX idx_tickets_hospital ON public.tickets USING btree (hospital_id);

CREATE INDEX idx_tickets_label_code ON public.tickets USING btree (label_code);

CREATE INDEX idx_tickets_query_category ON public.tickets USING btree (query_category);

CREATE INDEX idx_tickets_service_type ON public.tickets USING btree (service_type_id);

CREATE INDEX idx_tickets_stage ON public.tickets USING btree (current_stage_id);

CREATE INDEX idx_tickets_type ON public.tickets USING btree (type);

CREATE INDEX idx_tickets_uid ON public.tickets USING btree (uid);

CREATE INDEX idx_users_role ON public.users USING btree (role);

CREATE INDEX idx_users_username ON public.users USING btree (username);

CREATE INDEX idx_workflow_stages_order ON public.workflow_stages USING btree (sort_order);

CREATE UNIQUE INDEX labs_pkey ON public.labs USING btree (id);

CREATE UNIQUE INDEX service_types_pkey ON public.service_types USING btree (id);

CREATE UNIQUE INDEX status_transitions_pkey ON public.status_transitions USING btree (id);

CREATE UNIQUE INDEX ticket_comments_pkey ON public.ticket_comments USING btree (id);

CREATE UNIQUE INDEX ticket_custom_values_pkey ON public.ticket_custom_values USING btree (id);

CREATE UNIQUE INDEX ticket_custom_values_ticket_id_column_id_key ON public.ticket_custom_values USING btree (ticket_id, column_id);

CREATE UNIQUE INDEX tickets_pkey ON public.tickets USING btree (id);

CREATE UNIQUE INDEX tickets_uid_key ON public.tickets USING btree (uid);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);

CREATE UNIQUE INDEX workflow_stages_pkey ON public.workflow_stages USING btree (id);

alter table "public"."custom_columns" add constraint "custom_columns_pkey" PRIMARY KEY using index "custom_columns_pkey";

alter table "public"."doctors" add constraint "doctors_pkey" PRIMARY KEY using index "doctors_pkey";

alter table "public"."field_visibility" add constraint "field_visibility_pkey" PRIMARY KEY using index "field_visibility_pkey";

alter table "public"."hospitals" add constraint "hospitals_pkey" PRIMARY KEY using index "hospitals_pkey";

alter table "public"."labs" add constraint "labs_pkey" PRIMARY KEY using index "labs_pkey";

alter table "public"."service_types" add constraint "service_types_pkey" PRIMARY KEY using index "service_types_pkey";

alter table "public"."status_transitions" add constraint "status_transitions_pkey" PRIMARY KEY using index "status_transitions_pkey";

alter table "public"."ticket_comments" add constraint "ticket_comments_pkey" PRIMARY KEY using index "ticket_comments_pkey";

alter table "public"."ticket_custom_values" add constraint "ticket_custom_values_pkey" PRIMARY KEY using index "ticket_custom_values_pkey";

alter table "public"."tickets" add constraint "tickets_pkey" PRIMARY KEY using index "tickets_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."workflow_stages" add constraint "workflow_stages_pkey" PRIMARY KEY using index "workflow_stages_pkey";

alter table "public"."custom_columns" add constraint "custom_columns_column_type_check" CHECK (((column_type)::text = ANY (ARRAY[('tag'::character varying)::text, ('text'::character varying)::text, ('date'::character varying)::text, ('number'::character varying)::text, ('dropdown'::character varying)::text]))) not valid;

alter table "public"."custom_columns" validate constraint "custom_columns_column_type_check";

alter table "public"."doctors" add constraint "doctors_hospital_id_fkey" FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE SET NULL not valid;

alter table "public"."doctors" validate constraint "doctors_hospital_id_fkey";

alter table "public"."service_types" add constraint "service_types_category_check" CHECK (((category)::text = ANY (ARRAY[('diagnostics'::character varying)::text, ('therapeutics'::character varying)::text]))) not valid;

alter table "public"."service_types" validate constraint "service_types_category_check";

alter table "public"."service_types" add constraint "service_types_patient_type_check" CHECK (((patient_type)::text = ANY (ARRAY[('couple'::character varying)::text, ('female_only'::character varying)::text, ('male_only'::character varying)::text]))) not valid;

alter table "public"."service_types" validate constraint "service_types_patient_type_check";

alter table "public"."status_transitions" add constraint "status_transitions_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."status_transitions" validate constraint "status_transitions_changed_by_fkey";

alter table "public"."status_transitions" add constraint "status_transitions_from_stage_id_fkey" FOREIGN KEY (from_stage_id) REFERENCES public.workflow_stages(id) ON DELETE SET NULL not valid;

alter table "public"."status_transitions" validate constraint "status_transitions_from_stage_id_fkey";

alter table "public"."status_transitions" add constraint "status_transitions_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE not valid;

alter table "public"."status_transitions" validate constraint "status_transitions_ticket_id_fkey";

alter table "public"."status_transitions" add constraint "status_transitions_to_stage_id_fkey" FOREIGN KEY (to_stage_id) REFERENCES public.workflow_stages(id) ON DELETE SET NULL not valid;

alter table "public"."status_transitions" validate constraint "status_transitions_to_stage_id_fkey";

alter table "public"."ticket_comments" add constraint "ticket_comments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."ticket_comments" validate constraint "ticket_comments_created_by_fkey";

alter table "public"."ticket_comments" add constraint "ticket_comments_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_comments" validate constraint "ticket_comments_ticket_id_fkey";

alter table "public"."ticket_custom_values" add constraint "ticket_custom_values_column_id_fkey" FOREIGN KEY (column_id) REFERENCES public.custom_columns(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_custom_values" validate constraint "ticket_custom_values_column_id_fkey";

alter table "public"."ticket_custom_values" add constraint "ticket_custom_values_ticket_id_column_id_key" UNIQUE using index "ticket_custom_values_ticket_id_column_id_key";

alter table "public"."ticket_custom_values" add constraint "ticket_custom_values_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE not valid;

alter table "public"."ticket_custom_values" validate constraint "ticket_custom_values_ticket_id_fkey";

alter table "public"."tickets" add constraint "check_patient_age_1" CHECK (((patient_age_1 IS NULL) OR ((patient_age_1 >= 0) AND (patient_age_1 <= 150)))) not valid;

alter table "public"."tickets" validate constraint "check_patient_age_1";

alter table "public"."tickets" add constraint "check_patient_age_2" CHECK (((patient_age_2 IS NULL) OR ((patient_age_2 >= 0) AND (patient_age_2 <= 150)))) not valid;

alter table "public"."tickets" validate constraint "check_patient_age_2";

alter table "public"."tickets" add constraint "tickets_action_subtype_check" CHECK (((action_subtype)::text = ANY (ARRAY[('diagnostics'::character varying)::text, ('therapeutics'::character varying)::text]))) not valid;

alter table "public"."tickets" validate constraint "tickets_action_subtype_check";

alter table "public"."tickets" add constraint "tickets_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."tickets" validate constraint "tickets_assigned_to_fkey";

alter table "public"."tickets" add constraint "tickets_cancelled_by_fkey" FOREIGN KEY (cancelled_by) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."tickets" validate constraint "tickets_cancelled_by_fkey";

alter table "public"."tickets" add constraint "tickets_collection_location_check" CHECK (((collection_location)::text = ANY (ARRAY[('hospital'::character varying)::text, ('home'::character varying)::text]))) not valid;

alter table "public"."tickets" validate constraint "tickets_collection_location_check";

alter table "public"."tickets" add constraint "tickets_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."tickets" validate constraint "tickets_created_by_fkey";

alter table "public"."tickets" add constraint "tickets_current_stage_id_fkey" FOREIGN KEY (current_stage_id) REFERENCES public.workflow_stages(id) ON DELETE SET NULL not valid;

alter table "public"."tickets" validate constraint "tickets_current_stage_id_fkey";

alter table "public"."tickets" add constraint "tickets_doctor_id_fkey" FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE SET NULL not valid;

alter table "public"."tickets" validate constraint "tickets_doctor_id_fkey";

alter table "public"."tickets" add constraint "tickets_hospital_id_fkey" FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE SET NULL not valid;

alter table "public"."tickets" validate constraint "tickets_hospital_id_fkey";

alter table "public"."tickets" add constraint "tickets_query_category_check" CHECK (((query_category)::text = ANY (ARRAY[('report_related'::character varying)::text, ('scientific'::character varying)::text, ('billing_related'::character varying)::text, ('others'::character varying)::text]))) not valid;

alter table "public"."tickets" validate constraint "tickets_query_category_check";

alter table "public"."tickets" add constraint "tickets_sent_to_lab_id_fkey" FOREIGN KEY (sent_to_lab_id) REFERENCES public.labs(id) ON DELETE SET NULL not valid;

alter table "public"."tickets" validate constraint "tickets_sent_to_lab_id_fkey";

alter table "public"."tickets" add constraint "tickets_service_type_id_fkey" FOREIGN KEY (service_type_id) REFERENCES public.service_types(id) ON DELETE SET NULL not valid;

alter table "public"."tickets" validate constraint "tickets_service_type_id_fkey";

alter table "public"."tickets" add constraint "tickets_type_check" CHECK (((type)::text = ANY (ARRAY[('action'::character varying)::text, ('query'::character varying)::text, ('info'::character varying)::text]))) not valid;

alter table "public"."tickets" validate constraint "tickets_type_check";

alter table "public"."tickets" add constraint "tickets_uid_key" UNIQUE using index "tickets_uid_key";

alter table "public"."users" add constraint "users_role_check" CHECK (((role)::text = ANY (ARRAY[('admin'::character varying)::text, ('manager'::character varying)::text, ('customer_success'::character varying)::text, ('field_executive'::character varying)::text, ('officer_backoffice'::character varying)::text, ('scientist'::character varying)::text, ('accountant'::character varying)::text]))) not valid;

alter table "public"."users" validate constraint "users_role_check";

alter table "public"."users" add constraint "users_username_key" UNIQUE using index "users_username_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.generate_ticket_uid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    date_part VARCHAR(8);
    sequence_num INTEGER;
    new_uid VARCHAR(20);
BEGIN
    -- Get current date in YYYYMMDD format
    date_part := TO_CHAR(NOW(), 'YYYYMMDD');
    
    -- Get the next sequence number for today
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(uid FROM 14 FOR 4) AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM tickets
    WHERE uid LIKE 'TKT-' || date_part || '-%';
    
    -- Generate the new UID
    new_uid := 'TKT-' || date_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    NEW.uid := new_uid;
    RETURN NEW;
END;
$function$
;

create or replace view "public"."tickets_search_view" as  SELECT t.id,
    t.uid,
    t.type,
    t.original_message,
    t.doctor_id,
    t.hospital_id,
    t.assigned_to,
    t.current_stage_id,
    t.collection_location,
    t.collection_address,
    t.created_by,
    t.created_at,
    t.updated_at,
    t.action_subtype,
    t.patient_name,
    t.service_type_id,
    t.patient_name_2,
    t.patient_age_1,
    t.patient_age_2,
    t.status_new_at,
    t.status_sample_collected_at,
    t.status_sample_received_at,
    t.status_sample_sent_at,
    t.sent_to_lab_id,
    t.status_report_received_at,
    t.status_report_submitted_at,
    t.status_analyzed_at,
    t.screenshot_url,
    t.trf_image_url,
    t.raw_report_url,
    t.final_report_url,
    t.status_final_report_generated_at,
    t.scheduled_date,
    t.scheduled_time,
    t.collection_date,
    t.collection_time,
    t.trf_image_urls,
    t.sample_image_url,
    t.courier_image_url,
    t.tagged_sample_image_url,
    t.backoffice_courier_image_url,
    t.query_category,
    t.label_code,
    t.is_cancelled,
    t.cancelled_at,
    t.cancelled_by,
    t.cancellation_reason,
    d.name AS doctor_name,
    h.name AS hospital_name,
    st.name AS service_type_name
   FROM (((public.tickets t
     LEFT JOIN public.doctors d ON ((t.doctor_id = d.id)))
     LEFT JOIN public.hospitals h ON ((t.hospital_id = h.id)))
     LEFT JOIN public.service_types st ON ((t.service_type_id = st.id)));


CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."custom_columns" to "anon";

grant insert on table "public"."custom_columns" to "anon";

grant references on table "public"."custom_columns" to "anon";

grant select on table "public"."custom_columns" to "anon";

grant trigger on table "public"."custom_columns" to "anon";

grant truncate on table "public"."custom_columns" to "anon";

grant update on table "public"."custom_columns" to "anon";

grant delete on table "public"."custom_columns" to "authenticated";

grant insert on table "public"."custom_columns" to "authenticated";

grant references on table "public"."custom_columns" to "authenticated";

grant select on table "public"."custom_columns" to "authenticated";

grant trigger on table "public"."custom_columns" to "authenticated";

grant truncate on table "public"."custom_columns" to "authenticated";

grant update on table "public"."custom_columns" to "authenticated";

grant delete on table "public"."custom_columns" to "service_role";

grant insert on table "public"."custom_columns" to "service_role";

grant references on table "public"."custom_columns" to "service_role";

grant select on table "public"."custom_columns" to "service_role";

grant trigger on table "public"."custom_columns" to "service_role";

grant truncate on table "public"."custom_columns" to "service_role";

grant update on table "public"."custom_columns" to "service_role";

grant delete on table "public"."doctors" to "anon";

grant insert on table "public"."doctors" to "anon";

grant references on table "public"."doctors" to "anon";

grant select on table "public"."doctors" to "anon";

grant trigger on table "public"."doctors" to "anon";

grant truncate on table "public"."doctors" to "anon";

grant update on table "public"."doctors" to "anon";

grant delete on table "public"."doctors" to "authenticated";

grant insert on table "public"."doctors" to "authenticated";

grant references on table "public"."doctors" to "authenticated";

grant select on table "public"."doctors" to "authenticated";

grant trigger on table "public"."doctors" to "authenticated";

grant truncate on table "public"."doctors" to "authenticated";

grant update on table "public"."doctors" to "authenticated";

grant delete on table "public"."doctors" to "service_role";

grant insert on table "public"."doctors" to "service_role";

grant references on table "public"."doctors" to "service_role";

grant select on table "public"."doctors" to "service_role";

grant trigger on table "public"."doctors" to "service_role";

grant truncate on table "public"."doctors" to "service_role";

grant update on table "public"."doctors" to "service_role";

grant delete on table "public"."field_visibility" to "anon";

grant insert on table "public"."field_visibility" to "anon";

grant references on table "public"."field_visibility" to "anon";

grant select on table "public"."field_visibility" to "anon";

grant trigger on table "public"."field_visibility" to "anon";

grant truncate on table "public"."field_visibility" to "anon";

grant update on table "public"."field_visibility" to "anon";

grant delete on table "public"."field_visibility" to "authenticated";

grant insert on table "public"."field_visibility" to "authenticated";

grant references on table "public"."field_visibility" to "authenticated";

grant select on table "public"."field_visibility" to "authenticated";

grant trigger on table "public"."field_visibility" to "authenticated";

grant truncate on table "public"."field_visibility" to "authenticated";

grant update on table "public"."field_visibility" to "authenticated";

grant delete on table "public"."field_visibility" to "service_role";

grant insert on table "public"."field_visibility" to "service_role";

grant references on table "public"."field_visibility" to "service_role";

grant select on table "public"."field_visibility" to "service_role";

grant trigger on table "public"."field_visibility" to "service_role";

grant truncate on table "public"."field_visibility" to "service_role";

grant update on table "public"."field_visibility" to "service_role";

grant delete on table "public"."hospitals" to "anon";

grant insert on table "public"."hospitals" to "anon";

grant references on table "public"."hospitals" to "anon";

grant select on table "public"."hospitals" to "anon";

grant trigger on table "public"."hospitals" to "anon";

grant truncate on table "public"."hospitals" to "anon";

grant update on table "public"."hospitals" to "anon";

grant delete on table "public"."hospitals" to "authenticated";

grant insert on table "public"."hospitals" to "authenticated";

grant references on table "public"."hospitals" to "authenticated";

grant select on table "public"."hospitals" to "authenticated";

grant trigger on table "public"."hospitals" to "authenticated";

grant truncate on table "public"."hospitals" to "authenticated";

grant update on table "public"."hospitals" to "authenticated";

grant delete on table "public"."hospitals" to "service_role";

grant insert on table "public"."hospitals" to "service_role";

grant references on table "public"."hospitals" to "service_role";

grant select on table "public"."hospitals" to "service_role";

grant trigger on table "public"."hospitals" to "service_role";

grant truncate on table "public"."hospitals" to "service_role";

grant update on table "public"."hospitals" to "service_role";

grant delete on table "public"."labs" to "anon";

grant insert on table "public"."labs" to "anon";

grant references on table "public"."labs" to "anon";

grant select on table "public"."labs" to "anon";

grant trigger on table "public"."labs" to "anon";

grant truncate on table "public"."labs" to "anon";

grant update on table "public"."labs" to "anon";

grant delete on table "public"."labs" to "authenticated";

grant insert on table "public"."labs" to "authenticated";

grant references on table "public"."labs" to "authenticated";

grant select on table "public"."labs" to "authenticated";

grant trigger on table "public"."labs" to "authenticated";

grant truncate on table "public"."labs" to "authenticated";

grant update on table "public"."labs" to "authenticated";

grant delete on table "public"."labs" to "service_role";

grant insert on table "public"."labs" to "service_role";

grant references on table "public"."labs" to "service_role";

grant select on table "public"."labs" to "service_role";

grant trigger on table "public"."labs" to "service_role";

grant truncate on table "public"."labs" to "service_role";

grant update on table "public"."labs" to "service_role";

grant delete on table "public"."service_types" to "anon";

grant insert on table "public"."service_types" to "anon";

grant references on table "public"."service_types" to "anon";

grant select on table "public"."service_types" to "anon";

grant trigger on table "public"."service_types" to "anon";

grant truncate on table "public"."service_types" to "anon";

grant update on table "public"."service_types" to "anon";

grant delete on table "public"."service_types" to "authenticated";

grant insert on table "public"."service_types" to "authenticated";

grant references on table "public"."service_types" to "authenticated";

grant select on table "public"."service_types" to "authenticated";

grant trigger on table "public"."service_types" to "authenticated";

grant truncate on table "public"."service_types" to "authenticated";

grant update on table "public"."service_types" to "authenticated";

grant delete on table "public"."service_types" to "service_role";

grant insert on table "public"."service_types" to "service_role";

grant references on table "public"."service_types" to "service_role";

grant select on table "public"."service_types" to "service_role";

grant trigger on table "public"."service_types" to "service_role";

grant truncate on table "public"."service_types" to "service_role";

grant update on table "public"."service_types" to "service_role";

grant delete on table "public"."status_transitions" to "anon";

grant insert on table "public"."status_transitions" to "anon";

grant references on table "public"."status_transitions" to "anon";

grant select on table "public"."status_transitions" to "anon";

grant trigger on table "public"."status_transitions" to "anon";

grant truncate on table "public"."status_transitions" to "anon";

grant update on table "public"."status_transitions" to "anon";

grant delete on table "public"."status_transitions" to "authenticated";

grant insert on table "public"."status_transitions" to "authenticated";

grant references on table "public"."status_transitions" to "authenticated";

grant select on table "public"."status_transitions" to "authenticated";

grant trigger on table "public"."status_transitions" to "authenticated";

grant truncate on table "public"."status_transitions" to "authenticated";

grant update on table "public"."status_transitions" to "authenticated";

grant delete on table "public"."status_transitions" to "service_role";

grant insert on table "public"."status_transitions" to "service_role";

grant references on table "public"."status_transitions" to "service_role";

grant select on table "public"."status_transitions" to "service_role";

grant trigger on table "public"."status_transitions" to "service_role";

grant truncate on table "public"."status_transitions" to "service_role";

grant update on table "public"."status_transitions" to "service_role";

grant delete on table "public"."ticket_comments" to "anon";

grant insert on table "public"."ticket_comments" to "anon";

grant references on table "public"."ticket_comments" to "anon";

grant select on table "public"."ticket_comments" to "anon";

grant trigger on table "public"."ticket_comments" to "anon";

grant truncate on table "public"."ticket_comments" to "anon";

grant update on table "public"."ticket_comments" to "anon";

grant delete on table "public"."ticket_comments" to "authenticated";

grant insert on table "public"."ticket_comments" to "authenticated";

grant references on table "public"."ticket_comments" to "authenticated";

grant select on table "public"."ticket_comments" to "authenticated";

grant trigger on table "public"."ticket_comments" to "authenticated";

grant truncate on table "public"."ticket_comments" to "authenticated";

grant update on table "public"."ticket_comments" to "authenticated";

grant delete on table "public"."ticket_comments" to "service_role";

grant insert on table "public"."ticket_comments" to "service_role";

grant references on table "public"."ticket_comments" to "service_role";

grant select on table "public"."ticket_comments" to "service_role";

grant trigger on table "public"."ticket_comments" to "service_role";

grant truncate on table "public"."ticket_comments" to "service_role";

grant update on table "public"."ticket_comments" to "service_role";

grant delete on table "public"."ticket_custom_values" to "anon";

grant insert on table "public"."ticket_custom_values" to "anon";

grant references on table "public"."ticket_custom_values" to "anon";

grant select on table "public"."ticket_custom_values" to "anon";

grant trigger on table "public"."ticket_custom_values" to "anon";

grant truncate on table "public"."ticket_custom_values" to "anon";

grant update on table "public"."ticket_custom_values" to "anon";

grant delete on table "public"."ticket_custom_values" to "authenticated";

grant insert on table "public"."ticket_custom_values" to "authenticated";

grant references on table "public"."ticket_custom_values" to "authenticated";

grant select on table "public"."ticket_custom_values" to "authenticated";

grant trigger on table "public"."ticket_custom_values" to "authenticated";

grant truncate on table "public"."ticket_custom_values" to "authenticated";

grant update on table "public"."ticket_custom_values" to "authenticated";

grant delete on table "public"."ticket_custom_values" to "service_role";

grant insert on table "public"."ticket_custom_values" to "service_role";

grant references on table "public"."ticket_custom_values" to "service_role";

grant select on table "public"."ticket_custom_values" to "service_role";

grant trigger on table "public"."ticket_custom_values" to "service_role";

grant truncate on table "public"."ticket_custom_values" to "service_role";

grant update on table "public"."ticket_custom_values" to "service_role";

grant delete on table "public"."tickets" to "anon";

grant insert on table "public"."tickets" to "anon";

grant references on table "public"."tickets" to "anon";

grant select on table "public"."tickets" to "anon";

grant trigger on table "public"."tickets" to "anon";

grant truncate on table "public"."tickets" to "anon";

grant update on table "public"."tickets" to "anon";

grant delete on table "public"."tickets" to "authenticated";

grant insert on table "public"."tickets" to "authenticated";

grant references on table "public"."tickets" to "authenticated";

grant select on table "public"."tickets" to "authenticated";

grant trigger on table "public"."tickets" to "authenticated";

grant truncate on table "public"."tickets" to "authenticated";

grant update on table "public"."tickets" to "authenticated";

grant delete on table "public"."tickets" to "service_role";

grant insert on table "public"."tickets" to "service_role";

grant references on table "public"."tickets" to "service_role";

grant select on table "public"."tickets" to "service_role";

grant trigger on table "public"."tickets" to "service_role";

grant truncate on table "public"."tickets" to "service_role";

grant update on table "public"."tickets" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

grant delete on table "public"."workflow_stages" to "anon";

grant insert on table "public"."workflow_stages" to "anon";

grant references on table "public"."workflow_stages" to "anon";

grant select on table "public"."workflow_stages" to "anon";

grant trigger on table "public"."workflow_stages" to "anon";

grant truncate on table "public"."workflow_stages" to "anon";

grant update on table "public"."workflow_stages" to "anon";

grant delete on table "public"."workflow_stages" to "authenticated";

grant insert on table "public"."workflow_stages" to "authenticated";

grant references on table "public"."workflow_stages" to "authenticated";

grant select on table "public"."workflow_stages" to "authenticated";

grant trigger on table "public"."workflow_stages" to "authenticated";

grant truncate on table "public"."workflow_stages" to "authenticated";

grant update on table "public"."workflow_stages" to "authenticated";

grant delete on table "public"."workflow_stages" to "service_role";

grant insert on table "public"."workflow_stages" to "service_role";

grant references on table "public"."workflow_stages" to "service_role";

grant select on table "public"."workflow_stages" to "service_role";

grant trigger on table "public"."workflow_stages" to "service_role";

grant truncate on table "public"."workflow_stages" to "service_role";

grant update on table "public"."workflow_stages" to "service_role";

CREATE TRIGGER trigger_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_hospitals_updated_at BEFORE UPDATE ON public.hospitals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_service_types_updated_at BEFORE UPDATE ON public.service_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_ticket_comments_updated_at BEFORE UPDATE ON public.ticket_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_ticket_custom_values_updated_at BEFORE UPDATE ON public.ticket_custom_values FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_generate_ticket_uid BEFORE INSERT ON public.tickets FOR EACH ROW WHEN ((new.uid IS NULL)) EXECUTE FUNCTION public.generate_ticket_uid();

CREATE TRIGGER trigger_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


