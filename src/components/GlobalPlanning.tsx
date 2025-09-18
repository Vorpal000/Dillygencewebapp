import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Building2, Home, Ban, Filter, Users } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Planning {
  id: string;
  user_id: string;
  date: string;
  status: 'office' | 'remote' | 'absent';
  user: User;
}

interface GlobalPlanningProps {
  session: any;
}

export function GlobalPlanning({ session }: GlobalPlanningProps) {
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const statusConfig = {
    office: {
      label: 'Présentiel',
      icon: Building2,
      color: 'bg-green-100 text-green-800 border-green-200'
    },
    remote: {
      label: 'Télétravail',
      icon: Home,
      color: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    absent: {
      label: 'Absence',
      icon: Ban,
      color: 'bg-gray-100 text-gray-800 border-gray-200'
    }
  };

  useEffect(() => {
    fetchGlobalPlanning();
    fetchUsers();
  }, []);

  const getNext7Days = () => {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  const fetchGlobalPlanning = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-473c0057/global-planning`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPlannings(data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du planning global:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-473c0057/users`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const getPlanningForUserAndDate = (userId: string, date: string) => {
    return plannings.find(p => p.user_id === userId && p.date === date);
  };

  const filteredUsers = users.filter(user => {
    if (selectedUser !== 'all' && user.id !== selectedUser) return false;
    
    if (selectedStatus !== 'all') {
      const userHasStatus = plannings.some(
        p => p.user_id === user.id && p.status === selectedStatus
      );
      if (!userHasStatus) return false;
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filtres :</span>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="flex-1">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les employés" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les employés</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-1">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="office">Présentiel</SelectItem>
                <SelectItem value="remote">Télétravail</SelectItem>
                <SelectItem value="absent">Absence</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Vue Calendrier */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 min-w-[200px]">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4" />
                    <span>Employé</span>
                  </div>
                </th>
                {getNext7Days().map((date) => (
                  <th
                    key={date.toISOString()}
                    className={`px-3 py-3 text-center text-sm font-medium min-w-[120px] ${
                      isWeekend(date) ? 'text-gray-400 bg-gray-100' : 'text-gray-700'
                    }`}
                  >
                    {formatDate(date)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  {getNext7Days().map((date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const planning = getPlanningForUserAndDate(user.id, dateStr);
                    const weekend = isWeekend(date);

                    return (
                      <td
                        key={dateStr}
                        className={`px-3 py-4 text-center ${
                          weekend ? 'bg-gray-50' : ''
                        }`}
                      >
                        {weekend ? (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-500">
                            Repos
                          </Badge>
                        ) : planning ? (
                           (() => {
                             const StatusIcon = statusConfig[planning.status].icon;
                             return (
                               <Badge className={statusConfig[planning.status].color}>
                                 <StatusIcon className="h-3 w-3 mr-1" />
                                 {statusConfig[planning.status].label}
                               </Badge>
                             );
                           })()
                         ) : (
                          <span className="text-gray-400 text-sm">Non défini</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Aucun employé ne correspond aux filtres sélectionnés.
        </div>
      )}

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {getNext7Days().slice(0, 5).map((date) => {
          if (isWeekend(date)) return null;
          
          const dateStr = date.toISOString().split('T')[0];
          const dayPlannings = plannings.filter(p => p.date === dateStr);
          
          const stats = {
            office: dayPlannings.filter(p => p.status === 'office').length,
            remote: dayPlannings.filter(p => p.status === 'remote').length,
            absent: dayPlannings.filter(p => p.status === 'absent').length,
          };

          return (
            <div key={dateStr} className="bg-white p-4 rounded-lg border">
              <h4 className="font-medium text-gray-900 mb-3">
                {formatDate(date)}
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Bureau</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {stats.office}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Home className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Télétravail</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {stats.remote}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Ban className="h-4 w-4 text-gray-600" />
                    <span className="text-sm">Absences</span>
                  </div>
                  <Badge className="bg-gray-100 text-gray-800">
                    {stats.absent}
                  </Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}