
const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');

router.post('/comment', async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      return res.status(401).send('Utilisateur non authentifié');
    }

    const { content } = req.body;
    
    const newComment = new Comment({
      content,
      author: req.session.user.id // Assurez-vous que `id` est bien stocké dans la session
    });
    
    await newComment.save();
    res.redirect('/user/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/user/dashboard?error=true');
  }
});

// Dans user.js, modifiez la route dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.session.user.id.toString();
    if (global.activeUsers && global.activeUsers[userId]) {
      const storedExpiry = global.activeUsers[userId].sessionExpiry;
      if (storedExpiry && storedExpiry !== req.session.user.sessionExpiry) {
        req.session.user.sessionExpiry = storedExpiry;
        // Forcer la sauvegarde de la session
        req.session.save();
      }
    }
    // Vérifier si la session a été mise à jour par l'admin
    if (global.activeUsers && global.activeUsers[req.session.user.id]) {
      const storedExpiry = global.activeUsers[req.session.user.id].sessionExpiry;
      if (storedExpiry && storedExpiry !== req.session.user.sessionExpiry) {
        req.session.user.sessionExpiry = storedExpiry;
      }
    }
    
    // Calculer le temps restant correctement
    const now = new Date();
    const expiry = new Date(req.session.user.sessionExpiry);
    const timeLeftMs = Math.max(0, expiry - now);
    const timeLeft = Math.max(0, Math.floor((expiry - now) / 1000)); // en secondes
    
    // Récupérer les commentaires
    const comments = await Comment.find().populate('author', 'username').sort({ createdAt: -1 });
    
    res.render('userDashboard', { 
      user: req.session.user,
      timeLeft,
      comments
    });
  } catch (err) {
    console.error(err);
    res.render('error', { message: 'Erreur serveur' });
  }
});

router.post('/comment', async (req, res) => {
  try {
    const { content } = req.body;
    
    const newComment = new Comment({
      content,
      author: req.session.user.id
    });
    
    await newComment.save();
    res.redirect('/user/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/user/dashboard?error=true');
  }
});

module.exports = router;