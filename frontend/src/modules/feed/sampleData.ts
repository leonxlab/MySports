// TODO: Ganti contoh peminjaman ini dengan kontrak API setelah layanan equipment dan approval tersedia.
export type LoanStatus = "Tersedia" | "Diajukan" | "Dipinjam" | "Dikembalikan";

export interface SampleLoanRequest {
  id: string;
  requester: string;
  requestedAt: string;
  status: LoanStatus | "Ditolak";
}

export interface SampleEquipmentPost {
  id: string;
  kind: "offer" | "request";
  authorName: string;
  sport: string;
  itemName: string;
  condition: string;
  quantity: number;
  period: string;
  location: string;
  price: number;
  deposit: number | null;
  status: LoanStatus;
  isOwnPost: boolean;
  requests: SampleLoanRequest[];
}

export const sampleEquipmentPosts: SampleEquipmentPost[] = [
  {
    id: "sample-raket",
    kind: "offer",
    authorName: "Raka Pratama",
    sport: "Badminton",
    itemName: "Raket badminton",
    condition: "Kondisi baik",
    quantity: 2,
    period: "Sabtu, 09.00–13.00",
    location: "Cikarang Selatan",
    price: 15000,
    deposit: 50000,
    status: "Tersedia",
    isOwnPost: true,
    requests: [
      {
        id: "sample-request-raket",
        requester: "Dina Putri",
        requestedAt: "Hari ini",
        status: "Diajukan",
      },
    ],
  },
  {
    id: "sample-sepatu",
    kind: "offer",
    authorName: "Nadia Putri",
    sport: "Futsal",
    itemName: "Sepatu futsal ukuran 39",
    condition: "Kondisi sangat baik",
    quantity: 1,
    period: "Minggu, 15.00–19.00",
    location: "Cikarang Utara",
    price: 20000,
    deposit: null,
    status: "Dipinjam",
    isOwnPost: false,
    requests: [],
  },
  {
    id: "sample-cari-bola",
    kind: "request",
    authorName: "Bima Saputra",
    sport: "Basket",
    itemName: "Bola basket ukuran 7",
    condition: "Tidak ada preferensi kondisi",
    quantity: 1,
    period: "Jumat sore",
    location: "Cikarang Barat",
    price: 0,
    deposit: null,
    status: "Diajukan",
    isOwnPost: false,
    requests: [],
  },
  {
    id: "sample-pelindung",
    kind: "offer",
    authorName: "Ari Wibowo",
    sport: "Badminton",
    itemName: "Pelindung lutut",
    condition: "Sudah dibersihkan",
    quantity: 1,
    period: "Sampai 30 November",
    location: "Cikarang Pusat",
    price: 0,
    deposit: null,
    status: "Dikembalikan",
    isOwnPost: false,
    requests: [],
  },
];

export interface SampleVenueLoanPost {
  id: string;
  authorName: string;
  venueName: string;
  courtName: string;
  sport: string;
  period: string;
  location: string;
  pricePerHour: number;
  deposit: number | null;
  status: LoanStatus;
  isOwnPost: boolean;
  requests: SampleLoanRequest[];
}

export const sampleVenueLoanPosts: SampleVenueLoanPost[] = [
  {
    id: "sample-venue-request",
    authorName: "GOR Cikarang Baru",
    venueName: "GOR Cikarang Baru",
    courtName: "Court 2",
    sport: "Badminton",
    period: "Sabtu, 10.00–12.00",
    location: "Cikarang Utara",
    pricePerHour: 80000,
    deposit: null,
    status: "Diajukan",
    isOwnPost: true,
    requests: [
      {
        id: "sample-venue-requester",
        requester: "Fajar Hidayat",
        requestedAt: "Hari ini",
        status: "Diajukan",
      },
    ],
  },
  {
    id: "sample-venue-available",
    authorName: "GOR Taman Raya",
    venueName: "GOR Taman Raya",
    courtName: "Court 1",
    sport: "Basket",
    period: "Minggu, 13.00–15.00",
    location: "Cikarang Selatan",
    pricePerHour: 120000,
    deposit: 50000,
    status: "Tersedia",
    isOwnPost: false,
    requests: [],
  },
];

export interface SampleNotification {
  id: string;
  kind: "balasan" | "suka" | "open-play" | "lapangan";
  text: string;
  time: string;
  unread: boolean;
}

// TODO: Ganti notifikasi pratinjau ini setelah endpoint notifikasi tersedia.
export const sampleNotifications: SampleNotification[] = [
  {
    id: "sample-notification-reply",
    kind: "balasan",
    text: "Dina membalas thread latihan badminton kamu.",
    time: "5 menit lalu",
    unread: true,
  },
  {
    id: "sample-notification-open-play",
    kind: "open-play",
    text: "Open play badminton yang kamu ikuti akan dimulai besok.",
    time: "1 jam lalu",
    unread: true,
  },
  {
    id: "sample-notification-like",
    kind: "suka",
    text: "Raka menyukai postingan kamu.",
    time: "Kemarin",
    unread: false,
  },
];

// TODO: Ganti data profil ini setelah endpoint aktivitas profil tersedia.
export interface SampleProfileActivity {
  id: string;
  tab: "Postingan" | "Balasan" | "Open play" | "Alat";
  authorName: string;
  sport: string;
  title: string;
  body: string;
  time: string;
}

export const sampleProfileActivity: SampleProfileActivity[] = [
  {
    id: "sample-profile-post",
    tab: "Postingan",
    authorName: "Dina Putri",
    sport: "Badminton",
    title: "Latihan footwork sore ini",
    body: "Latihan langkah kecil membantu menjaga posisi tetap siap di setiap reli.",
    time: "2 jam lalu",
  },
  {
    id: "sample-profile-reply",
    tab: "Balasan",
    authorName: "Dina Putri",
    sport: "Badminton",
    title: "Balasan di komunitas",
    body: "Saya biasanya mulai pemanasan dengan lari ringan dan gerak kaki.",
    time: "Kemarin",
  },
  {
    id: "sample-profile-open-play",
    tab: "Open play",
    authorName: "Dina Putri",
    sport: "Badminton",
    title: "Open play akhir pekan",
    body: "Sabtu, pukul 09.00 · Cikarang Selatan · 4 dari 8 slot terisi.",
    time: "Sabtu",
  },
  {
    id: "sample-profile-equipment",
    tab: "Alat",
    authorName: "Dina Putri",
    sport: "Badminton",
    title: "Menawarkan raket badminton",
    body: "Kondisi baik · 1 unit · Cikarang Selatan.",
    time: "Minggu lalu",
  },
];

// TODO: Ganti data grup ini setelah endpoint komunitas, anggota, dan kalender tersedia.
export const sampleCommunityOpenPlays = [
  {
    id: "sample-community-open-play",
    authorName: "Komunitas Peluit",
    sport: "Badminton",
    title: "Latihan santai akhir pekan",
    body: "Sabtu, 09.00–11.00 · Cikarang Selatan · 4 dari 8 slot terisi · Rp 25.000",
    time: "Sabtu",
  },
];

export const sampleCommunityMembers = [
  { id: "sample-community-member-1", name: "Dina Putri", sport: "Badminton" },
  { id: "sample-community-member-2", name: "Raka Pratama", sport: "Basket" },
  { id: "sample-community-member-3", name: "Nadia Putri", sport: "Futsal" },
];
