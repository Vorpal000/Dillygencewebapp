import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Configuration CORS
app.use('*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use('*', logger(console.log));

// Client Supabase avec service role key
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Route d'inscription
app.post('/make-server-473c0057/signup', async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: 'Tous les champs sont requis' }, 400);
    }

    // Créer l'utilisateur avec Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Confirmer automatiquement l'email car aucun serveur email n'a été configuré
      email_confirm: true
    });

    if (authError) {
      console.log('Erreur lors de la création de l\'utilisateur:', authError);
      return c.json({ error: authError.message }, 400);
    }

    // Stocker les informations utilisateur dans notre KV store
    const userId = authData.user.id;
    await kv.set(`user:${userId}`, {
      id: userId,
      name,
      email,
      role: 'employee', // Par défaut, tous les nouveaux utilisateurs sont employés
      created_at: new Date().toISOString()
    });

    return c.json({ 
      message: 'Utilisateur créé avec succès',
      user: { id: userId, name, email, role: 'employee' }
    });

  } catch (error) {
    console.log('Erreur dans /signup:', error);
    return c.json({ error: 'Erreur serveur lors de l\'inscription' }, 500);
  }
});

// Route pour récupérer le profil utilisateur
app.get('/make-server-473c0057/profile', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Token manquant' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Utilisateur non authentifié' }, 401);
    }

    // Récupérer les informations stockées dans le KV store
    const userProfile = await kv.get(`user:${user.id}`);
    
    if (!userProfile) {
      // Si l'utilisateur n'existe pas dans le KV store, le créer
      const profile = {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Utilisateur',
        email: user.email,
        role: 'employee',
        created_at: new Date().toISOString()
      };
      
      await kv.set(`user:${user.id}`, profile);
      return c.json(profile);
    }

    return c.json(userProfile);

  } catch (error) {
    console.log('Erreur dans /profile:', error);
    return c.json({ error: 'Erreur serveur lors de la récupération du profil' }, 500);
  }
});

// Route pour récupérer le planning personnel
app.get('/make-server-473c0057/my-planning', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Token manquant' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Utilisateur non authentifié' }, 401);
    }

    // Récupérer les plannings de l'utilisateur
    const plannings = await kv.getByPrefix(`planning:${user.id}:`);
    
    return c.json(plannings.map(p => ({
      id: p.id,
      date: p.date,
      status: p.status
    })));

  } catch (error) {
    console.log('Erreur dans /my-planning:', error);
    return c.json({ error: 'Erreur serveur lors de la récupération du planning' }, 500);
  }
});

// Route pour sauvegarder le planning
app.post('/make-server-473c0057/save-planning', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Token manquant' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Utilisateur non authentifié' }, 401);
    }

    const { plannings } = await c.req.json();

    if (!Array.isArray(plannings)) {
      return c.json({ error: 'Format de données invalide' }, 400);
    }

    // Sauvegarder chaque planning
    for (const planning of plannings) {
      const planningId = `planning:${user.id}:${planning.date}`;
      await kv.set(planningId, {
        id: planningId,
        user_id: user.id,
        date: planning.date,
        status: planning.status,
        updated_at: new Date().toISOString()
      });
    }

    return c.json({ message: 'Planning sauvegardé avec succès' });

  } catch (error) {
    console.log('Erreur dans /save-planning:', error);
    return c.json({ error: 'Erreur serveur lors de la sauvegarde du planning' }, 500);
  }
});

// Route pour récupérer le planning global
app.get('/make-server-473c0057/global-planning', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Token manquant' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Utilisateur non authentifié' }, 401);
    }

    // Récupérer tous les plannings
    const allPlannings = await kv.getByPrefix('planning:');
    const allUsers = await kv.getByPrefix('user:');

    // Créer un map des utilisateurs pour la recherche rapide
    const userMap = new Map();
    allUsers.forEach(u => userMap.set(u.id, u));

    // Enrichir les plannings avec les informations utilisateur
    const enrichedPlannings = allPlannings.map(planning => ({
      id: planning.id,
      user_id: planning.user_id,
      date: planning.date,
      status: planning.status,
      user: userMap.get(planning.user_id) || { name: 'Utilisateur inconnu', email: '' }
    }));

    return c.json(enrichedPlannings);

  } catch (error) {
    console.log('Erreur dans /global-planning:', error);
    return c.json({ error: 'Erreur serveur lors de la récupération du planning global' }, 500);
  }
});

// Route pour récupérer tous les utilisateurs
app.get('/make-server-473c0057/users', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Token manquant' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Utilisateur non authentifié' }, 401);
    }

    const users = await kv.getByPrefix('user:');
    
    return c.json(users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role
    })));

  } catch (error) {
    console.log('Erreur dans /users:', error);
    return c.json({ error: 'Erreur serveur lors de la récupération des utilisateurs' }, 500);
  }
});

// Route pour le résumé manager
app.get('/make-server-473c0057/manager-summary', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Token manquant' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Utilisateur non authentifié' }, 401);
    }

    // Récupérer le profil utilisateur pour vérifier s'il est manager
    const userProfile = await kv.get(`user:${user.id}`);
    
    if (!userProfile || userProfile.role !== 'manager') {
      return c.json({ error: 'Accès refusé - Droits manager requis' }, 403);
    }

    // Récupérer tous les plannings et utilisateurs
    const allPlannings = await kv.getByPrefix('planning:');
    const allUsers = await kv.getByPrefix('user:');

    // Générer les 7 prochains jours
    const next7Days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      next7Days.push(date.toISOString().split('T')[0]);
    }

    // Calculer les statistiques par jour
    const summary = next7Days.map(date => {
      const dayPlannings = allPlannings.filter(p => p.date === date);
      
      return {
        date,
        office: dayPlannings.filter(p => p.status === 'office').length,
        remote: dayPlannings.filter(p => p.status === 'remote').length,
        absent: dayPlannings.filter(p => p.status === 'absent').length,
        total: dayPlannings.length
      };
    });

    return c.json({
      summary,
      totalUsers: allUsers.length
    });

  } catch (error) {
    console.log('Erreur dans /manager-summary:', error);
    return c.json({ error: 'Erreur serveur lors de la récupération du résumé manager' }, 500);
  }
});

// Route pour promouvoir un utilisateur en manager (pour les tests)
app.post('/make-server-473c0057/promote-manager', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Token manquant' }, 401);
    }

    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ error: 'Utilisateur non authentifié' }, 401);
    }

    // Récupérer le profil utilisateur
    const userProfile = await kv.get(`user:${user.id}`);
    
    if (!userProfile) {
      return c.json({ error: 'Profil utilisateur non trouvé' }, 404);
    }

    // Promouvoir en manager
    userProfile.role = 'manager';
    await kv.set(`user:${user.id}`, userProfile);

    return c.json({ 
      message: 'Utilisateur promu manager avec succès',
      user: userProfile
    });

  } catch (error) {
    console.log('Erreur dans /promote-manager:', error);
    return c.json({ error: 'Erreur serveur lors de la promotion' }, 500);
  }
});

// Route de test
app.get('/make-server-473c0057/health', (c) => {
  return c.json({ status: 'OK', message: 'Serveur de planning fonctionnel' });
});

Deno.serve(app.fetch);