import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { MyPlanning } from './MyPlanning';
import { GlobalPlanning } from './GlobalPlanning';
import { ManagerSummary } from './ManagerSummary';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Calendar, Users, BarChart3, LogOut } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DashboardProps {
  session: any;
}

export function Dashboard({ session }: DashboardProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, [session]);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-473c0057/profile`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const promoteToManager = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-473c0057/promote-manager`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        await fetchUserProfile(); // Refresh user profile
      }
    } catch (error) {
      console.error('Erreur lors de la promotion en manager:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Planning Manager
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarFallback>
                    {user ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-700">
                    {user?.name || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.role === 'manager' ? 'Manager' : 'Employé'}
                  </p>
                </div>
              </div>
              
              {user?.role !== 'manager' && (
                <Button onClick={promoteToManager} variant="outline" size="sm">
                  Devenir Manager
                </Button>
              )}
              
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="my-planning" className="w-full">
          <TabsList className={`grid w-full mb-8 ${user?.role === 'manager' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="my-planning" className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Mon Planning
            </TabsTrigger>
            <TabsTrigger value="global-planning" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Planning Global
            </TabsTrigger>
            {user?.role === 'manager' && (
              <TabsTrigger value="summary" className="flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Résumé Manager
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="my-planning">
            <Card>
              <CardHeader>
                <CardTitle>Mon Planning</CardTitle>
              </CardHeader>
              <CardContent>
                <MyPlanning session={session} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="global-planning">
            <Card>
              <CardHeader>
                <CardTitle>Planning Global de l'Équipe</CardTitle>
              </CardHeader>
              <CardContent>
                <GlobalPlanning session={session} />
              </CardContent>
            </Card>
          </TabsContent>

          {user?.role === 'manager' && (
            <TabsContent value="summary">
              <Card>
                <CardHeader>
                  <CardTitle>Résumé Manager</CardTitle>
                </CardHeader>
                <CardContent>
                  <ManagerSummary session={session} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}