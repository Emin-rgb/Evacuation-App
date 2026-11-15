import { z } from "zod";

export const nearestQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const routeQuerySchema = nearestQuerySchema.extend({ prev: z.string().uuid().optional() });

export const idParamSchema = z.object({ id: z.string().uuid() });
export const roadPatchSchema = z.object({ status: z.enum(["open", "closed"]) });
export const shelterPatchSchema = z.object({ occupancy: z.number().int().min(0) });
