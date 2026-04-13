CREATE TABLE profiles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    surname VARCHAR(255) NOT NULL,
    image_url VARCHAR(255) NOT NULL,
    biography VARCHAR(255) NOT NULL,
    moto VARCHAR(255) NOT NULL
)