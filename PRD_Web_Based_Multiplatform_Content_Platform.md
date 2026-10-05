

PRD — Web-Based Multiplatform Content PlatformPage 1
## Product Requirements Document
Web-Based Multiplatform Content Platform
## Version1.0
StatusDraft
PlatformWeb / PWA
ArchitectureFull-stack
Primary GoalTransform the existing Canva-based website into a scalable, responsive web application with an admin CMS.
## 1. Product Overview
Website saat ini dibuat menggunakan Canva untuk menyajikan informasi dan konten secara visual. Proyek ini
akan membangun ulang website tersebut menjadi web-based multiplatform application yang lebih fleksibel,
scalable, responsive, dan mudah dikelola melalui CMS.
- Public-facing website
- Admin dashboard
- Authentication dan authorization
- CRUD content
## • Database
- Cloud media storage
- Responsive design
- PWA capability
- Modern animation dan interactions
## 2. Product Vision
Membangun platform web modern yang mempertahankan identitas visual website original, tetapi
memberikan pengalaman yang lebih fleksibel, scalable, responsive, dan mudah dikelola melalui CMS.
## PLATFORM
n
nnnnnnnnnnnnnnnnnnnnnnnnnnn
n                         n
## PUBLIC SITE                ADMIN CMS
n                         n
## View Content              Manage Content
## Browse Media             Create / Read
## Responsive               Update / Delete
n                         n
nnnnnnnnnnnnnnnnnnnnnnnnnnn
n
## SUPABASE
## DATABASE
## 3. Goals

PRD — Web-Based Multiplatform Content PlatformPage 2
- Rebuild website Canva menjadi website berbasis code tanpa kehilangan visual identity, branding, hierarchy,
imagery, dan storytelling.
- Menyediakan CMS agar administrator dapat mengelola content tanpa mengubah source code.
- Mendukung Desktop, Laptop, Tablet, Mobile, serta opsi instalasi sebagai PWA.
- Membangun architecture yang mudah dikembangkan untuk users, categories, media, analytics, API, dan
halaman tambahan.
- Menggunakan cloud media platform untuk gambar dan video, dengan database menyimpan metadata dan URL.
- Non-Goals (V1)
- E-commerce dan payment gateway
- Shopping cart
- Complex recommendation engine
- Real-time chat
- Native Android/iOS application
- Advanced analytics
- Multi-language CMS
- AI-generated content
## 5. Target Users
## Public User
- Melihat halaman, content, gambar, dan video.
- Navigasi dan membuka detail content.
- Mengakses website dari desktop maupun mobile.
- Tidak dapat mengakses atau mengubah admin data.
## Admin
- Login dan mengakses dashboard.
- Create, read, update, dan delete content.
- Mengelola kategori dan media.
- Mengelola user dan status content.
## Editor — Optional
- Create, read, dan update content.
- Tidak dapat mengelola administrator atau system settings.
## 6. Roles & Permissions
FeaturePublicEditorAdmin
View website333
## Login-33

PRD — Web-Based Multiplatform Content PlatformPage 3
View dashboard-33
Create content-33
Edit content-33
Delete content--3
Manage categories-33
Manage media-33
Manage users--3
System settings--3
## 7. Functional Requirements
FR-01 — Public Website
Public-facing website dapat diakses tanpa authentication. Minimum: Homepage, Content/Collection page, Content
detail page, About/Information page, dan Contact section/page. Struktur final mengikuti content aktual website
## Canva.
FR-02 — Content Management
- Create: title, description, category, image, video, status, publication date.
- Read: list, detail, search, filtering, sorting.
- Update: metadata, image, video, category, status.
- Delete: confirmation dialog sebelum penghapusan.
FR-03 — Content Status
## DRAFT → PUBLISHED → ARCHIVED
Draft tidak muncul di public website. Published muncul. Archived tidak ditampilkan sebagai content aktif tetapi
tetap tersimpan.
FR-04 — Media Management
Gambar dan video tidak disimpan langsung di PostgreSQL. File disimpan di Cloudinary; database menyimpan
URL, public ID, type, dan metadata.
FR-05 — Authentication & Authorization
Admin dashboard membutuhkan Supabase Auth. Protected routes dan Row Level Security digunakan untuk
membatasi akses berdasarkan role.
## 8. Admin Dashboard
## Dashboard
## Content
## Categories
## Media
## Users
## Settings
nnnnnnnnnnnn
## Logout
Dashboard menampilkan overview jumlah content, published content, draft, dan recent content. Admin interface
mengutamakan efficiency dan usability dibandingkan visual effects.
## 9. Database Requirements

PRD — Web-Based Multiplatform Content PlatformPage 4
Database menggunakan PostgreSQL melalui Supabase. Initial schema:
users
nnnnn
id
email
role
created_at
updated_at
categories
nnnnnnnnnn
id
name
slug
created_at
updated_at
contents
nnnnnnnn
id
title
slug
description
content
category_id
cover_image
status
published_at
created_at
updated_at
media
nnnnn
id
content_id
type
url
public_id
alt_text
created_at
updated_at
Schema final akan disesuaikan dengan jenis content yang benar-benar terdapat pada website.
## 10. Design Requirements
Visual direction: Modern + Editorial + Visual-focused + Interactive. Identitas visual website original
dipertahankan, kemudian dikembangkan menjadi modern web experience. Public website bersifat visual dan
immersive; admin dashboard bersifat functional dan fast.
## Design System
- Color palette: Primary, Secondary, Accent, Background, Surface, Text.
## • Typography: Display, H1, H2, H3, Body, Caption.
- Spacing scale: 4, 8, 16, 24, 32, 48, 64, 96.
- Reusable components untuk navigation, buttons, cards, forms, dan admin UI.
## Responsive
## • Mobile 320px+
## • Tablet 768px+
## • Desktop 1024px+
## • Large Desktop 1440px+

PRD — Web-Based Multiplatform Content PlatformPage 5
- Desktop dapat menggunakan hover/cursor/parallax; mobile menggunakan touch/tap/swipe.
## 11. Animation & Interaction
## • GSAP
- GSAP ScrollTrigger
- Lenis smooth scrolling
- Hero entrance
- Section reveal
- Image reveal
- Scroll-triggered animation
## • Parallax
- Card hover
- Page transition
- Text animation
Prinsip: Animation should enhance content, not distract from it. Animasi public website dilakukan setelah layout
stabil. Admin dashboard tidak menggunakan efek berlebihan.
- PWA Requirements
## • Web App Manifest
- App icon
- Theme color
- Installable experience
- Responsive layout
Offline functionality bukan requirement utama V1.
- Performance, SEO & Accessibility
## Performance
- Fast initial page load
- Responsive interaction
- Optimized image delivery
- Lazy-loaded media
- Minimized JavaScript
- Code splitting
- Responsive image sizing
Target Lighthouse: Performance ≥ 90, Accessibility ≥ 90, Best Practices ≥ 90, SEO ≥ 90. Target merupakan goal,
bukan hard blocker jika terdapat trade-off karena desain/video.
## SEO

PRD — Web-Based Multiplatform Content PlatformPage 6
## • Metadata
- Title dan description
## • Open Graph
- Canonical URL
## • Sitemap
- robots.txt
- Semantic HTML
- Dynamic metadata berdasarkan content
## Accessibility
- Semantic HTML
- Keyboard navigation
- Visible focus state
- Sufficient contrast
- Alt text
- Accessible buttons dan forms
- Proper heading hierarchy
## 14. Technology Stack
LayerTechnology
FrontendNext.js, React, TypeScript
StylingTailwind CSS, shadcn/ui
AnimationGSAP, GSAP ScrollTrigger, Lenis
BackendNext.js Server Actions / Route Handlers
DatabaseSupabase PostgreSQL
AuthenticationSupabase Auth
MediaCloudinary
DeploymentVercel
Version ControlGitHub
MultiplatformResponsive Web + PWA
- High-Level Architecture
## USER
n
t
nnnnnnnnnnnnnnn
n   Vercel    n
n   Next.js   n
nnnnnnnnnnnnnnn
n
nnnnnnnnnnnnnnnnnnnnnnnnnnn
n                         n
t                         t
## PUBLIC WEBSITE             ADMIN CMS
n                         n

PRD — Web-Based Multiplatform Content PlatformPage 7
n                    Authentication
n                         n
nnnnnnnnnnnnnnnnnnnnnnnnnnn
n
t
## SUPABASE
## /         \
PostgreSQL       Auth
n
t
## Content
n
t
## Cloudinary
## /        \
## Images      Videos
## 16. Security Requirements
## • HTTPS
- Protected admin routes
- Authentication dan authorization
## • Row Level Security
- Input validation
- File upload validation
- Secret keys tidak diekspos ke client
- Environment variables untuk credentials
## NEXT_PUBLIC_SUPABASE_URL
## NEXT_PUBLIC_SUPABASE_ANON_KEY
## SUPABASE_SERVICE_ROLE_KEY
## CLOUDINARY_CLOUD_NAME
## CLOUDINARY_API_KEY
## CLOUDINARY_API_SECRET
Catatan: Secret key tidak boleh disimpan di repository.
## 17. Content Workflow
## CREATE → DRAFT → REVIEW → PUBLISHED → ARCHIVED
Untuk tim kecil, Admin dapat menggunakan alur sederhana Create → Publish.
## 18. File Upload Workflow
Upload → Validate → Cloudinary → Receive URL + Public ID → Save metadata → Supabase
System perlu memiliki strategi untuk menangani orphaned media apabila database gagal setelah file berhasil
di-upload.
## 19. Error & Loading States
- Success feedback setelah operasi CRUD.
- Error message yang jelas dan actionable.
- Confirmation dialog untuk delete.
- Public: skeleton, image placeholder, loading animation.
- Admin: table skeleton, button loading state, upload progress, form submission state.

PRD — Web-Based Multiplatform Content PlatformPage 8
## 20. Development Phases
## Phase 1 — Analysis
Analisis Canva, inventory content/media, identifikasi section, responsive behavior, dan information architecture.
## Phase 2 — Design System
Color palette, typography, grid, spacing, buttons, cards, navigation, forms, admin components.
## Phase 3 — Project Setup
Next.js, TypeScript, Tailwind, shadcn/ui, Supabase, Cloudinary, GitHub, Vercel.
## Phase 4 — Public Website
Navbar, Hero, main content, listing, detail, About, CTA, Footer.
## Phase 5 — Authentication
Login, logout, session, protected routes, roles.
Phase 6 — Admin CMS
Dashboard, Content CRUD, Category CRUD, Media management, User management.
## Phase 7 — Animation
GSAP, ScrollTrigger, Lenis, micro-interactions.
## Phase 8 — Responsive
## Test 320, 375, 390, 430, 768, 1024, 1280, 1440, 1920px.
Phase 9 — Performance & SEO
Image optimization, lazy loading, metadata, sitemap, accessibility, Lighthouse.
## Phase 10 — Deployment
GitHub → Vercel → Production.
- MVP Definition
## Public
## • Homepage
- Content listing
- Content detail
## • Image
## • Video
- Responsive layout
## • Navigation
## Admin
## • Login
## • Dashboard

PRD — Web-Based Multiplatform Content PlatformPage 9
## • Create
## • Read
## • Update
## • Delete
- Category management
- Media upload
- Publish/Draft
## Infrastructure
- Supabase database
## • Supabase Auth
## • Cloudinary
## • Vercel
- GitHub
- Environment variables
## • RLS
## 22. Future Development
## V1
nnn CMS
nnn CRUD
nnn Auth
nnn Media
n
t
## V2
nnn Multiple Admin Roles
nnn Analytics
nnn Search
nnn Advanced Filtering
nnn Scheduling
n
t
## V3
nnn Notifications
nnn Advanced Analytics
nnn API
nnn Multi-language
nnn Mobile App
## 23. Success Metrics
- Admin dapat Create → Publish → Update → Delete tanpa developer intervention.
- Website usable pada Desktop + Tablet + Mobile.
- Lighthouse target ≥ 90 untuk Performance, Accessibility, Best Practices, dan SEO.
- Developer dapat menambahkan content type baru tanpa rewrite architecture.
## 24. Final Product Concept

PRD — Web-Based Multiplatform Content PlatformPage 10
Produk memiliki dua pengalaman utama: Public Website yang visual, editorial, interactive, animated, dan
responsive; serta Admin CMS yang mengutamakan dashboard, CRUD, authentication, media, roles, dan usability.
Recommended Final Stack: Next.js + TypeScript + Tailwind CSS + shadcn/ui + GSAP + Lenis + Supabase +
Cloudinary + Vercel + PWA.
## 25. Next Step
- Analisis visual website Canva secara detail.
- Finalisasi sitemap.
- Finalisasi public page structure.
- Finalisasi admin page structure.
- Finalisasi database schema / ERD.
- Membuat wireframe desktop dan mobile.
- Membuat design system.
- Memulai implementasi Next.js.