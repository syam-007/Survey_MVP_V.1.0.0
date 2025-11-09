import React, { useState, useCallback, useMemo } from 'react';
import { Autocomplete, TextField, CircularProgress, Box, Typography } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useGetWellsQuery } from '../../stores/wellsSlice';
import type { Well } from '../../types/well.types';
import { WellCreateDialog } from './WellCreateDialog';

interface WellAutocompleteWithCreateProps {
  value: Well | null;
  onChange: (well: Well | null) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  wells?: Well[]; // Optional prop to provide wells directly
}

/**
 * WellAutocompleteWithCreate Component
 * Autocomplete component for selecting wells with debounced search
 * Includes ability to create new wells inline
 */
export const WellAutocompleteWithCreate: React.FC<WellAutocompleteWithCreateProps> = ({
  value,
  onChange,
  error = false,
  helperText,
  disabled = false,
  required = false,
  label = 'Well',
  wells: wellsProp,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // Debounce search with 300ms delay
  const debounceTimeout = React.useRef<NodeJS.Timeout | undefined>(undefined);
  const handleInputChange = useCallback((event: any, newInputValue: string) => {
    setInputValue(newInputValue);

    // Clear existing timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Set new timeout
    debounceTimeout.current = setTimeout(() => {
      setDebouncedSearch(newInputValue);
    }, 300);
  }, []);

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, []);

  // Query wells with search filter (only if wells prop not provided)
  const { data, isLoading, isFetching } = useGetWellsQuery(
    debouncedSearch
      ? { search: debouncedSearch, page_size: 100 }
      : { page_size: 100 },
    { skip: !!wellsProp } // Skip RTK Query if wells prop is provided
  );

  // Use wells from prop if provided, otherwise use RTK Query results
  const wells = useMemo(() => {
    if (wellsProp) {
      // Filter wells based on search if needed
      if (debouncedSearch) {
        return wellsProp.filter(w =>
          w.well_name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          w.well_id?.toLowerCase().includes(debouncedSearch.toLowerCase())
        );
      }
      return wellsProp;
    }
    return data?.results || [];
  }, [wellsProp, debouncedSearch, data]);

  // Create a special "create new" option
  const CREATE_NEW_OPTION: Well = {
    id: '__create_new__',
    well_id: '__create_new__',
    well_name: 'Create New Well...',
    runs_count: 0,
    runs: [],
    created_at: '',
    updated_at: '',
  };

  // Combine wells with create new option, ensuring selected well is included
  const options = useMemo(() => {
    let wellsList = [...wells];

    // Always ensure the selected well is in the options list
    if (value && value.id !== '__create_new__') {
      // Remove the well if it already exists to avoid duplicates
      wellsList = wellsList.filter(w => w.id !== value.id);
      // Add the selected well at the beginning (after CREATE_NEW_OPTION)
      wellsList.unshift(value);
    }

    return [CREATE_NEW_OPTION, ...wellsList];
  }, [wells, value]);

  // Loading state: only show loading if using RTK Query and it's loading
  const loading = wellsProp ? false : (isLoading || isFetching);

  const handleChange = (event: any, newValue: Well | null) => {
    if (newValue?.id === '__create_new__') {
      setCreateDialogOpen(true);
    } else {
      onChange(newValue);
    }
  };

  const handleWellCreated = (newWell: Well) => {
    onChange(newWell);
    setCreateDialogOpen(false);
  };

  return (
    <>
      <Autocomplete
        value={value}
        onChange={handleChange}
        inputValue={inputValue}
        onInputChange={handleInputChange}
        options={options}
        getOptionLabel={(option) => {
          if (option.id === '__create_new__') {
            return option.well_name;
          }
          return option.well_id ? `${option.well_id} - ${option.well_name}` : option.well_name;
        }}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        loading={loading}
        disabled={disabled}
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
                <Typography>{option.well_name}</Typography>
              </Box>
            );
          }
          return (
            <Box component="li" {...props}>
              <Box>
                <Typography variant="body1">
                  {option.well_id ? `${option.well_id} - ${option.well_name}` : option.well_name}
                </Typography>
                {option.runs_count > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {option.runs_count} {option.runs_count === 1 ? 'run' : 'runs'}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            required={required}
            error={error}
            helperText={helperText}
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
          debouncedSearch
            ? 'No wells found'
            : 'Start typing to search wells'
        }
      />

      <WellCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onWellCreated={handleWellCreated}
      />
    </>
  );
};
