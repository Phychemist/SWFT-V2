-- Enable Realtime for the tickets table
-- Run this in your Supabase SQL Editor to ensure updates are broadcasted.

ALTER PUBLICATION supabase_realtime ADD TABLE tickets;

-- If you get an error that the table is already in the publication, it's already enabled.
-- If the publication doesn't exist, create it first:
-- CREATE PUBLICATION supabase_realtime FOR TABLE tickets;
