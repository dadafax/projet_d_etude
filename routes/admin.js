const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Comment = require('../models/Comment');

router.get('/dashboard', async (req, res) => {
  try {
    // Récupérer tous les utilisateurs (sauf admins)
    const users = await User.find({ isAdmin: false });
    
    // Récupérer tous les commentaires
    const comments = await Comment.find().populate('author', 'username').sort({ createdAt: -1 });
    
    res.render('adminDashboard', { 
      user: req.session.user,
      users,
      comments
    });
  } catch (err) {
    console.error(err);
    res.render('error', { message: 'Erreur serveur' });
  }
});

router.post('/delete-user/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard?error=delete');
  }
});

router.post('/blacklist/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.blacklisted = !user.blacklisted;
    await user.save();

    // Si l'utilisateur est blacklisté, on le déconnecte
    if (user.blacklisted) {
      // Supprimer l'utilisateur de global.activeUsers
      if (global.activeUsers && global.activeUsers[user._id.toString()]) {
        delete global.activeUsers[user._id.toString()];
      }
      
      // Si l'utilisateur blacklisté est l'utilisateur actuel, on le déconnecte
      if (req.session.user && req.session.user.id.toString() === user._id.toString()) {
        // Forcer la destruction de la session
        req.session.destroy((err) => {
          if (err) {
            console.error('Erreur lors de la destruction de la session:', err);
          }
          return res.redirect('/?blacklisted=true');
        });
        return;
      }
    }
    
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard?error=blacklist');
  }
});

router.post('/reduce-time/:id', async (req, res) => {
  try {
    const { minutes } = req.body;
    const user = await User.findById(req.params.id);
    
    if (user.sessionExpiry) {
      // Convertir le nombre de minutes en millisecondes
      const reductionMs = parseInt(minutes) * 60 * 1000;
      
      // Récupérer l'heure courante
      const now = new Date();
      
      // Récupérer l'heure d'expiration actuelle
      const currentExpiry = new Date(user.sessionExpiry);
      
      // Calculer le temps réellement restant
      const timeLeftMs = Math.max(0, currentExpiry - now);
      
      // Soustraire le temps à réduire du temps restant
      const newTimeLeftMs = Math.max(0, timeLeftMs - reductionMs);
      
      // Calculer la nouvelle date d'expiration à partir du temps restant
      const newExpiry = new Date(now.getTime() + newTimeLeftMs);
      
      // Mettre à jour la date d'expiration
      user.sessionExpiry = newExpiry;
      
      // Sauvegarder dans la base de données
      await user.save();

      // S'assurer que global.activeUsers est initialisé
      if (!global.activeUsers) {
        global.activeUsers = {};
      }
      
      // Mettre à jour l'expiration dans global.activeUsers
      global.activeUsers[user._id.toString()] = {
        sessionExpiry: newExpiry.getTime()
      };
      
      console.log(`Temps de session réduit de ${minutes} minutes pour l'utilisateur ${user.username}. Temps restant: ${Math.floor(newTimeLeftMs / 60000)} minutes`);
    }
    
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error("Erreur lors de la réduction du temps:", err);
    res.redirect('/admin/dashboard?error=reduce');
  }
});

module.exports = router;