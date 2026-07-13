export type FieldType =
  | "text"
  | "number"
  | "currency"
  | "percent"
  | "select"
  | "multi_select"
  | "date"
  | "checkbox"
  | "user"
  | "multi_user"
  | "url"
  | "email"
  | "attachment"
  | "relation";

export type RuntimeKind = "database_app" | "custom_app";

export type OptionColor = string;

export interface SelectOption {
  id: string;
  label: string;
  color?: OptionColor;
}

export interface UserOption {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
}

export interface AttachmentFieldConfig {
  source?: "app_file" | "workspace_file";
  label_field?: string;
  url_field?: string;
  file_id_field?: string;
  preview_url_field?: string;
  direct_url_field?: string;
  download_url_field?: string;
  content_type_field?: string;
}

export interface FieldConfig {
  options?: SelectOption[];
  user_source?: "workspace" | "app";
  users?: UserOption[];
  currency?: string;
  include_time?: boolean;
  date_format?: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" | "MMM D, YYYY";
  max_visible?: number;
  relation_entity_id?: string;
  relation_label_field?: string;
  attachment?: AttachmentFieldConfig;
}

export interface ManifestField {
  key: string;
  column?: string;
  label: string;
  type: FieldType;
  required?: boolean;
  sortable?: boolean;
  width?: number;
  system?: boolean;
  config?: FieldConfig;
}

export interface RelationshipManifest {
  key?: string;
  type: "has_one" | "has_many" | "belongs_to" | "many_to_many";
  entityId: string;
  foreignKey?: string;
  label?: string;
}

export interface EntityManifest {
  id: string;
  label: string;
  pluralLabel: string;
  description: string;
  titleField: string;
  fields: ManifestField[];
  relationships: RelationshipManifest[];
}

export interface EntityListQueryParameter {
  name: string;
  required?: boolean;
  schema: Record<string, unknown>;
  description?: string;
}

export interface AppMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  baseUrl?: string;
}

export interface AppContractField {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  sortable?: boolean;
  width?: number;
  system?: boolean;
  config?: FieldConfig;
}

export interface AppContractRelationship {
  id: string;
  type: RelationshipManifest["type"];
  entity_id: string;
  foreign_key?: string;
}

export interface AppContractEntityCreateApi {
  path: string;
  autoLinkDiscussion?: boolean;
}

export interface AppContractEntityApi {
  get?: string;
  list?: string;
  create?: string | AppContractEntityCreateApi;
  update?: string;
  delete?: string;
}

export type EntityApiDefinition = AppContractEntityApi;

export interface AppContractEntity {
  id: string;
  label: string;
  description?: string;
  record_id_field: string;
  title_field: string;
  fields: AppContractField[];
  relationships: AppContractRelationship[];
  api?: AppContractEntityApi;
}

export interface AppManifest {
  schema_version: "kylon.app_manifest.v1";
  app: {
    id: string;
    name: string;
    version: string;
    base_url?: string;
    template_id?: string;
    template_version?: string;
  };
  data: {
    entities: AppContractEntity[];
  };
  docs?: {
    openapi_url?: string;
  };
}

export interface AppDataModelField {
  id: string;
  column: string;
}

export interface AppDataModelEntity {
  id: string;
  table: string;
  id_column?: string;
  created_at_column?: string;
  updated_at_column?: string;
  fields: AppDataModelField[];
}

export interface AppDataModel {
  schema_version: "kylon.app_data_model.v1";
  entities: AppDataModelEntity[];
}

export interface AppRegistration {
  runtime_kind: RuntimeKind;
  manifest: AppManifest;
  data_model?: AppDataModel | null;
  openapi?: Record<string, unknown> | null;
  agent_docs?: string | null;
}

export type FieldPrimitive = string | number | boolean | null;

export interface CanonicalObjectValue {
  id?: string;
  label?: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  url?: string;
}

export interface CanonicalFileBaseValue {
  id?: string;
  label?: string;
  contentType?: string;
  url?: string;
  workspaceId?: string;
  workspaceFileId?: string;
  previewUrl?: string;
  directUrl?: string;
  downloadUrl?: string;
  size?: number;
}

export type CanonicalFileValue =
  | (CanonicalFileBaseValue & { fileName: string; name?: string })
  | (CanonicalFileBaseValue & { name: string; fileName?: string });

export type CanonicalFieldValue =
  | FieldPrimitive
  | FieldPrimitive[]
  | CanonicalObjectValue
  | CanonicalObjectValue[]
  | CanonicalFileValue
  | CanonicalFileValue[];

export interface CanonicalRecord {
  id: string;
  entity: string;
  values: Record<string, CanonicalFieldValue>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppRecordResponse {
  entity_id: string;
  record_id: string;
  data: Record<string, CanonicalFieldValue>;
  created_at?: string;
  updated_at?: string;
}

export interface PaginationParams {
  limit: number;
  cursor?: string;
}

export interface PaginationResult {
  limit: number;
  nextCursor?: string;
  hasMore: boolean;
}

export interface AppRecordListResult {
  records: CanonicalRecord[];
  pagination: PaginationResult;
}

export interface AppRecordListResponse {
  entity_id: string;
  records: AppRecordResponse[];
  pagination: {
    limit: number;
    next_cursor?: string;
    has_more: boolean;
  };
}

export interface EntityDefinition extends EntityManifest {
  table: string;
  idColumn?: string;
  recordIdParam?: string;
  createdAtColumn?: string;
  updatedAtColumn?: string;
  api?: EntityApiDefinition;
  listQueryParameters?: EntityListQueryParameter[];
}

export interface AppDefinition {
  runtimeKind?: RuntimeKind;
  app: AppMetadata;
  entities: EntityDefinition[];
  openapi?: {
    paths?: Record<string, unknown>;
    schemas?: Record<string, unknown>;
    tags?: Array<Record<string, unknown>>;
  };
}
