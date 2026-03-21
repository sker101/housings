SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict 5sLQmie8g9jufFcPu8murXzqaQxYsba1xOFA9j4u0MHO6GnA8pPL4XD33LSFdE0

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
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'af97c808-a291-439c-8e72-81d427d55d2a', 'authenticated', 'authenticated', 'student.one@campusstay.co', '$2a$10$Ojykefu3B1lZ8RBslcZMU.SSO8M8Pk40DihmDntHyXwj6Q0gTKxqO', '2026-02-27 16:09:43.445583+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-01 21:33:07.657286+00', '{"provider": "email", "providers": ["email"]}', '{"role": "student", "phone": "+255700000201", "full_name": "Neema Student", "email_verified": true}', NULL, '2026-02-27 16:09:43.442403+00', '2026-03-01 21:33:07.693732+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', 'authenticated', 'authenticated', 'lister.manager@campusstay.co', '$2a$10$EnujVe1hGON3SdJWzjm7..KAh7S7cRs1/RKCX0pdLl.vowq8aiJKS', '2026-02-27 16:09:43.03855+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-11 18:52:53.026118+00', '{"provider": "email", "providers": ["email"]}', '{"role": "lister", "phone": "+255700000102", "full_name": "Baraka Manager", "lister_type": "manager", "email_verified": true}', NULL, '2026-02-27 16:09:43.035312+00', '2026-03-11 18:52:53.054507+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'authenticated', 'authenticated', 'admin@campusstay.co', '$2a$10$5T21gLFcH3tLtdvsFvKAmuqt.xiaMI467E0/o7mUWBbt5qCEaP2Tu', '2026-02-27 16:09:42.249734+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-12 01:01:17.209198+00', '{"provider": "email", "providers": ["email"]}', '{"role": "admin", "phone": "+255700000001", "full_name": "CampusStay Admin", "email_verified": true}', NULL, '2026-02-27 16:09:42.247167+00', '2026-03-12 01:01:17.286545+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', 'authenticated', 'authenticated', 'student.two@campusstay.co', '$2a$10$Q747DUg/HbgnEyQw43T1quahSAq5mMSusZ9sPcNbpmepFWnICLPhu', '2026-02-27 16:09:43.811037+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-11 02:47:40.222606+00', '{"provider": "email", "providers": ["email"]}', '{"role": "student", "phone": "+255700000202", "full_name": "Juma Student", "email_verified": true}', NULL, '2026-02-27 16:09:43.808059+00', '2026-03-11 02:47:40.226709+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'authenticated', 'authenticated', 'lister.owner@campusstay.co', '$2a$10$CLPFb7YogmKuJQ8YuuYib.WtUVIP780pC1SCIc7UKVnKe5idTxJt6', '2026-02-27 16:09:42.613562+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-03-11 16:21:07.766534+00', '{"provider": "email", "providers": ["email"]}', '{"role": "lister", "phone": "+255700000101", "full_name": "Asha Owner", "lister_type": "owner", "email_verified": true}', NULL, '2026-02-27 16:09:42.611043+00', '2026-03-11 16:21:07.797918+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '30fb7ca4-c99d-430e-a19e-6624aa67b418', 'authenticated', 'authenticated', 'godblessgkaaya@gmail.com', '$2a$10$0OMVy9DjLaVkpbUgrIJrXO5cJsnLdCsaMlh.8AhgeKKe1xl5987rq', '2026-03-07 07:57:16.378729+00', NULL, '', '2026-03-07 07:55:36.151628+00', '', NULL, '', '', NULL, '2026-03-11 17:10:18.614089+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "30fb7ca4-c99d-430e-a19e-6624aa67b418", "role": "lister", "email": "godblessgkaaya@gmail.com", "phone": "+255686475414", "full_name": "GODBLESS KAAYA", "lister_type": "manager", "email_verified": true, "phone_verified": false}', NULL, '2026-03-07 07:55:36.035229+00', '2026-03-11 17:10:18.673774+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('552fc1cf-4aae-4a00-be58-d3ab999f551c', '552fc1cf-4aae-4a00-be58-d3ab999f551c', '{"sub": "552fc1cf-4aae-4a00-be58-d3ab999f551c", "email": "admin@campusstay.co", "email_verified": false, "phone_verified": false}', 'email', '2026-02-27 16:09:42.248416+00', '2026-02-27 16:09:42.248464+00', '2026-02-27 16:09:42.248464+00', 'e4a6229b-d432-44f5-b2bb-ab9c6865004e'),
	('2aee506c-e263-478a-bcef-f3cc999a69b9', '2aee506c-e263-478a-bcef-f3cc999a69b9', '{"sub": "2aee506c-e263-478a-bcef-f3cc999a69b9", "email": "lister.owner@campusstay.co", "email_verified": false, "phone_verified": false}', 'email', '2026-02-27 16:09:42.612294+00', '2026-02-27 16:09:42.612339+00', '2026-02-27 16:09:42.612339+00', '044687e5-0288-42ab-ae7d-2e2ca864ecdc'),
	('e77965c7-7e4c-4ade-ba52-19472cd7d647', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', '{"sub": "e77965c7-7e4c-4ade-ba52-19472cd7d647", "email": "lister.manager@campusstay.co", "email_verified": false, "phone_verified": false}', 'email', '2026-02-27 16:09:43.036582+00', '2026-02-27 16:09:43.036624+00', '2026-02-27 16:09:43.036624+00', '1d840730-641e-49b3-ab2b-9622c8139030'),
	('af97c808-a291-439c-8e72-81d427d55d2a', 'af97c808-a291-439c-8e72-81d427d55d2a', '{"sub": "af97c808-a291-439c-8e72-81d427d55d2a", "email": "student.one@campusstay.co", "email_verified": false, "phone_verified": false}', 'email', '2026-02-27 16:09:43.444231+00', '2026-02-27 16:09:43.444286+00', '2026-02-27 16:09:43.444286+00', '08eab42c-bc2b-483d-a009-11375a44cde0'),
	('a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', '{"sub": "a70ff7e6-f0bb-4124-9429-671cc5d2eb6e", "email": "student.two@campusstay.co", "email_verified": false, "phone_verified": false}', 'email', '2026-02-27 16:09:43.809266+00', '2026-02-27 16:09:43.809309+00', '2026-02-27 16:09:43.809309+00', '3908d025-93df-4ea4-8566-c6a9b603bb61'),
	('30fb7ca4-c99d-430e-a19e-6624aa67b418', '30fb7ca4-c99d-430e-a19e-6624aa67b418', '{"sub": "30fb7ca4-c99d-430e-a19e-6624aa67b418", "role": "lister", "email": "godblessgkaaya@gmail.com", "phone": "+255686475414", "full_name": "GODBLESS KAAYA", "lister_type": "manager", "email_verified": true, "phone_verified": false}', 'email', '2026-03-07 07:55:36.118512+00', '2026-03-07 07:55:36.11956+00', '2026-03-07 07:55:36.11956+00', '0fc34e68-6c08-4685-ba30-d3e384fc712c');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('ebdfae9b-9781-4717-83bf-1af9057d6e7f', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', '2026-03-11 02:47:40.222711+00', '2026-03-11 02:47:40.222711+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '102.64.68.194', NULL, NULL, NULL, NULL, NULL),
	('9e537804-eef0-4602-a951-bab38a37b44a', '2aee506c-e263-478a-bcef-f3cc999a69b9', '2026-03-11 16:21:07.768721+00', '2026-03-11 16:21:07.768721+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '156.38.168.58', NULL, NULL, NULL, NULL, NULL),
	('91216eae-d175-4ec5-988a-80140ce6ccfb', '30fb7ca4-c99d-430e-a19e-6624aa67b418', '2026-03-11 17:10:18.614178+00', '2026-03-11 17:10:18.614178+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '197.250.8.203', NULL, NULL, NULL, NULL, NULL),
	('03906161-87c1-4e3d-a5a3-b06dd668e431', 'af97c808-a291-439c-8e72-81d427d55d2a', '2026-03-01 21:08:42.1416+00', '2026-03-01 21:08:42.1416+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '102.64.68.198', NULL, NULL, NULL, NULL, NULL),
	('a376ec5e-1f62-4a08-aa86-940a912d8fca', '552fc1cf-4aae-4a00-be58-d3ab999f551c', '2026-03-12 01:01:17.210342+00', '2026-03-12 01:01:17.210342+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '102.64.68.147', NULL, NULL, NULL, NULL, NULL),
	('c17962dd-9680-4aac-8f34-b28c3223ff8f', 'af97c808-a291-439c-8e72-81d427d55d2a', '2026-03-01 21:17:31.045155+00', '2026-03-01 21:17:31.045155+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '102.64.68.198', NULL, NULL, NULL, NULL, NULL),
	('38ff8c3b-b3a4-48c6-8f35-bcef7863f121', 'af97c808-a291-439c-8e72-81d427d55d2a', '2026-03-01 21:33:07.659897+00', '2026-03-01 21:33:07.659897+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '102.64.68.198', NULL, NULL, NULL, NULL, NULL),
	('f43c0c5b-e829-446a-a4f9-825c6078ae18', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', '2026-03-01 22:05:25.411048+00', '2026-03-02 00:04:25.942307+00', NULL, 'aal1', NULL, '2026-03-02 00:04:25.942204', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '102.64.68.198', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('a376ec5e-1f62-4a08-aa86-940a912d8fca', '2026-03-12 01:01:17.292558+00', '2026-03-12 01:01:17.292558+00', 'password', 'ab0c3da5-3753-4d55-81a3-78e8bf72899f'),
	('03906161-87c1-4e3d-a5a3-b06dd668e431', '2026-03-01 21:08:42.211635+00', '2026-03-01 21:08:42.211635+00', 'password', '9430377a-2944-4259-a99c-6ef20c137aa5'),
	('c17962dd-9680-4aac-8f34-b28c3223ff8f', '2026-03-01 21:17:31.098237+00', '2026-03-01 21:17:31.098237+00', 'password', '5c42c34f-bde6-4e35-889b-0f7464a36f2e'),
	('38ff8c3b-b3a4-48c6-8f35-bcef7863f121', '2026-03-01 21:33:07.69937+00', '2026-03-01 21:33:07.69937+00', 'password', '7ae5791f-7504-4c11-9283-6575e3b63c06'),
	('f43c0c5b-e829-446a-a4f9-825c6078ae18', '2026-03-01 22:05:25.49701+00', '2026-03-01 22:05:25.49701+00', 'password', '615f15c5-7f6d-4c79-84f8-24055934974f'),
	('ebdfae9b-9781-4717-83bf-1af9057d6e7f', '2026-03-11 02:47:40.227004+00', '2026-03-11 02:47:40.227004+00', 'password', 'ae1e0efe-43a7-4146-b4e2-9b42b47247cd'),
	('9e537804-eef0-4602-a951-bab38a37b44a', '2026-03-11 16:21:07.799224+00', '2026-03-11 16:21:07.799224+00', 'password', 'efb6f491-1e01-4463-a18a-4af13eb0a652'),
	('91216eae-d175-4ec5-988a-80140ce6ccfb', '2026-03-11 17:10:18.676746+00', '2026-03-11 17:10:18.676746+00', 'password', 'ee8616ea-27f0-462e-a0df-6104e78e5392');


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

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 20, 'u4r3k5zqa66u', 'af97c808-a291-439c-8e72-81d427d55d2a', false, '2026-03-01 21:08:42.179229+00', '2026-03-01 21:08:42.179229+00', NULL, '03906161-87c1-4e3d-a5a3-b06dd668e431'),
	('00000000-0000-0000-0000-000000000000', 22, '7zerz7lfdclr', 'af97c808-a291-439c-8e72-81d427d55d2a', false, '2026-03-01 21:17:31.080366+00', '2026-03-01 21:17:31.080366+00', NULL, 'c17962dd-9680-4aac-8f34-b28c3223ff8f'),
	('00000000-0000-0000-0000-000000000000', 23, '3vtoyujb6hwo', 'af97c808-a291-439c-8e72-81d427d55d2a', false, '2026-03-01 21:33:07.679979+00', '2026-03-01 21:33:07.679979+00', NULL, '38ff8c3b-b3a4-48c6-8f35-bcef7863f121'),
	('00000000-0000-0000-0000-000000000000', 28, 'fym4m5hkjd6t', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', true, '2026-03-01 22:05:25.44615+00', '2026-03-01 23:04:55.6454+00', NULL, 'f43c0c5b-e829-446a-a4f9-825c6078ae18'),
	('00000000-0000-0000-0000-000000000000', 30, 'qqxpdq4jpezk', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', true, '2026-03-01 23:04:55.667802+00', '2026-03-02 00:04:25.857492+00', 'fym4m5hkjd6t', 'f43c0c5b-e829-446a-a4f9-825c6078ae18'),
	('00000000-0000-0000-0000-000000000000', 32, 'e5x2alunsmfm', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', false, '2026-03-02 00:04:25.884467+00', '2026-03-02 00:04:25.884467+00', 'qqxpdq4jpezk', 'f43c0c5b-e829-446a-a4f9-825c6078ae18'),
	('00000000-0000-0000-0000-000000000000', 77, 'tu6rwtjgremk', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', false, '2026-03-11 02:47:40.225762+00', '2026-03-11 02:47:40.225762+00', NULL, 'ebdfae9b-9781-4717-83bf-1af9057d6e7f'),
	('00000000-0000-0000-0000-000000000000', 81, 'qbb6xkn6uywf', '2aee506c-e263-478a-bcef-f3cc999a69b9', false, '2026-03-11 16:21:07.790126+00', '2026-03-11 16:21:07.790126+00', NULL, '9e537804-eef0-4602-a951-bab38a37b44a'),
	('00000000-0000-0000-0000-000000000000', 82, 'kk5xzdjxd7hf', '30fb7ca4-c99d-430e-a19e-6624aa67b418', false, '2026-03-11 17:10:18.649058+00', '2026-03-11 17:10:18.649058+00', NULL, '91216eae-d175-4ec5-988a-80140ce6ccfb'),
	('00000000-0000-0000-0000-000000000000', 85, 'eptgnbr2lk6s', '552fc1cf-4aae-4a00-be58-d3ab999f551c', false, '2026-03-12 01:01:17.254542+00', '2026-03-12 01:01:17.254542+00', NULL, 'a376ec5e-1f62-4a08-aa86-940a912d8fca');


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
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 85, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict 5sLQmie8g9jufFcPu8murXzqaQxYsba1xOFA9j4u0MHO6GnA8pPL4XD33LSFdE0

RESET ALL;
