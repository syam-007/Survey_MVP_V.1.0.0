/**
 * Job Type Definitions
 * Defines types for Job management and master data entities
 */

// Job Status
export type JobStatus = 'planned' | 'active' | 'completed' | 'cancelled' | 'on_hold';

// Master Data Types
export interface Customer {
  id: string;
  customer_name: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  created_by_name?: string | null;
}

export interface Client {
  id: string;
  client_name: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  created_by_name?: string | null;
}

export interface Rig {
  id: string;
  rig_id: string;
  rig_number: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  created_by_name?: string | null;
}

export interface Service {
  id: string;
  service_name: string;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  created_by_name?: string | null;
}

// Nested objects for Job detail view
export interface JobCustomer {
  id: string;
  customer_name: string;
}

export interface JobClient {
  id: string;
  client_name: string;
}

export interface JobWell {
  id: string;
  well_name: string;
  well_id: string;
}

export interface JobRig {
  id: string;
  rig_id: string;
  rig_number: string;
}

export interface JobService {
  id: string;
  service_name: string;
}

export interface JobUser {
  id: string;
  username: string;
  email: string;
}

// Main Job Interface
export interface Job {
  id: string;
  job_number: string; // Auto-generated (OM1001, OM1002, etc.)
  customer: string | JobCustomer; // ID for create/update, object for detail
  client: string | JobClient;
  well: string | JobWell;
  rig: string | JobRig;
  service: string | JobService;
  start_date?: string | null; // Auto-populated from first run upload
  end_date?: string | null; // Auto-populated from last run upload
  status: JobStatus;
  description?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: JobUser | null;
  run_count?: number;
  duration_days?: number | null;
  is_active?: boolean;
}

// Job List Item (lightweight for list views)
export interface JobListItem {
  id: string;
  job_number: string;
  customer_name: string;
  client_name: string;
  well_name: string;
  rig_name: string;
  service_name: string;
  status: JobStatus;
  start_date?: string | null;
  end_date?: string | null;
  run_count: number;
  created_at: string;
  updated_at: string;
}

// Job Detail (full nested objects)
export interface JobDetail extends Omit<Job, 'customer' | 'client' | 'well' | 'rig' | 'service'> {
  customer: JobCustomer;
  client: JobClient;
  well: JobWell;
  rig: JobRig;
  service: JobService;
}

// Create Job Input
export interface CreateJobInput {
  customer: string; // Customer ID
  client: string; // Client ID
  well: string; // Well ID
  rig: string; // Rig ID
  service: string; // Service ID
  status?: JobStatus;
  description?: string | null;
}

// Update Job Input
export interface UpdateJobInput extends Partial<CreateJobInput> {}

// Job Filters
export interface JobFilters {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  customer?: string;
  client?: string;
  well?: string;
  rig?: string;
  service?: string;
  status?: JobStatus;
  start_date_after?: string;
  start_date_before?: string;
}

// Paginated Job Response
export interface PaginatedJobResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: JobListItem[];
}

// Master Data Filters
export interface MasterDataFilters {
  page?: number;
  page_size?: number;
  search?: string;
  ordering?: string;
  is_active?: boolean;
}

// Paginated Master Data Responses
export interface PaginatedCustomerResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Customer[];
}

export interface PaginatedClientResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Client[];
}

export interface PaginatedRigResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Rig[];
}

export interface PaginatedServiceResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Service[];
}

// Create Master Data Inputs
export interface CreateCustomerInput {
  customer_name: string;
}

export interface CreateClientInput {
  client_name: string;
}

export interface CreateRigInput {
  rig_id: string;
  rig_number: string;
}

export interface CreateServiceInput {
  service_name: string;
}
