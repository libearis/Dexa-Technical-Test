# AGENTS.md — Aplikasi Absensi WFH & Monitoring Karyawan

## 1. Overview Aplikasi

Project ini terdiri dari **2 microservice backend independen** yang saling terhubung lewat REST API,
dan **1 frontend React** yang mengonsumsi keduanya berdasarkan role user.

| Service                | Tanggung Jawab                                                           | Port (default) |
| ---------------------- | ------------------------------------------------------------------------ | -------------- |
| `attendance-service`   | Login employee, check-in/check-out, upload foto, validasi EXIF           | `3001`         |
| `monitoring-service`   | CRUD data master karyawan, dashboard & monitoring absensi (read-only)    | `3002`         |
| `web-frontend` (React) | UI untuk Employee (absensi) & HRD Admin (monitoring), role-based routing | `3000`         |

Setiap backend service adalah **1 aplikasi NestJS terpisah** dengan `package.json`, `node_modules`,
dan proses run masing-masing — bukan modular monolith. Ini sengaja dipisah untuk menunjukkan konsep
microservice (database-per-service, komunikasi antar service lewat API), meskipun untuk skala use case
ini tergolong over-engineering secara bisnis.

---

## 2. Arsitektur & Database

### 2.1 Prinsip Data Ownership

- `master_db` dimiliki & di-write oleh `monitoring-service` (tabel `employees`, `departments`).
- `attendance_db` dimiliki & di-write oleh `attendance-service` (tabel `attendances`).
- Setiap service punya 2 TypeORM connection: 1 primary (miliknya sendiri, read-write),
  1 secondary (milik service lain, **read-only** — jangan pernah write lewat connection ini).

```
attendance-service
 ├─ connection "attendance" (primary, RW) -> attendance_db
 └─ connection "master"     (secondary, RO) -> master_db   (untuk validasi employee saat login/check-in)

monitoring-service
 ├─ connection "master"     (primary, RW) -> master_db
 └─ connection "attendance" (secondary, RO) -> attendance_db (untuk dashboard & monitoring)
```

### 2.2 Kredensial Database

```
Host: localhost
Port: 3306
Username: root
Password: Zerolair2001
Databases: master_db, attendance_db
```

Simpan di `.env` masing-masing service (jangan hardcode), contoh key:

```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=Zerolair2001
DB_MASTER_NAME=master_db
DB_ATTENDANCE_NAME=attendance_db
```

### 2.3 Skema Tabel

Semua tabel (`departments`, `employees`, `attendances`) memakai **kolom audit standar** yang
sama, selalu ditambahkan sebagai kolom paling akhir di tabel:

| Kolom | Tipe | Ket |
|---|---|---|
| created_at | DATETIME | |
| created_by | INT | nullable, logical FK ke `employees.id` (actor) — `null` kalau dibuat dari seed/system |
| updated_at | DATETIME | |
| updated_by | INT | nullable, sama seperti `created_by` |
| deleted_at | DATETIME | nullable — penanda soft-delete (TypeORM `@DeleteDateColumn`) |
| deleted_by | INT | nullable |

> Kolom ini tidak pernah disisipkan di tengah tabel — MySQL tidak bisa mengubah urutan kolom
> tanpa rebuild tabel, jadi kalau skema perlu berubah lagi, tabelnya di-drop & dibuat ulang lewat
> `synchronize`, bukan di-ALTER di tempat. Soft-delete (`deleted_at` terisi) otomatis
> di-exclude dari query TypeORM default tanpa perlu filter manual. Saat ini alur hapus yang benar-benar
> memakainya baru ada di `departments` (lihat 3.3); `employees` dan `attendances` tetap punya kolom ini
> untuk konsistensi skema, meski belum ada alur hapus yang mengisinya (`employees` pakai `status` untuk
> deactivate, `attendances` view-only).

**master_db.departments**
| Kolom | Tipe | Ket |
|---|---|---|
| id | INT PK AI | |
| name | VARCHAR(100) | |
| *(+ kolom audit standar di atas)* | | |

**master_db.employees**
| Kolom | Tipe | Ket |
|---|---|---|
| id | INT PK AI | |
| name | VARCHAR(150) | untuk display saja, misal "Welcome, {name}" |
| username | VARCHAR(100) UNIQUE | dipakai untuk **login** — terpisah dari `name` |
| email | VARCHAR(150) UNIQUE | kontak, **tidak** dipakai untuk login |
| password | VARCHAR(255) | hashed (bcrypt) |
| role | ENUM('EMPLOYEE','HRD_ADMIN') | |
| department_id | INT FK -> departments.id | nullable |
| position | VARCHAR(100) | |
| join_date | DATE | |
| status | ENUM('ACTIVE','INACTIVE') | default ACTIVE |
| *(+ kolom audit standar di atas)* | | |

**attendance_db.attendances**
| Kolom | Tipe | Ket |
|---|---|---|
| id | INT PK AI | |
| employee_id | INT | FK logis ke master_db.employees.id (cross-db, no real FK constraint) |
| attendance_date | DATE | unique per (employee_id, attendance_date) |
| check_in_time | DATETIME | |
| check_in_photo_url | VARCHAR(255) | |
| check_in_photo_exif_time | DATETIME | hasil parse EXIF, nullable jika gagal parse |
| check_out_time | DATETIME | nullable |
| check_out_photo_url | VARCHAR(255) | nullable |
| check_out_photo_exif_time | DATETIME | nullable |
| status | ENUM('PRESENT','INCOMPLETE') | INCOMPLETE = belum/gagal check-out |
| notes | VARCHAR(255) | nullable, misal alasan EXIF mismatch |
| *(+ kolom audit standar di atas)* | | |

> Catatan: karena `employee_id` cross-database, **tidak bisa** pakai FK constraint MySQL asli.
> Relasi ini di-enforce di level aplikasi (service call/validasi), bukan di level DB.

---

## 3. Business Rules

### 3.1 Absensi (Attendance Service)

- Login memakai `username` + `password` (bukan `email` — lihat 2.3), berlaku untuk kedua role
  (`EMPLOYEE` & `HRD_ADMIN`) karena keduanya sama-sama baris di `employees`.
- Check-in bebas kapan saja, **maksimal 1x per hari** per employee (`UNIQUE(employee_id, attendance_date)`).
- Check-out hanya valid jika waktu submit **> 17:00** waktu server.
- Check-out **wajib di hari yang sama** dengan check-in; jika lewat tengah malam tanpa check-out,
  status dianggap `INCOMPLETE` (bisa dihandle via scheduled job/cron end-of-day).
- Waktu yang dicatat selalu **waktu server**, bukan waktu yang dikirim client.

### 3.2 Validasi Foto (Anti-Fraud)

- Setiap foto (check-in & check-out) di-parse EXIF metadata-nya (`DateTimeOriginal`) saat upload.
- Selisih EXIF time vs waktu server saat upload harus dalam toleransi (misal ±10 menit) — di luar itu,
  request ditolak dengan pesan jelas agar employee foto ulang.
- Pendekatan ini dipilih dibanding OCR watermark visual karena watermark burn-in tidak konsisten
  antar app/device dan butuh effort OCR yang tidak sepadan untuk scope ini.
- **Known limitation**: EXIF bisa dihapus/dimanipulasi oleh user yang punya niat & tools khusus.
  Ini acceptable trade-off untuk kasus penggunaan normal (employee awam) — dicatat sebagai limitation,
  bukan celah yang diabaikan. OCR watermark visual bisa jadi future enhancement bila diperlukan.

### 3.3 Monitoring & Master Data (Monitoring Service)

- HRD Admin: CRUD `employees` penuh — create, update, **deactivate** (`status = INACTIVE`), tidak ada
  hard delete maupun soft delete untuk employees.
- HRD Admin: CRUD `departments` penuh — create, update, **soft delete** (`deleted_at`/`deleted_by`
  terisi, baris tetap ada di DB tapi otomatis ter-exclude dari query berikutnya).
- HRD Admin: absensi bersifat **view-only**, tidak ada endpoint edit/hapus attendance dari service ini.
- Dashboard ringkas: jumlah hadir hari ini, belum absen, incomplete (belum checkout).
- Filter monitoring: by tanggal range, department, employee, status.
- Detail per karyawan menampilkan foto bukti + hasil validasi EXIF (transparansi ke admin).
- Seed data dev mencakup **minimal 2 departments** (`HRD`, `Engineering`) — bukan cuma 1 — supaya
  data contoh merepresentasikan struktur organisasi yang realistis (HRD Admin sendiri butuh
  department juga, tidak dibiarkan `null`).

---

## 4. Komunikasi Antar Service

Saat ini **tidak ada** panggilan HTTP antar service — kedua service berkomunikasi murni lewat
koneksi DB read-only masing-masing (lihat 2.1), termasuk untuk validasi status employee aktif
sebelum izinkan check-in (`attendance-service` baca langsung `master_db.employees` via
`EmployeeLookupService`, bukan memanggil API `monitoring-service`).

- **Kenapa bukan HTTP call untuk validasi status**: koneksi read-only itu live ke tabel yang sama
  persis yang ditulis `monitoring-service` — tidak ada replication lag, tidak ada data basi. Jadi
  untuk cek "apakah row ini `ACTIVE`" tanpa logika tambahan, baca-langsung dan panggil-API
  menghasilkan jawaban yang identik, tapi panggil-API membuat `attendance-service` berhenti bekerja
  kalau proses `monitoring-service` down — meski database-nya sehat. Trade-off itu tidak sepadan
  untuk cek sesederhana ini.
- **Kapan HTTP call antar service baru jadi masuk akal**: begitu operasinya butuh *keputusan*,
  bukan cuma *data* — misal aturan eligibility berkembang jadi lebih dari sekadar `status`
  (butuh cek cuti, approval, dll), sehingga logikanya harus tetap dimiliki satu tempat saja
  (service pemilik data) agar tidak diduplikasi dan berisiko tidak sinkron antar service. Kalau
  kebutuhan itu muncul, dibungkus dalam client service khusus (mis. `EmployeeClientService`) supaya
  dependency antar service eksplisit dan mudah dilacak — bukan dipanggil langsung dari controller
  service lain.
- Prioritaskan baca lewat secondary DB connection (read-only) untuk hampir semua kasus di skala
  aplikasi ini; HTTP call antar service adalah pengecualian yang harus punya alasan konkret
  (bukan default), justru karena ia mengorbankan independensi uptime yang jadi alasan utama pakai
  multi-connection di awal.

---

## 5. Tech Stack

| Layer              | Teknologi                                                        |
| ------------------ | ---------------------------------------------------------------- |
| Backend            | NestJS (TypeScript)                                              |
| ORM                | TypeORM                                                          |
| Database           | MySQL 8                                                          |
| Auth               | JWT (`@nestjs/jwt` + `@nestjs/passport`)                         |
| File upload        | `multer` (local disk atau adjust ke S3-compatible bila tersedia) |
| EXIF parsing       | `exifr`                                                          |
| Inter-service HTTP | `@nestjs/axios`                                                  |
| Frontend           | React.js + React Router                                          |
| HTTP client FE     | `axios` (2 instance: `attendanceApi`, `monitoringApi`)           |

---

## 6. Struktur Folder (per service NestJS)

```
src/
 ├─ modules/
 │   ├─ auth/
 │   ├─ employees/
 │   ├─ departments/         (hanya di monitoring-service)
 │   └─ attendances/         (hanya di attendance-service)
 ├─ common/
 │   ├─ guards/              (JwtAuthGuard, RolesGuard)
 │   ├─ decorators/          (@Roles, @CurrentUser)
 │   ├─ filters/             (HttpExceptionFilter)
 │   └─ interceptors/
 ├─ config/
 │   └─ database.config.ts   (definisi multi-connection)
 └─ main.ts
```

Setiap module NestJS mengikuti pola standar: `*.module.ts`, `*.controller.ts`, `*.service.ts`,
`*.entity.ts`, `dto/`.

---

## 7. Coding Convention

- **Urutan method dalam class**: seluruh **public method di atas**, seluruh **private method di
  bawah**, dipisah komentar `// ----- private -----`. Urutan public method mengikuti urutan
  pemanggilan logis (bukan alfabetis).
- **Komentar**: maksimal 1–2 baris, hanya untuk menjelaskan _kenapa_ (alasan/keputusan bisnis),
  bukan _apa_ yang sudah jelas dari kode itu sendiri. Hindari komentar berlebihan per baris.
- **Naming**: `camelCase` untuk variable/method, `PascalCase` untuk class/entity, `kebab-case`
  untuk nama file (`attendance.service.ts`).
- **DTO wajib** untuk setiap request body (validasi via `class-validator`), jangan terima raw body
  tanpa tipe.
- **Service layer** tidak boleh diakses langsung dari controller service lain — gunakan client
  wrapper (lihat bagian 4) agar dependency antar service eksplisit dan mudah dilacak.
- **Tidak ada logic bisnis di controller** — controller hanya orkestrasi (terima request, panggil
  service, return response).

Contoh struktur class:

```ts
export class AttendanceService {
  constructor(...) {}

  // ----- public -----
  async checkIn(dto: CheckInDto) { ... }
  async checkOut(dto: CheckOutDto) { ... }
  async getHistory(employeeId: number) { ... }

  // ----- private -----
  private validateExifTimestamp(photo: Express.Multer.File) { ... }
  private isSameDayCheckIn(date: Date) { ... }
}
```

---

## 8. Yang Sengaja Tidak Dikerjakan (Out of Scope)

- Message broker / event-driven communication (dianggap overkill untuk skala 2 service ini).
- OCR watermark visual pada foto (EXIF-based sudah cukup untuk kasus ini, lihat 3.2).
- Edit/hapus data attendance oleh HRD Admin (soal eksplisit "view only").
- 2 frontend terpisah (microservice concept hanya di sisi backend).
