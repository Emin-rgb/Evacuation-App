import { asc } from "drizzle-orm";
import { db } from "@/server/db";
import { zones } from "@/server/db/schema";

export async function listZones() {
  return db.select().from(zones).orderBy(asc(zones.name));
}
