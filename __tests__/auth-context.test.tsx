import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/components/auth-context';
import { supabase } from '@/lib/supabase';
import { walletAuth } from '@/lib/wallet-auth';

// Mock the dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      }))
    }))
  }
}));

jest.mock('@/lib/wallet-auth', () => ({
  walletAuth: {
    onAuthStateChange: jest.fn(() => jest.fn())
  }
}));

// Test component that uses the auth context
function TestComponent() {
  const { user, emailUser, isLoading, isAuthenticated } = useAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      <div data-testid="is-authenticated">{isAuthenticated ? 'true' : 'false'}</div>
      <div data-testid="wallet-user">{user ? 'wallet' : 'none'}</div>
      <div data-testid="email-user">{emailUser ? 'email' : 'none'}</div>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading state initially', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('handles authentication state changes', async () => {
    // Mock supabase auth to return a user
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: { id: '1', email: 'test@example.com' } }
    });

    // Mock the profile query
    const mockSelect = jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn().mockResolvedValue({
          data: { id: '1', email: 'test@example.com', username: 'testuser' }
        })
      }))
    }));
    (supabase.from as jest.Mock).mockReturnValue({
      select: mockSelect
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially should show loading
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Wait for auth state to resolve
    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
    });

    expect(screen.getByTestId('email-user')).toHaveTextContent('email');
  });

  it('handles no authentication', async () => {
    // Mock supabase auth to return no user
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: null }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for auth state to resolve
    await waitFor(() => {
      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('email-user')).toHaveTextContent('none');
  });
}); 