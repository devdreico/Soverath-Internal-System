export type EntityType = "coordinator" | "company" | "brand" | "service" | "concept" | "system" | "project" | "channel";
export type Provenance = "founder_confirmed" | "public_observation" | "inferred" | "demo_placeholder" | "needs_confirmation";

export interface Entity {
  id: string;
  slug: string;
  name: string;
  entity_type: EntityType;
  status: string;
  summary: string;
  description: string;
  parent_id: string | null;
  source_url: string | null;
  catalog_source_url: string | null;
  provenance: Provenance;
  source_observed_at: string | null;
  updated_at: string;
}

export interface EntityDocument {
  id: string;
  seed_key: string | null;
  entity_id: string | null;
  title: string;
  document_type: string;
  content: string;
  source_url: string | null;
  source_observed_at: string | null;
  provenance: Provenance;
  updated_at: string;
}

export interface Mission {
  id: string;
  entity_id: string | null;
  title: string;
  goal: string;
  success_metric: string;
  status: string;
  target_date: string | null;
  updated_at: string;
}

export interface Project {
  id: string;
  mission_id: string | null;
  entity_id: string | null;
  title: string;
  summary: string;
  status: string;
  target_date: string | null;
}

export interface Task {
  id: string;
  mission_id: string | null;
  project_id: string | null;
  entity_id: string | null;
  title: string;
  notes: string;
  status: string;
  priority: string;
  due_date: string | null;
}

export interface Metric {
  id: string;
  entity_id: string | null;
  name: string;
  description: string;
  unit: string;
  frequency: string;
  target_value: number | null;
}

export interface MetricValue {
  id: string;
  metric_id: string;
  value: number;
  recorded_on: string;
  note: string;
  provenance: Provenance;
}

export interface InternalAccount {
  id: string;
  entity_id: string | null;
  name: string;
  account_type: string;
  currency: "COP";
  opening_balance_cop: number;
  purpose: string;
  is_active: boolean;
  created_at: string;
}

export interface OperationEvent {
  id: string;
  entity_id: string | null;
  account_id: string | null;
  counter_account_id: string | null;
  event_type: string;
  account_effect: "increase" | "decrease" | "none";
  title: string;
  occurred_on: string;
  amount_cop: number | null;
  details: Record<string, unknown>;
  notes: string;
}

export interface Resource {
  id: string;
  entity_id: string | null;
  document_id: string | null;
  name: string;
  mime_type: string;
  byte_size: number;
  storage_path: string;
  created_at: string;
}

export interface EntityRelationship {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string;
  evidence: string;
  source_url: string | null;
  provenance: Provenance;
}

export interface AuditEvent {
  id: string;
  record_table: string;
  record_id: string | null;
  action: string;
  label: string;
  actor_id: string | null;
  created_at: string;
}
