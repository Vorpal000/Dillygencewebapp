import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Building2, Home, Ban, Save, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface Planning {
  id?: string;
  date: string;
  period: 'morning' | 'afternoon';
  status: 'office' | 'remote' | 'absent';
}

interface MyPlanningProps {
  session: any;
}

export function MyPlanning({ session }: MyPlanningProps) {
  const [plannings, setPlannings] = useState<Planning[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [error, setError] = useState('');

  const statusConfig = {
    office: {
      label: 'Présentiel',
      icon: Building2,
      color: 'bg-green-100 text-green-800 border-green-200',
      buttonColor: 'bg-green-600 hover:bg-green-700'
    },
    remote: {
      label: 'Télétravail',
      icon: Home,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      buttonColor: 'bg-blue-600 hover:bg-blue-700'
    },
    absent: {
      label: 'Absent',
      icon: Ban,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      buttonColor: 'bg-gray-600 hover:bg-gray-700'
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const fetchWithTimeout = async () => {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Request timeout')), 10000);
      });

      try {
        await Promise.race([fetchMyPlanning(), timeoutPromise]);
      } catch (error) {
        console.error('Error fetching planning:', error);
        setError('Erreur lors du chargement du planning');
        setLoading(false);
      } finally {
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

  const fetchMyPlanning = async () => {
    if (!session?.access_token) {
      setError('Session invalide');
      setLoading(false);
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
        `https://${projectId}.supabase.co/functions/v1/make-server-473c0057/my-planning?start=${startDate}&end=${endDate}`,
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
      console.error('Erreur lors de la récupération du planning:', error);
      if (error.name !== 'AbortError') {
        setError('Impossible de charger le planning');
      }
    } finally {
      setLoading(false);
    }
  };

  const savePlanning = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-473c0057/save-planning`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plannings }),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (response.ok) {
        setMessage('Planning sauvegardé avec succès !');
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      if (error.name !== 'AbortError') {
        setError('Erreur lors de la sauvegarde du planning');
      }
    } finally {
      setSaving(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
    setLoading(true);
  };

  const updatePlanning = (date: string, period: 'morning' | 'afternoon', status: 'office' | 'remote' | 'absent') => {
    setPlannings(prev => {
      const existing = prev.find(p => p.date === date && p.period === period);
      if (existing) {
        return prev.map(p => (p.date === date && p.period === period) ? { ...p, status } : p);
      } else {
        return [...prev, { date, period, status }];
      }
    });
  };

  const getPlanningForDateAndPeriod = (date: string, period: 'morning' | 'afternoon') => {
    return plannings.find(p => p.date === date && p.period === period);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const formatWeekRange = (date: Date) => {
    const weekDays = getWeekDays(date);
    const start = weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const end = weekDays[4].toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    return `${start} - ${end}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation de semaine et bouton sauvegarder */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium">
              Semaine du {formatWeekRange(currentWeek)}
            </h3>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={savePlanning} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>

      {message && (
        <Alert>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {getWeekDays(currentWeek).map((date) => {
          const dateStr = date.toISOString().split('T')[0];
          const morningPlanning = getPlanningForDateAndPeriod(dateStr, 'morning');
          const afternoonPlanning = getPlanningForDateAndPeriod(dateStr, 'afternoon');

          return (
            <div
              key={dateStr}
              className="p-4 border rounded-lg bg-white border-gray-200"
            >
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  {formatDate(date)}
                </h4>
              </div>

              {/* Matinée */}
              <div className="mb-6">
                <h5 className="text-sm font-medium text-gray-700 mb-3">Matinée</h5>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusConfig).map(([status, config]) => {
                    const Icon = config.icon;
                    const isSelected = morningPlanning?.status === status;

                    return (
                      <Button
                        key={`morning-${status}`}
                        onClick={() => updatePlanning(dateStr, 'morning', status as any)}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={isSelected ? `text-white ${config.buttonColor}` : ''}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
                
                {morningPlanning && (
                  <div className="mt-2">
                    {(() => {
                      const StatusIcon = statusConfig[morningPlanning.status].icon;
                      return (
                        <Badge className={statusConfig[morningPlanning.status].color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[morningPlanning.status].label}
                        </Badge>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Après-midi */}
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-3">Après-midi</h5>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusConfig).map(([status, config]) => {
                    const Icon = config.icon;
                    const isSelected = afternoonPlanning?.status === status;

                    return (
                      <Button
                        key={`afternoon-${status}`}
                        onClick={() => updatePlanning(dateStr, 'afternoon', status as any)}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={isSelected ? `text-white ${config.buttonColor}` : ''}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
                
                {afternoonPlanning && (
                  <div className="mt-2">
                    {(() => {
                      const StatusIcon = statusConfig[afternoonPlanning.status].icon;
                      return (
                        <Badge className={statusConfig[afternoonPlanning.status].color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig[afternoonPlanning.status].label}
                        </Badge>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Légende</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
      </div>
    </div>
  );
}