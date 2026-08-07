import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { keyValueStorage } from '@/src/lib/storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

export const isCloudConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = isCloudConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storage: keyValueStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    })
  : null;
