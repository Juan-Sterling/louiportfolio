# Diskusi & Rencana Fitur Custom Tata Letak Karya

Dokumen ini merangkum hasil diskusi mengenai rencana penambahan fitur pengaturan posisi/tata letak karya portofolio pada panel admin dan galeri utama LOUI Portfolio.

---

## 1. Latar Belakang & Kebutuhan

* **Tujuan**: Admin ingin memiliki keleluasaan untuk menentukan karya-karya unggulan (misalnya top 6 foto/video terbaik) agar selalu berada di posisi paling atas galeri web.
* **Karya Sisa**: Karya-karya lainnya yang tidak ditentukan nomornya akan otomatis diacak dan disusun seimbang di bawah karya-karya top tersebut, mengikuti logika penyeimbangan galeri yang sudah ada.

---

## 2. Analisis Skema Database

* **Pertanyaan**: *Apakah harus menambah kolom baru di database?*
* **Jawaban**: **TIDAK PERLU.**
  * Di dalam skema Supabase ([`supabase-schema.sql`](file:///c:/Users/ASUS%20TUF/Documents/louiportfolio/supabase-schema.sql#L85)), tabel `contents` **sudah memiliki kolom `order_index`**:
    ```sql
    CREATE TABLE contents (
        ...
        order_index INT DEFAULT 0,  -- Kolom urutan karya (sudah tersedia)
        ...
    );
    ```
  * Tipe data di codebase TypeScript ([`src/types/admin.ts`](file:///c:/Users/ASUS%20TUF/Documents/louiportfolio/src/types/admin.ts) & [`src/lib/supabase.ts`](file:///c:/Users/ASUS%20TUF/Documents/louiportfolio/src/lib/supabase.ts)) juga sudah mendefinisikan `order_index?: number`.
  * Kolom ini siap langsung digunakan tanpa perlu melakukan migrasi atau perubahan struktur tabel di Supabase.

---

## 3. Konsep Mekanisme: Prioritas Bertingkat (Top Priority + Auto-Fill)

Mekanisme yang disepakati memadukan kontrol penuh untuk karya unggulan dan otomatisasi untuk karya umum:

1. **Kelompok Karya Unggulan (Top Priority)**:
   * Diberi nomor urut prioritas: `1, 2, 3, 4, 5, 6...`
   * Karya dengan nomor ini akan selalu menempati slot baris-baris terdepan/teratas di galeri 3 kolom.
2. **Kelompok Karya Biasa (Non-Prioritas)**:
   * Memiliki nilai `order_index = 0` (atau kosong/null).
   * Otomatis ditempatkan di bawah karya-karya prioritas.
   * Disusun menggunakan algoritma penyeimbangan yang sudah ada (`distributeGalleryItemsBalanced`: foto dan video tersebar merata, tidak menumpuk di satu kolom).

---

## 4. Rencana Implementasi di Panel Admin (CMS)

1. **Formulir Tambah / Edit Karya ([`ContentModal.tsx`](file:///c:/Users/ASUS%20TUF/Documents/louiportfolio/src/components/admin/modals/ContentModal.tsx))**:
   * Menambahkan input numerik opsional: **"Nomor Prioritas Tampilan"**.
   * Panduan singkat untuk admin: *"Isi angka 1–6 untuk menampilkan karya di baris teratas. Kosongkan (0) jika ingin urutan otomatis."*
2. **Tabel Kelola Karya ([`ContentsTab.tsx`](file:///c:/Users/ASUS%20TUF/Documents/louiportfolio/src/components/admin/tabs/ContentsTab.tsx))**:
   * Menampilkan badge visual khusus pada karya yang memiliki nomor prioritas, misalnya:
     * `⭐ Top #1`
     * `⭐ Top #2`
     * `⭐ Top #3`
   * Memudahkan admin melihat secara sekilas karya mana saja yang sedang di-highlight di bagian teratas web.

---

## 5. Rencana Implementasi di Halaman Utama Galeri ([`ModernGallery.tsx`](file:///c:/Users/ASUS%20TUF/Documents/louiportfolio/src/components/ModernGallery.tsx))

1. **Query Data**:
   * Mengambil data dengan urutan prioritas:
     ```ts
     .order('order_index', { ascending: true })
     .order('created_at', { ascending: false })
     ```
2. **Penyusunan Kolom**:
   * Karya dengan `order_index > 0` (misal 1–6) didistribusikan ke baris teratas masing-masing kolom (Kolom 1, 2, dan 3).
   * Sisa karya (`order_index === 0`) didistribusikan ke slot di bawahnya dengan logika acak seimbang yang sudah berjalan saat ini.

---

*Catatan: Dokumen ini disimpan sebagai referensi spesifikasi teknis sebelum implementasi kode dijalankan.*
