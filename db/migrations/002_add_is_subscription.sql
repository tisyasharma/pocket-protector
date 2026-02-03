ALTER TABLE Stores ADD COLUMN is_subscription BOOLEAN DEFAULT FALSE;

UPDATE Stores SET is_subscription = TRUE
WHERE LOWER(store_name) LIKE '%equinox%'
   OR LOWER(store_name) LIKE '%planet fitness%'
   OR LOWER(store_name) LIKE '%boston sports club%'
   OR LOWER(store_name) LIKE '%cambridge athletic%'
   OR LOWER(store_name) LIKE '%comcast%'
   OR LOWER(store_name) LIKE '%xfinity%'
   OR LOWER(store_name) LIKE '%verizon%'
   OR LOWER(store_name) LIKE '%national grid%'
   OR LOWER(store_name) LIKE '%blue cross%'
   OR LOWER(store_name) LIKE '%bright horizons%'
   OR LOWER(store_name) LIKE '%netflix%'
   OR LOWER(store_name) LIKE '%spotify%'
   OR LOWER(store_name) LIKE '%hulu%'
   OR LOWER(store_name) LIKE '%disney+%';
