import React, { useState, useEffect } from 'react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Building2, Home, Ban, TrendingUp, Users, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ManagerSummaryProps {
  session: any;
}

interface DaySummary {
  date: string;
  office: number;
  remote: number;
  absent: number;
  total: number;
}

export function ManagerSummary({ session }: ManagerSummaryProps) {
  const [summary, setSummary] = useState<DaySummary[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const fetchWithTimeout = async () => {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Request timeout')), 10000);
      });

      try {
        await Promise.race([fetchManagerSummary(), timeoutPromise]);
      } catch (error) {
        console.error('Error fetching manager summary:', error);
        setLoading(false);
      } finally {
        clearTimeout(timeoutId);
      }
    };

    if (session?.access_token) {
      fetchWithTimeout();
    } else {
      setLoading(false);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const fetchManagerSummary = async () => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-473c0057/manager-summary`,
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
        setSummary(Array.isArray(data.summary) ? data.summary : []);
        setTotalUsers(typeof data.totalUsers === 'number' ? data.totalUsers : 0);
      } else {
        console.error('Erreur HTTP:', response.status);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du résumé manager:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const isWeekend = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const workingDays = summary.filter(day => !isWeekend(day.date));
  
  const chartData = workingDays.map(day => ({
    date: formatDate(day.date),
    'Bureau': day.office,
    'Télétravail': day.remote,
    'Absent': day.absent
  }));

  // Calcul des moyennes pour la semaine
  const averages = workingDays.reduce(
    (acc, day) => ({
      office: acc.office + day.office,
      remote: acc.remote + day.remote,
      absent: acc.absent + day.absent,
    }),
    { office: 0, remote: 0, absent: 0 }
  );

  const pieData = [
    { name: 'Bureau', value: averages.office, color: '#10b981' },
    { name: 'Télétravail', value: averages.remote, color: '#3b82f6' },
    { name: 'Absent', value: averages.absent, color: '#6b7280' }
  ];

  const occupancyRate = totalUsers > 0 ? ((averages.office / (workingDays.length * totalUsers)) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employés Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Équipe complète</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Présence</CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {occupancyRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Présence au bureau (moyenne)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Télétravail</CardTitle>
            <Home className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {workingDays.length > 0 ? Math.round(averages.remote / workingDays.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Moyenne par jour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <Ban className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {workingDays.length > 0 ? Math.round(averages.absent / workingDays.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Moyenne par jour
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique en barres */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart className="h-5 w-5" />
              <span>Répartition par jour</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Bureau" fill="#10b981" />
                <Bar dataKey="Télétravail" fill="#3b82f6" />
                <Bar dataKey="Absent" fill="#6b7280" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Graphique en secteurs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Répartition globale</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tableau détaillé */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Détail par jour</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Bureau</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Télétravail</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Absent</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((day) => (
                  <tr key={day.date} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">
                        {formatDate(day.date)}
                        {isWeekend(day.date) && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Week-end
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      {isWeekend(day.date) ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">
                          {day.office}
                        </Badge>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {isWeekend(day.date) ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <Badge className="bg-blue-100 text-blue-800">
                          {day.remote}
                        </Badge>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {isWeekend(day.date) ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">
                          {day.absent}
                        </Badge>
                      )}
                    </td>
                    <td className="text-center py-3 px-4">
                      {isWeekend(day.date) ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <span className="font-medium">{day.total}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}