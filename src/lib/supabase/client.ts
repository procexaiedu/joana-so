'use client'

import { createBrowserClient } from '@supabase/ssr'
import { supabaseUrl, supabaseAnonKey, SCHEMA } from './config'

export function createClient() {
    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
        db: {
            schema: SCHEMA
        }
    })
}
