SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict ZaRaIEVZlY8QSmOrqtmSEViyqteilEb0EsSXYi5sMbjzDjLIURY7WbL6lAAHdIJ

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
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "role", "lister_type", "full_name", "phone", "phone_verified", "university", "profile_photo_url", "id_doc_url", "selfie_url", "verification_status", "subscription_plan", "commission_rate_pct", "payout_provider", "payout_reference", "created_at", "updated_at", "takedown_count", "avg_rating", "trusted_host", "is_suspended", "suspension_reason", "preferred_language", "admin_notes") VALUES
	('af97c808-a291-439c-8e72-81d427d55d2a', 'student', NULL, 'Neema Student', '+255700000201', true, 'UDSM', NULL, NULL, NULL, 'verified', 'free', NULL, NULL, NULL, '2026-02-27 16:10:36.47874+00', '2026-02-27 16:10:36.47874+00', 0, NULL, false, false, NULL, 'en', NULL),
	('a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', 'student', NULL, 'Juma Student', '+255700000202', true, 'IFM', NULL, NULL, NULL, 'verified', 'free', NULL, NULL, NULL, '2026-02-27 16:10:36.750564+00', '2026-02-27 16:10:36.750564+00', 0, NULL, false, false, NULL, 'en', NULL),
	('2aee506c-e263-478a-bcef-f3cc999a69b9', 'lister', 'owner', 'Asha Owner', '+255700000101', true, NULL, NULL, NULL, NULL, 'verified', 'verified', NULL, 'mpesa', '255700000101', '2026-02-27 16:10:35.911159+00', '2026-03-11 16:19:52.637864+00', 0, NULL, false, false, NULL, 'en', NULL),
	('e77965c7-7e4c-4ade-ba52-19472cd7d647', 'lister', 'manager', 'Baraka Manager', '+255700000102', true, NULL, NULL, NULL, NULL, 'verified', 'free', NULL, NULL, NULL, '2026-02-27 16:10:36.203972+00', '2026-03-11 16:19:53.178273+00', 0, NULL, false, false, NULL, 'en', NULL),
	('552fc1cf-4aae-4a00-be58-d3ab999f551c', 'admin', NULL, 'CampusStay Admin', '+255700000001', true, NULL, NULL, NULL, NULL, 'verified', 'premium', NULL, NULL, NULL, '2026-02-27 16:10:35.606465+00', '2026-03-12 01:01:53.422207+00', 0, NULL, false, false, NULL, 'sw', NULL);


--
-- Data for Name: admin_audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."admin_audit_log" ("id", "admin_id", "action", "target_type", "target_id", "reason", "created_at") VALUES
	('f95876d6-0f8b-42f6-8278-1ef2b7c3f194', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_landlord', 'landlord', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'Identity and selfie validated', '2026-02-27 16:10:42.216037+00'),
	('afafaf1c-0b6c-4d1f-bb11-f7166f438f72', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_listing', 'listing', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', 'Listing quality and photos verified', '2026-02-27 16:10:42.549249+00'),
	('7f9af304-e2be-4908-b57c-12675cf27f18', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'flag', 'listing', '45dddfdc-e7e2-4b10-bbcf-e5514d5ce0dc', 'Requires clarification on listing details', '2026-02-27 16:10:42.825938+00'),
	('d5d0e3c8-0339-4c66-847e-93054d20ebea', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'unflag', 'listing', '45dddfdc-e7e2-4b10-bbcf-e5514d5ce0dc', NULL, '2026-03-01 22:04:37.762785+00'),
	('d971d918-61dc-41a2-826c-62aa4775e325', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'unflag', 'listing', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', NULL, '2026-03-01 22:04:50.45704+00'),
	('604a89ea-27e9-4b5a-9ade-939218117c6f', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_listing', 'listing', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', NULL, '2026-03-01 22:04:52.925428+00'),
	('4726b169-aef0-4d56-a033-92d770be417e', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_listing', 'listing', '45dddfdc-e7e2-4b10-bbcf-e5514d5ce0dc', NULL, '2026-03-01 22:04:54.439429+00'),
	('3b630352-e751-49b1-8b5b-ac2f0ef6d58f', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_listing', 'listing', 'cc13818d-5001-4acc-b952-35fc2f598780', NULL, '2026-03-01 22:04:57.816168+00'),
	('9f043600-2414-4813-8036-cfc5f8eb0efc', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_landlord', 'landlord', '2aee506c-e263-478a-bcef-f3cc999a69b9', NULL, '2026-03-11 16:09:12.327429+00'),
	('9ace4f2c-9b69-4ee0-8073-1e4c9756d7b4', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_landlord', 'landlord', '2aee506c-e263-478a-bcef-f3cc999a69b9', NULL, '2026-03-11 16:09:15.20919+00'),
	('94feaa3c-4b22-4912-baf3-7ec0817b290e', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_landlord', 'landlord', '2aee506c-e263-478a-bcef-f3cc999a69b9', NULL, '2026-03-11 16:09:18.04273+00'),
	('29eb5c19-25d4-4153-9754-d3d445b28703', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_landlord', 'landlord', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', NULL, '2026-03-11 16:11:05.776091+00'),
	('2ff21683-0766-4682-88cd-1ec19b377312', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'reject_landlord', 'landlord', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'ID document is unclear or does not match profile details', '2026-03-11 16:11:22.006603+00'),
	('7ced1584-6402-4c18-90f3-1a9c5c7e5514', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_landlord', 'landlord', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', NULL, '2026-03-11 16:17:05.836284+00'),
	('90c0dfb6-6b78-48fb-9055-466f901c056b', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_landlord', 'landlord', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', NULL, '2026-03-11 16:17:15.489143+00'),
	('275df001-910a-4950-858d-2a7242f22eeb', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_landlord', 'landlord', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', NULL, '2026-03-11 16:17:15.527496+00'),
	('f4eb820b-a4a5-4e2b-86a7-2a17f92b7e4f', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_landlord', 'landlord', '2aee506c-e263-478a-bcef-f3cc999a69b9', NULL, '2026-03-11 16:17:16.557483+00'),
	('f6b93225-42a1-49d1-beaa-a89a32b8ee25', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_landlord', 'landlord', '2aee506c-e263-478a-bcef-f3cc999a69b9', NULL, '2026-03-11 16:17:16.585537+00'),
	('5d1e2c5b-0d90-43cf-8d63-ea0df03db436', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_landlord', 'landlord', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', NULL, '2026-03-11 16:17:17.550667+00'),
	('8b67f352-8932-4223-8d87-562054294dd5', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_landlord', 'landlord', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', NULL, '2026-03-11 16:17:17.73393+00'),
	('a0dbea86-5ca0-4064-8e3e-52342f1bf3fa', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_landlord', 'landlord', '2aee506c-e263-478a-bcef-f3cc999a69b9', NULL, '2026-03-11 16:17:18.427139+00'),
	('16369bb9-931d-4a62-ab7d-d298c4cf7b34', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_landlord', 'landlord', '2aee506c-e263-478a-bcef-f3cc999a69b9', NULL, '2026-03-11 16:17:18.4995+00'),
	('ed4ee37f-fe87-46d3-a774-ae2429a4b447', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_landlord', 'landlord', '2aee506c-e263-478a-bcef-f3cc999a69b9', NULL, '2026-03-11 16:19:52.637864+00'),
	('4e43fb3d-3d2d-411d-855f-0ed5b9cda536', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'approve_landlord', 'landlord', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', NULL, '2026-03-11 16:19:53.178273+00');


--
-- Data for Name: listings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."listings" ("id", "lister_id", "title", "description", "room_type", "gender_preference", "price_monthly", "utilities_included", "region", "district", "ward", "street", "lat", "lng", "amenities", "house_rules", "available_from", "vacancy_status", "status", "rejection_reason", "featured", "promotion_level", "promotion_expires_at", "view_count", "near_universities", "created_at", "updated_at", "screening_passed", "auto_published_at", "report_count", "upheld_claims_count") VALUES
	('11b5f12d-377f-40dc-8c8a-3fd3203f0550', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'Verified single room near UDSM gate', 'Private single room with reliable water, quiet compound, and easy daladala access to UDSM main campus.', 'single', 'any', 250000, true, 'Dar es Salaam', 'Ubungo', 'Sinza', 'Mlimani Street', -6.784000, 39.205000, '{"wifi": true, "water": true, "parking": false, "security": true, "generator": false, "electricity": true}', 'No loud music after 10PM. Visitors during daytime only.', '2026-03-10', 'available', 'approved', NULL, true, 1, NULL, 42, '{UDSM,ARDHI}', '2026-02-27 16:10:37.029299+00', '2026-03-01 22:04:52.925428+00', NULL, NULL, 2, 0),
	('45dddfdc-e7e2-4b10-bbcf-e5514d5ce0dc', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'Bedsit near Mwenge bus stand', 'Bedsit unit close to transport routes. Needs profile moderation follow-up before approval.', 'bedsit', 'any', 220000, true, 'Dar es Salaam', 'Kinondoni', 'Mwenge', 'Sam Nujoma Road', -6.772700, 39.232600, '{"wifi": false, "water": true, "parking": false, "security": false, "generator": false, "electricity": true}', 'No smoking indoors.', '2026-04-01', 'available', 'approved', NULL, false, 0, NULL, 15, '{UDSM}', '2026-02-27 16:10:37.609733+00', '2026-03-01 22:04:54.439429+00', NULL, NULL, 0, 0),
	('cc13818d-5001-4acc-b952-35fc2f598780', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', 'Shared apartment room in Kinondoni', 'Shared apartment option with furnished common area and strong neighborhood security.', 'shared', 'female', 180000, false, 'Dar es Salaam', 'Kinondoni', 'Makumbusho', 'Kijitonyama Road', -6.766200, 39.241400, '{"wifi": true, "water": true, "parking": true, "security": true, "generator": false, "electricity": true}', 'Female tenants only. One month deposit required.', '2026-03-15', 'coming_soon', 'approved', NULL, false, 0, NULL, 8, '{IFM}', '2026-02-27 16:10:37.329794+00', '2026-03-01 22:04:57.816168+00', NULL, NULL, 0, 0);


--
-- Data for Name: bookings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: campuscover_claims; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."conversations" ("id", "listing_id", "tenant_id", "lister_id", "inquiry_status", "move_in_date", "last_message_at", "created_at", "updated_at") VALUES
	('92447701-9976-4c88-bf14-46d71db54868', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'open', '2026-03-01', '2026-02-27 16:18:22.826+00', '2026-02-27 16:18:22.392061+00', '2026-02-27 16:18:23.074528+00'),
	('54860a3d-4a85-42c9-b3ba-acf5427af104', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', 'af97c808-a291-439c-8e72-81d427d55d2a', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'interested', '2026-03-20', '2026-03-01 11:01:12.679664+00', '2026-02-27 16:10:39.38649+00', '2026-03-01 11:01:12.679664+00'),
	('decd1a02-f2c4-4101-b2f5-7c3a4958a573', 'cc13818d-5001-4acc-b952-35fc2f598780', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', 'open', '2026-03-30', '2026-02-27 16:10:40.904031+00', '2026-02-27 16:10:39.665045+00', '2026-03-08 18:42:52.833212+00'),
	('9b40a157-6325-4e70-bfd0-b3e00f349ae4', '45dddfdc-e7e2-4b10-bbcf-e5514d5ce0dc', '552fc1cf-4aae-4a00-be58-d3ab999f551c', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'open', NULL, '2026-03-11 16:24:20.664896+00', '2026-03-01 21:41:02.942665+00', '2026-03-11 16:24:20.664896+00');


--
-- Data for Name: error_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."error_logs" ("id", "user_id", "route", "error_msg", "stack_trace", "user_agent", "created_at") VALUES
	('ff71cec7-c009-4234-bcff-69b31631fe61', NULL, '/', 'maintenanceMode is not defined', 'ReferenceError: maintenanceMode is not defined
    at Layout (http://localhost:5173/src/components/Layout.tsx?t=1773170423015:196:27)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:11548:26)
    at mountIndeterminateComponent (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:14926:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:15914:22)
    at beginWork$1 (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19753:22)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19198:20)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19137:13)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19116:15)
    at recoverFromConcurrentError (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-10 19:20:23.486856+00'),
	('85beaf1f-9806-4bd7-991e-8165a9259fd6', NULL, '/search', 'maintenanceMode is not defined', 'ReferenceError: maintenanceMode is not defined
    at Layout (http://localhost:5173/src/components/Layout.tsx?t=1773170423015:196:27)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:11548:26)
    at mountIndeterminateComponent (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:14926:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:15914:22)
    at beginWork$1 (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19753:22)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19198:20)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19137:13)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19116:15)
    at recoverFromConcurrentError (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-10 19:20:24.198209+00'),
	('9593ef98-7ee7-4c36-80c9-9850280fe3d9', NULL, '/login', 'maintenanceMode is not defined', 'ReferenceError: maintenanceMode is not defined
    at Layout (http://localhost:5173/src/components/Layout.tsx?t=1773170423015:196:27)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:11548:26)
    at mountIndeterminateComponent (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:14926:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:15914:22)
    at beginWork$1 (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19753:22)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19198:20)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19137:13)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19116:15)
    at recoverFromConcurrentError (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-10 19:20:24.199995+00'),
	('4e77dd49-8497-4261-8411-351fa3d18f4c', NULL, '/', 'showMaintenance is not defined', 'ReferenceError: showMaintenance is not defined
    at Layout (http://localhost:5173/src/components/Layout.tsx?t=1773170464965:209:5)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:11548:26)
    at mountIndeterminateComponent (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:14926:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:15914:22)
    at beginWork$1 (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19753:22)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19198:20)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19137:13)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19116:15)
    at recoverFromConcurrentError (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-10 19:21:05.306213+00'),
	('26f023a7-3d86-4d85-ab67-512204186b5b', NULL, '/search', 'showMaintenance is not defined', 'ReferenceError: showMaintenance is not defined
    at Layout (http://localhost:5173/src/components/Layout.tsx?t=1773170464965:209:5)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:11548:26)
    at mountIndeterminateComponent (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:14926:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:15914:22)
    at beginWork$1 (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19753:22)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19198:20)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19137:13)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19116:15)
    at recoverFromConcurrentError (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-10 19:21:06.195482+00'),
	('56ab9868-087c-41e0-a488-2f611613fb2a', NULL, '/login', 'showMaintenance is not defined', 'ReferenceError: showMaintenance is not defined
    at Layout (http://localhost:5173/src/components/Layout.tsx?t=1773170464965:209:5)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:11548:26)
    at mountIndeterminateComponent (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:14926:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:15914:22)
    at beginWork$1 (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19753:22)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19198:20)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19137:13)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19116:15)
    at recoverFromConcurrentError (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-10 19:21:06.206418+00'),
	('c8d472d7-1837-443d-a1be-67f90ce0d042', NULL, '/login', 'showMaintenance is not defined', 'ReferenceError: showMaintenance is not defined
    at Layout (http://localhost:5173/src/components/Layout.tsx?t=1773170464965:209:5)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:11548:26)
    at mountIndeterminateComponent (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:14926:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:15914:22)
    at beginWork$1 (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19753:22)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19198:20)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19137:13)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19116:15)
    at recoverFromConcurrentError (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-10 19:22:37.388167+00'),
	('5521b982-39cc-4d9a-8108-bad672623489', NULL, '/', 'showMaintenance is not defined', 'ReferenceError: showMaintenance is not defined
    at Layout (http://localhost:5173/src/components/Layout.tsx?t=1773170464965:209:5)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:11548:26)
    at mountIndeterminateComponent (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:14926:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:15914:22)
    at beginWork$1 (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19753:22)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19198:20)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19137:13)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19116:15)
    at recoverFromConcurrentError (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-10 19:22:37.388173+00'),
	('bed36bc9-2646-434a-b8fa-77afd336017a', NULL, '/search', 'showMaintenance is not defined', 'ReferenceError: showMaintenance is not defined
    at Layout (http://localhost:5173/src/components/Layout.tsx?t=1773170464965:209:5)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:11548:26)
    at mountIndeterminateComponent (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:14926:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:15914:22)
    at beginWork$1 (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19753:22)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19198:20)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19137:13)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19116:15)
    at recoverFromConcurrentError (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-10 19:22:37.388259+00'),
	('5af95569-ff40-4386-80ce-52b3f73ccf82', NULL, '/admin', 'useAuth must be used within AuthProvider', 'Error: useAuth must be used within AuthProvider
    at useAuth (http://localhost:5173/src/context/AuthContext.tsx:329:11)
    at App (http://localhost:5173/src/App.tsx?t=1773171165354:46:31)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:11548:26)
    at mountIndeterminateComponent (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:14926:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:15914:22)
    at beginWork$1 (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19753:22)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19198:20)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19137:13)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19116:15)
    at recoverFromConcurrentError (http://loca', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-10 19:36:26.311796+00'),
	('50a1742d-b63e-41d9-850c-f27e17279d13', NULL, '/messages/decd1a02-f2c4-4101-b2f5-7c3a4958a573', 'useAuth must be used within AuthProvider', 'Error: useAuth must be used within AuthProvider
    at useAuth (http://localhost:5173/src/context/AuthContext.tsx:329:11)
    at App (http://localhost:5173/src/App.tsx?t=1773170625038:46:31)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:11548:26)
    at mountIndeterminateComponent (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:14926:21)
    at beginWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:15914:22)
    at beginWork$1 (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19753:22)
    at performUnitOfWork (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19198:20)
    at workLoopSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19137:13)
    at renderRootSync (http://localhost:5173/node_modules/.vite/deps/chunk-PJEEZAML.js?v=ea0bf905:19116:15)
    at recoverFromConcurrentError (http://loca', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-10 19:36:26.311839+00');


--
-- Data for Name: listing_checks; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: listing_drafts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."listing_drafts" ("lister_id", "current_step", "data", "created_at", "updated_at") VALUES
	('e77965c7-7e4c-4ade-ba52-19472cd7d647', 5, '{"lat": "", "lng": "", "ward": "Kivukoni", "phone": "", "title": "Draft listing near IFM", "region": "Dar es Salaam", "street": "Sokoine Drive", "district": "Ilala", "fullName": "", "roomType": "single", "amenities": {"wifi": false, "water": false, "parking": false, "security": false, "generator": false, "electricity": false}, "houseRules": "", "listerType": "owner", "university": "UDSM", "description": "", "priceMonthly": 210000, "availableFrom": "", "policyAccepted": false, "genderPreference": "any", "utilitiesIncluded": false}', '2026-02-27 16:10:41.937045+00', '2026-03-11 18:53:29.733715+00'),
	('2aee506c-e263-478a-bcef-f3cc999a69b9', 5, '{"lat": "", "lng": "", "ward": "", "phone": "+255700000101", "title": "", "region": "Dar es Salaam", "street": "", "district": "", "fullName": "Asha Owner", "roomType": "single", "amenities": {"wifi": false, "water": false, "parking": false, "security": false, "generator": false, "electricity": false}, "houseRules": "", "listerType": "manager", "university": "UDSM", "description": "", "priceMonthly": "", "availableFrom": "", "policyAccepted": false, "genderPreference": "any", "utilitiesIncluded": false}', '2026-02-27 16:19:45.685377+00', '2026-03-07 09:05:17.156069+00');


--
-- Data for Name: listing_photos; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."listing_photos" ("id", "listing_id", "angle", "storage_path", "public_url", "ai_verified", "ai_confidence", "created_at", "updated_at") VALUES
	('3a864c09-1342-4fa4-91eb-96e619c37b6e', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', 'bedroom', 'seed/11b5f12d-377f-40dc-8c8a-3fd3203f0550/bedroom.jpg', 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80', true, 0.9300, '2026-02-27 16:10:38.044381+00', '2026-02-27 16:10:38.044381+00'),
	('a9a59126-8678-4d61-9c73-13d9e1e333fb', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', 'kitchen', 'seed/11b5f12d-377f-40dc-8c8a-3fd3203f0550/kitchen.jpg', 'https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=1200&q=80', true, 0.9000, '2026-02-27 16:10:38.352091+00', '2026-02-27 16:10:38.352091+00'),
	('d50f8a98-78c6-4862-bd21-e462c83fad89', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', 'bathroom', 'seed/11b5f12d-377f-40dc-8c8a-3fd3203f0550/bathroom.jpg', 'https://images.unsplash.com/photo-1584622781564-1d987f7333c1?auto=format&fit=crop&w=1200&q=80', true, 0.8800, '2026-02-27 16:10:38.631687+00', '2026-02-27 16:10:38.631687+00'),
	('01b4da73-9221-4d2c-8063-51a5deb36fa0', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', 'outside', 'seed/11b5f12d-377f-40dc-8c8a-3fd3203f0550/outside.jpg', 'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=80', true, 0.9100, '2026-02-27 16:10:39.05508+00', '2026-02-27 16:10:39.05508+00');


--
-- Data for Name: listing_reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."listing_reports" ("id", "listing_id", "reporter_id", "reason", "description", "evidence_urls", "reporter_has_booking", "status", "admin_note", "created_at") VALUES
	('4d0c3fe9-9039-4e44-92f2-7c9419eafd62', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', 'af97c808-a291-439c-8e72-81d427d55d2a', 'fraud', 'sdfdb ', '{}', false, 'pending', NULL, '2026-03-01 21:23:19.91825+00'),
	('14a9043e-7d5c-47ae-8116-0c38b274894e', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'fraud', 'dgfhmn', '{}', false, 'upheld', 'report seem to need an evaluation', '2026-03-01 21:23:34.04542+00');


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."messages" ("id", "conversation_id", "sender_id", "body", "seen_at", "created_at") VALUES
	('91f58ea8-e727-4f6a-9880-bc68e6a31e04', '54860a3d-4a85-42c9-b3ba-acf5427af104', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'Yes, it is available. You can schedule a visit this weekend.', '2026-03-01 10:52:37.924+00', '2026-02-27 16:10:40.274666+00'),
	('03d2305d-2b9d-4187-a413-4a3748d40677', '54860a3d-4a85-42c9-b3ba-acf5427af104', 'af97c808-a291-439c-8e72-81d427d55d2a', 'Hi, is this room still available for March move-in?', '2026-03-01 10:54:15.726+00', '2026-02-27 16:10:39.990674+00'),
	('a6df83f8-6798-4fba-bb68-ad8fa63c1a25', '54860a3d-4a85-42c9-b3ba-acf5427af104', 'af97c808-a291-439c-8e72-81d427d55d2a', 'how do i reach there', '2026-03-01 10:54:15.726+00', '2026-03-01 10:53:01.601512+00'),
	('bcadf242-8829-4492-a5a8-87c377b77143', '92447701-9976-4c88-bf14-46d71db54868', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', 's;kcmba;dfkmvaDKM', '2026-03-01 10:54:39.975+00', '2026-02-27 16:18:22.692855+00'),
	('139a65a6-cddb-4cc8-b701-3a9a2e681b12', '54860a3d-4a85-42c9-b3ba-acf5427af104', 'af97c808-a291-439c-8e72-81d427d55d2a', 'pitia mikochenii', '2026-03-01 11:01:20.961+00', '2026-03-01 11:01:12.679664+00'),
	('d2b2497f-a2aa-4a9d-920b-799cf56dd1f4', '9b40a157-6325-4e70-bfd0-b3e00f349ae4', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'whats wrong with your room', '2026-03-01 21:42:46.491+00', '2026-03-01 21:41:24.55906+00'),
	('7ba04f4e-3527-4531-8b39-f7f8ef321c3e', 'decd1a02-f2c4-4101-b2f5-7c3a4958a573', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', 'Can you share updated photos of the common areas?', '2026-03-01 21:54:14.738+00', '2026-02-27 16:10:40.628754+00'),
	('767f0533-5c1b-4a36-9bcb-e239fa8ed7d8', '9b40a157-6325-4e70-bfd0-b3e00f349ae4', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'i will solve boss', '2026-03-01 21:56:53.648+00', '2026-03-01 21:56:10.897637+00'),
	('032fcf07-18f8-4c2d-bc95-a6fc2a78ca30', 'decd1a02-f2c4-4101-b2f5-7c3a4958a573', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', 'Sure, I will upload them this evening.', '2026-03-11 02:48:24.825+00', '2026-02-27 16:10:40.904031+00'),
	('2bfdd875-ea8f-46df-b293-8a40a34cf9f3', '9b40a157-6325-4e70-bfd0-b3e00f349ae4', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'have you fixed?', '2026-03-11 16:24:21.252+00', '2026-03-11 16:24:20.664896+00');


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."notifications" ("id", "user_id", "type", "title", "body", "link", "read_at", "created_at") VALUES
	('85a150c6-1b15-4d0a-93fc-393b8dee5e36', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', 'system_alert', 'System Alert', 'oyyy', NULL, '2026-03-10 20:55:43.525+00', '2026-03-10 20:55:25.949008+00'),
	('80f3e93d-2e26-4d45-8478-cb83d68e2289', 'af97c808-a291-439c-8e72-81d427d55d2a', 'system_alert', 'System Alert', 'want cake', NULL, NULL, '2026-03-10 21:00:26.863154+00'),
	('0ab06ab1-e1c8-49d3-9aa6-919ddf817a6d', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'system_alert', 'System Alert', 'want cake', NULL, '2026-03-10 21:00:30.249+00', '2026-03-10 21:00:26.863154+00'),
	('d2ea7a1a-ba9d-46c1-8d6c-efacc6acf68e', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', 'system_alert', 'System Alert', 'want cake', NULL, '2026-03-10 21:01:01.964+00', '2026-03-10 21:00:26.863154+00'),
	('67f039d4-4ec6-4ca0-8d73-1ed3244c96c9', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', 'message', 'Your reply to: "System Alert"', 'yes', NULL, '2026-03-10 21:02:26.956+00', '2026-03-10 21:01:11.839537+00'),
	('e99bb80b-1613-40ff-992b-8a888771f285', 'af97c808-a291-439c-8e72-81d427d55d2a', 'system_alert', 'System Alert', 'sb', NULL, NULL, '2026-03-10 21:02:55.452428+00'),
	('e82d19f3-cfc6-4fb1-a0c8-5465d3c70150', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'system_alert', 'System Alert', 'sb', NULL, '2026-03-10 21:02:57.776+00', '2026-03-10 21:02:55.452428+00'),
	('2f6c6aac-85f1-4625-96be-ed27c538b35f', '552fc1cf-4aae-4a00-be58-d3ab999f551c', 'message', 'Reply from CampusStay Admin: "System Alert"', 'fuck', NULL, '2026-03-10 21:03:48.774+00', '2026-03-10 21:03:41.893828+00'),
	('136acc0b-15b0-4dd1-851f-a58bdbefe3b0', 'e77965c7-7e4c-4ade-ba52-19472cd7d647', 'system_alert', 'System Alert', 'sb', NULL, '2026-03-10 22:02:10.886+00', '2026-03-10 21:02:55.452428+00'),
	('d7097e7d-4b8f-4be0-aed4-97ef7cd44c52', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'system_alert', 'System Alert', 'sb', NULL, '2026-03-11 01:15:03.068+00', '2026-03-10 21:02:55.452428+00'),
	('3ec4c390-6cbb-4d14-88b5-738baabf0852', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'system_alert', 'System Alert', 'want cake', NULL, '2026-03-11 01:15:03.069+00', '2026-03-10 21:00:26.863154+00'),
	('affc006c-385c-4409-b69d-b73a57558fe9', '2aee506c-e263-478a-bcef-f3cc999a69b9', 'system_alert', 'System Alert', 'oyyy', NULL, '2026-03-11 01:15:03.069+00', '2026-03-10 20:55:25.949008+00'),
	('a2bdc2a9-8d76-4775-b9b8-d7eff966ec26', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', 'system_alert', 'System Alert', 'want cake', NULL, '2026-03-11 02:49:02.179+00', '2026-03-10 21:00:26.863154+00'),
	('7d18c507-da0d-435a-9820-7f224386cfc2', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', 'system_alert', 'System Alert', 'sb', NULL, '2026-03-11 02:49:02.179+00', '2026-03-10 21:02:55.452428+00');


--
-- Data for Name: payment_records; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: phone_verification_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."reviews" ("id", "listing_id", "tenant_id", "rating", "comment", "is_hidden", "created_at", "updated_at", "rating_accuracy", "rating_cleanliness", "rating_communication", "rating_location", "rating_value", "rating_safety", "landlord_reply", "is_removed", "removal_reason", "body") VALUES
	('fae15fba-763b-4be7-b9ee-febef8e8e7f1', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', 'a70ff7e6-f0bb-4124-9429-671cc5d2eb6e', 4, 'nice room', false, '2026-03-01 10:18:52.64887+00', '2026-03-01 10:18:52.64887+00', NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL);


--
-- Data for Name: saved_listings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."saved_listings" ("tenant_id", "listing_id", "saved_at") VALUES
	('af97c808-a291-439c-8e72-81d427d55d2a', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', '2026-02-27 19:25:34.042603+00'),
	('e77965c7-7e4c-4ade-ba52-19472cd7d647', '11b5f12d-377f-40dc-8c8a-3fd3203f0550', '2026-02-27 20:07:04.172921+00');


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."system_settings" ("key", "value", "updated_at", "updated_by") VALUES
	('maintenance_mode', 'false', '2026-03-10 19:12:26.008942+00', NULL),
	('global_announcement', '""', '2026-03-10 19:12:26.008942+00', NULL);


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES
	('listing-photos', 'listing-photos', NULL, '2026-02-27 15:01:50.850056+00', '2026-02-27 15:01:50.850056+00', true, false, 52428800, '{image/jpeg,image/png,image/webp}', NULL, 'STANDARD'),
	('identity-docs', 'identity-docs', NULL, '2026-02-27 15:01:50.850056+00', '2026-02-27 15:01:50.850056+00', false, false, 52428800, '{image/jpeg,image/png,application/pdf}', NULL, 'STANDARD');


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
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

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 85, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict ZaRaIEVZlY8QSmOrqtmSEViyqteilEb0EsSXYi5sMbjzDjLIURY7WbL6lAAHdIJ

RESET ALL;
