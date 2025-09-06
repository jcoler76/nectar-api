import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { useBreadcrumbs } from '../../contexts/BreadcrumbContext';
import { getRoleById } from '../../services/roleService';
import LoadingSpinner from '../common/LoadingSpinner';
import { Alert, AlertDescription } from '../ui/alert';

import CreateRole from './CreateRole';

const RoleEdit = () => {
  const { id } = useParams();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { setBreadcrumbs, clearBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    const fetchRole = async () => {
      try {
        setLoading(true);
        const data = await getRoleById(id);
        setRole(data);

        // Set custom breadcrumbs with role name
        setBreadcrumbs([
          { label: 'Home', path: '/dashboard' },
          { label: 'Roles', path: '/roles' },
          { label: data.name, path: `/roles/edit/${id}` },
        ]);
      } catch (err) {
        console.error('Error fetching role:', err);
        setError('Failed to fetch role');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRole();
    }
  }, [id, setBreadcrumbs]);

  // Cleanup breadcrumbs when component unmounts
  useEffect(() => {
    return () => {
      clearBreadcrumbs();
    };
  }, [clearBreadcrumbs]);

  if (loading) return <LoadingSpinner />;
  if (error)
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  if (!role)
    return (
      <Alert variant="destructive">
        <AlertDescription>Role not found</AlertDescription>
      </Alert>
    );

  return <CreateRole mode="edit" existingRole={role} />;
};

export default RoleEdit;
