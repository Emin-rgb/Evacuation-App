import { z } from "zod";

export const nearestQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const routeQuerySchema = nearestQuerySchema.extend({
  prev: z.string().uuid().optional(),
  citizenId: z.string().uuid().optional(),
  shelterId: z.string().uuid().optional(),
});

export const idParamSchema = z.object({ id: z.string().uuid() });
export const roadPatchSchema = z.object({ status: z.enum(["open", "closed"]) });
export const shelterPatchSchema = z.object({ occupancy: z.number().int().min(0) });

export const citizenCreateSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  role: z.enum(["standard", "priority"]).optional(),
});
export const citizenPatchSchema = z
  .object({ status: z.literal("safe").optional(), role: z.enum(["standard", "priority"]).optional() })
  .refine((v) => v.status !== undefined || v.role !== undefined);
export const sosCreateSchema = z.object({
  citizenId: z.string().uuid(),
  type: z.enum(["fire", "collapse", "flood", "medical"]),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export const sosBurstSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  count: z.number().int().min(1).max(20),
});

export const providerModeSchema = z.object({ mode: z.enum(["off", "503", "slow"]) });
