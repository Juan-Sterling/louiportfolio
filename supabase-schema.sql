-- ==============================================================================
-- QUERY CEPAT UNTUK MENGHAPUS KOLOM 'ASPECT' DAN 'KEY'/SLUG DARI SUPABASE (JALANKAN DI SQL EDITOR):
-- ==============================================================================
-- ALTER TABLE contents DROP COLUMN IF EXISTS aspect;
-- ALTER TABLE subcategories DROP CONSTRAINT IF EXISTS unique_category_sub_key;
-- ALTER TABLE subcategories DROP CONSTRAINT IF EXISTS subcategories_category_id_key_key;
-- ALTER TABLE subcategories DROP COLUMN IF EXISTS key;
-- ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_key_key;
-- ALTER TABLE categories DROP COLUMN IF EXISTS key;
-- ==============================================================================
-- LOUI PORTFOLIO — CLEAN & PURPOSE-BUILT SUPABASE SCHEMA
-- Disederhanakan khusus untuk Visual Portfolio Loui
-- ==============================================================================

-- 1. HAPUS TABEL & OBJEK LAMA YANG MUBARZIR / TIDAK DIPAKAI (JIKA RESET SCHEMA)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS media CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS contents CASCADE;
DROP TABLE IF EXISTS subcategories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- 2. EXTENSION
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. FUNGSI OTOMATIS UPDATE KOLOM `updated_at`
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 4. TABEL 1: CATEGORIES (Kategori Utama)
-- Mendukung penambahan, penghapusan, dan edit kategori di masa depan
-- ==============================================================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,                  -- Nama Kategori (e.g. 'Photography', 'Videography')
    description TEXT,                     -- Teks deskripsi kategori
    order_index INT DEFAULT 0,            -- Urutan tampilan tab di navbar/filter
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER set_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==============================================================================
-- 5. TABEL 2: SUBCATEGORIES (Subkategori per Kategori)
-- Mendukung penambahan, penghapusan, dan edit subkategori di masa depan
-- ==============================================================================
CREATE TABLE subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    label TEXT NOT NULL,                  -- Nama Subkategori (e.g. 'Event Photoshoot', 'Music Video')
    description TEXT,                     -- Deskripsi spesifik subkategori (tampil di header galeri & lightbox)
    order_index INT DEFAULT 0,            -- Urutan tampilan subkategori
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);

CREATE TRIGGER set_subcategories_updated_at
    BEFORE UPDATE ON subcategories
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==============================================================================
-- 6. TABEL 3: CONTENTS (Item Portofolio: Foto & Video)
-- Hanya kolom yang BENAR-BENAR tampil dan berguna di halaman web
-- ==============================================================================
CREATE TABLE contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subcategory_id UUID NOT NULL REFERENCES subcategories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,                  -- Judul project / item
    description TEXT,                     -- Deskripsi singkat project
    type TEXT NOT NULL DEFAULT 'photo' CHECK (type IN ('photo', 'video')),
    image_url TEXT NOT NULL,              -- URL Cloudinary atau thumbnail YouTube
    video_url TEXT,                       -- Link video YouTube (jika type = 'video')
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    order_index INT DEFAULT 0,            -- Urutan karya
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_contents_subcategory_id ON contents(subcategory_id);
CREATE INDEX idx_contents_status ON contents(status);

CREATE TRIGGER set_contents_updated_at
    BEFORE UPDATE ON contents
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

-- A. Categories (Publik bisa baca, Admin / Authenticated bisa kelola penuh)
CREATE POLICY "Public can view categories" 
    ON categories FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage categories" 
    ON categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon dev can manage categories" 
    ON categories FOR ALL TO anon USING (true) WITH CHECK (true);

-- B. Subcategories (Publik bisa baca, Admin / Authenticated bisa kelola penuh)
CREATE POLICY "Public can view subcategories" 
    ON subcategories FOR SELECT USING (true);
CREATE POLICY "Authenticated can manage subcategories" 
    ON subcategories FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon dev can manage subcategories" 
    ON subcategories FOR ALL TO anon USING (true) WITH CHECK (true);

-- C. Contents (Publik hanya baca status 'published', Admin bisa kelola penuh)
CREATE POLICY "Public can view published contents" 
    ON contents FOR SELECT USING (status = 'published');
CREATE POLICY "Authenticated can manage contents" 
    ON contents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon dev can manage contents" 
    ON contents FOR ALL TO anon USING (true) WITH CHECK (true);

-- ==============================================================================
-- 8. INITIAL SEED DATA
-- Isi awal 4 Kategori Utama, 13 Subkategori, dan 20 Karya Portofolio
-- ==============================================================================

-- A. Categories Utama
INSERT INTO categories (key, label, description, order_index) VALUES
('photography', 'Photography', 'EVENT PHOTOSHOOT, MODEL PHOTOSHOOT, RETRO CAMERA, ‘CAT EYE’ PROJECT', 1),
('videography', 'Videography', 'MUSIC VIDEO, CINEMATIC EDIT, COMPETITION', 2),
('graphic-design', 'Graphic Design', 'KARBIDA FC, EVENT POSTERS, THUMBNAILS, RE-CREATE', 3),
('loui-tee', 'Loui Tee', 'TEE PRODUCTION ©2025 — ‘BOOTLEG’ GRAPHIC TEE PRODUCTS & CUSTOM ORDER', 4);

-- B. Subcategories
-- Photography
INSERT INTO subcategories (category_id, key, label, description, order_index)
SELECT id, 'event-photoshoot', 'Event Photoshoot', 'FOR BIRTHDAY, WEDDING, GRADUATION, OR MUSIC EVENT', 1 FROM categories WHERE key = 'photography';
INSERT INTO subcategories (category_id, key, label, description, order_index)
SELECT id, 'model-photoshoot', 'Model Photoshoot', 'FOR FAMILY POTRAIT, COUPLE, FRIENDS, AND ANOTHER MEMORIES WITH THE LOVED ONES', 2 FROM categories WHERE key = 'photography';
INSERT INTO subcategories (category_id, key, label, description, order_index)
SELECT id, 'retro-camera', 'Retro Camera', 'FOR THOSE WHO WANT SOMETHING BOLD, UNIQUE, AND TOUCH OF NOSTALGIA', 3 FROM categories WHERE key = 'photography';
INSERT INTO subcategories (category_id, key, label, description, order_index)
SELECT id, 'cat-eye-project', '‘Cat Eye’ Project', 'MY EXPERIMENTAL PROJECT, PORTRAYS THE LIVES OF STRAY CATS SURVIVING IN THE HUMAN WORLD.', 4 FROM categories WHERE key = 'photography';

-- Videography
INSERT INTO subcategories (category_id, key, label, description, order_index)
SELECT id, 'music-video', 'Music Video', 'I’VE EDITED SOME MUSIC VIDEOS, BOTH OFFICIAL SONG AND COVER SONG', 1 FROM categories WHERE key = 'videography';
INSERT INTO subcategories (category_id, key, label, description, order_index)
SELECT id, 'cinematic-edit', 'Cinematic Edit', 'CINEMATIC MOTION & COLOR', 2 FROM categories WHERE key = 'videography';
INSERT INTO subcategories (category_id, key, label, description, order_index)
SELECT id, 'competition', 'Competition', 'THESE ARE SOME VIDEOS I’VE SUBMITTED FOR VIDEO COMPETITION', 3 FROM categories WHERE key = 'videography';

-- Graphic Design
INSERT INTO subcategories (category_id, key, label, description, order_index)
SELECT id, 'karbida-fc', 'Karbida FC', 'FOOTBALL, COMIC-STYLE, FOR GANINDRA BIMO (INSTAGRAM FEEDS FORMAT)', 1 FROM categories WHERE key = 'graphic-design';
INSERT INTO subcategories (category_id, key, label, description, order_index)
SELECT id, 'event-posters', 'Event Posters', 'INSTAGRAM FEEDS FORMAT (SQUARE, 1080 x 1080p)', 2 FROM categories WHERE key = 'graphic-design';
INSERT INTO subcategories (category_id, key, label, description, order_index)
SELECT id, 'thumbnails', 'Thumbnails', 'MOSTLY, FOR YOUTUBE PLATFORM (1920 x 1080p)', 3 FROM categories WHERE key = 'graphic-design';
INSERT INTO subcategories (category_id, key, label, description, order_index)
SELECT id, 're-create', 'Re-create', 'THE IDEA IS RE-CREATING BAND/MOVIES POSTER WITH MY CREATIVE WAY', 4 FROM categories WHERE key = 'graphic-design';

-- Loui Tee
INSERT INTO subcategories (category_id, key, label, description, order_index)
SELECT id, 'graphic-tee', 'Graphic Tee', '‘BOOTLEG’ GRAPHIC TEE PRODUCTS (RELEASED SO FAR . . .)', 1 FROM categories WHERE key = 'loui-tee';
INSERT INTO subcategories (category_id, key, label, description, order_index)
SELECT id, 'custom-order', 'Custom Order', 'YOU CAN ALSO GET YOUR OWN GRAPHIC TEE. JUST SAY THE WORD AND LET ME DO IT FOR YOU! HERE SOME OF THE RESULTS!', 2 FROM categories WHERE key = 'loui-tee';

-- C. Initial Contents (Foto & Video Portofolio)
-- Video Items (YouTube Thumbnails Resmi)
INSERT INTO contents (subcategory_id, title, description, type, image_url, video_url, status)
SELECT id, 'Music Video Edit', 'I’VE EDITED SOME MUSIC VIDEOS, BOTH OFFICIAL SONG AND COVER SONG', 'video', 'https://img.youtube.com/vi/XyLoPRmUR3s/maxresdefault.jpg', 'https://www.youtube.com/embed/XyLoPRmUR3s?autoplay=1', 'published'
FROM subcategories WHERE key = 'music-video' LIMIT 1;

INSERT INTO contents (subcategory_id, title, description, type, image_url, video_url, status)
SELECT id, 'Cinematic Motion', 'CINEMATIC MOTION & COLOR', 'video', 'https://img.youtube.com/vi/g1j1ufqg8ng/maxresdefault.jpg', 'https://www.youtube.com/embed/g1j1ufqg8ng?autoplay=1', 'published'
FROM subcategories WHERE key = 'cinematic-edit' LIMIT 1;

INSERT INTO contents (subcategory_id, title, description, type, image_url, video_url, status)
SELECT id, 'Short Film Competition', 'THESE ARE SOME VIDEOS I’VE SUBMITTED FOR VIDEO COMPETITION', 'video', 'https://img.youtube.com/vi/qm2ZoAJPGTg/maxresdefault.jpg', 'https://www.youtube.com/embed/qm2ZoAJPGTg?autoplay=1', 'published'
FROM subcategories WHERE key = 'competition' LIMIT 1;

INSERT INTO contents (subcategory_id, title, description, type, image_url, video_url, status)
SELECT id, 'Beats & Visual Rhythm', 'I’VE EDITED SOME MUSIC VIDEOS, BOTH OFFICIAL SONG AND COVER SONG', 'video', 'https://img.youtube.com/vi/82GMXxyepLc/maxresdefault.jpg', 'https://www.youtube.com/embed/82GMXxyepLc?autoplay=1', 'published'
FROM subcategories WHERE key = 'music-video' LIMIT 1;
