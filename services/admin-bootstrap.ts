import { supabaseAdmin } from '@/services/supabase-admin';

import { getAdminEmail, getAdminPassword } from '@/services/admin-access';

export async function ensureAdminUser() {
  const email = getAdminEmail();
  const password = getAdminPassword();

  const { data, error } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  if (error) {
    throw error;
  }

  const existingUser = data.users.find(user => user.email?.trim().toLowerCase() === email);

  if (existingUser) {
    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existingUser.id,
      {
        email,
        password,
        email_confirm: true,
        app_metadata: {
          ...(existingUser.app_metadata ?? {}),
          role: 'admin',
        },
        user_metadata: {
          ...(existingUser.user_metadata ?? {}),
          role: 'admin',
        },
      }
    );

    if (updateError) {
      throw updateError;
    }

    return updatedUser.user;
  }

  const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      role: 'admin',
    },
    user_metadata: {
      role: 'admin',
    },
  });

  if (createError || !createdUser.user) {
    throw createError ?? new Error('Failed to create admin user');
  }

  return createdUser.user;
}
