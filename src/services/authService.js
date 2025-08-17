import { supabase } from './supabaseClient'

export const authService = {
  // Employee login
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      // Get employee profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          *,
          employees (*)
        `)
        .eq('id', data.user.id)
        .eq('role', 'employee')
        .single()
      
      if (profileError) throw new Error('Employee access denied')
      
      return { user: data.user, profile }
    } catch (error) {
      throw error
    }
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Get current session
  async getCurrentSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  // Get employee profile
  async getEmployeeProfile(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        employees (*)
      `)
      .eq('id', userId)
      .eq('role', 'employee')
      .single()
    
    if (error) throw error
    return data
  }
}
