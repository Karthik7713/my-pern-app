import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Reports from '../Reports';
import api from '../../services/api';

vi.mock('../../services/api', () => ({ get: vi.fn() }));

const mockRows = [
  { key: 'A', cash_in: 1000, cash_out: 200 },
  { key: 'B', cash_in: 2000, cash_out: 500 },
];

describe('Reports', () => {
  beforeEach(()=>{ vi.clearAllMocks(); });

  it('disables exports before generate and enables after', async ()=>{
    api.get.mockResolvedValueOnce({ data: { rows: mockRows } });
    render(<Reports />);
    const csv = screen.getByRole('button', { name: /Export CSV/i });
    expect(csv).toBeDisabled();
    const generate = screen.getByRole('button', { name: /Generate report/i }) || screen.getByRole('button', { name: /Generate/i });
    userEvent.click(generate);
    await waitFor(()=> expect(csv).not.toBeDisabled());
    // check formatted value present
    expect(screen.getByText('1,000.00')).toBeInTheDocument();
  });
});
