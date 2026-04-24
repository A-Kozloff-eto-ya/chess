CREATE OR REPLACE FUNCTION slugify(text) RETURNS text AS $$
DECLARE
    result text;
BEGIN
    result := lower($1);
    result := translate(result,
        'àáâãäåèéêëìíîïòóôõöùúûüýÿñç',
        'aaaaaaeeeeiiiiooooouuuuyync'
    );
    result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
    result := trim(both '-' from result);
    result := regexp_replace(result, '-+', '-', 'g');
    IF result = '' THEN
        result := 'app';
    END IF;
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    app_slug VARCHAR(100) NOT NULL UNIQUE,
    app_name VARCHAR(100) NOT NULL,
    github_url VARCHAR(500),
    github_stars INT DEFAULT 0,
    github_stars_updated_at TIMESTAMP WITH TIME ZONE,
    logo_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_applications_slug ON applications(app_slug);

INSERT INTO applications (app_slug, app_name)
SELECT DISTINCT slugify(app_name), app_name
FROM instances
WHERE app_name IS NOT NULL AND app_name != ''
ON CONFLICT (app_slug) DO NOTHING;

ALTER TABLE instances
    ADD COLUMN application_id UUID;

UPDATE instances i
SET application_id = a.id
FROM applications a
WHERE slugify(i.app_name) = a.app_slug;

ALTER TABLE instances
    ADD CONSTRAINT fk_instances_application
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE RESTRICT;

CREATE INDEX idx_instances_application_id ON instances(application_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
