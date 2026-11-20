import type { FastifyInstance } from "fastify";
import {
  bootstrapProfileSchema,
  experienceSchema,
  galleryItemSchema,
  sportSchema,
  updateProfileSchema,
  uploadSchema,
} from "./schema";
import { createAccountsService } from "./service";

export async function routes(app: FastifyInstance) {
  const accounts = createAccountsService(app.ctx);

  app.post("/bootstrap", { preHandler: app.requireRole() }, async (request) => {
    const input = bootstrapProfileSchema.parse(request.body);
    return accounts.bootstrapProfile(request.user!.id, input.display_name);
  });

  app.get("/me", { preHandler: app.requireRole() }, (request) => accounts.getMe(request.user!.id));

  app.patch("/me", { preHandler: app.requireRole() }, async (request) => {
    const input = updateProfileSchema.parse(request.body);
    return accounts.updateMe(request.user!.id, input);
  });

  app.get<{ Params: { id: string } }>("/:id", { preHandler: app.requireRole() }, (request) =>
    accounts.getPublicProfile(request.params.id),
  );

  app.put<{ Params: { sport: string } }>(
    "/me/experience/:sport",
    { preHandler: app.requireRole() },
    async (request) => {
      const sport = sportSchema.parse(request.params.sport);
      const input = experienceSchema.parse(request.body);
      return accounts.upsertExperience(request.user!.id, sport, input);
    },
  );

  app.post("/me/gallery/sign", { preHandler: app.requireRole() }, async (request) => {
    const input = uploadSchema.parse(request.body);
    return accounts.signUpload(request.user!.id, input, "gallery");
  });

  app.post("/me/gallery", { preHandler: app.requireRole() }, async (request) => {
    const input = galleryItemSchema.parse(request.body);
    return accounts.addGalleryItem(request.user!.id, input);
  });

  app.delete<{ Params: { itemId: string } }>(
    "/me/gallery/:itemId",
    { preHandler: app.requireRole() },
    (request) => accounts.removeGalleryItem(request.user!.id, request.params.itemId),
  );

  app.post("/me/photo/sign", { preHandler: app.requireRole() }, async (request) => {
    const input = uploadSchema.parse(request.body);
    return accounts.signUpload(request.user!.id, input, "photo");
  });
}
