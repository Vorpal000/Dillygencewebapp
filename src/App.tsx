import React, { useState, useEffect } from 'react';
import { supabase } from './utils/supabase/client';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Auth timeout')), 10000);
        });

        const sessionPromise = supabase.auth.getSession();
        
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (error) {
          console.error('Erreur d\'authentification:', error);
          setError('Erreur lors de l\'initialisation');
        } else {
          setSession(session);
        }
      } catch (error) {
        console.error('Timeout ou erreur lors de l\'initialisation:', error);
        setError('Impossible de se connecter au service d\'authentification');
      } finally {
        setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    initializeAuth();

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setError(''); // Clear error on auth state change
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            {error}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthForm />;
  }

  return <Dashboard session={session} />;
}