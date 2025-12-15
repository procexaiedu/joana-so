import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseUrl, supabaseAnonKey, SCHEMA } from './config'

export async function updateSession(request: NextRequest) {
    // Skip middleware if env vars are not set (development safety)
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase URL or Anon Key not set, skipping auth middleware')
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        db: {
            schema: SCHEMA
        },
        cookies: {
            getAll() {
                return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                supabaseResponse = NextResponse.next({
                    request,
                })
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                )
            },
        },
    })

    // Refresh session if exists
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protected routes check - only redirect if not on public routes
    const isPublicRoute =
        request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/auth')

    if (!user && !isPublicRoute) {
        // no user and trying to access protected route, redirect to login
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // If user is logged in and trying to access login page, redirect to dashboard
    if (user && request.nextUrl.pathname === '/login') {
        const url = request.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
