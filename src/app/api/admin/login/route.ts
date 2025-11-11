import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseConfigured } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseConfigured) {
      console.error('Supabase client not configured')
      return NextResponse.json(
        { error: 'Supabase is not configured' },
        { status: 500 }
      )
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Verify admin credentials using our custom function
    const { data: adminUser, error } = await supabase
      .rpc('get_admin_by_credentials', {
        p_email: email,
        p_password: password
      });

    if (error) {
      console.error('Admin login error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!adminUser || adminUser.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const admin = adminUser[0];

    // Update last login time
    await supabase
      .from('admin_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', admin.id);

    // Create a simple session token (in production, use JWT)
    const sessionToken = Buffer.from(`${admin.id}:${Date.now()}`).toString('base64');

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        role: admin.role,
        permissions: admin.permissions
      },
      sessionToken
    });

  } catch (error) {
    console.error('Admin login API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
