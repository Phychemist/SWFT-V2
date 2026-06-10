SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict pHRxIpdtRl6a7lgwpRnCWfIda3SoOMbNd3styF9Lh5a4Lefgd9bdpfXGjyeXiUW

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_columns; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: hospitals; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."hospitals" ("id", "name", "address", "city", "is_active", "created_at", "updated_at") VALUES
	('a68f2648-3481-486a-bec4-dc2974fd509f', 'Garbhagudi IVF', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('010984e7-e5fa-4faa-99fd-cdd918d08111', 'Indira IVF, Amritsar', 'Punjab', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('46e0e480-70d4-43d8-9cea-04e28b6ef9ed', 'Dr.  Pai Raiturkar ', 'Pune', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('39aa420b-cca0-4549-b658-efe8e377dfe7', 'Atul Ganatra', 'Mumbai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('ec17ea84-9961-4392-8413-fd19fc2796fe', 'Ovum Dr.  Chaitra  ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('cf88be6e-a595-4bd0-bf71-e74c62671b9d', 'Cloudnine Baner  ', 'Pune', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('a9b25596-28be-431c-88e5-4fd47e8cd12a', 'Sukrutha ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('b964f829-0e49-485a-9f62-a1ef31ead23d', 'Dr.  Meena  Anantpur', 'Anantapur', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('fa41cc00-18d0-4ac2-9996-afa2653e204f', 'Dr. .Soumya Hegde ', 'Hyderabad', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('707052b4-8c46-4919-a0a5-7ec91dfff1b9', 'Cloudnine Old Airport Road -  BLR', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('2184e79f-90b5-4863-b509-9e5f46f4a4b0', 'Dr.  Shyam Indira IVF JP Nagar', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('e7aa5f5f-7739-4e04-b97b-971716a52c0e', 'Dr.  Nidhi Indira IVF Bagalpur ', 'Bagalpur', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('d1bcca59-3351-4c01-a6c0-50e4ef61557d', 'Sudha Hospital', 'Sudha - All', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('db0d5c92-7d76-4ae4-bd32-dd08965dc1f7', 'SBL Logistics', 'SBL logistics - group', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('288af6ac-d05c-4d50-86d6-5779aeb9b951', 'Navjeevan  ', 'Mumbai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('2aa1c067-f37a-4f29-83e3-841f51f353fa', 'Cloudnine Jayanagar', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('78c4ae47-4e9b-4c32-80ab-335b2d79f96f', 'Dr.  Shilpa Ellur ', 'Madhya Pradesh', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('27f895d2-8861-4269-b6d3-e3f626d4abc9', 'Indira IVF Bhopal  ', 'Bhopal', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('9c1b65eb-01a1-4df0-a4ef-6b85f04cf3aa', 'Dr.  Charushila Benecare ', 'Pune', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('fc129f31-31f0-41bf-995a-078ba56f8f7c', 'Renew  ', 'Kolkata', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('bff4cfe8-be3c-4e4e-a255-e21f2dcaf201', 'Indira IVF, Ahmedabad', 'Ahmedabad', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('7a52e135-235c-4e7f-a99f-ba959e1bad66', 'Xenith Fertilty ', 'Pune', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('9dad7d41-5941-4b54-84a6-50f27cf780ae', 'Dr. Vasundara Sri Chakra', 'Chennai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('843d83ea-633c-45e1-bfbe-600a19e02056', 'Khushi Reports', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('5244c8d1-e5ad-45f4-8078-4a77d5da52bd', 'Dr.  Trupti Indira IVF BH HYDBD', 'Hyderabad', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('3523c42d-a0ca-451c-8d3b-204ec9830242', 'GENESIS ', 'Hyderabad', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('b720adac-2c91-4d63-9b94-3d8736be41dd', 'Dr.  Anuradha MMR Hospital ', 'Raipur', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('1971bdcc-0125-42bf-bd33-f16053976786', 'Indira IVF Prayagraj  ', 'Uttar Pradesh', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('c0c40f78-976a-4363-8011-3da77e067c0c', 'Endometrial immunoprofiling Reports', 'Immuno samples report group', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('2cb7e589-d5ef-4282-8a81-7ff7a98b22b6', 'PATTED  ASCOT', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('f5adb9f7-b2b7-45fb-a189-7e944ea3c54f', 'Yaami Fertility', 'Indore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('78d3fe79-4613-4a30-a72c-b069ef94e3cf', 'Ovarian Rejuvenation Pilot Indira IVF Delhi', 'Delhi', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('0093c401-921f-4405-aa11-3d55a4612220', 'UMA HOSPITAL ', 'Tindivanam', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('d1ad022d-b91a-4919-9bc4-1dc822d6bf9e', 'Dr. MEKHALA ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('30baf0bc-c45d-4c79-bb53-217411dc731d', 'Stem cell Dr.  Revathy ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('69a3271a-29fa-4974-bf29-65ee3f41a7ba', 'Dr.  Sandhya Motherhood ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('3795ac69-9109-4b71-b503-8a6a637d6de5', 'Nova ( Dr.  MP)', 'Chennai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('900cb810-a150-41c0-9e37-139963e19f77', 'Dr.  Shashidhar ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('d4bbd3fd-6f00-4a40-9469-00ce4d4efcc3', 'Dr.  Vyshnavi Altor ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('42f281c7-7cc1-4211-91d2-e1ec3ed5a958', 'WINGS  CoE', 'Ahmedabad', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('e8fae2e7-1e10-49d6-a250-f3d02aca3ddf', 'GURUKRUPA KANKAVLI RPL ', 'Mumbai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('4129074d-7465-4a70-a0cb-a42437c7baa4', 'Ishwa IVF ', 'Jaipur ', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('865a1b5c-53a7-44b5-9109-e1569dd25a1e', 'Dr.  Runa Acharya ', 'Hyderabad', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('816f2f10-6d84-4b75-8c17-c8a9f6699280', 'Dr.  TRUPTI KHAROSEKAR  CURRAE  IVF', 'Mumbai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('9eab211c-0de2-497c-b2dd-6941e667e9d4', 'Babyscience ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('fb2a6eaf-569e-4047-809e-937be5d64ee5', 'Dr.  Pramya ', 'Salem', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('43cfa150-c43e-452c-93ca-79d929e6fb11', 'Altius Procedures ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('c6a16999-01ae-4bad-9256-5e79fb905bed', 'Shanthi Gynec', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('9962c5c0-ee1c-43d5-a74e-bac72b9ea588', 'Dr.  Chaitra CANS', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('fdcb58be-f725-4020-b29f-3b3707478762', 'Genea, Endometrial immune profile', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('6af4eb0b-4e5b-4370-86e7-8720316614ca', 'Dr.  Sam Abraham ', 'Kerala', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('99bc5ec9-5212-40cd-8018-6c291a1ee49f', 'World IVF Lajpat Ngr', 'Delhi', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('a041a199-f34d-445a-b64a-5f98b2f1d5e1', 'Indira IVF Bikaner', 'Rajasthan', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('86ba0b75-f911-4fec-9a13-1a96c4a14eef', 'Dr.  Priyanka Arya', 'Noida, Uttar pradesh', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('eef37c5e-aad9-47f5-bd4c-c6e15a9513a2', 'Dr.  Sachin Kulkarni ', 'Kolhapur', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('6fe9a33a-b108-403a-a809-58fc2b1a7c45', 'Dr.  Shashi ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('ed523fa0-4c65-4b66-b379-d74e24837ce6', 'MAA IVF ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('a78dab2c-2793-4c36-945d-dd0a0731e866', 'HIVE FERTILITY ', 'Chennai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('be0d933d-e360-4b41-bd92-f399971a589d', 'Indira IVF Indore  ', 'Indore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('18c02036-7ba5-4db9-9059-475e729a1463', 'Dr.  Vidya Bhat ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('3161c6ae-82cb-4fdb-98ad-e67861f9446f', 'Dr.  Siddhartha ', 'Nellore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('8ea44a0e-8541-4737-8b0d-c71c52402e39', 'Vardhan ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('0e340c44-ae55-4051-b04f-189567b72545', 'Sneh Fertility ', 'Ahmedabad', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('6fa708fd-53e4-4a68-b46d-4441a76f7b3e', 'Indira Dehradun', 'Uttarakhand ', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('53600990-a5d8-463b-8c40-c09710c59f9a', 'Indira IVF, Bellary  ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('371a95eb-6da5-4d8d-be9c-e784368f6617', 'HLA REPORTS @ Dr.  MANJU NAIR', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('c9e7f711-b05a-45b0-98c5-8e1201047b76', 'Cloudnine Noida S51', 'Noida, Uttar pradesh', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('36a59c6c-e264-4ffc-b41b-3cce2230c272', 'Nova CBE Dr.  Meenakshi', 'Coimbatore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('b2881f6b-ffd1-482d-86b2-073f3192a229', 'AKANKSHA REPRODUCTIVE  IMMUNOLOGY', 'Ahmedabad', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('b70fa878-f293-4a9b-95d7-ddfb1a08ef07', 'Dr.  Akanksha ', 'Delhi', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('fcdafc6a-dcc0-439b-93f0-0d72455a40eb', 'Aikya ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('5807a7ba-4f2e-45ce-b3a2-399b95551975', 'Dr.  Aishwarya P ', 'Chennai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('1d56993a-bb4e-4068-9971-6d3399f730b3', 'Dr.  Prathiba Indira Kanpur', 'Kanpur', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('b544579c-ca56-434c-a71b-25afa51d72e7', 'Zahra Mediplus', 'Ahmedabad', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('8e1e3a85-d6b3-4fd8-bf93-7a18be325f5e', 'Sudha Coimbatore  ', 'Coimbatore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('91ba2108-f876-4bb7-9c1b-759c5232eab3', 'Sudha Chennai ', 'Chennai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('43b73b65-984a-40ca-9c91-f4c8085388d1', 'Dr.  Deepa Sai Women''s Clinic ', 'Chennai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('eb2d1b80-c3b3-4843-af5f-8a99564bea56', 'AURA ', 'Chennai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('1c1efa78-e3ba-4924-ac5f-263dcb6a3edf', 'Nova Madurai ', 'Madurai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('f277c63d-e087-4138-9c76-61b4cff1a45f', 'Cloudnine Nagarbhavi  ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('fb0d138a-4b73-49c0-a0f5-4f142938a577', 'Dr.  Kavitha IVF Access', 'Coimbatore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('3de0c385-b1a2-494b-804f-29271bf6aa40', 'Regen Immuno Genetics CoE', 'Uttar Pradesh', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('fb00aece-69fd-447f-b22a-a9d04bbc9534', 'Dr.  Anitha GLB ', 'Chennai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('bfff5783-e70c-4c1f-b2af-c0dae5278baf', 'Dr.  Asha Fortis Wellspring ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('52c9ddf1-1632-45cb-8108-13da792bb7d3', 'Dr.  Bharathi Rajanna ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('933d5b53-47e6-4e52-9081-86f2f6cb4ec6', 'Dr.  Mandavi Rai', 'Noida, Uttar pradesh', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('48ea28b3-03a9-490d-b946-d4b3b75dd461', 'Indira IVF Tanisandra', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('cc5530a6-8ea5-4de7-b27f-cc416ee5db12', 'Nova Varanasi ', 'Uttar Pradesh', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('47e56d38-fafd-44ba-b94f-97135aaf5fb7', 'Dr.  Indu - Samrudh Fertility ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('c88e0240-c30d-4c2c-87eb-24fc09e384b2', 'THE BOON IVF', 'Hyderabad', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('c0d6f64f-0ee0-4f44-88e6-237fa57d2a7b', 'Indira IVF, Gauwhati  ', 'Assam', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('2497137b-1329-4d01-8ac8-38e9dcae7c8d', 'Indira IVF, Jodhpur  ', 'Rajasthan', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('4939d7c1-bafc-4abb-8625-94d3333a7d73', 'Dr.  Nihar @ Crescenta ', 'Odisha', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('128e3d3f-bced-4aee-8d13-c0bf0ba954fb', 'SURYA HOSPITAL  - Dr.  SHILPA SAPLE ', 'Mumbai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('4a7f3c27-88f0-4bad-8850-4bff9ee14f5d', 'Phoenix, Delhi', 'Delhi', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('c2a27890-f59a-4a9b-8d3a-554f5dd0dd8b', 'Dr.  Archana ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('003f2808-c18b-40b5-a00b-e58e2d239372', 'Altius HRBR Layout ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('41228147-89a1-4457-9ba9-2886d77cdbec', 'Dr.  Amuthambigai ', 'Tindivanam', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('62f2abfc-585c-49cd-b714-3acb3d0b92a1', 'Dr.  Niveditha Cloudnine ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('37aafe97-fc37-46fc-a386-9b365242ec23', 'Dr.  Arunima Haldar', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('a7c0451a-87c9-4328-834d-3b3865ee4e83', 'ARC ERODE ', 'Erode', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('b7342d15-f590-4e89-a692-8b0f06fd303b', 'Dr.  Sagar  ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('c21d2ba3-ebfd-47f9-a98c-f4755d022412', 'Dr.  Archana ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('bc3c1082-21ba-40dc-b01a-7730d8b5db1b', 'Cambridge Hospital Bangalore ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('1c73907a-e37d-460c-8043-85ff6f7b2a3a', 'Dr.  Sujata Rajput  ', 'Pune', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('18f79171-bf33-4a2b-ace2-dfe6f05822b2', 'Nova Tambaram Reports', 'Chennai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('f4bb6be5-27b5-41a2-ac95-1c77b52a2142', 'Dr.  Shivani Candorivf', 'Surat', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('598274b5-30c7-4d76-add1-82caecbf6b85', 'Nova Prayagraj  ', 'Uttar Pradesh', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('5265fe79-1e2a-47ff-a8c9-b802842a6c84', 'Dr.  Ashwini Bangalore', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('f2b24935-fc97-44ca-b2dc-fa384bd3f228', 'Dr.  Anjani ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('ca960c6d-ec91-4d53-b327-e15d6cac8eaa', 'Usha Nursing Home  ', 'Gujarat', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('54d178de-68d5-4766-8af1-6573fa9a72ed', 'Nova Kolkata ', 'Kolkata', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('c7488d4c-c8d0-478b-889c-333cfdf4c927', 'Nova Gorakhpur ', 'Gorakhpur', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('4575731a-1e25-49ee-b6d7-c6082f66f721', 'Mom & Miracle', 'Pune', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('3167703d-79f3-474d-aa07-e94622cfd403', 'Cloudnine Gurgaon - Dr.  Priyanka', 'Gurgaon', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('62c7a2bb-feaf-446a-8b23-490df0f8a35d', 'Shreeji Hospital ', 'Gujarat', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('c7cba011-85a2-4045-852f-2687bb0573eb', 'Indira IVF Patna', 'Patna', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('b0a62912-9345-4f6c-832a-bedd2c9ff485', 'Bliss IVF, Surat', 'Surat', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('602b21c1-e006-4bfc-aeeb-6dad3f0cbc85', 'Dr.  Varun Shah  ', 'Mumbai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('fd64eb71-0749-42e1-8ca5-743910cd89b3', 'Dr.  Pavithra Nova Hubli ', 'Hubli', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('81ae6c6b-af5d-4bdc-9b13-6df078165f5a', 'Dr. Vaishali - Sahyadri Hospital', 'Pune', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('6d0ff55e-29ce-455a-8507-2107dfa992af', 'Dr.  Sangeetha Nagpur ', 'Maharashtra', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('8f84acab-9800-428a-9be0-27acdbfb53b2', 'Dr.  Lavanya ', 'Tirupati', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('4dcee2e5-3489-4c1a-bfe1-c0ca44b25889', 'Dr.  Nirmala  ', 'Hyderabad', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('5ec2f1c7-8e10-4da9-9fab-7275f5fb4d10', 'Sree Renga Hospital ,Chengalpattu', 'Chengalpet', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('27936953-426f-4d30-b2ec-87c6bfd46f04', 'Dr.  Bharathi Indira IVF ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('79567f01-afa8-48db-9c06-cc3fd3aabf69', 'Dr.  Avanti  ', 'Coimbatore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('63496aff-dd95-4690-a95b-2a35f579a84b', 'Dr.  Anagha ', 'Pune', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('22f96b98-329f-4680-aef9-6179c9661164', 'Dr.  Arthi Cloudnine Pune', 'Pune', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('19fbc639-bf1f-4fa1-a60b-a53ca62aec66', 'Dr.  Phani Madhuri ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('bc3ba274-e4cb-44ca-a723-b2bfee014ed3', 'Indira IVF Jaipur', 'Indira - POR group', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('42c5e41d-6ca7-4a06-81ea-57fccad749a8', 'Nova Erode ', 'Erode', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('8b5e526b-ec4e-4212-be52-0e74bf71b687', 'Cloudnine Pune', 'Pune', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('ea82d415-4f92-4d05-83e6-08b2063f53f9', 'Dr.  Jayashree Mysore ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('fc3504e0-728e-4085-8924-1a27d9423d45', 'Dr.  Dhanashri Natu  (Corion )', 'Mumbai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('2d544cf8-e675-46c1-bbdd-e356a868a6b5', 'Dr.  Karthikeyan', 'Chennai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('16e9951b-d1f4-4437-80ce-d6cb4757f8e8', 'Noble Hospital ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('fd469890-1bf5-421e-bec3-86ae7e5bd96b', 'Vishvas Fertility ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('b79a5df2-7121-4b01-ab9c-fa026630cd71', 'Nova Nagpur ', 'Maharashtra', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('ab8ccb0a-994e-4165-8e42-81c32d1e75f1', 'Femcare Fertilty ', 'Pune', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('e234e6f7-9c07-4c4a-ae96-f2b2e1a3d4eb', 'Apollo CM Fertility ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('2312c085-80ac-4de3-a9d0-2eb6c16d8681', 'Eraya Fertility ', 'Hyderabad', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('a2aa4437-4d54-4a27-8b27-2dbc0a207cba', 'Nova CBE Dr.VL ', 'Coimbatore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('661d751c-41c3-447f-93db-c6f523144b0b', 'Dr.  Shilpa Gupta Kinder ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('6f4beb69-abea-4245-a571-b6e0d9337eac', 'Mayflower  Hospital', 'Ahmedabad', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('ce79a4e9-f9fb-43a5-92c8-ba8e59e4d6a7', 'Dr.  Asmita Pune ', 'Pune', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('547d63a9-0a08-4136-9ac8-ba2767b16a31', 'Dr.  Priyanka Pune', 'Pune', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('845a2678-b0a6-45cd-84dc-390ecacb81af', 'Dr.  Akanksha - Indira IVF Kolkata ', 'Kolkata', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('13f19c85-d5b0-40a8-8a05-bb596cd6e2a9', 'Dr.  Shailaja ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('121123ae-2e4a-435e-9c37-f35009cf8d97', 'Dr.  Kirti Naroda ', 'Ahmedabad', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('28501ca5-e5ac-4d04-b8de-14fc9589fd21', 'Dr.  Akanksha ', 'Noida, Uttar pradesh', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('cca67629-9266-4eca-b37c-96895c07bc2e', 'Dr.  Puneet Arora GGN', 'Haryana', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('35979325-6af6-4573-bbdd-ee4117fd9976', 'JANANI IVF TUMKUR', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('4f278cc6-45d5-48c7-aea2-c9a12eb3a9e3', 'Parency IVF ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('37566800-61e3-4954-9b79-1fec2ba97d7d', 'Indira Varanasi ', 'Uttar Pradesh', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('3e6d4007-c366-43eb-afcd-1c031a8bf4e0', 'Dr.  Apurva Nova Kalyan Nagar', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('be046ba9-6d84-4fe9-8fee-295de5aa479a', 'Srushti Fertility', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('583cc1fd-971f-454b-b3b2-31ff216ae095', 'Ananta Fertility  ', 'Chennai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('e80a0130-7421-45ed-9951-7c64cdd44866', 'Kushi Rangadore ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('b168ed89-2eac-46d0-bded-0bb69bd0f86f', 'Dr.  Chaitanya Birla Fertility ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('73f5dba5-757c-4459-a299-eb354e039125', 'Wings Collaboration', 'Ahmedabad', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('5fba9dae-970e-4977-b13e-e61607768562', 'Dr.  Divya Cloudnine ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('b164c4f1-b3ba-43ef-8619-3bdf248318f8', 'Dr.  Ramya - Cloudnine Thanisandra', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('63a80566-3e0c-4467-90a0-d8a96b9ee46f', 'Dr.  Priti Delhi', 'Delhi', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('064c170d-187e-4050-8e98-fcafa3c25c0d', 'Cloudnine Pimple Saudagar  ', 'Pune', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('1d51e120-6a49-4f78-88f9-36b01085b9d9', 'Dr.  Mangalesh ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('5d7e8378-7432-4ced-8a2a-597b88ac8977', 'Cosmetology Bangalore', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('e3eeef85-1071-4952-8ae0-75883b665bec', 'Hairline', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('de0cf57e-53a1-4b56-a06c-e2638771ea02', 'Dr.  Vanusha ', 'Chennai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('4e0e9484-9ec2-47c5-a04e-bdf89b382089', 'Dr.  shrutika thakkar', 'Mumbai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('dfaf9af4-36de-46ff-ba2c-717a77564640', 'Peacock Fertility ', 'Chennai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('1faee8aa-f895-41fb-a57b-ea590a42e284', 'Dr.  Silambuselvi - Vamsam ', 'Coimbatore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('f66f3b79-cc55-4088-a2d3-c7c7af430772', 'Nova Bareilly ', 'Uttar Pradesh', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('993b69ec-8b45-45e0-8cb5-b9ddc5ccc394', 'A4 Fertility', 'Chennai', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('8af30b47-f868-427a-80af-52488b394921', 'Jeeva Fertility - Dr.  Nishitha Dharwad ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('3a5b6be7-9f93-46da-b2e4-8eac3ff63e62', 'VRIKSH ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('26c22346-6f95-417a-add4-38add73e2b1d', 'Dr.  Prathibha ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00'),
	('60b87c91-fd7f-4bbd-a3eb-2c7cdc01a350', 'ARC FERTILITY BLR  ', 'Bangalore', NULL, true, '2026-01-23 10:40:46.538092+00', '2026-01-23 10:40:46.538092+00');


--
-- Data for Name: doctors; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."doctors" ("id", "name", "phone", "hospital_id", "is_active", "created_at", "updated_at") VALUES
	('ac8ab407-08fc-453d-bb95-a8631bcfc2a5', 'mr doctor', '97646 23344', NULL, true, '2026-01-20 08:25:49.410042+00', '2026-01-20 16:23:32.548749+00');


--
-- Data for Name: field_visibility; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."field_visibility" ("field_id", "is_visible", "updated_at") VALUES
	('assigned_to', false, '2026-01-20 08:30:20.217+00');


--
-- Data for Name: labs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."labs" ("id", "name", "is_active", "created_at", "address", "city") VALUES
	('33f4110a-b8fd-41c5-a0b2-11958323d47e', 'Apollo', true, '2026-01-20 08:59:28.043977+00', '', 'Hyderabad');


--
-- Data for Name: service_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."service_types" ("id", "category", "name", "kit", "requirements", "protocol", "is_active", "sort_order", "created_at", "updated_at", "patient_type") VALUES
	('02a3d564-5f0c-41dc-aa2c-5ed50ded4929', 'diagnostics', 'HLA', '2 test tubes, 3ml each for both the patints', 'this is a test requirements', 'this are the test protocols that needs to be followed', true, 1, '2026-01-20 08:23:12.924214+00', '2026-01-20 08:23:12.924214+00', 'couple'),
	('c6d36ea3-b538-412c-95ad-62a002610ad0', 'therapeutics', 'Test therapeutic', 'xyz', 'abc', 'efg', true, 1, '2026-01-20 08:24:05.409323+00', '2026-01-20 08:24:05.409323+00', 'couple'),
	('6c83c697-9596-4aca-aa75-011b89e4788d', 'diagnostics', 'test', 'kit to carry ', 'requirements', 'protocol', true, 2, '2026-01-23 11:04:12.569975+00', '2026-01-23 11:04:12.569975+00', 'male_only');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."users" ("id", "username", "password_hash", "full_name", "role", "is_active", "created_at", "updated_at") VALUES
	('911cc360-556e-4c75-8898-46c5d52c7714', 'admin', '$2b$12$Ut9TWQzTcMsCplE032Xw1OFJBEMcxhA2LS5w0oRJcAU9Hhk07MoGa', 'System Administrator', 'admin', true, '2026-01-13 17:40:20.415342+00', '2026-01-13 17:44:08.600614+00'),
	('f0871447-a937-48e2-8c29-53ac8038435d', 'customer-success', '$2b$12$2S.MW9keTiT4IAI4x30CEeD3KFXvnh1u1LZEW8UJqTcSWP6t/r/4e', 'customer-success', 'customer_success', true, '2026-01-20 08:17:58.900951+00', '2026-01-20 08:17:58.900951+00'),
	('cd9bb8df-bdf2-4904-91c0-2a9650b86984', 'manager', '$2b$12$HEjifGSSOhOZrt6yyDdJu.T299S7Hc1bh85mKICpacNMJPQte9yqC', 'manager', 'manager', true, '2026-01-20 08:18:19.733408+00', '2026-01-20 08:18:19.733408+00'),
	('14613ce2-2c6e-4668-b9ee-e169c66efb5e', 'officer', '$2b$12$NQCSaSP1IyYiVjidU8VtLOmwLtKyDpdUfvAQcbVAE3t2kCW3CZUDu', 'XYZ officer', 'officer_backoffice', true, '2026-01-20 08:19:07.751466+00', '2026-01-20 08:19:07.751466+00'),
	('19830a50-e414-45ea-bf70-afa4ed1ea247', 'scientist', '$2b$12$PVx7L3oRRHh5qwf98kGg4OGN/3gdmtmavpf6NKv/JFVVYpS/wzcwW', 'XYZ - scientist', 'scientist', true, '2026-01-20 08:19:35.339397+00', '2026-01-20 08:19:35.339397+00'),
	('d8026c45-55ca-444d-88c8-3a4c1c728e09', '9924980141', '$2b$12$y7OfHJU2wId0nLtId6pnG..6MroneUg5QZSLhnmg29oSOJiEf5Q8y', 'Irfan', 'field_executive', true, '2026-01-20 17:53:21.417634+00', '2026-01-20 17:53:21.417634+00'),
	('9d17be66-8ab6-40d0-bd67-788d047f8140', '9723649936', '$2b$12$BA1F7dGwXVhMsH6CVNlQV.U3qkJw/ak12yf0GtNnONhbTaYxjzKlO', 'Chirag', 'field_executive', true, '2026-01-20 17:53:21.944666+00', '2026-01-20 17:53:21.944666+00'),
	('9102e844-6f80-4813-b450-46f65372ec17', '8197492126', '$2b$12$df567Zp3KOtys1y.dfxRyuaVWVEWCXMYAiLTAOijoiyJLvuq02lYa', 'Manu', 'field_executive', true, '2026-01-20 17:53:22.40856+00', '2026-01-20 17:53:22.40856+00'),
	('89dcf27e-9bb5-46b0-80be-f03aacd9547e', '8971211450', '$2b$12$2rZlbV08K0UWhUENKDIOI.M/LsE/RWwpvlvMirmCQzUK.CBb9.ybm', 'Sharath ', 'field_executive', true, '2026-01-20 17:53:22.86564+00', '2026-01-20 17:53:22.86564+00'),
	('79381d1a-526d-4283-b0db-800234fe42bd', '6383871535', '$2b$12$2UteCvwDzwd0fVqFbidd3OJeAYII/cVYRMt2KMbewWLPPEn8u3gO.', 'Akathish', 'field_executive', true, '2026-01-20 17:53:23.342412+00', '2026-01-20 17:53:23.342412+00'),
	('2d7448c2-4c76-47c9-add7-8b4b7bc7ae7c', '9113976490', '$2b$12$lk5jalA2Ic7PeaA7moTbI.eMsUOLRzlrrooVZzE34EjX0CVMwkEh.', 'Prem', 'field_executive', true, '2026-01-20 17:53:23.835765+00', '2026-01-20 17:53:23.835765+00'),
	('ffe5dba6-ca57-4f1d-b27b-7d0a5df3193d', '7299592253', '$2b$12$16G2F22mMuXhi6mnZIANEuzEJkeW5PRH9nVt.JqFJDxl7DEGXYhhe', 'Lokesh', 'field_executive', true, '2026-01-20 17:53:24.314792+00', '2026-01-20 17:53:24.314792+00'),
	('2a20ad97-18f8-4299-a2fb-b2dd380583e4', '9159580455', '$2b$12$0e1vR4C9Tq6uihEfJlnO3OwPaJ3/Rmgcgij9aXfDCKJvoJZPAVDLi', 'Sugumar', 'field_executive', true, '2026-01-20 17:53:25.155419+00', '2026-01-20 17:53:25.155419+00'),
	('fe7d0ac1-7c54-4e12-927b-ea27afaf7212', '7904119530', '$2b$12$GEzUXYVG5JHLBUEZ9aTzi.Ep.VLgcYrXlyehF5oUSZUAuI6gVjcoi', 'Rameshkannan', 'field_executive', true, '2026-01-20 17:53:25.609133+00', '2026-01-20 17:53:25.609133+00'),
	('a2341865-1eae-43ae-ac44-e9303e85c04f', '9539577480', '$2b$12$p8GGny7gVwUJVHNdDLf4des9hU2Z8wB/5g.qTtmMkqV5FXPdnM87S', 'Alwin', 'field_executive', true, '2026-01-20 17:53:26.064852+00', '2026-01-20 17:53:26.064852+00'),
	('b2e69b82-4932-4ce7-a2f1-2c304d411f6b', '8606524141', '$2b$12$yX/F.UduDzR5qhBgrP/yJOA6fLBMx5.cMrUBdqejdG4v07E7MKhz.', 'Akhil', 'field_executive', true, '2026-01-20 17:53:26.548533+00', '2026-01-20 17:53:26.548533+00'),
	('1b4f02cf-ed97-4ff5-a622-5e883f2b5c4f', '9344576132', '$2b$12$fOYFwizDgEwtn.Qy6Rm8t.rJCRxgBi8eJfLDC6CSkrRaZQDbE1wY6', 'Vignesh Muthuraj', 'field_executive', true, '2026-01-20 17:53:27.006243+00', '2026-01-20 17:53:27.006243+00'),
	('df058963-a033-4893-931d-befde189e8d2', '9650783921', '$2b$12$4lyKJwfl3v8hXbkVOSwy.eGbtbuQ4DZBp1./bt41Ob9kBSfiHjpOO', 'Sanjay', 'field_executive', true, '2026-01-20 17:53:27.565186+00', '2026-01-20 17:53:27.565186+00'),
	('8aa07367-c987-4619-915c-c9999e45b2c4', '8722051202', '$2b$12$KJZ7D4Azyl5pt0LkWofD/ecCXb.46uoMUJgiC8bCyLOTjAZhfLJBq', 'Arun', 'field_executive', true, '2026-01-20 17:53:28.775981+00', '2026-01-20 17:53:28.775981+00'),
	('9fb1222a-00a1-481b-9558-d9ee1e2d0fa7', '9346777887', '$2b$12$H7yw2TM0NEUzzCneJozQ1O8kug1ikwrXZyJR7tRjJ3OGogt3T2qCW', 'Nagaraju', 'field_executive', true, '2026-01-20 17:53:29.245629+00', '2026-01-20 17:53:29.245629+00'),
	('a35440bd-a529-42ae-ac83-99e6df00bfa6', '9059906560', '$2b$12$s0gXbcNgN84b4I47owXz/.zeYFk20AoU76VWymUOJscFutCCSqgnm', 'Harishkumar', 'field_executive', true, '2026-01-20 17:53:29.722109+00', '2026-01-20 17:53:29.722109+00'),
	('d2896476-548e-4fb6-9278-91b82809e114', '6290193641', '$2b$12$C6eqxGO9ZesPXTyiSEHpUeednB044xiFblouYQxIxUtMEtoxITh46', 'Soumyobasu', 'field_executive', true, '2026-01-20 17:53:30.171361+00', '2026-01-20 17:53:30.171361+00'),
	('038a9797-aaa0-4886-922a-340bc4088f6a', '8825707007', '$2b$12$XU7BERDcwl.UlwuXoxfi3uFQ3C4rDI1mHj6waOqdKHc2llLLk4bRq', 'AjithKumar', 'field_executive', true, '2026-01-20 17:53:30.684663+00', '2026-01-20 17:53:30.684663+00'),
	('9009830f-e7c7-4d40-9dd0-e060dc824989', '7900052177', '$2b$12$f5SEJ43nFX//X2RTw8StsezuJZznvbELM4HPWEH9sNiM9lvEm.Kum', 'Shubham ', 'field_executive', true, '2026-01-20 17:53:31.146299+00', '2026-01-20 17:53:31.146299+00'),
	('013e2f6e-2acc-40d4-8579-e1e67c538b8a', '9167308558', '$2b$12$.dcUjxub.uYCD5EqBga3De20WMFqfoDtAnJY9pJBXkRsRrPDZaxbu', 'Pawan Kumar', 'field_executive', true, '2026-01-20 17:53:31.620076+00', '2026-01-20 17:53:31.620076+00'),
	('0fb9682a-2047-4fb0-b733-d5840447277e', '9833087105', '$2b$12$AXWuti.dqDeywfknZB1joeUM0EoipjK.NqIhyg/nOorCytLa8ZieO', 'Hariom', 'field_executive', true, '2026-01-20 17:53:32.058961+00', '2026-01-20 17:53:32.058961+00'),
	('bf4a33be-28e5-4749-b4c8-f39babdacb68', '8081552527', '$2b$12$FibJ2ZodMoYYikbHORcMeONZn.LTGfwsPLPSlIq4Gf3Zze0Nd8B3a', 'Suryabhan ', 'field_executive', true, '2026-01-20 17:53:32.533602+00', '2026-01-20 17:53:32.533602+00'),
	('27f1b512-d8df-4e7c-900c-ee5c1ed86f39', '7350157386', '$2b$12$c8F76ftwxTZ3sWNnFrX2wedwrNLMWGZcac..pPOKMg.Y9RBHcIK6i', 'Shivam', 'field_executive', true, '2026-01-20 17:53:32.981709+00', '2026-01-20 17:53:32.981709+00'),
	('064c61ac-52e7-493a-b74c-3cf4ccf6cc39', '9750351577', '$2b$12$78l/SPaYYp48xIH0ilaCBOXZOCcODUt2HgWWUT6sxnDgYmQZXhTCa', 'Mathiyarasu', 'field_executive', true, '2026-01-20 17:53:33.43233+00', '2026-01-20 17:53:33.43233+00'),
	('31a3670d-63a6-4da5-868d-0b289dcd0ae1', '9620032008', '$2b$12$fvbPinvUcFw5BUw78nycjeS0SWj/AApDFHkKFCAl6lYNreL4i2uU2', 'Sudhakar', 'field_executive', true, '2026-01-20 17:53:33.863816+00', '2026-01-20 17:53:33.863816+00'),
	('4a0e0df8-3269-47fc-9a19-54ec12bcfd32', '8423350713', '$2b$12$cUGHcNEARI3GwQYTWOKxT.xUHbgRj50/uJmq944FqVwp0eIcBsfrC', 'Mohammad Sohel', 'field_executive', true, '2026-01-20 17:53:34.302299+00', '2026-01-20 17:53:34.302299+00'),
	('be789fa4-b16e-4311-b453-ee882af76a86', '9056177720', '$2b$12$6D4hR06IShJk9gFFGn/v9eLvSkEMf2X0gTzVNp4DsKHRUCLPW3BSW', 'Jitender', 'field_executive', true, '2026-01-20 17:53:34.747536+00', '2026-01-20 17:53:34.747536+00'),
	('7697f26a-1996-4416-a082-3881590f0c07', '9065910948', '$2b$12$nhakMkF8TdUQS.y2qBRV7OLPCLy3Gr2fjywURWZ3GLZ/izFkkU/im', 'Faizal', 'field_executive', true, '2026-01-20 17:53:35.199346+00', '2026-01-20 17:53:35.199346+00'),
	('2fa25393-4d5b-429a-b14f-2471434d6e35', 'field-officer', '$2b$12$00tGyMJQ.tocMlmpLBBRRO78IYYf88eDpeRmnLq9QZ7noZEsS9wey', 'field officer', 'field_executive', true, '2026-01-20 08:17:30.452914+00', '2026-01-23 09:50:17.301573+00');


--
-- Data for Name: workflow_stages; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."workflow_stages" ("id", "name", "color", "sort_order", "is_active", "created_at", "requires_modal", "modal_fields") VALUES
	('b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', 'Sample Collected', '#8b5cf6', 2, true, '2026-01-14 11:15:59.607118+00', true, '[{"id": "date", "type": "date", "label": "Collection Date", "required": true}, {"id": "time", "type": "time", "label": "Collection Time", "required": true}]'),
	('2adf08ba-59b5-4831-bb1a-b5fc7465e252', 'New', '#6b7280', 0, true, '2026-01-14 11:15:59.607118+00', false, '[]'),
	('037774a3-d741-4318-85a1-de41d8e6f6ba', 'Sample Received', '#3b82f6', 3, true, '2026-01-14 11:15:59.607118+00', true, '[{"id": "date", "type": "date", "label": "Received Date", "required": true}, {"id": "time", "type": "time", "label": "Received Time", "required": true}]'),
	('3602def8-56ed-485f-af43-2e16ce6ee0bd', 'Report Received', '#10b981', 5, true, '2026-01-14 11:15:59.607118+00', true, '[{"id": "date", "type": "date", "label": "Report Date", "required": true}, {"id": "time", "type": "time", "label": "Report Time", "required": true}]'),
	('b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', 'Assigned', '#ec4899', 1, true, '2026-01-14 11:15:59.607118+00', true, '[{"id": "assigned_to", "type": "system_dropdown", "label": "Field Executive", "source": "users", "required": true}]'),
	('1033c12c-e79c-4d0a-9ac8-a498471f007a', 'Sample Sent to', '#f59e0b', 4, true, '2026-01-14 11:15:59.607118+00', true, '[{"id": "lab_id", "type": "system_dropdown", "label": "Diagnostics Center", "source": "labs", "required": true}]'),
	('45280980-4665-41d3-9956-d05e31b7f370', 'Final Report Generated', '#8b5cf6', 6, true, '2026-01-20 04:32:55.434118+00', true, '[]'),
	('49c44032-aa3b-4fe4-90b5-1c4a451396b4', 'Submitted and Closed', '#3b82f6', 9, true, '2026-01-20 05:13:29.496094+00', false, '[]'),
	('0130eea2-35d8-47ca-9eff-3a69e35b4bbe', 'cancelleed', '#ef4444', 10, true, '2026-01-23 11:20:28.992363+00', false, '[]');


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."tickets" ("id", "uid", "type", "original_message", "doctor_id", "hospital_id", "assigned_to", "current_stage_id", "collection_location", "collection_address", "created_by", "created_at", "updated_at", "action_subtype", "patient_name", "service_type_id", "patient_name_2", "patient_age_1", "patient_age_2", "status_new_at", "status_sample_collected_at", "status_sample_received_at", "status_sample_sent_at", "sent_to_lab_id", "status_report_received_at", "status_report_submitted_at", "status_analyzed_at", "screenshot_url", "trf_image_url", "raw_report_url", "final_report_url", "status_final_report_generated_at", "scheduled_date", "scheduled_time", "collection_date", "collection_time", "trf_image_urls", "sample_image_url", "courier_image_url", "tagged_sample_image_url", "backoffice_courier_image_url", "query_category", "label_code", "is_cancelled", "cancelled_at", "cancelled_by", "cancellation_reason") VALUES
	('4015fa40-722f-4923-81af-188828de3def', 'TKT-20260120-0005', 'action', NULL, NULL, NULL, '7697f26a-1996-4416-a082-3881590f0c07', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', NULL, NULL, 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-20 15:19:57.053494+00', '2026-01-23 10:35:29.591502+00', 'diagnostics', 'Husband 1', '02a3d564-5f0c-41dc-aa2c-5ed50ded4929', 'Wife 1', 43, 38, '2026-01-20 15:19:57.053494+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1768922394972.webp', NULL, NULL, NULL, NULL, '2026-01-22', '20:48:00', NULL, NULL, '{}', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL),
	('51e4c563-8903-485f-9e42-a46272508eb7', 'TKT-20260120-0001', 'action', NULL, 'ac8ab407-08fc-453d-bb95-a8631bcfc2a5', NULL, '2fa25393-4d5b-429a-b14f-2471434d6e35', '49c44032-aa3b-4fe4-90b5-1c4a451396b4', NULL, NULL, 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-20 08:28:10.154794+00', '2026-01-23 10:39:44.487148+00', 'diagnostics', 'Husband 1', '02a3d564-5f0c-41dc-aa2c-5ed50ded4929', 'wife 1', 32, 24, '2026-01-20 08:28:10.154794+00', '2026-01-20 08:32:57.687+00', '2026-01-20 08:49:21.289+00', '2026-01-20 08:59:57.324+00', '33f4110a-b8fd-41c5-a0b2-11958323d47e', '2026-01-20 09:00:24.98+00', NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1768897689924.webp', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_51e4c563-8903-485f-9e42-a46272508eb7_1768899019832.pdf', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_51e4c563-8903-485f-9e42-a46272508eb7_1768899803489.pdf', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/final-reports/final_report_51e4c563-8903-485f-9e42-a46272508eb7_1768900008001.pdf', '2026-01-20 09:06:49.519+00', NULL, NULL, NULL, NULL, '{https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_51e4c563-8903-485f-9e42-a46272508eb7_1768899019832.pdf}', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL),
	('fe5b5e1c-a133-43a4-9c0e-4edc526465c3', 'TKT-20260120-0008', 'action', NULL, NULL, NULL, '2fa25393-4d5b-429a-b14f-2471434d6e35', '45280980-4665-41d3-9956-d05e31b7f370', NULL, NULL, 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-20 17:01:10.864421+00', '2026-01-23 10:39:44.487148+00', 'diagnostics', 'gfghg', '02a3d564-5f0c-41dc-aa2c-5ed50ded4929', 'gfhg', 29, 20, '2026-01-20 17:01:10.864421+00', '2026-01-20 18:05:45.693+00', '2026-01-20 18:06:37.439+00', '2026-01-20 18:07:45.643+00', '33f4110a-b8fd-41c5-a0b2-11958323d47e', '2026-01-20 18:07:57.731+00', NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1768928470758.webp', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_fe5b5e1c-a133-43a4-9c0e-4edc526465c3_1768932455643.pdf', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_fe5b5e1c-a133-43a4-9c0e-4edc526465c3_1768932476503.pdf', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/final-reports/final_report_fe5b5e1c-a133-43a4-9c0e-4edc526465c3_1768932783773.pdf', '2026-01-20 18:12:05.247+00', '2026-01-21', '22:33:00', NULL, NULL, '{https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_fe5b5e1c-a133-43a4-9c0e-4edc526465c3_1768932455643.pdf}', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL),
	('47125b1a-613f-49c3-a487-ab531ddb3c6e', 'TKT-20260122-0003', 'info', NULL, NULL, NULL, NULL, '0130eea2-35d8-47ca-9eff-3a69e35b4bbe', NULL, NULL, 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-22 12:34:24.358762+00', '2026-01-23 11:20:45.471568+00', NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-22 12:34:24.358762+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1769085264628.webp', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL),
	('323d29e8-de6e-4b65-95f6-3d2f8eb23aa0', 'TKT-20260123-0003', 'action', NULL, NULL, 'eb2d1b80-c3b3-4843-af5f-8a99564bea56', '7697f26a-1996-4416-a082-3881590f0c07', '49c44032-aa3b-4fe4-90b5-1c4a451396b4', 'home', 'sdddhgfh', 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-23 11:10:22.203492+00', '2026-01-23 11:36:41.482808+00', 'diagnostics', 'test 11', '02a3d564-5f0c-41dc-aa2c-5ed50ded4929', 'test 11', 32, 31, '2026-01-23 11:10:22.203492+00', '2026-01-23 11:25:42.609+00', '2026-01-23 11:28:49.742+00', '2026-01-23 11:32:06.892+00', '33f4110a-b8fd-41c5-a0b2-11958323d47e', '2026-01-23 11:33:56.086+00', NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1769166621696.webp', NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_323d29e8-de6e-4b65-95f6-3d2f8eb23aa0_1769168034466.pdf', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/final-reports/final_report_323d29e8-de6e-4b65-95f6-3d2f8eb23aa0_1769168159665.pdf', '2026-01-23 11:35:00.45+00', '2026-01-25', '16:42:00', NULL, NULL, '{https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_323d29e8-de6e-4b65-95f6-3d2f8eb23aa0_1769167488073.jpg}', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/sample_323d29e8-de6e-4b65-95f6-3d2f8eb23aa0_1769167519348.jpg', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_323d29e8-de6e-4b65-95f6-3d2f8eb23aa0_1769167530857.jpg', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/tagged_sample_323d29e8-de6e-4b65-95f6-3d2f8eb23aa0_1769167984067.jpg', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_details_323d29e8-de6e-4b65-95f6-3d2f8eb23aa0_1769167985552.jpg', NULL, NULL, false, NULL, NULL, NULL),
	('70438d3b-7b4c-4d7b-963b-535ec37ed8bc', 'TKT-20260120-0006', 'action', NULL, NULL, NULL, '2fa25393-4d5b-429a-b14f-2471434d6e35', '1033c12c-e79c-4d0a-9ac8-a498471f007a', NULL, NULL, 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-20 15:45:55.86332+00', '2026-01-23 12:58:35.918381+00', 'diagnostics', 'jhfg', '02a3d564-5f0c-41dc-aa2c-5ed50ded4929', 'jhg', 76, 59, '2026-01-20 15:45:55.86332+00', '2026-01-23 12:44:57.883+00', '2026-01-23 12:45:57.019+00', '2026-01-23 12:58:36.924+00', '33f4110a-b8fd-41c5-a0b2-11958323d47e', '2026-01-23 12:44:09.495+00', NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1768923955124.webp', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1768936965803.jpg', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1769172248040.pdf', NULL, NULL, '2026-01-22', '23:17:00', NULL, NULL, '{https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1768936965803.jpg,https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1768936972628.jpg,https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1768936979077.jpg}', NULL, NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_details_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1769173115564.jpg', NULL, 'TEST123', false, NULL, NULL, NULL),
	('a717d9fc-a995-4059-bf24-9f8b92778e26', 'TKT-20260122-0001', 'query', 'this is the query tht the kjhsjkdfs', NULL, NULL, '7697f26a-1996-4416-a082-3881590f0c07', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', NULL, NULL, 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-22 12:11:35.652067+00', '2026-01-23 10:39:44.487148+00', NULL, 'gh', NULL, NULL, NULL, NULL, '2026-01-22 12:11:35.652067+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1769083896087.webp', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, NULL, NULL, 'scientific', NULL, false, NULL, NULL, NULL),
	('78a98dc5-e751-4e87-8f5f-a565a734d920', 'TKT-20260120-0007', 'action', NULL, NULL, NULL, '7697f26a-1996-4416-a082-3881590f0c07', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', 'home', 'this is my home
', 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-20 16:02:00.737796+00', '2026-01-23 10:40:21.040649+00', 'diagnostics', 'dffgfgx', '02a3d564-5f0c-41dc-aa2c-5ed50ded4929', 'cv', NULL, NULL, '2026-01-20 16:02:00.737796+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1768924921205.webp', NULL, NULL, NULL, NULL, '2026-01-21', '21:35:00', '2026-01-21', '21:35:00', '{}', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL),
	('88d0fab7-5060-445c-bd4f-97b66426e088', 'TKT-20260120-0002', 'action', NULL, 'ac8ab407-08fc-453d-bb95-a8631bcfc2a5', NULL, '2fa25393-4d5b-429a-b14f-2471434d6e35', '45280980-4665-41d3-9956-d05e31b7f370', NULL, NULL, 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-20 09:22:15.841991+00', '2026-01-20 19:22:30.954274+00', 'therapeutics', 'HUsband 2', 'c6d36ea3-b538-412c-95ad-62a002610ad0', 'wife 2', 43, 39, '2026-01-20 09:22:15.841991+00', '2026-01-20 10:00:59.221+00', '2026-01-20 10:36:44.612+00', '2026-01-20 10:37:26.408+00', '33f4110a-b8fd-41c5-a0b2-11958323d47e', '2026-01-20 10:37:00.847+00', NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1768900935571.webp', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_88d0fab7-5060-445c-bd4f-97b66426e088_1768905402519.pdf', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_88d0fab7-5060-445c-bd4f-97b66426e088_1768905479402.pdf', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/final-reports/final_report_88d0fab7-5060-445c-bd4f-97b66426e088_1768905535553.pdf', '2026-01-20 10:38:57.035+00', NULL, NULL, NULL, NULL, '{https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_88d0fab7-5060-445c-bd4f-97b66426e088_1768905402519.pdf}', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL),
	('bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4', 'TKT-20260123-0002', 'action', NULL, NULL, '003f2808-c18b-40b5-a00b-e58e2d239372', '7697f26a-1996-4416-a082-3881590f0c07', '45280980-4665-41d3-9956-d05e31b7f370', NULL, NULL, 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-23 10:50:03.387975+00', '2026-01-23 10:52:56.261327+00', 'diagnostics', 'ghfg', '02a3d564-5f0c-41dc-aa2c-5ed50ded4929', 'rtsgds', 45, 34, '2026-01-23 10:50:03.387975+00', '2026-01-23 10:51:35.438+00', '2026-01-23 10:52:07.829+00', '2026-01-23 10:52:22.467+00', '33f4110a-b8fd-41c5-a0b2-11958323d47e', '2026-01-23 10:52:31.586+00', NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1769165403117.webp', NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4_1769165550639.pdf', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/final-reports/final_report_bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4_1769165576446.pdf', '2026-01-23 10:52:57.348+00', '2026-01-28', '16:24:00', NULL, NULL, '{https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4_1769165480590.jpg}', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/sample_bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4_1769165487343.jpg', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4_1769165491519.jpg', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/tagged_sample_bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4_1769165540562.jpg', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_details_bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4_1769165541390.jpg', NULL, NULL, false, NULL, NULL, NULL),
	('b1ad576c-9a63-4243-b9d7-d21feb135e9b', 'TKT-20260123-0004', 'action', NULL, NULL, '003f2808-c18b-40b5-a00b-e58e2d239372', '7697f26a-1996-4416-a082-3881590f0c07', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', NULL, NULL, 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-23 17:22:30.141131+00', '2026-01-23 19:39:21.233215+00', 'diagnostics', 'sdfgh', '6c83c697-9596-4aca-aa75-011b89e4788d', NULL, 41, NULL, '2026-01-23 17:22:30.141131+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1769188950253.webp', NULL, NULL, NULL, NULL, '2026-01-24', '22:53:00', NULL, NULL, '{}', NULL, NULL, NULL, NULL, NULL, NULL, true, '2026-01-23 19:39:23.094+00', '911cc360-556e-4c75-8898-46c5d52c7714', 'tis was cancelled'),
	('a6581ad9-8481-4859-b3fc-9f73cbd4a9e0', 'TKT-20260120-0003', 'action', NULL, NULL, NULL, '2fa25393-4d5b-429a-b14f-2471434d6e35', '3602def8-56ed-485f-af43-2e16ce6ee0bd', NULL, NULL, 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-20 10:58:08.352001+00', '2026-01-20 19:22:30.954274+00', 'diagnostics', 'Name 1', '02a3d564-5f0c-41dc-aa2c-5ed50ded4929', 'Name 2', 43, 38, '2026-01-20 10:58:08.352001+00', '2026-01-20 11:03:26.979+00', '2026-01-20 12:31:05.579+00', '2026-01-20 12:32:08.443+00', '33f4110a-b8fd-41c5-a0b2-11958323d47e', '2026-01-20 12:34:22.163+00', NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1768906688339.webp', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_a6581ad9-8481-4859-b3fc-9f73cbd4a9e0_1768912323789.pdf', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_a6581ad9-8481-4859-b3fc-9f73cbd4a9e0_1768912460707.pdf', NULL, NULL, NULL, NULL, NULL, NULL, '{https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_a6581ad9-8481-4859-b3fc-9f73cbd4a9e0_1768912323789.pdf}', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL),
	('b94f4baf-1321-47be-b137-28b2980828bf', 'TKT-20260120-0004', 'action', NULL, NULL, NULL, '2fa25393-4d5b-429a-b14f-2471434d6e35', '49c44032-aa3b-4fe4-90b5-1c4a451396b4', NULL, NULL, 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-20 11:47:30.958965+00', '2026-01-20 19:22:30.954274+00', 'diagnostics', ' test 1', '02a3d564-5f0c-41dc-aa2c-5ed50ded4929', 'test 2', 43, 39, '2026-01-20 11:47:30.958965+00', '2026-01-20 12:01:13.406+00', '2026-01-20 12:21:11.071+00', '2026-01-20 12:22:39.789+00', '33f4110a-b8fd-41c5-a0b2-11958323d47e', '2026-01-20 12:24:38.491+00', NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1768909650827.webp', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_b94f4baf-1321-47be-b137-28b2980828bf_1768911729508.pdf', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_b94f4baf-1321-47be-b137-28b2980828bf_1768911876257.pdf', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/final-reports/final_report_b94f4baf-1321-47be-b137-28b2980828bf_1768912561497.pdf', '2026-01-20 12:35:03.442+00', NULL, NULL, NULL, NULL, '{https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_b94f4baf-1321-47be-b137-28b2980828bf_1768911729508.pdf}', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL),
	('5cbc07c9-44c7-428b-ab14-1029a1cf239c', 'TKT-20260121-0002', 'action', NULL, NULL, NULL, '7697f26a-1996-4416-a082-3881590f0c07', '45280980-4665-41d3-9956-d05e31b7f370', NULL, NULL, 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-21 05:05:58.910426+00', '2026-01-23 10:39:44.487148+00', 'diagnostics', 'gh', '02a3d564-5f0c-41dc-aa2c-5ed50ded4929', 'weer', 43, 30, '2026-01-21 05:05:58.910426+00', '2026-01-22 06:10:43.307+00', '2026-01-22 11:22:41.136+00', '2026-01-22 11:38:51.748+00', '33f4110a-b8fd-41c5-a0b2-11958323d47e', '2026-01-22 11:39:25.646+00', NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1768971959329.webp', NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769081964041.jpg', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/final-reports/final_report_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769082129634.pdf', '2026-01-22 11:42:10.298+00', '2026-01-22', '10:38:00', NULL, NULL, '{https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769061913435.jpg,https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769062138152.jpg,https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769062170545.jpg}', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/sample_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769062201816.jpg', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769062235905.jpg', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/tagged_sample_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769081923933.jpg', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_details_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769081929354.jpg', NULL, NULL, false, NULL, NULL, NULL),
	('a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5', 'TKT-20260123-0001', 'action', NULL, NULL, NULL, '7697f26a-1996-4416-a082-3881590f0c07', '49c44032-aa3b-4fe4-90b5-1c4a451396b4', NULL, NULL, 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-23 06:39:58.798981+00', '2026-01-23 10:39:44.487148+00', 'diagnostics', 'test 1', '02a3d564-5f0c-41dc-aa2c-5ed50ded4929', 'Test 2', 43, 43, '2026-01-23 06:39:58.798981+00', '2026-01-23 06:45:36.849+00', '2026-01-23 06:47:03.599+00', '2026-01-23 06:48:01.246+00', '33f4110a-b8fd-41c5-a0b2-11958323d47e', '2026-01-23 06:49:21.59+00', NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1769150398054.webp', NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769150960405.jpg', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/final-reports/final_report_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769151006158.pdf', '2026-01-23 06:49:07.767+00', '2026-01-24', '12:13:00', NULL, NULL, '{https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769150632081.jpg,https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769150656432.jpg,https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769150675483.jpg}', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/sample_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769150706555.jpg', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769150720492.jpg', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/tagged_sample_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769150936700.jpg', 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_details_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769150939172.jpg', NULL, NULL, false, NULL, NULL, NULL),
	('4a20a39f-1568-4345-8ed0-36ba457e8dbe', 'TKT-20260122-0002', 'query', NULL, NULL, NULL, NULL, '49c44032-aa3b-4fe4-90b5-1c4a451396b4', NULL, NULL, 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-22 12:17:41.827344+00', '2026-01-23 10:39:44.487148+00', NULL, 'gh', NULL, NULL, NULL, NULL, '2026-01-22 12:17:41.827344+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1769084262570.webp', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '{}', NULL, NULL, NULL, NULL, 'billing_related', NULL, false, NULL, NULL, NULL),
	('905ab91c-cb3b-448c-99bf-d525369d614d', 'TKT-20260121-0001', 'action', NULL, NULL, NULL, '7697f26a-1996-4416-a082-3881590f0c07', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', NULL, NULL, 'f0871447-a937-48e2-8c29-53ac8038435d', '2026-01-21 04:57:56.939277+00', '2026-01-23 10:39:50.732615+00', 'diagnostics', 'name 21', '02a3d564-5f0c-41dc-aa2c-5ed50ded4929', 'name 32', 32, 19, '2026-01-21 04:57:56.939277+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/ticket-screenshots/temp_f0871447-a937-48e2-8c29-53ac8038435d_1768971477407.webp', NULL, NULL, NULL, NULL, '2026-01-22', '01:27:00', NULL, NULL, '{}', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL);


--
-- Data for Name: status_transitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."status_transitions" ("id", "ticket_id", "from_stage_id", "to_stage_id", "transition_date", "transition_time", "field_data", "changed_by", "created_at") VALUES
	('cbf4f7c7-76d6-47bc-9e73-0c2cccc57c6c', '51e4c563-8903-485f-9e42-a46272508eb7', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', '2026-01-20', '14:01:00', '{"assigned_to": "2fa25393-4d5b-429a-b14f-2471434d6e35", "collection_date": "2026-01-22", "collection_time": "18:05"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-20 08:32:09.873717+00'),
	('71cc4db4-0c96-4ef1-97b1-c43a8acc2792', '51e4c563-8903-485f-9e42-a46272508eb7', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '2026-01-20', '14:02:00', '{}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-20 08:32:56.287442+00'),
	('5533cef4-dd4b-4f7a-86a1-006b6fc6f458', '51e4c563-8903-485f-9e42-a46272508eb7', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '037774a3-d741-4318-85a1-de41d8e6f6ba', '2026-01-20', '14:19:00', '{"trf_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_51e4c563-8903-485f-9e42-a46272508eb7_1768899019832.pdf"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 08:50:19.768899+00'),
	('6772e1e5-ac8e-473f-8390-6b18fa987780', '51e4c563-8903-485f-9e42-a46272508eb7', '037774a3-d741-4318-85a1-de41d8e6f6ba', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '2026-01-20', '14:29:00', '{"lab_id": "33f4110a-b8fd-41c5-a0b2-11958323d47e"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 08:59:55.804876+00'),
	('347a7afa-d4f9-435a-8ea9-66a717202608', '51e4c563-8903-485f-9e42-a46272508eb7', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '2026-01-20', '14:30:00', '{"raw_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_51e4c563-8903-485f-9e42-a46272508eb7_1768899803489.pdf"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 09:03:23.431505+00'),
	('45d919f5-3fe4-438e-aff5-3fd9b02d7f4d', '51e4c563-8903-485f-9e42-a46272508eb7', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '45280980-4665-41d3-9956-d05e31b7f370', '2026-01-20', '14:36:00', '{"final_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/final-reports/final_report_51e4c563-8903-485f-9e42-a46272508eb7_1768900008001.pdf"}', '19830a50-e414-45ea-bf70-afa4ed1ea247', '2026-01-20 09:06:48.006641+00'),
	('0fdcc6a7-3484-4aa7-a9f9-eb9941c4bbf8', '51e4c563-8903-485f-9e42-a46272508eb7', '45280980-4665-41d3-9956-d05e31b7f370', '49c44032-aa3b-4fe4-90b5-1c4a451396b4', '2026-01-20', '14:38:00', '{}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-20 09:08:31.727906+00'),
	('2b872707-4406-46a5-9f0a-3ce5af860df2', '88d0fab7-5060-445c-bd4f-97b66426e088', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', '2026-01-20', '15:00:00', '{"assigned_to": "2fa25393-4d5b-429a-b14f-2471434d6e35", "collection_date": "2026-01-21", "collection_time": "15:25"}', '911cc360-556e-4c75-8898-46c5d52c7714', '2026-01-20 10:00:12.24195+00'),
	('6997e08c-053a-4348-9b2c-2014f991c582', '88d0fab7-5060-445c-bd4f-97b66426e088', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '2026-01-20', '15:30:00', '{}', '911cc360-556e-4c75-8898-46c5d52c7714', '2026-01-20 10:00:57.773208+00'),
	('15461120-dea4-438b-b701-c20365184ffa', '88d0fab7-5060-445c-bd4f-97b66426e088', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '037774a3-d741-4318-85a1-de41d8e6f6ba', '2026-01-20', '16:06:00', '{"trf_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_88d0fab7-5060-445c-bd4f-97b66426e088_1768905402519.pdf"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 10:36:43.15888+00'),
	('ba17b6a1-1e85-429b-be89-691d5909aaba', '88d0fab7-5060-445c-bd4f-97b66426e088', '037774a3-d741-4318-85a1-de41d8e6f6ba', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '2026-01-20', '16:07:00', '{"lab_id": "33f4110a-b8fd-41c5-a0b2-11958323d47e"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 10:37:24.99891+00'),
	('0a36611d-2238-48c4-acbe-0c238e042498', '88d0fab7-5060-445c-bd4f-97b66426e088', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '2026-01-20', '16:07:00', '{"raw_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_88d0fab7-5060-445c-bd4f-97b66426e088_1768905479402.pdf"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 10:37:59.411301+00'),
	('5c6023c6-4d74-40e6-8306-7495d94f183d', '88d0fab7-5060-445c-bd4f-97b66426e088', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '45280980-4665-41d3-9956-d05e31b7f370', '2026-01-20', '16:08:00', '{"final_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/final-reports/final_report_88d0fab7-5060-445c-bd4f-97b66426e088_1768905535553.pdf"}', '19830a50-e414-45ea-bf70-afa4ed1ea247', '2026-01-20 10:38:55.629109+00'),
	('cd022388-ebeb-45e6-bb9b-0cb14afdf52c', 'a6581ad9-8481-4859-b3fc-9f73cbd4a9e0', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', '2026-01-20', '16:28:00', '{"assigned_to": "2fa25393-4d5b-429a-b14f-2471434d6e35", "collection_date": "2026-01-21", "collection_time": "20:31"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-20 10:58:43.797253+00'),
	('b6bc6458-fbc7-4dbe-9b57-8ad8e16e0140', 'a6581ad9-8481-4859-b3fc-9f73cbd4a9e0', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '2026-01-20', '16:33:00', '{"actual_collection_date": "2026-01-22", "actual_collection_time": "16:35"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-20 11:03:25.524003+00'),
	('6c0b095b-e00c-4bc8-9372-448c8deefea0', 'b94f4baf-1321-47be-b137-28b2980828bf', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', '2026-01-20', '17:27:00', '{"assigned_to": "2fa25393-4d5b-429a-b14f-2471434d6e35", "collection_date": "2026-01-28", "collection_time": "17:33"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-20 12:01:09.740734+00'),
	('7edb0adf-8b33-4c62-94d3-34c49de73c25', 'b94f4baf-1321-47be-b137-28b2980828bf', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '2026-01-20', '17:31:00', '{"actual_collection_date": "2026-01-29", "actual_collection_time": "17:36"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-20 12:02:11.912219+00'),
	('f352556b-d7f7-41fe-bb7b-61e4af550309', 'b94f4baf-1321-47be-b137-28b2980828bf', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '037774a3-d741-4318-85a1-de41d8e6f6ba', '2026-01-20', '17:51:00', '{"trf_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_b94f4baf-1321-47be-b137-28b2980828bf_1768911729508.pdf"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 12:22:09.721232+00'),
	('d8f4a886-ec86-4155-b854-57793eda7fb2', 'b94f4baf-1321-47be-b137-28b2980828bf', '037774a3-d741-4318-85a1-de41d8e6f6ba', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '2026-01-20', '17:52:00', '{"lab_id": "33f4110a-b8fd-41c5-a0b2-11958323d47e"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 12:22:37.985597+00'),
	('0b608721-2ee4-4c29-bef5-3a644afd445e', 'b94f4baf-1321-47be-b137-28b2980828bf', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '2026-01-20', '17:54:00', '{"raw_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_b94f4baf-1321-47be-b137-28b2980828bf_1768911876257.pdf"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 12:24:37.113702+00'),
	('f4e04969-a213-462b-8f60-939a75a1c3b8', 'a6581ad9-8481-4859-b3fc-9f73cbd4a9e0', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '037774a3-d741-4318-85a1-de41d8e6f6ba', '2026-01-20', '18:01:00', '{"trf_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_a6581ad9-8481-4859-b3fc-9f73cbd4a9e0_1768912323789.pdf"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 12:32:04.212233+00'),
	('82d46db7-d78e-431f-a941-7ea45def5bb0', 'a6581ad9-8481-4859-b3fc-9f73cbd4a9e0', '037774a3-d741-4318-85a1-de41d8e6f6ba', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '2026-01-20', '18:02:00', '{"lab_id": "33f4110a-b8fd-41c5-a0b2-11958323d47e"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 12:34:07.044206+00'),
	('bd38faab-a1d6-465e-baae-6de6e909f031', 'a6581ad9-8481-4859-b3fc-9f73cbd4a9e0', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '2026-01-20', '18:04:00', '{"raw_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_a6581ad9-8481-4859-b3fc-9f73cbd4a9e0_1768912460707.pdf"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 12:34:20.779291+00'),
	('9aea5494-398f-4b7b-b10e-69dee9909af7', 'b94f4baf-1321-47be-b137-28b2980828bf', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '45280980-4665-41d3-9956-d05e31b7f370', '2026-01-20', '18:05:00', '{"final_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/final-reports/final_report_b94f4baf-1321-47be-b137-28b2980828bf_1768912561497.pdf"}', '19830a50-e414-45ea-bf70-afa4ed1ea247', '2026-01-20 12:36:02.122647+00'),
	('f4269324-60b1-49a0-bbd0-fdb95656ccc4', 'b94f4baf-1321-47be-b137-28b2980828bf', '45280980-4665-41d3-9956-d05e31b7f370', '49c44032-aa3b-4fe4-90b5-1c4a451396b4', '2026-01-20', '18:10:00', '{}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-20 12:40:13.154984+00'),
	('844d3024-580b-4ea6-9d81-20dc5d14b9f2', 'fe5b5e1c-a133-43a4-9c0e-4edc526465c3', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', '2026-01-20', '22:42:00', '{"assigned_to": "2fa25393-4d5b-429a-b14f-2471434d6e35"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-20 17:15:40.35489+00'),
	('9591a947-d72e-4cad-9553-187ed6347b98', '70438d3b-7b4c-4d7b-963b-535ec37ed8bc', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', '2026-01-20', '23:08:00', '{"assigned_to": "2fa25393-4d5b-429a-b14f-2471434d6e35"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-20 17:39:01.194172+00'),
	('14ed6b37-7ee1-47b4-a749-931cc1bb0bb1', 'fe5b5e1c-a133-43a4-9c0e-4edc526465c3', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '2026-01-20', '23:35:00', '{"actual_collection_date": "2026-01-21", "actual_collection_time": "23:37"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-20 18:05:43.927868+00'),
	('f75829b9-26dc-41fe-aced-e3be05bf03c8', 'fe5b5e1c-a133-43a4-9c0e-4edc526465c3', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '037774a3-d741-4318-85a1-de41d8e6f6ba', '2026-01-20', '23:36:00', '{"trf_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_fe5b5e1c-a133-43a4-9c0e-4edc526465c3_1768932455643.pdf"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 18:07:35.66344+00'),
	('e920e2a8-4fd8-4928-8a3c-b0071ac20cc2', 'fe5b5e1c-a133-43a4-9c0e-4edc526465c3', '037774a3-d741-4318-85a1-de41d8e6f6ba', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '2026-01-20', '23:37:00', '{"lab_id": "33f4110a-b8fd-41c5-a0b2-11958323d47e"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 18:07:43.863427+00'),
	('07a9adb3-11a6-4daf-ab84-79f861d64b22', 'fe5b5e1c-a133-43a4-9c0e-4edc526465c3', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '2026-01-20', '23:37:00', '{"raw_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_fe5b5e1c-a133-43a4-9c0e-4edc526465c3_1768932476503.pdf"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 18:07:55.938445+00'),
	('babfd88a-26e2-41c8-afb6-63a405384635', 'fe5b5e1c-a133-43a4-9c0e-4edc526465c3', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '45280980-4665-41d3-9956-d05e31b7f370', '2026-01-20', '23:42:00', '{"final_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/final-reports/final_report_fe5b5e1c-a133-43a4-9c0e-4edc526465c3_1768932783773.pdf"}', '19830a50-e414-45ea-bf70-afa4ed1ea247', '2026-01-20 18:13:03.428429+00'),
	('f032058d-3c7d-4e66-a8d3-dd873a20e7b4', '70438d3b-7b4c-4d7b-963b-535ec37ed8bc', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '2026-01-20', '00:33:00', '{"actual_collection_date": "2026-01-22", "actual_collection_time": "00:37"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-20 19:03:44.707811+00'),
	('e366617e-5b64-4afb-9d63-ba6cb21ddf70', '70438d3b-7b4c-4d7b-963b-535ec37ed8bc', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '037774a3-d741-4318-85a1-de41d8e6f6ba', '2026-01-20', '00:49:00', '{"trf_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1768936784587.jpg", "trf_image_urls": ["https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1768936784587.jpg", "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1768936791113.jpg", "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1768936795128.jpg"]}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 19:19:57.319846+00'),
	('d90d5dca-60f6-4885-87bb-4c5b066ef92b', '70438d3b-7b4c-4d7b-963b-535ec37ed8bc', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '037774a3-d741-4318-85a1-de41d8e6f6ba', '2026-01-20', '00:49:00', '{"trf_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1768936810664.jpg", "trf_image_urls": ["https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1768936810664.jpg", "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1768936816693.jpg", "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1768936823721.jpg"]}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 19:20:27.370369+00'),
	('1575cbc1-9ef2-46cb-9828-081c377cc6ea', '70438d3b-7b4c-4d7b-963b-535ec37ed8bc', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '037774a3-d741-4318-85a1-de41d8e6f6ba', '2026-01-20', '00:49:00', '{"trf_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1768936965803.jpg", "trf_image_urls": ["https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1768936965803.jpg", "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1768936972628.jpg", "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1768936979077.jpg"]}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-20 19:23:02.337221+00'),
	('16e9ed14-2b16-49d4-8a1f-7aba7841d9f4', '5cbc07c9-44c7-428b-ab14-1029a1cf239c', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', '2026-01-22', '10:56:00', '{"assigned_to": "7697f26a-1996-4416-a082-3881590f0c07"}', '911cc360-556e-4c75-8898-46c5d52c7714', '2026-01-22 05:26:57.804967+00'),
	('824e1e47-f388-4684-85a8-433b9f32f2f8', '5cbc07c9-44c7-428b-ab14-1029a1cf239c', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '2026-01-22', '11:40:00', '{"trf_image_urls": ["https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769061913435.jpg", "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769062138152.jpg", "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769062170545.jpg"], "sample_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/sample_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769062201816.jpg", "courier_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769062235905.jpg", "actual_collection_date": "2026-01-22", "actual_collection_time": "11:40"}', '7697f26a-1996-4416-a082-3881590f0c07', '2026-01-22 06:10:41.119692+00'),
	('4f7a4678-8e43-49e4-9e86-4a648c62bf12', '905ab91c-cb3b-448c-99bf-d525369d614d', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', '2026-01-22', '11:42:00', '{"assigned_to": "7697f26a-1996-4416-a082-3881590f0c07"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-22 06:12:48.505357+00'),
	('56790d89-ef21-4b23-9a49-59ec1e82954a', '5cbc07c9-44c7-428b-ab14-1029a1cf239c', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '037774a3-d741-4318-85a1-de41d8e6f6ba', '2026-01-22', '16:52:00', '{}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-22 11:22:38.701812+00'),
	('fb1f294c-3686-4b27-bd11-9296f31811b0', '5cbc07c9-44c7-428b-ab14-1029a1cf239c', '037774a3-d741-4318-85a1-de41d8e6f6ba', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '2026-01-22', '17:08:00', '{"lab_id": "33f4110a-b8fd-41c5-a0b2-11958323d47e", "tagged_sample_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/tagged_sample_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769081923933.jpg", "backoffice_courier_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_details_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769081929354.jpg"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-22 11:38:49.712646+00'),
	('993f6121-02d8-45aa-9d56-3a4036ee9936', '5cbc07c9-44c7-428b-ab14-1029a1cf239c', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '2026-01-22', '17:09:00', '{"raw_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769081964041.jpg"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-22 11:39:23.680248+00'),
	('9dce9a98-bebe-4288-bb5d-b0e77793be03', '5cbc07c9-44c7-428b-ab14-1029a1cf239c', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '45280980-4665-41d3-9956-d05e31b7f370', '2026-01-22', '17:12:00', '{"final_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/final-reports/final_report_5cbc07c9-44c7-428b-ab14-1029a1cf239c_1769082129634.pdf"}', '19830a50-e414-45ea-bf70-afa4ed1ea247', '2026-01-22 11:42:08.474354+00'),
	('fa90878b-d6b2-423e-b41b-e19571035d49', '4a20a39f-1568-4345-8ed0-36ba457e8dbe', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', '49c44032-aa3b-4fe4-90b5-1c4a451396b4', '2026-01-22', '17:53:00', '{}', '911cc360-556e-4c75-8898-46c5d52c7714', '2026-01-22 12:23:33.744071+00'),
	('d54bbb62-528f-4c54-b334-35c5c7d42b14', 'a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', '2026-01-23', '12:10:00', '{"assigned_to": "7697f26a-1996-4416-a082-3881590f0c07"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-23 06:40:37.504005+00'),
	('2709201d-95b5-4669-adf4-9b6b17c32338', 'a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '2026-01-23', '12:15:00', '{"trf_image_urls": ["https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769150632081.jpg", "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769150656432.jpg", "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769150675483.jpg"], "sample_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/sample_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769150706555.jpg", "courier_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769150720492.jpg", "actual_collection_date": "2026-01-23", "actual_collection_time": "12:15"}', '7697f26a-1996-4416-a082-3881590f0c07', '2026-01-23 06:45:35.317239+00'),
	('73db4cee-3e1f-4919-a111-3d048b85a79c', 'a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '037774a3-d741-4318-85a1-de41d8e6f6ba', '2026-01-23', '12:17:00', '{}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-23 06:48:02.054631+00'),
	('480cd109-ccb1-4ff3-b461-850a26f7211c', 'a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5', '037774a3-d741-4318-85a1-de41d8e6f6ba', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '2026-01-23', '12:18:00', '{"lab_id": "33f4110a-b8fd-41c5-a0b2-11958323d47e", "tagged_sample_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/tagged_sample_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769150936700.jpg", "backoffice_courier_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_details_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769150939172.jpg"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-23 06:48:59.718802+00'),
	('a5380149-73e2-4d0f-b030-55278db88c50', 'a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '2026-01-23', '12:19:00', '{"raw_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769150960405.jpg"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-23 06:49:20.082467+00'),
	('1655c76a-5d79-4c64-8e92-c49869c73dd7', 'a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '45280980-4665-41d3-9956-d05e31b7f370', '2026-01-23', '12:19:00', '{"final_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/final-reports/final_report_a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5_1769151006158.pdf"}', '19830a50-e414-45ea-bf70-afa4ed1ea247', '2026-01-23 06:50:06.236298+00'),
	('628be7d8-0e1b-492e-a2fd-30405adb891f', 'a336dbcb-8b1f-40ba-84ca-d3fd2bf35cf5', '45280980-4665-41d3-9956-d05e31b7f370', '49c44032-aa3b-4fe4-90b5-1c4a451396b4', '2026-01-23', '12:20:00', '{}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-23 06:50:57.209321+00'),
	('68159ff5-8f5c-429d-ab5a-04aed7b4b382', 'a717d9fc-a995-4059-bf24-9f8b92778e26', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', '2026-01-23', '16:04:00', '{"assigned_to": "7697f26a-1996-4416-a082-3881590f0c07"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-23 10:34:21.677332+00'),
	('2311039c-3adb-4848-b109-a62b6df08995', '4015fa40-722f-4923-81af-188828de3def', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', '2026-01-23', '16:05:00', '{"assigned_to": "7697f26a-1996-4416-a082-3881590f0c07"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-23 10:35:29.294859+00'),
	('1ee2f03e-cba5-49fa-ae19-3e982b488dde', '78a98dc5-e751-4e87-8f5f-a565a734d920', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', '2026-01-23', '16:09:00', '{"assigned_to": "7697f26a-1996-4416-a082-3881590f0c07"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-23 10:39:58.482325+00'),
	('e1fa705c-40a3-4482-a520-56b4b01f828c', 'bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', '2026-01-23', '16:20:00', '{"assigned_to": "7697f26a-1996-4416-a082-3881590f0c07"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-23 10:50:24.238877+00'),
	('24aef40f-410a-4241-abec-bb0251378852', 'bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '2026-01-23', '16:21:00', '{"trf_image_urls": ["https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4_1769165480590.jpg"], "sample_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/sample_bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4_1769165487343.jpg", "courier_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4_1769165491519.jpg", "actual_collection_date": "2026-01-23", "actual_collection_time": "16:21"}', '7697f26a-1996-4416-a082-3881590f0c07', '2026-01-23 10:51:34.149259+00'),
	('bc2d9418-5c84-405d-b702-ac725e6e6b84', 'bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '037774a3-d741-4318-85a1-de41d8e6f6ba', '2026-01-23', '16:22:00', '{}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-23 10:52:06.425074+00'),
	('ef9a7ba7-945d-4e8b-8b5d-5a4eb2bd325f', 'bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4', '037774a3-d741-4318-85a1-de41d8e6f6ba', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '2026-01-23', '16:22:00', '{"lab_id": "33f4110a-b8fd-41c5-a0b2-11958323d47e", "tagged_sample_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/tagged_sample_bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4_1769165540562.jpg", "backoffice_courier_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_details_bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4_1769165541390.jpg"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-23 10:52:21.114414+00'),
	('f277973c-ff94-4dde-ab1a-0165c6f9a36e', 'bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '2026-01-23', '16:22:00', '{"raw_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4_1769165550639.pdf"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-23 10:52:30.271542+00'),
	('8db9ad5e-a17d-4f4f-9f3d-d0323fb3360d', 'bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '45280980-4665-41d3-9956-d05e31b7f370', '2026-01-23', '16:22:00', '{"final_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/final-reports/final_report_bca2f4a2-9baf-4f2e-b8e9-ef95fe912fa4_1769165576446.pdf"}', '19830a50-e414-45ea-bf70-afa4ed1ea247', '2026-01-23 10:52:56.022696+00'),
	('c6e29bfc-8453-4568-b0fb-e4fa3c4e58e9', '323d29e8-de6e-4b65-95f6-3d2f8eb23aa0', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', '2026-01-23', '16:46:00', '{"assigned_to": "7697f26a-1996-4416-a082-3881590f0c07"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-23 11:17:46.396453+00'),
	('d11da227-67dc-4be7-8ed7-b7ad446bc1c3', '47125b1a-613f-49c3-a487-ab531ddb3c6e', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', '0130eea2-35d8-47ca-9eff-3a69e35b4bbe', '2026-01-23', '16:50:00', '{}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-23 11:20:44.996344+00'),
	('33484fd6-8beb-409d-859c-a296667c7366', '323d29e8-de6e-4b65-95f6-3d2f8eb23aa0', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '2026-01-23', '16:55:00', '{"trf_image_urls": ["https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/trf_323d29e8-de6e-4b65-95f6-3d2f8eb23aa0_1769167488073.jpg"], "sample_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/sample_323d29e8-de6e-4b65-95f6-3d2f8eb23aa0_1769167519348.jpg", "courier_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_323d29e8-de6e-4b65-95f6-3d2f8eb23aa0_1769167530857.jpg", "actual_collection_date": "2026-01-23", "actual_collection_time": "16:55"}', '7697f26a-1996-4416-a082-3881590f0c07', '2026-01-23 11:25:41.32213+00'),
	('7b5779c7-73d3-409c-956d-f1f83a2e3eba', '323d29e8-de6e-4b65-95f6-3d2f8eb23aa0', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '037774a3-d741-4318-85a1-de41d8e6f6ba', '2026-01-23', '16:58:00', '{}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-23 11:28:48.479634+00'),
	('b98627e7-50e2-46c3-b95e-799873d74a28', '323d29e8-de6e-4b65-95f6-3d2f8eb23aa0', '037774a3-d741-4318-85a1-de41d8e6f6ba', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '2026-01-23', '17:02:00', '{"lab_id": "33f4110a-b8fd-41c5-a0b2-11958323d47e", "tagged_sample_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/tagged_sample_323d29e8-de6e-4b65-95f6-3d2f8eb23aa0_1769167984067.jpg", "backoffice_courier_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_details_323d29e8-de6e-4b65-95f6-3d2f8eb23aa0_1769167985552.jpg"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-23 11:33:05.523847+00'),
	('91c59b14-8119-42d3-bc07-6cc9d1ef369e', '323d29e8-de6e-4b65-95f6-3d2f8eb23aa0', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '2026-01-23', '17:03:00', '{"raw_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_323d29e8-de6e-4b65-95f6-3d2f8eb23aa0_1769168034466.pdf"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-23 11:33:54.807738+00'),
	('fbfd2e9a-c7c8-477c-bef4-205028fece46', '323d29e8-de6e-4b65-95f6-3d2f8eb23aa0', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '45280980-4665-41d3-9956-d05e31b7f370', '2026-01-23', '17:05:00', '{"final_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/final-reports/final_report_323d29e8-de6e-4b65-95f6-3d2f8eb23aa0_1769168159665.pdf"}', '19830a50-e414-45ea-bf70-afa4ed1ea247', '2026-01-23 11:35:59.1557+00'),
	('3ee26ee1-4990-46a6-8b06-2d79c6c90c99', '323d29e8-de6e-4b65-95f6-3d2f8eb23aa0', '45280980-4665-41d3-9956-d05e31b7f370', '49c44032-aa3b-4fe4-90b5-1c4a451396b4', '2026-01-23', '17:06:00', '{}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-23 11:36:41.287211+00'),
	('a544f215-700c-4b89-9111-1de8ccc6a26a', '70438d3b-7b4c-4d7b-963b-535ec37ed8bc', '037774a3-d741-4318-85a1-de41d8e6f6ba', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '2026-01-23', '17:57:00', '{"lab_id": "33f4110a-b8fd-41c5-a0b2-11958323d47e", "label_code": "TESTID123", "backoffice_courier_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_details_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1769171252137.jpg"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-23 12:27:32.250038+00'),
	('b40f92a2-3b39-4612-843e-af00bad81c1a', '70438d3b-7b4c-4d7b-963b-535ec37ed8bc', '037774a3-d741-4318-85a1-de41d8e6f6ba', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '2026-01-23', '17:57:00', '{"lab_id": "33f4110a-b8fd-41c5-a0b2-11958323d47e", "label_code": "TESTID123", "backoffice_courier_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_details_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1769171268972.jpg"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-23 12:27:48.907596+00'),
	('e48ccaa3-41a0-4ea7-8c8f-02c53cfe1015', '70438d3b-7b4c-4d7b-963b-535ec37ed8bc', '037774a3-d741-4318-85a1-de41d8e6f6ba', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '2026-01-23', '17:57:00', '{"lab_id": "33f4110a-b8fd-41c5-a0b2-11958323d47e", "label_code": "TESTID123", "backoffice_courier_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_details_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1769171322000.jpg"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-23 12:28:41.958034+00'),
	('782c9830-ed63-40bb-868a-a3f463e50404', '70438d3b-7b4c-4d7b-963b-535ec37ed8bc', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '037774a3-d741-4318-85a1-de41d8e6f6ba', '2026-01-23', '18:01:00', '{}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-23 12:32:02.231343+00'),
	('e961e712-4686-40f7-8954-94a7e9f1c6ca', '70438d3b-7b4c-4d7b-963b-535ec37ed8bc', '037774a3-d741-4318-85a1-de41d8e6f6ba', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '2026-01-23', '18:02:00', '{"lab_id": "33f4110a-b8fd-41c5-a0b2-11958323d47e", "label_code": "TEST12", "backoffice_courier_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_details_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1769171557554.jpg"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-23 12:32:37.581721+00'),
	('15b53af3-124d-424e-ba74-dc94470b73ec', '70438d3b-7b4c-4d7b-963b-535ec37ed8bc', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '3602def8-56ed-485f-af43-2e16ce6ee0bd', '2026-01-23', '18:14:00', '{"raw_report_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/raw-reports/raw_report_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1769172248040.pdf"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-23 12:44:08.123514+00'),
	('59aae7e4-2b77-4a1a-a86e-2fa8c2fb3121', '70438d3b-7b4c-4d7b-963b-535ec37ed8bc', '3602def8-56ed-485f-af43-2e16ce6ee0bd', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '2026-01-23', '18:14:00', '{"actual_collection_date": "2026-01-23", "actual_collection_time": "18:09"}', 'cd9bb8df-bdf2-4904-91c0-2a9650b86984', '2026-01-23 12:44:56.615865+00'),
	('07a1e671-34e7-4882-8e28-0c4d3641638b', '70438d3b-7b4c-4d7b-963b-535ec37ed8bc', 'b5f0b45e-189b-459f-a2a4-9179f4a1e4d5', '037774a3-d741-4318-85a1-de41d8e6f6ba', '2026-01-23', '18:15:00', '{}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-23 12:45:55.696055+00'),
	('c526b1e3-3058-416b-a4a6-af1e87168ac7', '70438d3b-7b4c-4d7b-963b-535ec37ed8bc', '037774a3-d741-4318-85a1-de41d8e6f6ba', '1033c12c-e79c-4d0a-9ac8-a498471f007a', '2026-01-23', '18:28:00', '{"lab_id": "33f4110a-b8fd-41c5-a0b2-11958323d47e", "label_code": "TEST123", "backoffice_courier_image_url": "https://vamnglhizuaupgstdifv.supabase.co/storage/v1/object/public/trf-documents/courier_details_70438d3b-7b4c-4d7b-963b-535ec37ed8bc_1769173115564.jpg"}', '14613ce2-2c6e-4668-b9ee-e169c66efb5e', '2026-01-23 12:58:35.617641+00'),
	('831b94d8-a5fb-4754-9137-3c6e080eb14c', 'b1ad576c-9a63-4243-b9d7-d21feb135e9b', '2adf08ba-59b5-4831-bb1a-b5fc7465e252', 'b2b477cb-2ce1-497b-b977-7b5a1d26c8fe', '2026-01-23', '22:53:00', '{"assigned_to": "7697f26a-1996-4416-a082-3881590f0c07"}', '911cc360-556e-4c75-8898-46c5d52c7714', '2026-01-23 17:24:02.205926+00');


--
-- Data for Name: ticket_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ticket_custom_values; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES
	('ticket-screenshots', 'ticket-screenshots', NULL, '2026-01-19 05:06:10.74131+00', '2026-01-19 05:06:10.74131+00', true, false, 5242880, '{image/*}', NULL, 'STANDARD'),
	('trf-documents', 'trf-documents', NULL, '2026-01-19 18:33:25.704383+00', '2026-01-19 18:33:25.704383+00', true, false, NULL, NULL, NULL, 'STANDARD'),
	('raw-reports', 'raw-reports', NULL, '2026-01-19 18:53:08.03791+00', '2026-01-19 18:53:08.03791+00', true, false, NULL, NULL, NULL, 'STANDARD'),
	('final-reports', 'final-reports', NULL, '2026-01-20 04:32:55.434118+00', '2026-01-20 04:32:55.434118+00', true, false, NULL, NULL, NULL, 'STANDARD');


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--
-- Skipped seeding storage.objects to prevent column mismatch and broken file references.


--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict pHRxIpdtRl6a7lgwpRnCWfIda3SoOMbNd3styF9Lh5a4Lefgd9bdpfXGjyeXiUW

RESET ALL;
