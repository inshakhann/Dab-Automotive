-- Test-only data. This file is NEVER run by npm run migrate.
CREATE TABLE test_workshop_receipts(receipt_id text,amount numeric,currency text,received_at timestamptz);
CREATE TABLE test_store_receipts(LIKE test_workshop_receipts);
INSERT INTO test_workshop_receipts VALUES ('w1',1000.00,'PKR','2026-11-01T00:00:00Z'),('old',9000.00,'PKR','2026-10-31T23:59:59Z');
INSERT INTO test_store_receipts VALUES ('s1',300.00,'PKR','2026-11-30T23:59:59Z'),('refund1',-50.00,'PKR','2026-11-25T00:00:00Z'),('future',9000.00,'PKR','2026-12-01T00:00:00Z');
CREATE VIEW insha_workshop_revenue AS SELECT * FROM test_workshop_receipts;
CREATE VIEW insha_store_revenue AS SELECT * FROM test_store_receipts;
CREATE VIEW insha_reporting_jobs AS SELECT 'j1'::text AS job_id,'in_progress'::text AS status,'2026-11-25T00:00:00Z'::timestamptz AS scheduled_at,1::integer AS worker_id,'b1'::text AS bay_id;
CREATE VIEW insha_reporting_bays AS SELECT 'b1'::text AS bay_id,true AS is_active;
CREATE VIEW insha_reporting_orders AS SELECT 'o1'::text AS order_id,'delivered'::text AS status,'2026-11-25T00:00:00Z'::timestamptz AS placed_at,300.00::numeric AS total_amount,'PKR'::text AS currency;
CREATE VIEW insha_reporting_reviews AS SELECT 'r1'::text AS review_id,'positive'::text AS sentiment,'2026-11-25T00:00:00Z'::timestamptz AS created_at;
