// Daftar semua modul. Modul baru: buat foldernya, lalu impor di sini.
import type { AppModule } from "../core/module";
import accounts from "./accounts";
import roleRequests from "./role-requests";
import venues from "./venues";
import openPlay from "./open-play";
import payments from "./payments";
import equipment from "./equipment";
import bracket from "./bracket";
import match from "./match";
import scoring from "./scoring";
import devices from "./devices";
import level from "./level";
import community from "./community";
import feed from "./feed";
import vip from "./vip";
import admin from "./admin";

export const modules: AppModule[] = [
  accounts,
  roleRequests,
  venues,
  openPlay,
  payments,
  equipment,
  bracket,
  match,
  scoring,
  devices,
  level,
  community,
  feed,
  vip,
  admin,
];
