"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import styles from "./VenueMapPicker.module.css";

export interface VenueMapPickerProps {
  value: { lat: number; lng: number } | null;
  onChange: (position: { lat: number; lng: number }) => void;
  height?: number;
}

interface MapFocus {
  lat: number;
  lng: number;
  zoom: number;
}

interface NominatimResult {
  lat: string;
  lon: string;
}

const DEFAULT_CENTER: L.LatLngExpression = [-6.3055, 107.1722];
const NOMINATIM_NO_RESULT =
  "Alamat tidak ditemukan. Coba kata kunci lain atau klik langsung di peta.";

const markerIcon = L.divIcon({
  className: "",
  html: '<svg xmlns="http://www.w3.org/2000/svg" width="38" height="48" viewBox="0 0 38 48" aria-hidden="true"><path d="M19 1C9.6 1 2 8.6 2 18c0 11.6 17 28 17 28s17-16.4 17-28C36 8.6 28.4 1 19 1Z" fill="#1687c9" stroke="#fff" stroke-width="2"/><circle cx="19" cy="18" r="6" fill="#fff"/></svg>',
  iconSize: [38, 48],
  iconAnchor: [19, 47],
});

export function VenueMapPicker({ value, onChange, height = 320 }: VenueMapPickerProps) {
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const lastSearchAt = useRef(0);

  useEffect(() => {
    if (!mapElement.current) return;

    const map = L.map(mapElement.current, { maxZoom: 19, scrollWheelZoom: true }).setView(
      DEFAULT_CENTER,
      14,
    );
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    map.on("click", (event: L.LeafletMouseEvent) => {
      onChangeRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
    });
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const point: L.LatLngExpression = [value.lat, value.lng];
    if (markerRef.current) {
      markerRef.current.setLatLng(point);
    } else {
      const marker = L.marker(point, { icon: markerIcon, draggable: true }).addTo(map);
      marker.on("dragend", () => {
        const position = marker.getLatLng();
        onChangeRef.current({ lat: position.lat, lng: position.lng });
      });
      markerRef.current = marker;
    }

    if (!map.getBounds().contains(point)) {
      map.flyTo(point, map.getZoom(), { animate: true });
    }
  }, [value?.lat, value?.lng]);

  useEffect(() => {
    if (focus) mapRef.current?.flyTo([focus.lat, focus.lng], focus.zoom, { animate: true });
  }, [focus]);

  async function searchAddress() {
    const searchTerm = query.trim();
    if (!searchTerm || isSearching) return;

    setSearchError(null);
    setIsSearching(true);
    try {
      const waitMs = Math.max(0, 1000 - (Date.now() - lastSearchAt.current));
      if (waitMs > 0) await new Promise((resolve) => window.setTimeout(resolve, waitMs));

      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      url.searchParams.set("countrycodes", "id");
      url.searchParams.set("accept-language", "id");
      url.searchParams.set("q", searchTerm);

      lastSearchAt.current = Date.now();
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 10000);
      let response: Response;
      try {
        response = await fetch(url, {
          headers: { "Accept-Language": "id" },
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeout);
      }
      if (!response.ok) throw new Error("Pencarian alamat gagal. Periksa koneksi lalu coba lagi.");

      const results = (await response.json()) as NominatimResult[];
      if (results.length === 0) {
        setSearchError(NOMINATIM_NO_RESULT);
        return;
      }

      const lat = Number(results[0].lat);
      const lng = Number(results[0].lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("Hasil pencarian lokasi tidak valid.");
      }

      const position = { lat, lng };
      onChange(position);
      setFocus({ ...position, zoom: 16 });
    } catch (error) {
      setSearchError(
        error instanceof DOMException && error.name === "AbortError"
          ? "Pencarian alamat terlalu lama. Coba lagi."
          : error instanceof Error
            ? error.message
            : "Pencarian alamat gagal. Coba lagi.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  function locateMe() {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Lokasi tidak tersedia di perangkat ini. Klik peta untuk menandai lokasi.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const point = { lat: position.coords.latitude, lng: position.coords.longitude };
        onChange(point);
        setFocus({ ...point, zoom: 17 });
        setIsLocating(false);
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Izin lokasi ditolak. Klik peta untuk menandai lokasi."
            : "Lokasi tidak dapat diambil. Klik peta untuk menandai lokasi.",
        );
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className={styles.picker}>
      <div className={styles.searchRow}>
        <input
          aria-label="Cari alamat atau nama tempat"
          className={styles.searchInput}
          placeholder="Cari alamat atau nama tempat"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void searchAddress();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void searchAddress()}
          disabled={isSearching || !query.trim()}
        >
          {isSearching ? "Mencari…" : "Cari"}
        </button>
      </div>

      <div className={styles.mapFrame} style={{ height }}>
        <div className={styles.map} ref={mapElement} />
        <button
          className={styles.locateButton}
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            locateMe();
          }}
          disabled={isLocating}
        >
          {isLocating ? "Mencari lokasi…" : "Lokasi saya"}
        </button>
      </div>

      <p className={styles.hint}>Klik peta untuk menandai titik, atau gunakan lokasimu saat ini.</p>
      {searchError && (
        <p className={styles.error} role="alert">
          {searchError}
        </p>
      )}
      {locationError && (
        <p className={styles.error} role="alert">
          {locationError}
        </p>
      )}
    </div>
  );
}
