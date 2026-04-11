import { NextRequest } from 'next/server';

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
      error: error?.message || 'Unauthorized',
    };
  }

  return {
    user: data.user,
    error: null,
  };
}
