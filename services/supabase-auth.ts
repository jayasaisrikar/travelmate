import { NextRequest } from 'next/server';

import { isAdminEmail } from '@/services/admin-access';
import { supabase } from '@/services/supabase';

export async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    return {
      user: null,
      error: 'Unauthorized',
    };
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return {
      user: null,
      isAdmin: false,
      error: error?.message || 'Unauthorized',
    };
  }

  if (!isAdminEmail(data.user.email)) {
    return {
      user: null,
      isAdmin: false,
      error: 'Unauthorized',
    };
  }

  return {
    user: data.user,
    isAdmin: true,
    error: null,
  };
}
