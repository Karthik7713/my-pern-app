import { render, fireEvent, screen } from '@testing-library/react';
import Navbar from '../Navbar.jsx';
import { MemoryRouter } from 'react-router-dom';

// Mock useAuth hook
jest.mock('../../hooks/useAuth.jsx', () => ({
  useAuth: () => ({ user: { name: 'Test User', role: 'USER' }, logout: jest.fn() })
}));

describe('Navbar actions', () => {
  it('renders and allows opening profile menu', async () => {
    render(<MemoryRouter><Navbar/></MemoryRouter>);
    const profile = await screen.findByLabelText(/Profile|Test User/i);
    fireEvent.click(profile);
    const view = await screen.findByText(/View profile/i);
    expect(view).toBeInTheDocument();
  });
});
