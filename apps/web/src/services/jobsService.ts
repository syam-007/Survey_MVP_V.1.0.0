import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  Job,
  JobDetail,
  JobListItem,
  CreateJobInput,
  UpdateJobInput,
  JobFilters,
  PaginatedJobResponse,
  Customer,
  Client,
  Rig,
  Service,
  CreateCustomerInput,
  CreateClientInput,
  CreateRigInput,
  CreateServiceInput,
  MasterDataFilters,
  PaginatedCustomerResponse,
  PaginatedClientResponse,
  PaginatedRigResponse,
  PaginatedServiceResponse,
} from '../types/job.types';
import authService from './authService';
import config from '../config/env';

const API_BASE_URL = config.apiBaseUrl;

/**
 * Jobs Service
 * Handles all API calls for Job Management and Master Data
 */
class JobsService {
  private api: AxiosInstance;

  constructor() {
    console.log(API_BASE_URL)
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Skip interceptors in test environment
    const isTestEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

    if (!isTestEnv) {
      // Add request interceptor to include access token
      this.api.interceptors.request.use(
        (config) => {
          const token = authService.getAccessToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        (error) => Promise.reject(error)
      );

      // Add response interceptor to handle errors
      this.api.interceptors.response.use(
        (response) => response,
        async (error) => {
          if (error.response?.status === 401) {
            const newAccessToken = await authService.refreshAccessToken();
            if (newAccessToken) {
              error.config.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.api(error.config);
            }
          }
          return Promise.reject(error);
        }
      );
    }
  }

  // ===== JOB MANAGEMENT =====

  /**
   * Fetch jobs with optional filters, search, and pagination
   */
  async getJobs(filters?: JobFilters): Promise<PaginatedJobResponse> {
    console.log("jobs called")
    const params: Record<string, any> = {};

    if (filters) {
      if (filters.page) params.page = filters.page;
      if (filters.page_size) params.page_size = filters.page_size;
      if (filters.search) params.search = filters.search;
      if (filters.ordering) params.ordering = filters.ordering;
      if (filters.customer) params.customer = filters.customer;
      if (filters.client) params.client = filters.client;
      if (filters.well) params.well = filters.well;
      if (filters.rig) params.rig = filters.rig;
      if (filters.service) params.service = filters.service;
      if (filters.status) params.status = filters.status;
      if (filters.start_date_after) params.start_date_after = filters.start_date_after;
      if (filters.start_date_before) params.start_date_before = filters.start_date_before;
    }

    const response = await this.api.get<PaginatedJobResponse>('/api/v1/jobs/', { params });
    console.log(response.data)
    return response.data;
   
  }

  /**
   * Fetch a single job by ID with full nested data
   */
  async getJobById(id: string): Promise<JobDetail> {
    const response = await this.api.get<JobDetail>(`/api/v1/jobs/${id}/`);
    return response.data;
  }

  /**
   * Create a new job
   */
  async createJob(data: CreateJobInput): Promise<Job> {
    const response = await this.api.post<Job>('/api/v1/jobs/', data);
    return response.data;
  }

  /**
   * Update an existing job
   */
  async updateJob(id: string, data: UpdateJobInput): Promise<Job> {
    const response = await this.api.patch<Job>(`/api/v1/jobs/${id}/`, data);
    return response.data;
  }

  /**
   * Delete a job
   */
  async deleteJob(id: string): Promise<void> {
    await this.api.delete(`/api/v1/jobs/${id}/`);
  }

  /**
   * Get runs for a specific job
   */
  async getJobRuns(id: string): Promise<any[]> {
    const response = await this.api.get(`/api/v1/jobs/${id}/runs/`);
    return response.data;
  }

  /**
   * Get job statistics
   */
  async getJobStatistics(): Promise<any> {
    const response = await this.api.get('/api/v1/jobs/statistics/');
    return response.data;
  }

  // ===== CUSTOMER MANAGEMENT =====

  /**
   * Fetch customers with optional filters
   */
  async getCustomers(filters?: MasterDataFilters): Promise<PaginatedCustomerResponse> {
    const params: Record<string, any> = {};

    if (filters) {
      if (filters.page) params.page = filters.page;
      if (filters.page_size) params.page_size = filters.page_size;
      if (filters.search) params.search = filters.search;
      if (filters.ordering) params.ordering = filters.ordering;
      if (filters.is_active !== undefined) params.is_active = filters.is_active;
    }

    const response = await this.api.get<PaginatedCustomerResponse>('/api/v1/customers/', { params });
    return response.data;
  }

  /**
   * Fetch a single customer by ID
   */
  async getCustomerById(id: string): Promise<Customer> {
    const response = await this.api.get<Customer>(`/api/v1/customers/${id}/`);
    return response.data;
  }

  /**
   * Create a new customer
   */
  async createCustomer(data: CreateCustomerInput): Promise<Customer> {
    const response = await this.api.post<Customer>('/api/v1/customers/', data);
    return response.data;
  }

  /**
   * Update an existing customer
   */
  async updateCustomer(id: string, data: Partial<CreateCustomerInput>): Promise<Customer> {
    const response = await this.api.patch<Customer>(`/api/v1/customers/${id}/`, data);
    return response.data;
  }

  /**
   * Delete a customer
   */
  async deleteCustomer(id: string): Promise<void> {
    await this.api.delete(`/api/v1/customers/${id}/`);
  }

  /**
   * Get clients for a specific customer
   */
  async getCustomerClients(id: string): Promise<Client[]> {
    const response = await this.api.get(`/api/v1/customers/${id}/clients/`);
    return response.data;
  }

  /**
   * Get jobs for a specific customer
   */
  async getCustomerJobs(id: string): Promise<JobListItem[]> {
    const response = await this.api.get(`/api/v1/customers/${id}/jobs/`);
    return response.data;
  }

  // ===== CLIENT MANAGEMENT =====

  /**
   * Fetch clients with optional filters
   */
  async getClients(filters?: MasterDataFilters & { customer?: string }): Promise<PaginatedClientResponse> {
    const params: Record<string, any> = {};

    if (filters) {
      if (filters.page) params.page = filters.page;
      if (filters.page_size) params.page_size = filters.page_size;
      if (filters.search) params.search = filters.search;
      if (filters.ordering) params.ordering = filters.ordering;
      if (filters.is_active !== undefined) params.is_active = filters.is_active;
      if (filters.customer) params.customer = filters.customer;
    }

    const response = await this.api.get<PaginatedClientResponse>('/api/v1/clients/', { params });
    return response.data;
  }

  /**
   * Fetch a single client by ID
   */
  async getClientById(id: string): Promise<Client> {
    const response = await this.api.get<Client>(`/api/v1/clients/${id}/`);
    return response.data;
  }

  /**
   * Create a new client
   */
  async createClient(data: CreateClientInput): Promise<Client> {
    const response = await this.api.post<Client>('/api/v1/clients/', data);
    return response.data;
  }

  /**
   * Update an existing client
   */
  async updateClient(id: string, data: Partial<CreateClientInput>): Promise<Client> {
    const response = await this.api.patch<Client>(`/api/v1/clients/${id}/`, data);
    return response.data;
  }

  /**
   * Delete a client
   */
  async deleteClient(id: string): Promise<void> {
    await this.api.delete(`/api/v1/clients/${id}/`);
  }

  /**
   * Get jobs for a specific client
   */
  async getClientJobs(id: string): Promise<JobListItem[]> {
    const response = await this.api.get(`/api/v1/clients/${id}/jobs/`);
    return response.data;
  }

  // ===== RIG MANAGEMENT =====

  /**
   * Fetch rigs with optional filters
   */
  async getRigs(filters?: MasterDataFilters): Promise<PaginatedRigResponse> {
    const params: Record<string, any> = {};

    if (filters) {
      if (filters.page) params.page = filters.page;
      if (filters.page_size) params.page_size = filters.page_size;
      if (filters.search) params.search = filters.search;
      if (filters.ordering) params.ordering = filters.ordering;
      if (filters.is_active !== undefined) params.is_active = filters.is_active;
    }

    const response = await this.api.get<PaginatedRigResponse>('/api/v1/rigs/', { params });
    return response.data;
  }

  /**
   * Fetch a single rig by ID
   */
  async getRigById(id: string): Promise<Rig> {
    const response = await this.api.get<Rig>(`/api/v1/rigs/${id}/`);
    return response.data;
  }

  /**
   * Create a new rig
   */
  async createRig(data: CreateRigInput): Promise<Rig> {
    const response = await this.api.post<Rig>('/api/v1/rigs/', data);
    return response.data;
  }

  /**
   * Update an existing rig
   */
  async updateRig(id: string, data: Partial<CreateRigInput>): Promise<Rig> {
    const response = await this.api.patch<Rig>(`/api/v1/rigs/${id}/`, data);
    return response.data;
  }

  /**
   * Delete a rig
   */
  async deleteRig(id: string): Promise<void> {
    await this.api.delete(`/api/v1/rigs/${id}/`);
  }

  /**
   * Get jobs for a specific rig
   */
  async getRigJobs(id: string): Promise<JobListItem[]> {
    const response = await this.api.get(`/api/v1/rigs/${id}/jobs/`);
    return response.data;
  }

  // ===== SERVICE MANAGEMENT =====

  /**
   * Fetch services with optional filters
   */
  async getServices(filters?: MasterDataFilters): Promise<PaginatedServiceResponse> {
    const params: Record<string, any> = {};

    if (filters) {
      if (filters.page) params.page = filters.page;
      if (filters.page_size) params.page_size = filters.page_size;
      if (filters.search) params.search = filters.search;
      if (filters.ordering) params.ordering = filters.ordering;
      if (filters.is_active !== undefined) params.is_active = filters.is_active;
    }

    const response = await this.api.get<PaginatedServiceResponse>('/api/v1/services/', { params });
    return response.data;
  }

  /**
   * Fetch a single service by ID
   */
  async getServiceById(id: string): Promise<Service> {
    const response = await this.api.get<Service>(`/api/v1/services/${id}/`);
    return response.data;
  }

  /**
   * Create a new service
   */
  async createService(data: CreateServiceInput): Promise<Service> {
    const response = await this.api.post<Service>('/api/v1/services/', data);
    return response.data;
  }

  /**
   * Update an existing service
   */
  async updateService(id: string, data: Partial<CreateServiceInput>): Promise<Service> {
    const response = await this.api.patch<Service>(`/api/v1/services/${id}/`, data);
    return response.data;
  }

  /**
   * Delete a service
   */
  async deleteService(id: string): Promise<void> {
    await this.api.delete(`/api/v1/services/${id}/`);
  }

  /**
   * Get jobs for a specific service
   */
  async getServiceJobs(id: string): Promise<JobListItem[]> {
    const response = await this.api.get(`/api/v1/services/${id}/jobs/`);
    return response.data;
  }

  // ===== UTILITY METHODS =====

  /**
   * Get axios instance for testing
   */
  public getAxiosInstance(): AxiosInstance {
    return this.api;
  }
}

// Export singleton instance
const jobsService = new JobsService();
export default jobsService;
