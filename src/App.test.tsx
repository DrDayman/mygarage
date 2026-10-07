import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { STORAGE_KEYS } from './lib/storage';

function startEmpty() {
  localStorage.setItem(STORAGE_KEYS.vehicles, '[]');
  localStorage.setItem(STORAGE_KEYS.logs, '[]');
}

describe('App', () => {
  it('loads the demo garage on first visit', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'My Garage' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '2018 Toyota Tacoma' })).toBeInTheDocument();
    expect(screen.getByText('Upcoming & Overdue Service')).toBeInTheDocument();
  });

  it('adds a vehicle, logs a service and persists it', async () => {
    startEmpty();
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /add your first vehicle/i }));
    const dialog = screen.getByRole('dialog', { name: 'Add New Vehicle' });
    await user.type(within(dialog).getByLabelText('Make'), 'Subaru');
    await user.type(within(dialog).getByLabelText('Model'), 'Outback');
    await user.type(within(dialog).getByLabelText('Year'), '2019');
    await user.type(within(dialog).getByLabelText('Current Mileage'), '70000');
    await user.click(within(dialog).getByRole('button', { name: 'Save Vehicle' }));

    // Lands on the new vehicle's page; never-logged oil change is flagged.
    expect(screen.getByRole('heading', { name: '2019 Subaru Outback' })).toBeInTheDocument();
    expect(window.location.hash).toMatch(/^#\/vehicles\//);

    await user.click(screen.getByRole('button', { name: /log service/i }));
    const logDialog = screen.getByRole('dialog');
    await user.clear(within(logDialog).getByLabelText('Mileage at Service'));
    await user.type(within(logDialog).getByLabelText('Mileage at Service'), '71000');
    await user.type(within(logDialog).getByLabelText('Cost ($)'), '64.99');
    expect(within(logDialog).getByText('Odometer will update to 71,000 mi')).toBeInTheDocument();
    await user.click(within(logDialog).getByRole('button', { name: 'Save Record' }));

    // Rendered in both the desktop table and the phone card list (jsdom doesn't apply CSS).
    expect(screen.getAllByText('$64.99').length).toBeGreaterThan(0);
    expect(screen.getAllByText('71,000 mi').length).toBeGreaterThan(0);

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.logs)!);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ serviceType: 'Oil Change', cost: 64.99, mileage: 71000 });
  });

  it('validates the vehicle form', async () => {
    startEmpty();
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /add your first vehicle/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Year'), '1850');
    await user.click(within(dialog).getByRole('button', { name: 'Save Vehicle' }));
    expect(within(dialog).getAllByText('Required')).toHaveLength(2);
    expect(within(dialog).getByText(/Enter a year between 1900/)).toBeInTheDocument();
  });

  it('decodes a VIN with the NHTSA API', async () => {
    startEmpty();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ Results: [{ Make: 'HONDA', Model: 'Accord', ModelYear: '2003', FuelTypePrimary: 'Gasoline' }] })),
    );
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /add your first vehicle/i }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/VIN/), '1hgcm82633a004352');
    await user.click(within(dialog).getByRole('button', { name: /decode/i }));

    expect(await within(dialog).findByText(/Found 2003 Honda Accord/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Make')).toHaveValue('Honda');
    expect(within(dialog).getByLabelText('Year')).toHaveValue(2003);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('1HGCM82633A004352'), expect.anything());
    fetchMock.mockRestore();
  });

  it('deletes a vehicle after confirmation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /^2021 Tesla Model 3/ }));
    await user.click(screen.getByRole('button', { name: 'Delete vehicle' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('heading', { name: 'My Garage' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '2021 Tesla Model 3' })).not.toBeInTheDocument();
  });
});
