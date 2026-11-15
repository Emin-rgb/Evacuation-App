import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roadStatusEnum = pgEnum("road_status", ["open", "closed"]);
export const shelterTypeEnum = pgEnum("shelter_type", ["shelter", "park", "stadium"]);
export const citizenStatusEnum = pgEnum("citizen_status", ["unknown", "safe", "sos"]);
export const sosTypeEnum = pgEnum("sos_type", ["fire", "collapse", "flood", "medical"]);
export const sosStatusEnum = pgEnum("sos_status", ["new", "assigned", "resolved"]);
export const teamStatusEnum = pgEnum("team_status", ["available", "en_route", "on_scene"]);
export const alertKindEnum = pgEnum("alert_kind", ["sos_cluster", "shelter_overload"]);
export const alertStatusEnum = pgEnum("alert_status", ["open", "approved", "dismissed"]);

export const zones = pgTable("zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  centerLat: doublePrecision("center_lat").notNull(),
  centerLng: doublePrecision("center_lng").notNull(),
});

export const roadNodes = pgTable("road_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
});

export const roadEdges = pgTable("road_edges", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromNodeId: uuid("from_node_id").references(() => roadNodes.id, { onDelete: "cascade" }).notNull(),
  toNodeId: uuid("to_node_id").references(() => roadNodes.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  lengthM: integer("length_m").notNull(),
  status: roadStatusEnum("status").notNull().default("open"),
});

export const shelters = pgTable("shelters", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  type: shelterTypeEnum("type").notNull(),
  zoneId: uuid("zone_id").references(() => zones.id).notNull(),
  nodeId: uuid("node_id").references(() => roadNodes.id).notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  capacity: integer("capacity").notNull(),
  occupancy: integer("occupancy").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isReserve: boolean("is_reserve").notNull().default(false),
});

export const citizens = pgTable("citizens", {
  id: uuid("id").primaryKey().defaultRandom(),
  zoneId: uuid("zone_id").references(() => zones.id),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  status: citizenStatusEnum("status").notNull().default("unknown"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sosSignals = pgTable(
  "sos_signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    citizenId: uuid("citizen_id").references(() => citizens.id, { onDelete: "cascade" }).notNull(),
    zoneId: uuid("zone_id").references(() => zones.id).notNull(),
    type: sosTypeEnum("type").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    status: sosStatusEnum("status").notNull().default("new"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("sos_created_at_idx").on(t.createdAt), index("sos_zone_idx").on(t.zoneId)],
);

export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  kind: alertKindEnum("kind").notNull(),
  zoneId: uuid("zone_id").references(() => zones.id).notNull(),
  shelterId: uuid("shelter_id").references(() => shelters.id),
  sosCount: integer("sos_count").notNull().default(0),
  message: text("message").notNull(),
  status: alertStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rescueTeams = pgTable("rescue_teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  status: teamStatusEnum("status").notNull().default("available"),
  zoneId: uuid("zone_id").references(() => zones.id).notNull(),
  alertId: uuid("alert_id").references(() => alerts.id, { onDelete: "set null" }),
});

export const zonesRelations = relations(zones, ({ many }) => ({
  shelters: many(shelters),
  teams: many(rescueTeams),
}));
export const sheltersRelations = relations(shelters, ({ one }) => ({
  zone: one(zones, { fields: [shelters.zoneId], references: [zones.id] }),
  node: one(roadNodes, { fields: [shelters.nodeId], references: [roadNodes.id] }),
}));
export const sosRelations = relations(sosSignals, ({ one }) => ({
  citizen: one(citizens, { fields: [sosSignals.citizenId], references: [citizens.id] }),
  zone: one(zones, { fields: [sosSignals.zoneId], references: [zones.id] }),
}));
export const teamsRelations = relations(rescueTeams, ({ one }) => ({
  zone: one(zones, { fields: [rescueTeams.zoneId], references: [zones.id] }),
  alert: one(alerts, { fields: [rescueTeams.alertId], references: [alerts.id] }),
}));
export const alertsRelations = relations(alerts, ({ one }) => ({
  zone: one(zones, { fields: [alerts.zoneId], references: [zones.id] }),
  shelter: one(shelters, { fields: [alerts.shelterId], references: [shelters.id] }),
}));
