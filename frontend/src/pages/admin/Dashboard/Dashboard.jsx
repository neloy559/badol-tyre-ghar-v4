import React from 'react';
import { Package, Users, UserCheck, Clock } from 'lucide-react';
import useFetch from '../../../hooks/useFetch';
import { useAuth } from '../../../context/AuthContext';
import Spinner from '../../../components/ui/Spinner/Spinner';
import KPICard from '../../../components/ui/KPICard/KPICard';
import ProductsByBrandChart from '../../../components/ui/ProductsByBrandChart/ProductsByBrandChart';
import DealerRegistrationsChart from '../../../components/ui/DealerRegistrationsChart/DealerRegistrationsChart';
import TopProductsTable from '../../../components/ui/TopProductsTable/TopProductsTable';
import ActivityFeed from '../../../components/ui/ActivityFeed/ActivityFeed';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { loading: authLoading } = useAuth();
  const { data, loading, error, refetch } = useFetch('/admin/analytics/summary', !authLoading);

  React.useEffect(() => {
    document.title = 'Dashboard — BTG Admin';
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner />
        <p className={styles.loadingText}>Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <p className={styles.errorText}>Failed to load analytics data.</p>
        <button onClick={refetch} className={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  const summary = data || {};

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Overview of key business metrics</p>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <KPICard
          icon={Package}
          label="Total Products"
          value={summary.totalProducts}
          subLabel="Non-deleted products"
        />
        <KPICard
          icon={Users}
          label="Total Dealers"
          value={summary.totalDealers}
          subLabel="All dealer accounts"
        />
        <KPICard
          icon={UserCheck}
          label="Active Dealers"
          value={summary.activeDealers}
          subLabel="Approved dealers"
        />
        <KPICard
          icon={Clock}
          label="Pending Registrations"
          value={summary.pendingRegistrations}
          subLabel="Awaiting approval"
        />
      </div>

      {/* Charts Row */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartItem}>
          <ProductsByBrandChart data={summary.productsByBrand} />
        </div>
        <div className={styles.chartItem}>
          <DealerRegistrationsChart data={summary.dealerRegistrations} />
        </div>
      </div>

      {/* Tables Row */}
      <div className={styles.tablesGrid}>
        <div className={styles.tableItem}>
          <TopProductsTable products={summary.topViewedProducts} />
        </div>
        <div className={styles.tableItem}>
          <ActivityFeed activities={summary.recentActivity} />
        </div>
      </div>
    </div>
  );
}

