"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { getSupabase } from "@/lib/supabase";
import { accountsApi, type GalleryItemInput } from "../api";
import { useMe } from "./SessionProvider";
import type { GalleryItem, MeProfile, Sport } from "../types";
import { VipBadge, VipSubscribeButton } from "@/modules/vip";

const sports: { value: Sport; label: string }[] = [
  { value: "basketball", label: "Basket" },
  { value: "badminton", label: "Badminton" },
  { value: "tennis", label: "Tennis" },
  { value: "padel", label: "Padel" },
  { value: "futsal", label: "Futsal" },
];

const styles = {
  main: { margin: "0 auto", maxWidth: 760, padding: 24 } as const,
  panel: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    marginTop: 16,
    padding: 20,
  } as const,
  field: { display: "grid", gap: 6, marginBottom: 14 } as const,
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    font: "inherit",
    padding: "10px 12px",
  } as const,
  button: {
    background: "#0f172a",
    border: 0,
    borderRadius: 8,
    color: "#fff",
    cursor: "pointer",
    font: "inherit",
    padding: "10px 14px",
  } as const,
};

function Message({ error, info }: { error: string | null; info?: string | null }) {
  return (
    <>
      {error ? (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}
      {info ? <p role="status">{info}</p> : null}
    </>
  );
}

function ProfileContent({ profile, editable = false }: { profile: MeProfile; editable?: boolean }) {
  return (
    <main style={styles.main}>
      <header style={{ alignItems: "center", display: "flex", gap: 16 }}>
        {profile.photo_url ? (
          <img
            alt={`Foto profil ${profile.display_name}`}
            src={profile.photo_url}
            style={{ borderRadius: "50%", height: 88, objectFit: "cover", width: 88 }}
          />
        ) : (
          <div
            aria-label="Belum ada foto profil"
            role="img"
            style={{ background: "#e2e8f0", borderRadius: "50%", height: 88, width: 88 }}
          />
        )}
        <div>
          <h1 style={{ margin: 0 }}>{profile.display_name}</h1>
          <p style={{ color: "#475569", margin: "6px 0" }}>
            Level {profile.level} · {profile.roles.filter((role) => role !== "admin").join(", ")}
          </p>
          {/* TODO(integration): accounts profile belum menyediakan status VIP. */}
          <VipBadge isVip={false} />
        </div>
        {editable ? (
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 12 }}>
            <VipSubscribeButton />
            <Link href="/profile/edit">Ubah profil</Link>
          </div>
        ) : null}
      </header>
      {profile.age !== null ? <p>Usia: {profile.age}</p> : null}
      {profile.bio ? <p>{profile.bio}</p> : null}
      <section aria-labelledby="experience-title" style={styles.panel}>
        <h2 id="experience-title">Pengalaman olahraga</h2>
        {profile.experience.length ? (
          <ul>
            {profile.experience.map((item) => (
              <li key={item.sport}>
                {sports.find((sport) => sport.value === item.sport)?.label ?? item.sport}
                {item.years === null ? "" : ` · ${item.years} tahun`}
                {item.notes ? ` · ${item.notes}` : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p>Belum ada pengalaman yang ditambahkan.</p>
        )}
      </section>
      <section aria-labelledby="gallery-title" style={styles.panel}>
        <h2 id="gallery-title">Galeri</h2>
        {profile.gallery.length ? (
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            {profile.gallery.map((item) => (
              <GalleryCard item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <p>Belum ada item galeri.</p>
        )}
      </section>
    </main>
  );
}

function GalleryCard({ item }: { item: GalleryItem }) {
  if (item.kind === "quote") {
    return <blockquote style={styles.panel}>{item.quote_text}</blockquote>;
  }
  if (!item.media_url) return <p>Media tidak tersedia.</p>;
  return item.kind === "photo" ? (
    <img alt="Foto galeri pemain" src={item.media_url} style={{ maxWidth: "100%" }} />
  ) : (
    <video
      controls
      aria-label="Video galeri pemain"
      src={item.media_url}
      style={{ maxWidth: "100%" }}
    />
  );
}

export function MyProfilePage() {
  const { user, me, isLoading, error } = useMe();
  const router = useRouter();
  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, router, user]);

  if (isLoading)
    return (
      <main style={styles.main}>
        <p role="status">Memuat profil...</p>
      </main>
    );
  if (error)
    return (
      <main style={styles.main}>
        <Message error={error} />
      </main>
    );
  if (!me)
    return (
      <main style={styles.main}>
        <p role="status">Mengarahkan ke halaman login...</p>
      </main>
    );
  return <ProfileContent editable profile={me} />;
}

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    accountsApi.getProfile(id).then(
      (result) => {
        if (active) setProfile(result);
      },
      (reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Profil gagal dimuat.");
      },
    );
    return () => {
      active = false;
    };
  }, [id]);

  if (error)
    return (
      <main style={styles.main}>
        <Message error={error} />
      </main>
    );
  if (!profile)
    return (
      <main style={styles.main}>
        <p role="status">Memuat profil...</p>
      </main>
    );
  return <ProfileContent profile={profile} />;
}

async function uploadMedia(file: File, purpose: "photo" | "gallery"): Promise<string> {
  const signed = await accountsApi.signUpload(
    { file_name: file.name, content_type: file.type },
    purpose,
  );
  const { error } = await getSupabase()
    .storage.from("media")
    .uploadToSignedUrl(signed.path, signed.token, file, { contentType: file.type });
  if (error) throw error;
  return signed.path;
}

export function EditProfilePage() {
  const { user, me, isLoading, error, refresh } = useMe();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [sport, setSport] = useState<Sport>("basketball");
  const [years, setYears] = useState("");
  const [notes, setNotes] = useState("");
  const [quote, setQuote] = useState("");
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, router, user]);
  useEffect(() => {
    if (!me) return;
    setDisplayName(me.display_name);
    setAge(me.age === null ? "" : String(me.age));
    setBio(me.bio ?? "");
  }, [me]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);
    setMessage(null);
    try {
      const photo_path = photoFile ? await uploadMedia(photoFile, "photo") : me?.photo_path;
      await accountsApi.updateMe({
        display_name: displayName,
        age: age ? Number(age) : null,
        bio: bio || null,
        photo_path,
      });
      await refresh();
      setPhotoFile(null);
      setMessage("Profil berhasil disimpan.");
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Profil gagal disimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveExperience(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);
    setMessage(null);
    try {
      await accountsApi.upsertExperience(sport, {
        years: years ? Number(years) : null,
        notes: notes || null,
      });
      await refresh();
      setMessage("Pengalaman olahraga berhasil disimpan.");
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Pengalaman gagal disimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveGallery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setFormError(null);
    setMessage(null);
    try {
      let item: GalleryItemInput;
      if (galleryFile) {
        const path = await uploadMedia(galleryFile, "gallery");
        item = {
          kind: galleryFile.type.startsWith("video/") ? "video" : "photo",
          storage_path: path,
        };
      } else {
        item = { kind: "quote", quote_text: quote };
      }
      await accountsApi.addGalleryItem(item);
      await refresh();
      setGalleryFile(null);
      setQuote("");
      setMessage("Item galeri berhasil ditambahkan.");
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Item galeri gagal ditambahkan.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteGalleryItem(itemId: string) {
    setIsSaving(true);
    setFormError(null);
    try {
      await accountsApi.removeGalleryItem(itemId);
      await refresh();
      setMessage("Item galeri dihapus.");
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Item galeri gagal dihapus.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading)
    return (
      <main style={styles.main}>
        <p role="status">Memuat profil...</p>
      </main>
    );
  if (error)
    return (
      <main style={styles.main}>
        <Message error={error} />
      </main>
    );
  if (!me)
    return (
      <main style={styles.main}>
        <p role="status">Mengarahkan ke halaman login...</p>
      </main>
    );

  return (
    <main style={styles.main}>
      <h1>Ubah profil</h1>
      <Message error={formError} info={message} />
      <form onSubmit={saveProfile} style={styles.panel}>
        <h2>Informasi profil</h2>
        <label style={styles.field}>
          Nama tampilan
          <input
            required
            maxLength={80}
            onChange={(event) => setDisplayName(event.target.value)}
            style={styles.input}
            value={displayName}
          />
        </label>
        <label style={styles.field}>
          Usia
          <input
            min={5}
            max={100}
            type="number"
            onChange={(event) => setAge(event.target.value)}
            style={styles.input}
            value={age}
          />
        </label>
        <label style={styles.field}>
          Bio
          <textarea
            maxLength={500}
            onChange={(event) => setBio(event.target.value)}
            style={styles.input}
            value={bio}
          />
        </label>
        <label style={styles.field}>
          Foto profil
          <input
            accept="image/jpeg,image/png,image/webp"
            type="file"
            onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button disabled={isSaving} style={styles.button} type="submit">
          {isSaving ? "Menyimpan..." : "Simpan profil"}
        </button>
      </form>

      <form onSubmit={saveExperience} style={styles.panel}>
        <h2>Pengalaman olahraga</h2>
        <label style={styles.field}>
          Cabang olahraga
          <select
            onChange={(event) => setSport(event.target.value as Sport)}
            style={styles.input}
            value={sport}
          >
            {sports.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label style={styles.field}>
          Lama bermain (tahun)
          <input
            min={0}
            max={80}
            step={0.1}
            type="number"
            onChange={(event) => setYears(event.target.value)}
            style={styles.input}
            value={years}
          />
        </label>
        <label style={styles.field}>
          Catatan
          <textarea
            maxLength={500}
            onChange={(event) => setNotes(event.target.value)}
            style={styles.input}
            value={notes}
          />
        </label>
        <button disabled={isSaving} style={styles.button} type="submit">
          Simpan pengalaman
        </button>
      </form>

      <form onSubmit={saveGallery} style={styles.panel}>
        <h2>Tambah ke galeri</h2>
        <label style={styles.field}>
          Foto atau video
          <input
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            type="file"
            onChange={(event) => setGalleryFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label style={styles.field}>
          Atau tambahkan kutipan
          <textarea
            maxLength={1000}
            onChange={(event) => setQuote(event.target.value)}
            style={styles.input}
            value={quote}
          />
        </label>
        <button
          disabled={isSaving || (!galleryFile && !quote.trim())}
          style={styles.button}
          type="submit"
        >
          Tambah item
        </button>
      </form>

      <section style={styles.panel}>
        <h2>Item galeri saat ini</h2>
        {me.gallery.map((item: GalleryItem) => {
          return (
            <div
              key={item.id}
              style={{ alignItems: "center", display: "flex", gap: 12, marginBottom: 10 }}
            >
              <GalleryCard item={item} />
              <button
                disabled={isSaving}
                onClick={() => void deleteGalleryItem(item.id)}
                style={styles.button}
                type="button"
              >
                Hapus
              </button>
            </div>
          );
        })}
      </section>
    </main>
  );
}
