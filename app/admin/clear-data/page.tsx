'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

// Function to sanitize sensitive data before display
const sanitizeResult = (result: any): any => {
  if (!result) return result;
  
  const sanitized = { ...result };
  
  // Mask email addresses
  if (sanitized.email) {
    const [localPart, domain] = sanitized.email.split('@');
    if (localPart && domain) {
      sanitized.email = `${localPart.charAt(0)}***@${domain}`;
    }
  }
  
  // Mask wallet addresses
  if (sanitized.wallet_address) {
    const addr = sanitized.wallet_address;
    if (addr.length > 8) {
      sanitized.wallet_address = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    }
  }
  
  // Mask user IDs
  if (sanitized.user_id) {
    const id = sanitized.user_id;
    if (id.length > 8) {
      sanitized.user_id = `${id.slice(0, 8)}...`;
    }
  }
  
  // Handle arrays of users
  if (Array.isArray(sanitized.users)) {
    sanitized.users = sanitized.users.map((user: any) => {
      const sanitizedUser = { ...user };
      if (sanitizedUser.email) {
        const [localPart, domain] = sanitizedUser.email.split('@');
        if (localPart && domain) {
          sanitizedUser.email = `${localPart.charAt(0)}***@${domain}`;
        }
      }
      if (sanitizedUser.wallet_address) {
        const addr = sanitizedUser.wallet_address;
        if (addr.length > 8) {
          sanitizedUser.wallet_address = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
        }
      }
      if (sanitizedUser.user_id) {
        const id = sanitizedUser.user_id;
        if (id.length > 8) {
          sanitizedUser.user_id = `${id.slice(0, 8)}...`;
        }
      }
      return sanitizedUser;
    });
  }
  
  return sanitized;
};

export default function AdminClearData() {
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [summary, setSummary] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleAction = async (actionType: string) => {
    setLoading(true);
    setAction(actionType);
    setResult(null);

    try {
      const response = await fetch('/api/admin/clear-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: actionType,
          email,
          walletAddress,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to perform action');
      }

      setResult(data);
      
      // Refresh summary after destructive actions
      if (actionType === 'clear_all' || actionType === 'clear_by_email' || actionType === 'clear_by_wallet') {
        await fetchSummary();
      }
    } catch (error) {
      console.error('Error performing action:', error);
      setResult({ error: error instanceof Error ? error.message : 'An error occurred' });
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  // Enhanced clear all data with multiple confirmations
  const handleClearAllData = async () => {
    // First confirmation
    const firstConfirm = window.confirm(
      '⚠️ WARNING: This will permanently delete ALL user data from the database.\n\n' +
      'This action cannot be undone. Are you sure you want to proceed?'
    );
    
    if (!firstConfirm) return;
    
    // Second confirmation with typing requirement
    const userInput = prompt(
      'To confirm deletion of ALL user data, please type "DELETE ALL" exactly as shown:\n\n' +
      'This will permanently delete all users, social accounts, and related data.'
    );
    
    if (userInput !== 'DELETE ALL') {
      alert('Confirmation text did not match. Operation cancelled.');
      return;
    }
    
    // Final confirmation
    const finalConfirm = window.confirm(
      'Final confirmation: You are about to permanently delete ALL user data.\n\n' +
      'This will affect:\n' +
      '• All user accounts\n' +
      '• All social account connections\n' +
      '• All quest data\n' +
      '• All task submissions\n\n' +
      'This action cannot be undone. Proceed?'
    );
    
    if (finalConfirm) {
      await handleAction('clear_all');
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/admin/clear-data');
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const listUsers = async () => {
    await handleAction('list_users');
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Admin - Clear User Data</CardTitle>
          <CardDescription>
            Clear all user data from the database. This will delete all users and their social accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Summary */}
          {summary && (
            <Alert>
              <AlertDescription>
                <strong>Current Data:</strong> {summary.users_count} users, {summary.social_accounts_count} social accounts
              </AlertDescription>
            </Alert>
          )}

          {/* Clear All Data */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Clear All Data</h3>
            <Button 
              onClick={handleClearAllData}
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading && action === 'clear_all' ? 'Clearing...' : 'Clear All User Data'}
            </Button>
          </div>

          {/* Clear by Email */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Clear User by Email</h3>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <Button 
                onClick={() => handleAction('clear_by_email')}
                disabled={loading || !email}
                variant="destructive"
              >
                {loading && action === 'clear_by_email' ? 'Clearing...' : 'Clear'}
              </Button>
            </div>
          </div>

          {/* Clear by Wallet */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Clear User by Wallet Address</h3>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter wallet address"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                disabled={loading}
              />
              <Button 
                onClick={() => handleAction('clear_by_wallet')}
                disabled={loading || !walletAddress}
                variant="destructive"
              >
                {loading && action === 'clear_by_wallet' ? 'Clearing...' : 'Clear'}
              </Button>
            </div>
          </div>

          {/* List Users */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">List All Users</h3>
            <Button 
              onClick={listUsers}
              disabled={loading}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {loading && action === 'list_users' ? 'Loading...' : 'List Users'}
            </Button>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Result</h3>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(sanitizeResult(result), null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 