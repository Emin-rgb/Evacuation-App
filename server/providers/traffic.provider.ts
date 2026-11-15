import { db } from "@/server/db";
import { roadEdges } from "@/server/db/schema";
import type { GraphEdge } from "@/server/engine/routing";

export interface TrafficProvider {
  getEdges(): Promise<GraphEdge[]>;
}

/** Simulated "external routing API": reads road status from our own table. */
export class SimulatedTrafficProvider implements TrafficProvider {
  async getEdges(): Promise<GraphEdge[]> {
    const rows = await db.select().from(roadEdges);
    return rows.map(({ id, fromNodeId, toNodeId, lengthM, status }) => ({
      id,
      fromNodeId,
      toNodeId,
      lengthM,
      status,
    }));
  }
}

export const trafficProvider: TrafficProvider = new SimulatedTrafficProvider();
