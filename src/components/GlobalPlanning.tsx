import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Building2, Home, Ban, Filter, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface User {
  id: string;
  name: string;
  email: string;
}

interface Planning {
  id: string;
  user_id: string;
  date: string;
  period: 'morning' | 'afternoon';
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
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [error, setError] = useState('');

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
      label: 'Repos',
      icon: Ban,
      color: 'bg-gray-100 text-gray-800 border-gray-200'
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const fetchWithTimeout = async () => {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Request timeout')), 15000);
      });

      try {
        setLoading(true);
        await Promise.race([
          Promise.all([fetchGlobalPlanning(), fetchUsers()]),
          timeoutPromise
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Erreur lors du chargement des données');
      } finally {
        setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    fetchWithTimeout();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentWeek]);

  // Obtenir les 5 jours de la semaine actuelle (lundi à vendredi)
  const getWeekDays = (date: Date) => {
    const days = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Lundi = premier jour
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 5; i++) {
      const weekDay = new Date(startOfWeek);
      weekDay.setDate(startOfWeek.getDate() + i);
      days.push(weekDay);
    }
    
    return days;
  };

  const fetchGlobalPlanning = async () => {
    if (!session?.access_token) {
      setError('Session invalide');
      return;
    }

    try {
      setError('');
      const weekDays = getWeekDays(currentWeek);
      const startDate = weekDays[0].toISOString().split('T')[0];
      const endDate = weekDays[4].toISOString().split('T')[0];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-473c0057/global-planning?start=${startDate}&end=${endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setPlannings(Array.isArray(data) ? data : []);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du planning global:', error);
      if (error.name !== 'AbortError') {
        setError('Impossible de charger le planning global');
      }
    }
  };

  const fetchUsers = async () => {
    if (!session?.access_token) {
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-473c0057/users`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      if (error.name !== 'AbortError') {
        setError('Impossible de charger les utilisateurs');
      }
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
    setLoading(true);
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

  const formatWeekRange = (date: Date) => {
    const weekDays = getWeekDays(date);
    const start = weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const end = weekDays[4].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `${start} - ${end}`;
  };

  const getPlanningForUserDateAndPeriod = (userId: string, date: string, period: 'morning' | 'afternoon') => {
    return plannings.find(p => p.user_id === userId && p.date === date && p.period === period);
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

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <Alert className="bg-red-500 text-white p-4 rounded-lg">
          <AlertDescription className="text-sm font-medium">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation de semaine */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-medium text-lg">
            Semaine du {formatWeekRange(currentWeek)}
          </h3>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
                <SelectItem value="absent">Repos</SelectItem>
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
                {getWeekDays(currentWeek).map((date) => (
                  <th
                    key={date.toISOString()}
                    className="px-3 py-3 text-center text-sm font-medium min-w-[150px] text-gray-700"
                  >
                    <div className="space-y-1">
                      <div>{formatDate(date)}</div>
                      <div className="flex justify-center space-x-2 text-xs text-gray-500">
                        <span>Mat.</span>
                        <span>A-M.</span>
                      </div>
                    </div>
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
                  {getWeekDays(currentWeek).map((date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const morningPlanning = getPlanningForUserDateAndPeriod(user.id, dateStr, 'morning');
                    const afternoonPlanning = getPlanningForUserDateAndPeriod(user.id, dateStr, 'afternoon');

                    return (
                      <td
                        key={dateStr}
                        className="px-2 py-4 text-center"
                      >
                        <div className="space-y-2">
                          {/* Matinée */}
                          <div className="min-h-[24px]">
                            {morningPlanning ? (
                              (() => {
                                const StatusIcon = statusConfig[morningPlanning.status].icon;
                                return (
                                  <Badge className={`${statusConfig[morningPlanning.status].color} text-xs px-1 py-0.5`}>
                                    <StatusIcon className="h-2 w-2 mr-1" />
                                    M
                                  </Badge>
                                );
                              })()
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </div>
                          {/* Après-midi */}
                          <div className="min-h-[24px]">
                            {afternoonPlanning ? (
                              (() => {
                                const StatusIcon = statusConfig[afternoonPlanning.status].icon;
                                return (
                                  <Badge className={`${statusConfig[afternoonPlanning.status].color} text-xs px-1 py-0.5`}>
                                    <StatusIcon className="h-2 w-2 mr-1" />
                                    A
                                  </Badge>
                                );
                              })()
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </div>
                        </div>
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

      {/* Légende */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-3">Légende</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon;
            return (
              <div key={status} className="flex items-center space-x-2">
                <Icon className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-700">{config.label}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-sm text-gray-600">
          <p>M = Matinée | A = Après-midi</p>
        </div>
      </div>
    </div>
  );
}