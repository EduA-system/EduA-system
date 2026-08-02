-- Data cleanup: some library_contents rows carry a 'DRAFT' status value that
-- was never a valid LibraryContentStatus enum constant (PRIVATE, SUBMITTED,
-- APPROVED, REJECTED), causing Hibernate enum deserialization to fail on read.
UPDATE library_contents SET status = 'PRIVATE' WHERE status = 'DRAFT';
