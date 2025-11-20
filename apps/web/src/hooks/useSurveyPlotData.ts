/**
 * useSurveyPlotData Hook
 *
 * Custom hook for fetching survey data formatted for visualization.
 * Supports both calculated and interpolated data sources.
 */
import { useState, useEffect } from 'react';
import surveysService from '../services/surveysService';
import type { SurveyPlotData } from '../components/visualization/types';

interface SurveyMetadata {
  filename: string;
  uploadDate: string;
  processingDuration: string;
  calculatedCount: number;
  interpolatedCount: number;
}

interface UseSurveyPlotDataResult {
  data: SurveyPlotData | null;
  metadata: SurveyMetadata | null;
  isLoading: boolean;
  error: Error | null;
  isSaved: boolean;
  refetch: () => void;
}

export const useSurveyPlotData = (
  surveyDataId: string,
  dataSource: 'calculated' | 'interpolated',
  resolution?: number,
  startMD?: number,
  endMD?: number
): UseSurveyPlotDataResult => {
  const [data, setData] = useState<SurveyPlotData | null>(null);
  const [metadata, setMetadata] = useState<SurveyMetadata | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(true); // For calculated data, always true; for interpolated, depends on API
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!surveyDataId) return;

      setIsLoading(true);
      setError(null);

      // Clear previous data to ensure fresh fetch
      setData(null);

      try {
        // Fetch survey data based on source
        // Note: surveyDataId parameter is actually the calculated survey ID from the API response
        const result = await surveysService.getSurveyById(surveyDataId);

        // Transform data for plotting based on data source
        let plotData: SurveyPlotData;

        if (dataSource === 'calculated') {
          // Use calculated data
          plotData = {
            md: result.survey_data?.md_data || [],
            inc: result.survey_data?.inc_data || [],
            azi: result.survey_data?.azi_data || [],
            easting: result.easting || [],
            northing: result.northing || [],
            tvd: result.tvd || [],
            dls: result.dls || [],
            vertical_section: result.vertical_section || [],
            closure_distance: result.closure_distance || [],
            closure_direction: result.closure_direction || [],
            pointCount: result.survey_data?.row_count || 0
          };
          // Calculated data is always saved
          setIsSaved(true);
        } else {
          // Fetch interpolated data using the calculated survey ID from the result
          try {
            // The result.id is the calculated survey ID that we need for interpolation
            const calculatedSurveyId = result.id;
            const interpResult = await surveysService.getInterpolation(
              calculatedSurveyId,
              resolution || 5,
              startMD,
              endMD
            );

            plotData = {
              md: interpResult.md_interpolated || [],
              inc: interpResult.inc_interpolated || [],
              azi: interpResult.azi_interpolated || [],
              easting: interpResult.easting_interpolated || [],
              northing: interpResult.northing_interpolated || [],
              tvd: interpResult.tvd_interpolated || [],
              dls: interpResult.dls_interpolated || [],
              vertical_section: interpResult.vertical_section_interpolated || [],
              closure_distance: interpResult.closure_distance_interpolated || [],
              closure_direction: interpResult.closure_direction_interpolated || [],
              pointCount: interpResult.point_count || 0
            };

            // Debug logging
            console.log('=== INTERPOLATION DATA RECEIVED ===');
            console.log('MD array length:', interpResult.md_interpolated?.length || 0);
            console.log('First MD:', interpResult.md_interpolated?.[0]);
            console.log('Last MD:', interpResult.md_interpolated?.[interpResult.md_interpolated?.length - 1]);
            console.log('Last 3 MDs:', interpResult.md_interpolated?.slice(-3));

            // Set isSaved based on API response
            setIsSaved(interpResult.is_saved === true);
          } catch (interpError) {
            // Fall back to calculated data if interpolation not available
            console.warn('Interpolation not available, falling back to calculated data', interpError);
            plotData = {
              md: result.survey_data?.md_data || [],
              inc: result.survey_data?.inc_data || [],
              azi: result.survey_data?.azi_data || [],
              easting: result.easting || [],
              northing: result.northing || [],
              tvd: result.tvd || [],
              dls: result.dls || [],
              vertical_section: result.vertical_section || [],
              closure_distance: result.closure_distance || [],
              closure_direction: result.closure_direction || [],
              pointCount: result.survey_data?.row_count || 0
            };
            setIsSaved(true); // Fallback to calculated, which is always saved
          }
        }

        setData(plotData);

        // Set metadata
        const meta: SurveyMetadata = {
          filename: result.survey_file?.file_name || 'Unknown',
          uploadDate: result.created_at ? new Date(result.created_at).toLocaleString() : 'Unknown',
          processingDuration: result.calculation_duration
            ? `${result.calculation_duration.toFixed(2)}s`
            : 'N/A',
          calculatedCount: result.survey_data?.row_count || 0,
          interpolatedCount: result.point_count || 0
        };

        setMetadata(meta);
      } catch (err: any) {
        setError(err instanceof Error ? err : new Error(err.message || 'Failed to fetch survey data'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [surveyDataId, dataSource, resolution, startMD, endMD, refetchTrigger]);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  return {
    data,
    metadata,
    isLoading,
    error,
    isSaved,
    refetch
  };
};
