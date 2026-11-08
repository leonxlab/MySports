# Image yang sama dipakai di laptop RTX (docker compose) dan di GPU hosting sewa.
# Sesuaikan versi CUDA dengan driver penyedia GPU. Cek juga indeks wheel di pytorch.org.
FROM nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3.11 python3.11-venv python3-pip libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.11 /usr/local/bin/python

WORKDIR /srv
RUN python -m pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cu124
COPY requirements.txt .
RUN python -m pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY scripts ./scripts

# Bobot model TIDAK ada di image: diunduh saat start (scripts/download_models.py)
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
