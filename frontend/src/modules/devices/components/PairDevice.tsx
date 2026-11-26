"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ErrorNote, useAction } from "@/modules/payments";
import { devicesApi } from "../api";
import type { DeviceRole } from "../types";
import { ROLE_LABEL } from "./DeviceList";

/** Pasang HP ke sesi dengan kode (diketik atau dari tautan QR ?code=). */
export function PairDevice({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [role, setRole] = useState<DeviceRole>("camera_home");
  const action = useAction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await action.run(() => devicesApi.joinSession(code, role));
    if (!res) return;
    if (role === "controller") {
      router.push(res.session.matchId ? `/coach/match/${res.session.matchId}` : `/coach/session/new`);
    } else {
      router.push(`/device/camera/${res.session.id}`);
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset disabled={action.busy}>
        <label>
          Kode sesi{" "}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            autoCapitalize="characters"
            autoComplete="off"
            inputMode="text"
            maxLength={12}
            required
          />
        </label>
        <div role="radiogroup" aria-label="Peran device" style={{ display: "flex", gap: 8, margin: "12px 0" }}>
          {(Object.keys(ROLE_LABEL) as DeviceRole[]).map((r) => (
            <label key={r}>
              <input type="radio" name="role" checked={role === r} onChange={() => setRole(r)} /> {ROLE_LABEL[r]}
            </label>
          ))}
        </div>
        <button type="submit">Pasang</button>
        <ErrorNote message={action.error} />
      </fieldset>
    </form>
  );
}
