

## PRODUCT REQUIREMENT DOCUMENT (PRD)
## Sistem Penataan Spasial Showcase & Custom Layout Galeri
Produk: LOUI Portfolio (louiportfolio.vercel.app)Versi Dokumen: 1.0.0Author: Lead Fullstack & Product Team
## Target Rilis: Q4 2026
## 1. RINGKASAN EKSEKUTIF & LATAR BELAKANG
LOUI Portfolio menggunakan tata letak galeri 3-kolom berbasis masonry layout. Saat ini, seluruh karya foto dan
video disusun otomatis secara dinamis melalui algoritma penyeimbang. Pengelola portofolio (Admin)
membutuhkan kendali terarah untuk menetapkan karya-karya unggulan (featured works) agar selalu menempati
slot baris teratas galeri secara deterministik tanpa merusak harmoni masonry publik.
## 2. TUJUAN PRODUK & BATASAN RUANG LINGKUP
 Tujuan Utama (Objectives)
Menyediakan antarmuka visual WYSIWYG bagi admin
untuk menetapkan karya pada slot presisi per
subkategori.
Mendukung fleksibilitas pengisian parsial (misal hanya
mengisi 3 dari 5 slot) tanpa menimbulkan area kosong
di web.
Memastikan pertukaran posisi karya bebas duplikasi
melalui mekanisme Auto-Swap dan tombol reset cepat.
 Batasan Sistem (Scope Boundaries)
Konfigurasi slot bersifat terisolasi per subkategori;
urutan tidak bercampur antar subkategori.
Kolom 1 Baris 1 dialokasikan tetap untuk kartu teks
editorial (judul & deskripsi subkategori).
Sisa karya yang tidak diplot ke slot prioritas akan
otomatis mengisi sisa galeri secara seimbang.
## 3. ARSITEKTUR DATA & PEMANFAATAN SKEMA DATABASE
Implementasi ini memanfaatkan kolom skema yang telah tersedia di PostgreSQL Supabase tanpa memerlukan
migrasi DDL baru:
Entitas / KolomTipe DataNilai DefaultFungsi dalam Fitur Tata Letak
contents.order_indexINT0Menyimpan indeks slot penempatan (1, 2, 3,
dst.). Nilai 0 menandakan karya mengalir
dinamis.
contents.subcategory_idUUID / FKNOT NULLKunci isolasi partisi. Setiap subkategori
memiliki urutan slot 1–N mandiri.
contents.statusVARCHAR'published'Hanya karya berstatus terbit yang dapat
dimasukkan ke dalam slot showcase.
Spesifikasi Kebutuhan Produk (PRD) — LOUI PortfolioHalaman 1 dari 3

## 4. SPESIFIKASI MATRIKS SPASIAL & BLUEPRINT TATA LETAK
Struktur visual galeri desktop menganut orientasi membaca z-pattern melintang. Kartu editorial subkategori
dipindahkan ke header navigasi kategori (sebagai breadcrumb dinamis), sehingga nomor slot karya dimulai
langsung dari kiri atas (Kolom 1, Baris 1):
## BLUEPRINT PEMETAAN MATRIKS GALERI 3-KOLOM
## ⭐ SLOT #1⭐ SLOT #2⭐ SLOT #3
## ⭐ SLOT #4⭐ SLOT #5⭐ SLOT #6
## + SLOT #7+ SLOT #8+ SLOT #9
## 5. ATURAN PENEMPATAN SLOT & PENANGANAN SLOT KOSONG
Slot Target: Posisi Fisik Kolom
Slot #1, #2, #3: Baris 1 (Kiri, Tengah, Kanan)
Slot #4, #5, #6: Baris 2 (Kiri, Tengah, Kanan)
Slot #7+: Ekspansi baris berikutnya (Kiri, Tengah, Kanan)
Kondisi Terisi (Admin): Dirender deterministik pada slotnya
Kondisi Dikosongkan (Fallback): Otomatis diisi karya reguler secara acak (Random / Acak) tanpa menimbulkan celah kosong
## 6. LOGIKA EKSEKUSI PUBLIK (MODERNGALLERY.TSX)
Pada antarmuka publik, karya berslot (order_index > 0) menempati posisi slot prioritas, sedangkan karya tanpa slot (order_index = 0) didistribusikan secara acak dinamis (Random / Acak) dan seimbang ke 3 kolom galeri:
Kolom 1: Slot #1, Slot #4, Slot #7...
Kolom 2: Slot #2, Slot #5, Slot #8... (dimulai dengan column-break)
Kolom 3: Slot #3, Slot #6, Slot #9... (dimulai dengan column-break)
sehingga Slot #1 berada di kiri atas, Slot #2 di tengah atas, dan Slot #3 di kanan atas.

## 7. SPESIFIKASI INTERAKSI ADMIN & MEKANISME AUTO-SWAP
 Logika Auto-Swap & Indikator Badge
Mencegah karya yang sama terpasang di dua slot berbeda:
Jika karya sudah ada di Slot A dan dipilih untuk Slot B,
kedua karya saling bertukar posisi secara atomik.
Di modal pemilih, karya tersebut diberi badge visual:
##  TUKAR (SLOT #A ⇄ #B).
Jika slot target kosong, badge berubah menjadi:
## ↗ PINDAH DARI SLOT #A.
## 粒 Fleksibilitas Reset & Penambahan Baris
Admin memiliki kebebasan membongkar susunan tanpa
hambatan:
Reset Parsial: Ikon ✕ pada kartu slot untuk mengosongkan
karya spesifik kembali ke mode otomatis.
Reset Total: Tombol "Reset ke Otomatis" dengan modal
konfirmasi untuk mengembalikan semua order_index
subkategori ke 0 (urutan acak dinamis).
Tambah Baris: Tombol [+ Tambah Baris] menambah 3
slot kosong baru sekaligus.
## 8. ALUR PERSISTENSI TRANSAKSI DATABASE SUPABASE
Penyimpanan perubahan tata letak dieksekusi secara batch dalam dua tahap untuk menjamin integritas urutan:
Langkah 1 (Purge Stale Indexes): Eksekusi update order_index = 0 untuk semua baris pada subcategory_id aktif.
Langkah 2 (Apply Target Assignments): Eksekusi pembaruan batch untuk karya-karya terpilih sesuai nomor slotnya
(order_index = 1..N). Operasi dibungkus dalam Promise.all demi performa instan.
## 9. KRITERIA PENERIMAAN SISTEM (ACCEPTANCE CRITERIA)
Kategori UjiSkenario & EkspektasiStatus Verifikasi
Isolasi ScopeKarya dari Subkategori A tidak dapat muncul di
modal pemilih Subkategori B.
## WAJIB LULUS QA
Penanganan ParsialMengisi hanya 3 slot dari 5 slot tidak menyebabkan
celah kosong pada web publik.
## WAJIB LULUS QA
Eksekusi Auto-SwapMemilih karya yang sudah terpasang menukar posisi
secara atomik disertai label badge.
## WAJIB LULUS QA
Pembalikan ResetMenekan tombol reset mengembalikan urutan ke
mode acak dinamis seimbang seketika.
## WAJIB LULUS QA
Spesifikasi Kebutuhan Produk (PRD) — LOUI PortfolioHalaman 3 dari 3