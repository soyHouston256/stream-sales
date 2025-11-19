'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // SECURITY: Token is in httpOnly cookie, sent automatically
        const response = await fetch('/api/auth/me', {
          credentials: 'include', // Include cookies in request
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }

        const data = await response.json();
        setUser(data.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      // SECURITY: Call logout endpoint to revoke token server-side
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      // Ignore errors, still redirect to login
    }

    router.push('/login');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error || 'User not found'}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Dashboard</h1>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Logout
          </button>
        </div>

        <div style={styles.userInfo}>
          <h2 style={styles.welcome}>Welcome, {user.name || user.email}!</h2>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.label}>Email:</span>
              <span style={styles.value}>{user.email}</span>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.label}>Name:</span>
              <span style={styles.value}>{user.name || 'Not set'}</span>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.label}>Role:</span>
              <span style={styles.value}>{user.role}</span>
            </div>

            <div style={styles.infoItem}>
              <span style={styles.label}>User ID:</span>
              <span style={styles.value}>{user.id}</span>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Quick Stats</h3>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statValue}>0</div>
              <div style={styles.statLabel}>Sales</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>0</div>
              <div style={styles.statLabel}>Products</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statValue}>0</div>
              <div style={styles.statLabel}>Customers</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '20px',
  },
  card: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid #eee',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  logoutButton: {
    padding: '10px 20px',
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  userInfo: {
    marginBottom: '40px',
  },
  welcome: {
    fontSize: '24px',
    fontWeight: '500',
    color: '#333',
    marginBottom: '20px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#666',
  },
  value: {
    fontSize: '16px',
    color: '#333',
  },
  section: {
    marginTop: '40px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '20px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  statCard: {
    backgroundColor: '#f9f9f9',
    padding: '30px',
    borderRadius: '8px',
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    color: '#0070f3',
    marginBottom: '10px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
  },
  loading: {
    textAlign: 'center' as const,
    fontSize: '18px',
    color: '#666',
    marginTop: '50px',
  },
  error: {
    textAlign: 'center' as const,
    fontSize: '18px',
    color: '#c00',
    marginTop: '50px',
  },
};
