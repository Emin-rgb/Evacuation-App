import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { roadEdges, systemFlags } from "@/server/db/schema";
import { EDGES, INACCESSIBLE_EDGES, NODES, haversineM } from "@/server/data/fallback-graph";
import { ResilientEdges, type EdgesResult, type ProviderHealth } from "@/server/engine/resilient-edges";
import type { GraphEdge } from "@/server/engine/routing";

export type FailureMode = "off" | "503" | "slow";
const FLAG = "traffic_failure_mode";

export interface TrafficProvider {
  getEdges(): Promise<GraphEdge[]>;
}

export class ProviderUnavailableError extends Error {
  constructor() {
    super("503 Service Unavailable");
    this.name = "ProviderUnavailableError";
  }
}

export async function getFailureMode(): Promise<FailureMode> {
  const [row] = await db.select().from(systemFlags).where(eq(systemFlags.key, FLAG));
  return row?.value === "503" || row?.value === "slow" ? row.value : "off";
}

export async function setFailureMode(mode: FailureMode): Promise<void> {
  await db
    .insert(systemFlags)
    .values({ key: FLAG, value: mode })
    .onConflictDoUpdate({ target: systemFlags.key, set: { value: mode, updatedAt: new Date() } });
}

/** Simulated "external routing API": reads road status from our own table; can be told to fail (503) or hang (slow). */
export class SimulatedTrafficProvider implements TrafficProvider {
  async getEdges(): Promise<GraphEdge[]> {
    const mode = await getFailureMode();
    if (mode === "503") throw new ProviderUnavailableError();
    if (mode === "slow") await new Promise((r) => setTimeout(r, 6500));
    const rows = await db.select().from(roadEdges);
    return rows.map(({ id, fromNodeId, toNodeId, lengthM, status, isAccessible, name }) => ({
      id,
      fromNodeId,
      toNodeId,
      lengthM,
      status,
      isAccessible,
      name,
    }));
  }
}

/** Bundled backup graph: node ids are the stable seed keys (n1..n20), all roads assumed open. */
export function staticEdges(): GraphEdge[] {
  return EDGES.map(([a, b, name]) => ({
    id: `static-${a}-${b}`,
    fromNodeId: a,
    toNodeId: b,
    lengthM: haversineM([NODES[a][1], NODES[a][2]], [NODES[b][1], NODES[b][2]]),
    status: "open" as const,
    isAccessible: !INACCESSIBLE_EDGES.has(`${a}-${b}`),
    name,
  }));
}

/** Maps static-graph node keys to the DB node ids (matched by node name, which the seed keeps unique). */
export function remapStaticEdges(edges: GraphEdge[], nodes: { id: string; name: string }[]): GraphEdge[] {
  const idByKey = new Map<string, string>();
  for (const [key, [name]] of Object.entries(NODES)) {
    const n = nodes.find((x) => x.name === name);
    if (n) idByKey.set(key, n.id);
  }
  return edges.flatMap((e) => {
    const from = idByKey.get(e.fromNodeId);
    const to = idByKey.get(e.toNodeId);
    return from && to ? [{ ...e, fromNodeId: from, toNodeId: to }] : [];
  });
}

const simulated = new SimulatedTrafficProvider();
const resilient = new ResilientEdges({ primary: () => simulated.getEdges(), fallback: staticEdges });

export const trafficProvider = {
  /** live → cache → static; never throws */
  getEdgesWithMeta: (): Promise<EdgesResult> => resilient.get(),
  async getEdges(): Promise<GraphEdge[]> {
    return (await resilient.get()).edges;
  },
  health: (): ProviderHealth => resilient.health(),
};
