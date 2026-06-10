import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Server configuration error: missing environment variables.')
    }

    // 1. Create a standard client to verify the caller's JWT
    const authHeader = req.headers.get('Authorization')!
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

    // 2. Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      console.error('Auth verification failed. Error:', userError?.message)
      return new Response(JSON.stringify({ error: `Unauthorized user: ${userError?.message || 'Invalid session'}` }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Initialize the Admin client using the Service Role Key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 3.5 Fetch caller's profile using admin client to bypass RLS lookup issues
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || (profile.role !== 'master_admin' && profile.role !== 'partner')) {
      console.error('Caller role verification failed. Error:', profileError?.message)
      return new Response(JSON.stringify({ error: `Forbidden: Requires master_admin or partner role. Details: ${profileError?.message || 'Access denied'}` }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4. Get the request payload
    const payload = await req.json()
    const { email, fullName, redirectTo } = payload
    let { role, organizationId } = payload

    if (!email || !role) {
      return new Response(JSON.stringify({ error: 'Email and role are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 4.5 Enforce partner role limits (can only invite other partners to their own organization)
    if (profile.role === 'partner') {
      role = 'partner'
      organizationId = profile.organization_id
      
      if (!organizationId) {
        return new Response(JSON.stringify({ error: 'Caller does not have an associated organization' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // 5. Already initialized supabaseAdmin previously

    // 6. Send the invite
    const inviteOptions: { data: Record<string, unknown>; redirectTo?: string } = {
      data: {
        role: role,
        organization_id: organizationId || null,
        full_name: fullName || '', 
      },
    }
    if (redirectTo) {
      inviteOptions.redirectTo = redirectTo
    }

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, inviteOptions)

    if (inviteError) {
      throw inviteError
    }

    return new Response(JSON.stringify({ message: 'User invited successfully', user: inviteData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('Edge Function Error:', errMsg)
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
