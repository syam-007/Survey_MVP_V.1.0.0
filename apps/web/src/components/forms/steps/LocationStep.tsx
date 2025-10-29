import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Typography,
  Alert,
  Box,
  Paper,
  Button,
  Divider,
  CircularProgress,
} from '@mui/material';
import { GridWrapper as Grid } from './GridWrapper';
import type { GeodeticSystem, NorthReference, CreateLocationInput, Location } from '../../../types';
import { LocationAutocompleteWithCreate } from '../../locations/LocationAutocompleteWithCreate';
import locationsService from '../../../services/locationsService';

/**
 * Validation schema for Location step
 */
const locationSchema = yup.object({
  latitude: yup
    .number()
    .nullable()
    .min(-90, 'Latitude must be >= -90')
    .max(90, 'Latitude must be <= 90'),
  longitude: yup
    .number()
    .nullable()
    .min(-180, 'Longitude must be >= -180')
    .max(180, 'Longitude must be <= 180'),
  latitude_degrees: yup
    .number()
    .required('Latitude degrees is required')
    .min(-90, 'Degrees must be >= -90')
    .max(90, 'Degrees must be <= 90'),
  latitude_minutes: yup
    .number()
    .nullable()
    .min(0, 'Minutes must be >= 0')
    .max(59, 'Minutes must be <= 59'),
  latitude_seconds: yup
    .number()
    .nullable()
    .min(0, 'Seconds must be >= 0')
    .max(59.999, 'Seconds must be < 60'),
  longitude_degrees: yup
    .number()
    .required('Longitude degrees is required')
    .min(-180, 'Degrees must be >= -180')
    .max(180, 'Degrees must be <= 180'),
  longitude_minutes: yup
    .number()
    .nullable()
    .min(0, 'Minutes must be >= 0')
    .max(59, 'Minutes must be <= 59'),
  longitude_seconds: yup
    .number()
    .nullable()
    .min(0, 'Seconds must be >= 0')
    .max(59.999, 'Seconds must be < 60'),
  easting: yup
    .number()
    .required('Easting is required')
    .min(0, 'Easting must be >= 0'),
  northing: yup
    .number()
    .required('Northing is required')
    .min(0, 'Northing must be >= 0'),
  geodetic_datum: yup
    .string()
    .nullable(),
  geodetic_system: yup
    .mixed<GeodeticSystem>()
    .oneOf(['PSD 93', 'WGS84', 'NAD83', 'NAD27', 'Other'])
    .nullable(),
  map_zone: yup
    .string()
    .nullable()
    .max(100, 'Map zone cannot exceed 100 characters'),
  north_reference: yup
    .mixed<NorthReference>()
    .oneOf(['True North', 'Magnetic North', 'Grid North'])
    .nullable(),
  central_meridian: yup
    .number()
    .required('Central meridian is required')
    .min(-180, 'Central meridian must be >= -180')
    .max(180, 'Central meridian must be <= 180'),
});

export interface LocationStepProps {
  data: Partial<CreateLocationInput>;
  onChange: (data: Partial<CreateLocationInput>) => void;
  wellId?: string;
}

/**
 * LocationStep Component
 * Step 2 of the complete run creation workflow
 * Collects location information (lat/lon, geodetic system, etc.)
 * Based on Story 3.5 AC#2
 */
export const LocationStep: React.FC<LocationStepProps> = ({
  data,
  onChange,
  wellId,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [loadingWellLocation, setLoadingWellLocation] = useState(false);

  const {
    control,
    watch,
    formState: { errors },
    setValue,
  } = useForm<Partial<CreateLocationInput>>({
    resolver: yupResolver(locationSchema) as any,
    defaultValues: {
      geodetic_datum: 'PSD 93', // Default to PSD 93 (read-only)
      geodetic_system: 'Universal Transverse Mercator', // Default to UTM (read-only)
      map_zone: 'Zone 40N(54E to 60E)', // Default to Zone 40N (read-only)
      north_reference: 'Grid North', // Default to Grid North (read-only)
      central_meridian: 57.0, // Default central meridian for Zone 40N
      ...data,
    },
    mode: 'onBlur',
  });

  // Watch all form fields and update parent on change
  const formData = watch();

  // Fetch and auto-populate location when wellId changes
  useEffect(() => {
    const fetchWellLocation = async () => {
      if (!wellId) return;

      setLoadingWellLocation(true);
      try {
        const locations = await locationsService.getLocationsByWellId(wellId);
        if (locations && locations.length > 0) {
          const wellLocation = locations[0];
          // Auto-populate form with well's location
          setValue('latitude_degrees', wellLocation.latitude_degrees);
          setValue('latitude_minutes', wellLocation.latitude_minutes);
          setValue('latitude_seconds', wellLocation.latitude_seconds);
          setValue('longitude_degrees', wellLocation.longitude_degrees);
          setValue('longitude_minutes', wellLocation.longitude_minutes);
          setValue('longitude_seconds', wellLocation.longitude_seconds);
          setValue('easting', wellLocation.easting);
          setValue('northing', wellLocation.northing);
          setValue('central_meridian', wellLocation.central_meridian);
          setValue('geodetic_datum', wellLocation.geodetic_datum);
          setValue('geodetic_system', wellLocation.geodetic_system);
          setValue('map_zone', wellLocation.map_zone);
          setValue('north_reference', wellLocation.north_reference);
          setSelectedLocation(wellLocation);
        }
      } catch (error) {
        console.error('Failed to fetch well location:', error);
      } finally {
        setLoadingWellLocation(false);
      }
    };

    fetchWellLocation();
  }, [wellId, setValue]);

  // Handle location selection - populate form with selected location data
  const handleLocationSelect = (location: Location | null) => {
    setSelectedLocation(location);
    if (location && location.id !== '__create_new__') {
      // Populate form with selected location data
      setValue('latitude_degrees', location.latitude_degrees);
      setValue('latitude_minutes', location.latitude_minutes);
      setValue('latitude_seconds', location.latitude_seconds);
      setValue('longitude_degrees', location.longitude_degrees);
      setValue('longitude_minutes', location.longitude_minutes);
      setValue('longitude_seconds', location.longitude_seconds);
      setValue('easting', location.easting);
      setValue('northing', location.northing);
      setValue('central_meridian', location.central_meridian);
      setValue('geodetic_datum', location.geodetic_datum);
      setValue('geodetic_system', location.geodetic_system);
      setValue('map_zone', location.map_zone);
      setValue('north_reference', location.north_reference);
      setUseManualEntry(false);
    }
  };

  // Use ref to store onChange to avoid infinite loop
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onChangeRef.current(formData);
  }, [formData]);

  // Calculate coordinates from DMS in real-time
  // Formula: degrees + minutes/60 + seconds/3600
  const northCoordinate = useMemo(() => {
    const degrees = formData.latitude_degrees;
    const minutes = formData.latitude_minutes || 0;
    const seconds = formData.latitude_seconds || 0;

    if (degrees === undefined || degrees === null) return null;

    const result = degrees + minutes / 60 + seconds / 3600;
    return parseFloat(result.toFixed(8));
  }, [formData.latitude_degrees, formData.latitude_minutes, formData.latitude_seconds]);

  const eastCoordinate = useMemo(() => {
    const degrees = formData.longitude_degrees;
    const minutes = formData.longitude_minutes || 0;
    const seconds = formData.longitude_seconds || 0;

    if (degrees === undefined || degrees === null) return null;

    const result = degrees + minutes / 60 + seconds / 3600;
    return parseFloat(result.toFixed(8));
  }, [formData.longitude_degrees, formData.longitude_minutes, formData.longitude_seconds]);

  return (
    <>
      <Typography variant="h6" gutterBottom>
        Location Information
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Select an existing location for this well or create a new one.
      </Typography>

      {loadingWellLocation && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={20} />
            <Typography>Loading well location...</Typography>
          </Box>
        </Alert>
      )}

      {wellId && selectedLocation && !loadingWellLocation && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Location data auto-populated from well
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Location Selection */}
        <Grid item xs={12}>
          <LocationAutocompleteWithCreate
            value={selectedLocation}
            onChange={handleLocationSelect}
            wellId={wellId}
            label="Select Existing Location or Create New"
          />
        </Grid>

        {/* Display selected location details in read-only mode */}
        {selectedLocation && !useManualEntry && selectedLocation.id !== '__create_new__' && (
          <Grid item xs={12}>
            <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Selected Location Details
              </Typography>

              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'primary.main' }}>
                Coordinates
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Latitude (DMS)</Typography>
                  <Typography variant="body2">
                    {selectedLocation.latitude_degrees}° {selectedLocation.latitude_minutes || 0}' {selectedLocation.latitude_seconds ? Number(selectedLocation.latitude_seconds).toFixed(3) : 0}"
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Longitude (DMS)</Typography>
                  <Typography variant="body2">
                    {selectedLocation.longitude_degrees}° {selectedLocation.longitude_minutes || 0}' {selectedLocation.longitude_seconds ? Number(selectedLocation.longitude_seconds).toFixed(3) : 0}"
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Easting (UTM)</Typography>
                  <Typography variant="body2">{Number(selectedLocation.easting).toFixed(3)} m</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Northing (UTM)</Typography>
                  <Typography variant="body2">{Number(selectedLocation.northing).toFixed(3)} m</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: 'primary.main' }}>
                Geodetic Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Geodetic Datum</Typography>
                  <Typography variant="body2">{selectedLocation.geodetic_datum || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Geodetic System</Typography>
                  <Typography variant="body2">{selectedLocation.geodetic_system || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Map Zone</Typography>
                  <Typography variant="body2">{selectedLocation.map_zone || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">North Reference</Typography>
                  <Typography variant="body2">{selectedLocation.north_reference || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary">Central Meridian</Typography>
                  <Typography variant="body2">{Number(selectedLocation.central_meridian).toFixed(1)}°</Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Divider sx={{ flex: 1 }} />
            <Typography variant="body2" color="text.secondary">
              OR
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>
        </Grid>

        <Grid item xs={12}>
          {/* <Button
            variant={useManualEntry ? 'contained' : 'outlined'}
            onClick={() => setUseManualEntry(!useManualEntry)}
            fullWidth
          >
            {useManualEntry ? 'Using Manual Entry' : 'Enter Location Manually'}
          </Button> */}
        </Grid>
      </Grid>

      {useManualEntry && (
        <>
          <Typography variant="body2" color="text.secondary" paragraph sx={{ mt: 3 }}>
            Provide the geographic location coordinates and geodetic settings manually.
          </Typography>

          <Grid container spacing={3}>
        {/* Latitude DMS Section */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Latitude (Degrees, Minutes, Seconds)
          </Typography>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Controller
            name="latitude_degrees"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Degrees"
                fullWidth
                required
                error={!!errors.latitude_degrees}
                helperText={errors.latitude_degrees?.message || '(-90 to 90)'}
                placeholder="e.g., 29"
                inputProps={{ step: '1' }}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <Controller
            name="latitude_minutes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Minutes"
                fullWidth
                error={!!errors.latitude_minutes}
                helperText={errors.latitude_minutes?.message || '(0 to 59)'}
                placeholder="e.g., 45"
                inputProps={{ step: '1' }}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <Controller
            name="latitude_seconds"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Seconds"
                fullWidth
                error={!!errors.latitude_seconds}
                helperText={errors.latitude_seconds?.message || '(0.0 to 59.999)'}
                placeholder="e.g., 37.536"
                inputProps={{ step: '0.001' }}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />
        </Grid>

        {/* Longitude DMS Section */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Longitude (Degrees, Minutes, Seconds)
          </Typography>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Controller
            name="longitude_degrees"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Degrees"
                fullWidth
                required
                error={!!errors.longitude_degrees}
                helperText={errors.longitude_degrees?.message || '(-180 to 180)'}
                placeholder="e.g., -95"
                inputProps={{ step: '1' }}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <Controller
            name="longitude_minutes"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Minutes"
                fullWidth
                error={!!errors.longitude_minutes}
                helperText={errors.longitude_minutes?.message || '(0 to 59)'}
                placeholder="e.g., 22"
                inputProps={{ step: '1' }}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />
        </Grid>

        <Grid item xs={12} sm={4}>
          <Controller
            name="longitude_seconds"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Seconds"
                fullWidth
                error={!!errors.longitude_seconds}
                helperText={errors.longitude_seconds?.message || '(0.0 to 59.999)'}
                placeholder="e.g., 11.292"
                inputProps={{ step: '0.001' }}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />
        </Grid>

        {/* Calculated Coordinates Display */}
        {(northCoordinate !== null || eastCoordinate !== null) && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
              <Typography variant="subtitle2" gutterBottom>
                Calculated Decimal Coordinates
              </Typography>
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {northCoordinate !== null && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      North Coordinate (Latitude):
                    </Typography>
                    <Typography variant="h6">
                      {northCoordinate.toFixed(8)}°
                    </Typography>
                  </Box>
                )}
                {eastCoordinate !== null && (
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      East Coordinate (Longitude):
                    </Typography>
                    <Typography variant="h6">
                      {eastCoordinate.toFixed(8)}°
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Geodetic Datum - Read Only */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="geodetic_datum"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Geodetic Datum"
                fullWidth
                disabled
                value="PSD 93"
                helperText="Default geodetic datum (read-only)"
                InputProps={{
                  readOnly: true,
                }}
              />
            )}
          />
        </Grid>

        {/* Geodetic System - Read Only */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="geodetic_system"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Geodetic System"
                fullWidth
                disabled
                value="Universal Transverse Mercator"
                helperText="Default geodetic system (read-only)"
                InputProps={{
                  readOnly: true,
                }}
              />
            )}
          />
        </Grid>

        {/* Map Zone - Read Only */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="map_zone"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Map Zone"
                fullWidth
                disabled
                value="Zone 40N(54E to 60E)"
                helperText="Default map zone (read-only)"
                InputProps={{
                  readOnly: true,
                }}
              />
            )}
          />
        </Grid>

        {/* North Reference - Read Only */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="north_reference"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="North Reference"
                fullWidth
                disabled
                value="Grid North"
                helperText="Default north reference (read-only)"
                InputProps={{
                  readOnly: true,
                }}
              />
            )}
          />
        </Grid>

        {/* Central Meridian */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="central_meridian"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Central Meridian"
                fullWidth
                required
                error={!!errors.central_meridian}
                helperText={errors.central_meridian?.message || 'Decimal degrees (-180 to 180)'}
                placeholder="e.g., -93.0"
                inputProps={{ step: '0.1' }}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />
        </Grid>

        {/* UTM Coordinates Section */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            UTM Coordinates
          </Typography>
        </Grid>

        {/* Easting */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="easting"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Easting"
                fullWidth
                required
                error={!!errors.easting}
                helperText={errors.easting?.message || 'UTM Easting coordinate (meters)'}
                placeholder="e.g., 500000.000"
                inputProps={{ step: '0.001' }}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />
        </Grid>

        {/* Northing */}
        <Grid item xs={12} sm={6}>
          <Controller
            name="northing"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                type="number"
                label="Northing"
                fullWidth
                required
                error={!!errors.northing}
                helperText={errors.northing?.message || 'UTM Northing coordinate (meters)'}
                placeholder="e.g., 3500000.000"
                inputProps={{ step: '0.001' }}
                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
              />
            )}
          />
        </Grid>

        {/* Calculated Fields Info */}
        <Grid item xs={12}>
          <Alert severity="info">
            Grid Correction, G_T, and W_T will be automatically calculated by the backend.
          </Alert>
        </Grid>
      </Grid>
      </>
      )}
    </>
  );
};
