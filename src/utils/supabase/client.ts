import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Instance singleton du client Supabase
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);