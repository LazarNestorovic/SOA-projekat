ALTER TABLE profiles
ADD COLUMN user_id INTEGER NOT NULL,
ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Učini polja opcionalnim
ALTER TABLE profiles
ALTER COLUMN name DROP NOT NULL,
ALTER COLUMN surname DROP NOT NULL,
ALTER COLUMN image_url DROP NOT NULL,
ALTER COLUMN biography DROP NOT NULL,
ALTER COLUMN moto DROP NOT NULL;

-- Dodaj default vrijednosti za postojeće redove
UPDATE profiles SET name = '', surname = '', image_url = '', biography = '', moto = '' WHERE name IS NULL;
