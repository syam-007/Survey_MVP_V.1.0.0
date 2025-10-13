import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CompleteRunForm, CompleteRunFormData } from '../CompleteRunForm';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('CompleteRunForm Component Tests', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();
  const mockWells = [
    { id: '1', well_name: 'Well A' },
    { id: '2', well_name: 'Well B' },
  ];

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
    localStorageMock.clear();
    jest.clearAllTimers();
  });

  describe('Rendering', () => {
    it('should render stepper with all steps', () => {
      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
        />
      );

      expect(screen.getByText('Run Info')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Depth')).toBeInTheDocument();
      expect(screen.getByText('Survey Type')).toBeInTheDocument();
      expect(screen.getByText('Tie-On')).toBeInTheDocument();
      expect(screen.getByText('Review & Submit')).toBeInTheDocument();
    });

    it('should render first step by default', () => {
      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
        />
      );

      // Should show Run Info fields
      expect(screen.getByLabelText(/run number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/run name/i)).toBeInTheDocument();
    });

    it('should render navigation buttons', () => {
      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('should show auto-save indicator', () => {
      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
        />
      );

      expect(screen.getByText(/your progress is automatically saved/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should disable back button on first step', () => {
      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
        />
      );

      const backButton = screen.getByRole('button', { name: /back/i });
      expect(backButton).toBeDisabled();
    });

    it('should navigate to next step when Next is clicked', async () => {
      const user = userEvent.setup();
      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
        />
      );

      await user.click(screen.getByRole('button', { name: /next/i }));

      // Should show Location step
      await waitFor(() => {
        expect(screen.getByText(/location information/i)).toBeInTheDocument();
      });
    });

    it('should navigate back to previous step', async () => {
      const user = userEvent.setup();
      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
        />
      );

      // Go to step 2
      await user.click(screen.getByRole('button', { name: /next/i }));

      // Go back to step 1
      await user.click(screen.getByRole('button', { name: /back/i }));

      await waitFor(() => {
        expect(screen.getByLabelText(/run number/i)).toBeInTheDocument();
      });
    });

    it('should show Submit button on last step', async () => {
      const user = userEvent.setup();
      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
        />
      );

      // Navigate to last step (click Next 5 times)
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
      });
    });
  });

  describe('Auto-Save Functionality', () => {
    jest.useFakeTimers();

    it('should save form data to localStorage on change', async () => {
      const user = userEvent.setup({ delay: null });
      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
        />
      );

      const runNumberInput = screen.getByLabelText(/run number/i);
      await user.type(runNumberInput, 'RUN-001');

      // Fast-forward timers to trigger debounced save
      jest.advanceTimersByTime(500);

      const savedData = localStorageMock.getItem('complete_run_form_draft');
      expect(savedData).toBeTruthy();
    });

    it('should load saved data from localStorage on mount', () => {
      const savedData: CompleteRunFormData = {
        run: { run_number: 'RUN-SAVED', run_name: 'Saved Run' },
        location: {},
        depth: {},
        survey: {},
        tieon: {},
      };

      localStorageMock.setItem('complete_run_form_draft', JSON.stringify(savedData));

      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
        />
      );

      expect(screen.getByLabelText(/run number/i)).toHaveValue('RUN-SAVED');
      expect(screen.getByLabelText(/run name/i)).toHaveValue('Saved Run');
    });

    it('should clear localStorage on successful submission', async () => {
      mockOnSubmit.mockResolvedValue(undefined);

      const user = userEvent.setup();
      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
        />
      );

      // Navigate to last step
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }

      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(localStorageMock.getItem('complete_run_form_draft')).toBeNull();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should show confirmation dialog on cancel', async () => {
      window.confirm = jest.fn(() => true);
      const user = userEvent.setup();

      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
        />
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('Are you sure you want to cancel')
      );
    });

    it('should call onCancel and clear localStorage when confirmed', async () => {
      window.confirm = jest.fn(() => true);
      const user = userEvent.setup();

      localStorageMock.setItem('complete_run_form_draft', '{"test": "data"}');

      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
        />
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
      expect(localStorageMock.getItem('complete_run_form_draft')).toBeNull();
    });

    it('should not cancel when user declines confirmation', async () => {
      window.confirm = jest.fn(() => false);
      const user = userEvent.setup();

      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
        />
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with complete form data', async () => {
      mockOnSubmit.mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
        />
      );

      // Navigate to last step
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }

      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            run: expect.any(Object),
            location: expect.any(Object),
            depth: expect.any(Object),
            survey: expect.any(Object),
            tieon: expect.any(Object),
          })
        );
      });
    });

    it('should disable buttons during submission', () => {
      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
          isSubmitting={true}
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /back/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });
  });

  describe('Wells Integration', () => {
    it('should pass wells to RunInfoStep', () => {
      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={mockWells}
        />
      );

      // Should show well selection dropdown
      expect(screen.getByLabelText(/well/i)).toBeInTheDocument();
    });

    it('should handle empty wells array', () => {
      render(
        <CompleteRunForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          wells={[]}
        />
      );

      expect(screen.getByLabelText(/well/i)).toBeInTheDocument();
    });
  });
});
