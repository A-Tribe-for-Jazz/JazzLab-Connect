-- Dynamic preference limit update
ALTER TABLE preferences DROP CONSTRAINT IF EXISTS preferences_rank_check;
ALTER TABLE preferences ADD CONSTRAINT preferences_rank_check CHECK (rank >= 1 AND rank <= 10);
