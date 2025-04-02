
const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/dashboard', async (req, res) => {
  try {
    // Récupérer tous les utilisateurs (sauf admins)
    const users = await User.find({ isAdmin: false });
    
    // Calculer le temps restant de session
    const now = new Date();
    const expiry = new Date(req.session.user.sessionExpiry);
    const timeLeft = Math.max(0, Math.floor((expiry - now) / 1000)); // en secondes
    
    res.render('adminDashboard', { 
      user: req.session.user,
      users,
      timeLeft
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
      
      // Récupérer l'heure d'expiration actuelle
      const currentExpiry = new Date(user.sessionExpiry);
      
      // Calculer la nouvelle date d'expiration
      const newExpiry = new Date(currentExpiry.getTime() - reductionMs);
      
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
      
      console.log(`Temps de session réduit de ${minutes} minutes pour l'utilisateur ${user.username}`);
    }
    
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error("Erreur lors de la réduction du temps:", err);
    res.redirect('/admin/dashboard?error=reduce');
  }
});
module.exports = router;