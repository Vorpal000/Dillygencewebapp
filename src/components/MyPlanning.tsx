import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Building2, Home, Ban, Save, Calendar } from 'lucide-react';

interface Planning {
  id?: string;
  date: string;
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
      label: 'Absence',
      icon: Ban,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      buttonColor: 'bg-gray-600 hover:bg-gray-700'
    }
  };

  useEffect(() => {
    fetchMyPlanning();
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

  const fetchMyPlanning = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-473c0057/my-planning`,
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
      console.error('Erreur lors de la récupération du planning:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePlanning = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-473c0057/save-planning`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plannings }),
        }
      );

      if (response.ok) {
        setMessage('Planning sauvegardé avec succès !');
        setTimeout(() => setMessage(''), 3000);
      } else {
        throw new Error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      setMessage('Erreur lors de la sauvegarde du planning');
    } finally {
      setSaving(false);
    }
  };

  const updatePlanning = (date: string, status: 'office' | 'remote' | 'absent') => {
    setPlannings(prev => {
      const existing = prev.find(p => p.date === date);
      if (existing) {
        return prev.map(p => p.date === date ? { ...p, status } : p);
      } else {
        return [...prev, { date, status }];
      }
    });
  };

  const getPlanningForDate = (date: string) => {
    return plannings.find(p => p.date === date);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const isWeekend = (date: Date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Dimanche ou Samedi
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium">Planning des 7 prochains jours</h3>
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

      <div className="grid gap-4">
        {getNext7Days().map((date) => {
          const dateStr = date.toISOString().split('T')[0];
          const planning = getPlanningForDate(dateStr);
          const weekend = isWeekend(date);

          return (
            <div
              key={dateStr}
              className={`p-4 border rounded-lg ${
                weekend ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {formatDate(date)}
                  </h4>
                  {weekend && (
                    <p className="text-sm text-gray-500">Week-end</p>
                  )}
                </div>

                {!weekend && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    {Object.entries(statusConfig).map(([status, config]) => {
                      const Icon = config.icon;
                      const isSelected = planning?.status === status;

                      return (
                        <Button
                          key={status}
                          onClick={() => updatePlanning(dateStr, status as any)}
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
                )}

                {weekend && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                    Repos
                  </Badge>
                )}
              </div>

              {planning && !weekend && (
                <div className="mt-3">
                  {(() => {
                    const StatusIcon = statusConfig[planning.status].icon;
                    return (
                      <Badge className={statusConfig[planning.status].color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig[planning.status].label}
                      </Badge>
                    );
                  })()}
                </div>
              )}
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