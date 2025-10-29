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

  // Query wells with search filter
  const { data, isLoading, isFetching } = useGetWellsQuery(
    debouncedSearch
      ? { search: debouncedSearch, page_size: 20 }
      : { page_size: 20 }
  );

  const wells = useMemo(() => data?.results || [], [data]);

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

  // Combine wells with create new option
  const options = useMemo(() => {
    return [CREATE_NEW_OPTION, ...wells];
  }, [wells]);

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
        loading={isLoading || isFetching}
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
                  {(isLoading || isFetching) ? (
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
