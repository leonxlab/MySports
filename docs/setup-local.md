# Setup lokal

## Yang perlu dipasang

- Git, Node.js 20+, Python 3.11
- Docker Desktop (untuk Supabase lokal, dan untuk uji image YOLO)
- Supabase CLI (`npm i -g supabase`)
- Laptop RTX: driver NVIDIA terbaru. CUDA toolkit terpisah tidak wajib, wheel PyTorch sudah membawa runtime CUDA.

## Sekali setelah clone

```bash
git clone <url-repo> openplay-app && cd openplay-app
git config core.hooksPath .githooks      # cek format commit
```

## 1. Database lokal

```bash
supabase init        # sekali, lalu commit supabase/config.toml
supabase start       # catat API URL, anon key, service_role key dari outputnya
supabase db reset    # jalankan migrasi
```

## 2. Backend

```bash
cd backend
cp .env.example .env     # isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dari langkah 1
npm install
npm run dev              # http://localhost:3001/health
npm test
```

## 3. Frontend

```bash
cd frontend
cp .env.example .env.local   # isi NEXT_PUBLIC_SUPABASE_URL dan ANON key (bukan service role)
npm install
npm run dev                  # http://localhost:3000
```

## 4. YOLO service di laptop RTX

```bash
cd yolo-service
python -m venv .venv
# Windows: .venv\Scripts\activate      Linux/macOS: source .venv/bin/activate

# pasang PyTorch dengan CUDA dulu, ambil perintah yang cocok di https://pytorch.org
# contoh: pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
pip install -r requirements.txt

python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0))"

cp .env.example .env
uvicorn app.main:app --reload --port 8000    # cek /health, /gpu, /detectors
```

Menguji detektor pada klip lokal, tanpa Supabase dan backend:

```bash
python -m scripts.run_detector basketball /path/ke/klip.mp4
```

Menjalankan worker penuh (ambil antrean dari Supabase lokal, kirim event ke backend lokal):

```bash
python -m app.worker
```

Metrik worker tersedia di `http://localhost:8001/metrics`.

Atau lewat Docker (butuh NVIDIA Container Toolkit; di Windows lewat Docker Desktop dengan WSL2):

```bash
docker compose up --build
```

Bobot model: letakkan di `yolo-service/models/` atau unduh dengan `python -m scripts.download_models <file>.pt`. Jangan di-commit.

## Alur kerja harian

```bash
git switch main && git pull
git switch -c feat/<modul>-<hal>
# ... kerja, commit kecil: feat(<modul>): ...
git fetch && git rebase origin/main
git push -u origin HEAD            # lalu buka PR
```

Aturan lengkap ada di `rules.md`.
