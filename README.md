# GameForge AI

Bu proje `frontend` (React), `backend` (FastAPI) ve `db` (PostgreSQL) servislerinden oluşur.

## Docker ile Hızlı Kurulum

### 1) Gereksinimler

- Docker Desktop (Windows/Mac) veya Docker Engine + Docker Compose (Linux)

Kurulum sonrası kontrol:

```bash
docker --version
docker compose version
```

### 2) Projeyi indir

```bash
git clone <repo-url>
cd gameforge-ai
```

### 3) Backend ortam değişkenlerini hazırla

`backend/.env.example` dosyasını `backend/.env` olarak kopyalayın ve gerekli alanları doldurun.

Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

Linux/Mac:

```bash
cp backend/.env.example backend/.env
```

Not: Docker Compose içinde backend için `DATABASE_URL` otomatik olarak `db` servisine yönlendirilir.

### 4) Servisleri ayağa kaldır

```bash
docker compose up --build
```

Arkaplanda çalıştırmak için:

```bash
docker compose up --build -d
```

### 5) Uygulamaya erişim

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

### 6) Sık kullanılan komutlar

Logları izleme:

```bash
docker compose logs -f
```

Sadece bir servisin logu:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

Servisleri durdurma:

```bash
docker compose down
```

Volume'ları da silmek istersen:

```bash
docker compose down -v
```

## Güvenlik Notu

- `backend/.env` dosyasını repoya commit etmeyin.
- Sadece `backend/.env.example` paylaşın.
