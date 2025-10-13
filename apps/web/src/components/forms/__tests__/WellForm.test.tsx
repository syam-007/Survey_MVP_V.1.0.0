import * as React from 'react';
import { render } from '@testing-library/react';
import { screen, waitFor, fireEvent } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { WellForm } from '../WellForm';
import type { CreateWellInput } from '../../../types/well.types';

describe('WellForm Component Tests', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  describe('Rendering', () => {
    it('should render all form fields', () => {
      render(
        <WellForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/well name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/well type/i)).toBeInTheDocument();
    });

    it('should render submit and cancel buttons', () => {
      render(
        <WellForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should render with custom submit label', () => {
      render(
        <WellForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          submitLabel="Create Well"
        />
      );

      expect(screen.getByRole('button', { name: /create well/i })).toBeInTheDocument();
    });

    it('should render with initial values', () => {
      const initialValues: CreateWellInput = {
        well_name: 'Test Well',
        well_type: 'Gas',
      };

      render(
        <WellForm
          initialValues={initialValues}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/well name/i)).toHaveValue('Test Well');
      expect(screen.getByLabelText(/well type/i)).toHaveTextContent('Gas');
    });
  });

  describe('Validation', () => {
    it('should show error when well name is empty', async () => {
      const user = userEvent.setup();
      render(
        <WellForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const wellNameInput = screen.getByLabelText(/well name/i);
      await user.clear(wellNameInput);
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/well name is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error when well name exceeds 255 characters', async () => {
      const user = userEvent.setup();
      render(
        <WellForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const longName = 'a'.repeat(256);
      const wellNameInput = screen.getByLabelText(/well name/i);
      await user.clear(wellNameInput);
      await user.type(wellNameInput, longName);
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/must be at most 255 characters/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should require well type selection', async () => {
      render(
        <WellForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Well type should be required
      const wellTypeField = screen.getByLabelText(/well type/i);
      expect(wellTypeField).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with valid data', async () => {
      const user = userEvent.setup();
      render(
        <WellForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.type(screen.getByLabelText(/well name/i), 'New Well');

      // Select well type
      await user.click(screen.getByLabelText(/well type/i));
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Oil' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Oil' }));

      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          well_name: 'New Well',
          well_type: 'Oil',
        });
      });
    });

    it('should not submit when form is invalid', async () => {
      const user = userEvent.setup();
      render(
        <WellForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Clear the well name (making it invalid)
      await user.clear(screen.getByLabelText(/well name/i));
      await user.click(screen.getByRole('button', { name: /submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/well name is required/i)).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Cancel Button', () => {
    it('should call onCancel when cancel button clicked', async () => {
      const user = userEvent.setup();
      render(
        <WellForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('should disable form fields when isSubmitting is true', () => {
      render(
        <WellForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      );

      expect(screen.getByLabelText(/well name/i)).toBeDisabled();
      expect(screen.getByLabelText(/well type/i)).toHaveAttribute('aria-disabled', 'true');
    });

    it('should disable buttons when isSubmitting is true', () => {
      render(
        <WellForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      );

      expect(screen.getByRole('button', { name: /submitting/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('should show "Submitting..." text when isSubmitting is true', () => {
      render(
        <WellForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      );

      expect(screen.getByRole('button', { name: /submitting/i })).toBeInTheDocument();
    });
  });

  describe('Well Type Options', () => {
    it('should display all well type options', async () => {
      const user = userEvent.setup();
      render(
        <WellForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByLabelText(/well type/i));

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Oil' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Gas' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Water' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument();
      });
    });

    it('should allow selecting different well types', async () => {
      const user = userEvent.setup();
      render(
        <WellForm
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      await user.click(screen.getByLabelText(/well type/i));
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Water' })).toBeInTheDocument();
      });
      await user.click(screen.getByRole('option', { name: 'Water' }));

      expect(screen.getByLabelText(/well type/i)).toHaveTextContent('Water');
    });
  });
});
