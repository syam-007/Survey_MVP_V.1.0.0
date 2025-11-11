import React, { useState } from 'react';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Build as BuildIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { PageHeader } from '../components/common/PageHeader';
import { ErrorAlert } from '../components/common/ErrorAlert';
import { SkeletonLoader } from '../components/common/SkeletonLoader';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { SuccessSnackbar } from '../components/common/SuccessSnackbar';
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useGetClientsQuery,
  useCreateClientMutation,
  useUpdateClientMutation,
  useDeleteClientMutation,
  useGetRigsQuery,
  useCreateRigMutation,
  useUpdateRigMutation,
  useDeleteRigMutation,
  useGetServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
} from '../stores/jobsSlice';
import { useGetWellsQuery, useCreateWellMutation, useUpdateWellMutation, useDeleteWellMutation } from '../stores/wellsSlice';
import type {
  Customer,
  Client,
  Rig,
  Service,
  CreateCustomerInput,
  CreateClientInput,
  CreateRigInput,
  CreateServiceInput,
} from '../types/job.types';
import type { Well, CreateWellInput } from '../types/well.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`config-tabpanel-${index}`}
      aria-labelledby={`config-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

/**
 * ConfigurationPage Component
 * Master data management page with tabbed interface for Customer, Client, Well, Rig, and Service
 */
export const ConfigurationPage: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Dialog states
  const [customerDialog, setCustomerDialog] = useState(false);
  const [clientDialog, setClientDialog] = useState(false);
  const [wellDialog, setWellDialog] = useState(false);
  const [rigDialog, setRigDialog] = useState(false);
  const [serviceDialog, setServiceDialog] = useState(false);

  // Edit mode states
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editingWell, setEditingWell] = useState<Well | null>(null);
  const [editingRig, setEditingRig] = useState<Rig | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Form data states
  const [customerForm, setCustomerForm] = useState({ customer_name: '' });
  const [clientForm, setClientForm] = useState({ client_name: '' });
  const [wellForm, setWellForm] = useState<CreateWellInput>({
    well_name: '',
    well_id: '',
    location: {
      latitude: null,
      longitude: null,
      latitude_degrees: null,
      latitude_minutes: null,
      latitude_seconds: null,
      longitude_degrees: null,
      longitude_minutes: null,
      longitude_seconds: null,
      easting: null,
      northing: null,
      geodetic_datum: 'PSD 93',
      geodetic_system: 'Universal Transverse Mercator',
      map_zone: 'Zone 40N(54E to 60E)',
      north_reference: 'Grid North',
      central_meridian: null,
    },
  });
  const [rigForm, setRigForm] = useState({ rig_id: '', rig_number: '' });
  const [serviceForm, setServiceForm] = useState({ service_name: '' });

  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation states
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  // Queries
  const { data: customers, isLoading: loadingCustomers, refetch: refetchCustomers } = useGetCustomersQuery({
    page: page + 1,
    page_size: pageSize,
  });
  const { data: clients, isLoading: loadingClients, refetch: refetchClients } = useGetClientsQuery({
    page: page + 1,
    page_size: pageSize,
  });
  const { data: wells, isLoading: loadingWells, refetch: refetchWells } = useGetWellsQuery({
    page: page + 1,
    page_size: pageSize,
  });
  const { data: rigs, isLoading: loadingRigs, refetch: refetchRigs } = useGetRigsQuery({
    page: page + 1,
    page_size: pageSize,
  });
  const { data: services, isLoading: loadingServices, refetch: refetchServices } = useGetServicesQuery({
    page: page + 1,
    page_size: pageSize,
  });

  // Mutations
  const [createCustomer] = useCreateCustomerMutation();
  const [updateCustomer] = useUpdateCustomerMutation();
  const [deleteCustomer] = useDeleteCustomerMutation();
  const [createClient] = useCreateClientMutation();
  const [updateClient] = useUpdateClientMutation();
  const [deleteClient] = useDeleteClientMutation();
  const [createWell] = useCreateWellMutation();
  const [updateWell] = useUpdateWellMutation();
  const [deleteWell] = useDeleteWellMutation();
  const [createRig] = useCreateRigMutation();
  const [updateRig] = useUpdateRigMutation();
  const [deleteRig] = useDeleteRigMutation();
  const [createService] = useCreateServiceMutation();
  const [updateService] = useUpdateServiceMutation();
  const [deleteService] = useDeleteServiceMutation();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    setPage(0);
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const showSnackbar = (message: string) => {
    setSnackbar({ open: true, message });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      switch (deleteTarget.type) {
        case 'customer':
          await deleteCustomer(deleteTarget.id).unwrap();
          refetchCustomers();
          break;
        case 'client':
          await deleteClient(deleteTarget.id).unwrap();
          refetchClients();
          break;
        case 'well':
          await deleteWell(deleteTarget.id).unwrap();
          refetchWells();
          break;
        case 'rig':
          await deleteRig(deleteTarget.id).unwrap();
          refetchRigs();
          break;
        case 'service':
          await deleteService(deleteTarget.id).unwrap();
          refetchServices();
          break;
      }
      showSnackbar(`${deleteTarget.type.charAt(0).toUpperCase() + deleteTarget.type.slice(1)} deleted successfully`);
      setDeleteDialog(false);
      setDeleteTarget(null);
    } catch (error: any) {
      console.error('Failed to delete:', error);
      showSnackbar(error?.data?.detail || 'Failed to delete. It may be in use by other records.');
    }
  };

  const openDeleteDialog = (type: string, id: string) => {
    setDeleteTarget({ type, id });
    setDeleteDialog(true);
  };

  // Handle customer form
  const openCustomerDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustomerForm({ customer_name: customer.customer_name });
    } else {
      setEditingCustomer(null);
      setCustomerForm({ customer_name: '' });
    }
    setFormErrors({});
    setCustomerDialog(true);
  };

  const handleCustomerSubmit = async () => {
    if (!customerForm.customer_name.trim()) {
      setFormErrors({ customer_name: 'Customer name is required' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        await updateCustomer({ id: editingCustomer.id, data: customerForm }).unwrap();
        showSnackbar('Customer updated successfully');
      } else {
        await createCustomer(customerForm).unwrap();
        showSnackbar('Customer created successfully');
      }
      setCustomerDialog(false);
      refetchCustomers();
    } catch (error: any) {
      console.error('Failed to save customer:', error);
      showSnackbar(error?.data?.detail || 'Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle client form
  const openClientDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setClientForm({ client_name: client.client_name });
    } else {
      setEditingClient(null);
      setClientForm({ client_name: '' });
    }
    setFormErrors({});
    setClientDialog(true);
  };

  const handleClientSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!clientForm.client_name.trim()) errors.client_name = 'Client name is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingClient) {
        await updateClient({ id: editingClient.id, data: clientForm }).unwrap();
        showSnackbar('Client updated successfully');
      } else {
        await createClient(clientForm).unwrap();
        showSnackbar('Client created successfully');
      }
      setClientDialog(false);
      refetchClients();
    } catch (error: any) {
      console.error('Failed to save client:', error);
      showSnackbar(error?.data?.detail || 'Failed to save client');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle well form
  const openWellDialog = (well?: Well) => {
    if (well) {
      setEditingWell(well);
      setWellForm({
        well_name: well.well_name,
        well_id: well.well_id,
        location: {
          latitude: well.location?.latitude || null,
          longitude: well.location?.longitude || null,
          latitude_degrees: well.location?.latitude_degrees || null,
          latitude_minutes: well.location?.latitude_minutes || null,
          latitude_seconds: well.location?.latitude_seconds || null,
          longitude_degrees: well.location?.longitude_degrees || null,
          longitude_minutes: well.location?.longitude_minutes || null,
          longitude_seconds: well.location?.longitude_seconds || null,
          easting: well.location?.easting || null,
          northing: well.location?.northing || null,
          geodetic_datum: well.location?.geodetic_datum || 'PSD 93',
          geodetic_system: well.location?.geodetic_system || 'Universal Transverse Mercator',
          map_zone: well.location?.map_zone || 'Zone 40N(54E to 60E)',
          north_reference: well.location?.north_reference || 'Grid North',
          central_meridian: well.location?.central_meridian || null,
        },
      });
    } else {
      setEditingWell(null);
      setWellForm({
        well_name: '',
        well_id: '',
        location: {
          latitude: null,
          longitude: null,
          latitude_degrees: null,
          latitude_minutes: null,
          latitude_seconds: null,
          longitude_degrees: null,
          longitude_minutes: null,
          longitude_seconds: null,
          easting: null,
          northing: null,
          geodetic_datum: 'PSD 93',
          geodetic_system: 'Universal Transverse Mercator',
          map_zone: 'Zone 40N(54E to 60E)',
          north_reference: 'Grid North',
          central_meridian: null,
        },
      });
    }
    setFormErrors({});
    setWellDialog(true);
  };

  const handleWellSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!wellForm.well_name.trim()) errors.well_name = 'Well name is required';
    if (!wellForm.well_id.trim()) errors.well_id = 'Well ID is required';

    // Validate location - at least latitude/longitude OR easting/northing must be provided
    const hasLatLong = wellForm.location.latitude !== null && wellForm.location.longitude !== null;
    const hasUTM = wellForm.location.easting !== null && wellForm.location.northing !== null;

    if (!hasLatLong && !hasUTM) {
      errors.location = 'Either Latitude/Longitude or Easting/Northing is required';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingWell) {
        await updateWell({ id: editingWell.id, data: wellForm }).unwrap();
        showSnackbar('Well updated successfully');
      } else {
        await createWell(wellForm).unwrap();
        showSnackbar('Well created successfully');
      }
      setWellDialog(false);
      refetchWells();
    } catch (error: any) {
      console.error('Failed to save well:', error);
      showSnackbar(error?.data?.detail || 'Failed to save well');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle rig form
  const openRigDialog = (rig?: Rig) => {
    if (rig) {
      setEditingRig(rig);
      setRigForm({ rig_id: rig.rig_id, rig_number: rig.rig_number });
    } else {
      setEditingRig(null);
      setRigForm({ rig_id: '', rig_number: '' });
    }
    setFormErrors({});
    setRigDialog(true);
  };

  const handleRigSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!rigForm.rig_id.trim()) errors.rig_id = 'Rig ID is required';
    if (!rigForm.rig_number.trim()) errors.rig_number = 'Rig number is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRig) {
        await updateRig({ id: editingRig.id, data: rigForm }).unwrap();
        showSnackbar('Rig updated successfully');
      } else {
        await createRig(rigForm).unwrap();
        showSnackbar('Rig created successfully');
      }
      setRigDialog(false);
      refetchRigs();
    } catch (error: any) {
      console.error('Failed to save rig:', error);
      showSnackbar(error?.data?.detail || 'Failed to save rig');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle service form
  const openServiceDialog = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setServiceForm({ service_name: service.service_name });
    } else {
      setEditingService(null);
      setServiceForm({ service_name: '' });
    }
    setFormErrors({});
    setServiceDialog(true);
  };

  const handleServiceSubmit = async () => {
    if (!serviceForm.service_name.trim()) {
      setFormErrors({ service_name: 'Service name is required' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingService) {
        await updateService({ id: editingService.id, data: serviceForm }).unwrap();
        showSnackbar('Service updated successfully');
      } else {
        await createService(serviceForm).unwrap();
        showSnackbar('Service created successfully');
      }
      setServiceDialog(false);
      refetchServices();
    } catch (error: any) {
      console.error('Failed to save service:', error);
      showSnackbar(error?.data?.detail || 'Failed to save service');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Customer Table
  const renderCustomersTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BusinessIcon /> Customers
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openCustomerDialog()}
        >
          Create Customer
        </Button>
      </Box>

      {loadingCustomers ? (
        <SkeletonLoader count={5} height={60} />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Customer Name</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers?.results.map((customer) => (
                <TableRow key={customer.id} hover>
                  <TableCell>{customer.customer_name}</TableCell>
                  <TableCell>{format(new Date(customer.created_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{format(new Date(customer.updated_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{customer.created_by_name || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => openCustomerDialog(customer)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => openDeleteDialog('customer', customer.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={customers?.count || 0}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </TableContainer>
      )}
    </Box>
  );

  // Client Table
  const renderClientsTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon /> Clients
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openClientDialog()}
        >
          Create Client
        </Button>
      </Box>

      {loadingClients ? (
        <SkeletonLoader count={5} height={60} />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Client Name</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients?.results.map((client) => (
                <TableRow key={client.id} hover>
                  <TableCell>{client.client_name}</TableCell>
                  <TableCell>{format(new Date(client.created_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{format(new Date(client.updated_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{client.created_by_name || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => openClientDialog(client)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => openDeleteDialog('client', client.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={clients?.count || 0}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </TableContainer>
      )}
    </Box>
  );

  // Well Table
  const renderWellsTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationIcon /> Wells
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openWellDialog()}
        >
          Create Well
        </Button>
      </Box>

      {loadingWells ? (
        <SkeletonLoader count={5} height={60} />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Well Name</TableCell>
                <TableCell>Well ID</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {wells?.results.map((well) => (
                <TableRow key={well.id} hover>
                  <TableCell>{well.well_name}</TableCell>
                  <TableCell>{well.well_id}</TableCell>
                  <TableCell>
                    {well.has_location ? (
                      <Box>
                        <Chip label="Location Set" color="success" size="small" />
                        {well.location && (
                          <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                            {well.location.latitude && well.location.longitude
                              ? `Lat: ${well.location.latitude.toFixed(6)}, Lon: ${well.location.longitude.toFixed(6)}`
                              : well.location.easting && well.location.northing
                              ? `E: ${well.location.easting.toFixed(2)}, N: ${well.location.northing.toFixed(2)}`
                              : 'Location data available'}
                          </Typography>
                        )}
                      </Box>
                    ) : (
                      <Chip label="No Location" size="small" />
                    )}
                  </TableCell>
                  <TableCell>{format(new Date(well.created_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{format(new Date(well.updated_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{well.created_by_name || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => openWellDialog(well)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => openDeleteDialog('well', well.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={wells?.count || 0}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </TableContainer>
      )}
    </Box>
  );

  // Rig Table
  const renderRigsTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BuildIcon /> Rigs
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openRigDialog()}
        >
          Create Rig
        </Button>
      </Box>

      {loadingRigs ? (
        <SkeletonLoader count={5} height={60} />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Rig ID</TableCell>
                <TableCell>Rig Number</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rigs?.results.map((rig) => (
                <TableRow key={rig.id} hover>
                  <TableCell>{rig.rig_id}</TableCell>
                  <TableCell>{rig.rig_number}</TableCell>
                  <TableCell>{format(new Date(rig.created_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{format(new Date(rig.updated_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{rig.created_by_name || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => openRigDialog(rig)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => openDeleteDialog('rig', rig.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={rigs?.count || 0}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </TableContainer>
      )}
    </Box>
  );

  // Service Table
  const renderServicesTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon /> Services
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => openServiceDialog()}
        >
          Create Service
        </Button>
      </Box>

      {loadingServices ? (
        <SkeletonLoader count={5} height={60} />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Service Name</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
                <TableCell>Created By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {services?.results.map((service) => (
                <TableRow key={service.id} hover>
                  <TableCell>{service.service_name}</TableCell>
                  <TableCell>{format(new Date(service.created_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{format(new Date(service.updated_at), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{service.created_by_name || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => openServiceDialog(service)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => openDeleteDialog('service', service.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={services?.count || 0}
            page={page}
            onPageChange={handlePageChange}
            rowsPerPage={pageSize}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </TableContainer>
      )}
    </Box>
  );

  return (
    <Container maxWidth="xl">
      <PageHeader
        title="Configuration"
        subtitle="Manage master data: Customers, Clients, Wells, Rigs, and Services"
        breadcrumbs={[
          { label: 'Home', path: '/dashboard' },
          { label: 'Configuration' },
        ]}
      />

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="configuration tabs"
          variant="fullWidth"
        >
          <Tab label="Customers" icon={<BusinessIcon />} iconPosition="start" />
          <Tab label="Clients" icon={<PersonIcon />} iconPosition="start" />
          <Tab label="Wells" icon={<LocationIcon />} iconPosition="start" />
          <Tab label="Rigs" icon={<BuildIcon />} iconPosition="start" />
          <Tab label="Services" icon={<SettingsIcon />} iconPosition="start" />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          {renderCustomersTab()}
        </TabPanel>
        <TabPanel value={currentTab} index={1}>
          {renderClientsTab()}
        </TabPanel>
        <TabPanel value={currentTab} index={2}>
          {renderWellsTab()}
        </TabPanel>
        <TabPanel value={currentTab} index={3}>
          {renderRigsTab()}
        </TabPanel>
        <TabPanel value={currentTab} index={4}>
          {renderServicesTab()}
        </TabPanel>
      </Paper>

      {/* Customer Dialog */}
      <Dialog open={customerDialog} onClose={() => setCustomerDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Create Customer'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              required
              label="Customer Name"
              value={customerForm.customer_name}
              onChange={(e) => setCustomerForm({ ...customerForm, customer_name: e.target.value })}
              error={!!formErrors.customer_name}
              helperText={formErrors.customer_name}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerDialog(false)} disabled={isSubmitting}>Cancel</Button>
          <Button variant="contained" onClick={handleCustomerSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Client Dialog */}
      <Dialog open={clientDialog} onClose={() => setClientDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingClient ? 'Edit Client' : 'Create Client'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              required
              label="Client Name"
              value={clientForm.client_name}
              onChange={(e) => setClientForm({ ...clientForm, client_name: e.target.value })}
              error={!!formErrors.client_name}
              helperText={formErrors.client_name}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClientDialog(false)} disabled={isSubmitting}>Cancel</Button>
          <Button variant="contained" onClick={handleClientSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Well Dialog */}
      <Dialog open={wellDialog} onClose={() => setWellDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>{editingWell ? 'Edit Well' : 'Create Well'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Well Basic Info */}
            <Typography variant="h6" color="primary">Basic Information</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                required
                label="Well Name"
                value={wellForm.well_name}
                onChange={(e) => setWellForm({ ...wellForm, well_name: e.target.value })}
                error={!!formErrors.well_name}
                helperText={formErrors.well_name}
              />
              <TextField
                fullWidth
                required
                label="Well ID"
                value={wellForm.well_id}
                onChange={(e) => setWellForm({ ...wellForm, well_id: e.target.value })}
                error={!!formErrors.well_id}
                helperText={formErrors.well_id}
              />
            </Box>

            {/* Location Section */}
            <Typography variant="h6" color="primary">Location Information</Typography>

            {/* Show error if neither coordinate system is provided */}
            {formErrors.location && (
              <Typography color="error" variant="caption" sx={{ mb: 2, display: 'block' }}>
                {formErrors.location}
              </Typography>
            )}

            {/* Latitude/Longitude Decimal */}
            <Typography variant="subtitle2">Latitude/Longitude (Decimal)</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Latitude (Decimal)"
                type="number"
                value={wellForm.location.latitude ?? ''}
                onChange={(e) =>
                  setWellForm({
                    ...wellForm,
                    location: {
                      ...wellForm.location,
                      latitude: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  })
                }
                helperText="e.g., 25.123456"
                inputProps={{ step: 'any' }}
              />
              <TextField
                fullWidth
                label="Longitude (Decimal)"
                type="number"
                value={wellForm.location.longitude ?? ''}
                onChange={(e) =>
                  setWellForm({
                    ...wellForm,
                    location: {
                      ...wellForm.location,
                      longitude: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  })
                }
                helperText="e.g., 55.123456"
                inputProps={{ step: 'any' }}
              />
            </Box>

            {/* Latitude DMS */}
            <Typography variant="subtitle2">Latitude (Degrees, Minutes, Seconds)</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Degrees"
                type="number"
                value={wellForm.location.latitude_degrees ?? ''}
                onChange={(e) =>
                  setWellForm({
                    ...wellForm,
                    location: {
                      ...wellForm.location,
                      latitude_degrees: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  })
                }
                inputProps={{ min: 0, max: 90 }}
              />
              <TextField
                fullWidth
                label="Minutes"
                type="number"
                value={wellForm.location.latitude_minutes ?? ''}
                onChange={(e) =>
                  setWellForm({
                    ...wellForm,
                    location: {
                      ...wellForm.location,
                      latitude_minutes: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  })
                }
                inputProps={{ min: 0, max: 60 }}
              />
              <TextField
                fullWidth
                label="Seconds"
                type="number"
                value={wellForm.location.latitude_seconds ?? ''}
                onChange={(e) =>
                  setWellForm({
                    ...wellForm,
                    location: {
                      ...wellForm.location,
                      latitude_seconds: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  })
                }
                inputProps={{ min: 0, max: 60, step: 'any' }}
              />
            </Box>

            {/* Longitude DMS */}
            <Typography variant="subtitle2">Longitude (Degrees, Minutes, Seconds)</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Degrees"
                type="number"
                value={wellForm.location.longitude_degrees ?? ''}
                onChange={(e) =>
                  setWellForm({
                    ...wellForm,
                    location: {
                      ...wellForm.location,
                      longitude_degrees: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  })
                }
                inputProps={{ min: 0, max: 180 }}
              />
              <TextField
                fullWidth
                label="Minutes"
                type="number"
                value={wellForm.location.longitude_minutes ?? ''}
                onChange={(e) =>
                  setWellForm({
                    ...wellForm,
                    location: {
                      ...wellForm.location,
                      longitude_minutes: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  })
                }
                inputProps={{ min: 0, max: 60 }}
              />
              <TextField
                fullWidth
                label="Seconds"
                type="number"
                value={wellForm.location.longitude_seconds ?? ''}
                onChange={(e) =>
                  setWellForm({
                    ...wellForm,
                    location: {
                      ...wellForm.location,
                      longitude_seconds: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  })
                }
                inputProps={{ min: 0, max: 60, step: 'any' }}
              />
            </Box>

            {/* UTM Coordinates */}
            <Typography variant="subtitle2">UTM Coordinates</Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Easting"
                type="number"
                value={wellForm.location.easting ?? ''}
                onChange={(e) =>
                  setWellForm({
                    ...wellForm,
                    location: {
                      ...wellForm.location,
                      easting: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  })
                }
                helperText="UTM Easting coordinate"
                inputProps={{ step: 'any' }}
              />
              <TextField
                fullWidth
                label="Northing"
                type="number"
                value={wellForm.location.northing ?? ''}
                onChange={(e) =>
                  setWellForm({
                    ...wellForm,
                    location: {
                      ...wellForm.location,
                      northing: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  })
                }
                helperText="UTM Northing coordinate"
                inputProps={{ step: 'any' }}
              />
              <TextField
                fullWidth
                label="Central Meridian"
                type="number"
                value={wellForm.location.central_meridian ?? ''}
                onChange={(e) =>
                  setWellForm({
                    ...wellForm,
                    location: {
                      ...wellForm.location,
                      central_meridian: e.target.value ? parseFloat(e.target.value) : null,
                    },
                  })
                }
                helperText="e.g., 57"
                inputProps={{ step: 'any' }}
              />
            </Box>

            {/* Geodetic System Info */}
            <Typography variant="subtitle2">Geodetic System</Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
              <TextField
                fullWidth
                label="Geodetic Datum"
                value={wellForm.location.geodetic_datum}
                onChange={(e) =>
                  setWellForm({
                    ...wellForm,
                    location: {
                      ...wellForm.location,
                      geodetic_datum: e.target.value,
                    },
                  })
                }
                placeholder="PSD 93"
              />
              <TextField
                fullWidth
                label="Geodetic System"
                value={wellForm.location.geodetic_system}
                onChange={(e) =>
                  setWellForm({
                    ...wellForm,
                    location: {
                      ...wellForm.location,
                      geodetic_system: e.target.value,
                    },
                  })
                }
                placeholder="Universal Transverse Mercator"
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Map Zone"
                value={wellForm.location.map_zone}
                onChange={(e) =>
                  setWellForm({
                    ...wellForm,
                    location: {
                      ...wellForm.location,
                      map_zone: e.target.value,
                    },
                  })
                }
                placeholder="Zone 40N(54E to 60E)"
              />
              <FormControl fullWidth>
                <InputLabel>North Reference</InputLabel>
                <Select
                  value={wellForm.location.north_reference}
                  label="North Reference"
                  onChange={(e) =>
                    setWellForm({
                      ...wellForm,
                      location: {
                        ...wellForm.location,
                        north_reference: e.target.value as 'True North' | 'Grid North' | 'Magnetic North',
                      },
                    })
                  }
                >
                  <MenuItem value="True North">True North</MenuItem>
                  <MenuItem value="Grid North">Grid North</MenuItem>
                  <MenuItem value="Magnetic North">Magnetic North</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWellDialog(false)} disabled={isSubmitting}>Cancel</Button>
          <Button variant="contained" onClick={handleWellSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rig Dialog */}
      <Dialog open={rigDialog} onClose={() => setRigDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRig ? 'Edit Rig' : 'Create Rig'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              required
              label="Rig ID"
              value={rigForm.rig_id}
              onChange={(e) => setRigForm({ ...rigForm, rig_id: e.target.value })}
              error={!!formErrors.rig_id}
              helperText={formErrors.rig_id}
            />
            <TextField
              fullWidth
              required
              label="Rig Number"
              value={rigForm.rig_number}
              onChange={(e) => setRigForm({ ...rigForm, rig_number: e.target.value })}
              error={!!formErrors.rig_number}
              helperText={formErrors.rig_number || 'Unique identifier for the rig'}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRigDialog(false)} disabled={isSubmitting}>Cancel</Button>
          <Button variant="contained" onClick={handleRigSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Service Dialog */}
      <Dialog open={serviceDialog} onClose={() => setServiceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingService ? 'Edit Service' : 'Create Service'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              required
              label="Service Name"
              value={serviceForm.service_name}
              onChange={(e) => setServiceForm({ ...serviceForm, service_name: e.target.value })}
              error={!!formErrors.service_name}
              helperText={formErrors.service_name}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServiceDialog(false)} disabled={isSubmitting}>Cancel</Button>
          <Button variant="contained" onClick={handleServiceSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog}
        title="Delete Confirmation"
        message={`Are you sure you want to delete this ${deleteTarget?.type}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteDialog(false);
          setDeleteTarget(null);
        }}
        confirmText="Delete"
        confirmColor="error"
      />

      {/* Success Snackbar */}
      <SuccessSnackbar
        open={snackbar.open}
        message={snackbar.message}
        onClose={() => setSnackbar({ open: false, message: '' })}
      />
    </Container>
  );
};
