import type { FastifyInstance } from "fastify";
import { liveRoute } from "../../core/realtime";
import {
  capabilityBody,
  consentBody,
  createSessionBody,
  ingestEventsBody,
  joinSessionBody,
  segmentParams,
  sessionParams,
  signSegmentBody,
} from "./schema";
import { createDevicesService } from "./service";

export async function routes(app: FastifyInstance) {
  const devices = createDevicesService(app.ctx);
  const sid = (params: unknown) => sessionParams.parse(params).id;

  // POST /api/v1/devices/sessions: Buat sesi pairing (kode sesi dan QR) [coach]
  app.post("/sessions", { preHandler: app.requireRole("coach") }, async (req, reply) =>
    reply.code(201).send(await devices.createSession(req.user!, createSessionBody.parse(req.body))),
  );
  // POST /api/v1/devices/sessions/join: Pasang device dengan kode: {code, role} [login]
  app.post("/sessions/join", { preHandler: app.requireRole() }, (req) =>
    devices.joinSession(req.user!, joinSessionBody.parse(req.body)),
  );
  // GET /api/v1/devices/sessions/:id: Status sesi dan device [login]
  app.get("/sessions/:id", { preHandler: app.requireRole() }, (req) => devices.getSessionFor(req.user!, sid(req.params)));
  // POST /api/v1/devices/sessions/:id/capability: Laporkan kemampuan device (resolusi, FPS) [login]
  app.post("/sessions/:id/capability", { preHandler: app.requireRole() }, (req) =>
    devices.reportCapability(req.user!, sid(req.params), capabilityBody.parse(req.body)),
  );
  // POST /api/v1/devices/sessions/:id/heartbeat: Tandai device masih online [login]
  app.post("/sessions/:id/heartbeat", { preHandler: app.requireRole() }, (req) =>
    devices.heartbeat(req.user!, sid(req.params)),
  );
  // POST /api/v1/devices/sessions/:id/consent: Catat persetujuan pemain sebelum direkam [login]
  app.post("/sessions/:id/consent", { preHandler: app.requireRole() }, (req) => {
    consentBody.parse(req.body);
    return devices.recordConsent(req.user!, sid(req.params));
  });
  // POST /api/v1/devices/sessions/:id/calibration: Simpan kalibrasi ring, gawang, atau garis [coach]
  app.post("/sessions/:id/calibration", { preHandler: app.requireRole("coach") }, (req) =>
    devices.saveCalibration(req.user!, sid(req.params), req.body),
  );
  // POST /api/v1/devices/sessions/:id/segments/sign: Minta signed URL upload segmen (maks 50 MB) [login]
  app.post("/sessions/:id/segments/sign", { preHandler: app.requireRole() }, (req) =>
    devices.signSegment(req.user!, sid(req.params), signSegmentBody.parse(req.body)),
  );
  // POST /api/v1/devices/sessions/:id/segments/:segmentId/uploaded: Tandai segmen siap diproses [login]
  app.post("/sessions/:id/segments/:segmentId/uploaded", { preHandler: app.requireRole() }, (req) => {
    const { id, segmentId } = segmentParams.parse(req.params);
    return devices.markUploaded(req.user!, id, segmentId);
  });
  // POST /api/v1/devices/events: Terima batch kejadian dari yolo-service [x-service-key]
  app.post("/events", { preHandler: app.requireServiceKey }, (req) =>
    devices.ingestEvents(ingestEventsBody.parse(req.body).events),
  );
  // WS /api/v1/devices/sessions/:id/live?token=: Status device langsung [Coach sesi atau device yang join]
  liveRoute(app, "/sessions/:id/live", (p) => `devices:${p.id}`, {
    authorize: (user, params) => devices.canView(user, params.id ?? ""),
  });
}
