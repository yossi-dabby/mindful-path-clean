import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export const AGE_POLICY_VERSION = '2026-11-11';
export const accountAccessKey = (userId) => ['account-access', userId];

export async function requestAccountAccess(input, userId) {
  const { data } = await base44.functions.invoke('accountAccess', input);
  if (data?.schema_version !== 1 || data.user_id !== userId || data.policy_version !== AGE_POLICY_VERSION ||
      !['pending', 'confirmed', 'declined'].includes(data.adult_status) ||
      typeof data.eligible !== 'boolean' || typeof data.forms_review_allowed !== 'boolean' ||
      data.eligible !== (data.adult_status === 'confirmed') || (data.forms_review_allowed && !data.eligible)) {
    throw new Error('ACCESS_UNAVAILABLE');
  }
  return data;
}

export function useAccountAccess() {
  const { user, isAuthenticated } = useAuth();
  const query = useQuery({
    queryKey: accountAccessKey(user?.id),
    queryFn: () => requestAccountAccess({ action: 'status' }, user.id),
    enabled: !!user?.id && isAuthenticated,
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
  });
  return { ...query, canReviewForms: !query.isError && query.data?.user_id === user?.id && query.data?.forms_review_allowed === true };
}
