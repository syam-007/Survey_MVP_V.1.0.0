import React, { useState, useCallback, useMemo } from 'react';
import { Autocomplete, TextField, CircularProgress } from '@mui/material';
import { useGetWellsQuery } from '../../stores/wellsSlice';
import type { Well } from '../../types/well.types';

interface WellAutocompleteProps {
  value: Well | null;
  onChange: (well: Well | null) => void;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
}

/**
 * WellAutocomplete Component
 * Autocomplete component for selecting wells with debounced search
 * Based on Story 2.5 AC#6
 */
export const WellAutocomplete: React.FC<WellAutocompleteProps> = ({
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

  return (
    <Autocomplete
      value={value}
      onChange={(event, newValue) => onChange(newValue)}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      options={wells}
      getOptionLabel={(option) => option.well_name}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      loading={isLoading || isFetching}
      disabled={disabled}
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
  );
};
