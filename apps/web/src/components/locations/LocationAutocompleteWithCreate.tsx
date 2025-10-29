import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Box,
  Typography,
  Chip,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import type { Location } from '../../types/location.types';
import { LocationCreateDialog } from './LocationCreateDialog';
import locationsService from '../../services/locationsService';

interface LocationAutocompleteWithCreateProps {
  value: Location | null;
  onChange: (location: Location | null) => void;
  wellId?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  label?: string;
}

/**
 * LocationAutocompleteWithCreate Component
 * Autocomplete component for selecting locations from a well
 * Includes ability to create new locations inline
 */
export const LocationAutocompleteWithCreate: React.FC<LocationAutocompleteWithCreateProps> = ({
  value,
  onChange,
  wellId,
  error = false,
  helperText,
  disabled = false,
  label = 'Location',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch locations when wellId changes
  useEffect(() => {
    const fetchLocations = async () => {
      if (!wellId) {
        setLocations([]);
        return;
      }

      setLoading(true);
      try {
        const fetchedLocations = await locationsService.getLocationsByWellId(wellId);
        setLocations(fetchedLocations);
      } catch (error) {
        console.error('Failed to fetch locations:', error);
        setLocations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, [wellId]);

  // Create a special "create new" option
  const CREATE_NEW_OPTION: Location = {
    id: '__create_new__',
    run: '',
    latitude: 0,
    longitude: 0,
    latitude_degrees: 0,
    latitude_minutes: 0,
    latitude_seconds: 0,
    longitude_degrees: 0,
    longitude_minutes: 0,
    longitude_seconds: 0,
    geodetic_datum: 'Create New Location...',
    geodetic_system: 'PSD 93',
    map_zone: '',
    north_reference: 'Grid North',
    central_meridian: 0,
    easting: 0,
    northing: 0,
    grid_correction: 0,
    g_t: 0,
    w_t: 0,
    created_at: '',
    updated_at: '',
  };

  // Combine locations with create new option
  const options = [CREATE_NEW_OPTION, ...locations];

  const handleChange = (event: any, newValue: Location | null) => {
    if (newValue?.id === '__create_new__') {
      setCreateDialogOpen(true);
    } else {
      onChange(newValue);
    }
  };

  const handleLocationCreated = (newLocation: Location) => {
    setLocations([...locations, newLocation]);
    onChange(newLocation);
    setCreateDialogOpen(false);
  };

  const getOptionLabel = (option: Location) => {
    if (option.id === '__create_new__') {
      return option.geodetic_datum || 'Create New Location...';
    }
    // Display format: "Lat: XX.XXXX, Lon: XX.XXXX"
    const lat = option.north_coordinate || option.latitude || 0;
    const lon = option.east_coordinate || option.longitude || 0;
    return `Lat: ${lat.toFixed(4)}°, Lon: ${lon.toFixed(4)}°`;
  };

  return (
    <>
      <Autocomplete
        value={value}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
        options={options}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        loading={loading}
        disabled={disabled || !wellId}
        renderOption={(props, option) => {
          if (option.id === '__create_new__') {
            return (
              <Box
                component="li"
                {...props}
                sx={{
                  color: 'primary.main',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <AddIcon />
                <Typography>Create New Location...</Typography>
              </Box>
            );
          }
          const lat = option.north_coordinate || option.latitude || 0;
          const lon = option.east_coordinate || option.longitude || 0;
          return (
            <Box component="li" {...props}>
              <Box>
                <Typography variant="body2">
                  Lat: {lat.toFixed(4)}°, Lon: {lon.toFixed(4)}°
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {option.map_zone || 'N/A'} - {option.geodetic_system || 'N/A'}
                </Typography>
              </Box>
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={error}
            helperText={helperText || (!wellId ? 'Select a well first' : undefined)}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
        noOptionsText={
          !wellId
            ? 'Select a well first'
            : 'No locations found for this well'
        }
      />

      <LocationCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onLocationCreated={handleLocationCreated}
        wellId={wellId}
      />
    </>
  );
};
