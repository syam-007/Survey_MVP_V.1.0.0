/**
 * Curve Adjustment Types
 *
 * Type definitions for survey curve adjustment operations.
 * Supports offset application, undo/redo, and recalculation.
 */

export interface ApplyOffsetRequest {
  md_start: number;
  md_end: number;
  x_offset: number;
  y_offset: number;
  z_offset: number;
}

export interface AdjustmentState {
  adjustment_id?: string;
  sequence: number;
  md_data: number[];
  north_adjusted: number[];
  east_adjusted: number[];
  tvd_adjusted: number[];
  inc_recalculated?: number[];
  azi_recalculated?: number[];
  has_adjustment: boolean;
  message?: string;
  points_affected?: number;
}

export interface CurveAdjustment {
  id: string;
  comparison: string;
  md_start: number;
  md_end: number;
  x_offset: number;
  y_offset: number;
  z_offset: number;
  md_data: number[];
  north_adjusted: number[];
  east_adjusted: number[];
  tvd_adjusted: number[];
  inc_recalculated?: number[];
  azi_recalculated?: number[];
  adjustment_sequence: number;
  is_current: boolean;
  created_at: string;
}
