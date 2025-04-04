const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const User = require('../models/User');

router.post('/comment', async (req, res) => {
  try {
    if (!req.session.user || !req.session.user.id) {
      console.log('Tentative de publication sans session valide');
      return res.status(401).send('Utilisateur non authentifié');
    }

    const { content } = req.body;
    
    // Rafraîchir la session avant de sauvegarder le commentaire
    req.session.touch();
    await req.session.save();
    
    const newComment = new Comment({
      content,
      author: req.session.user.id
    });
    
    await newComment.save();
    
    // Rafraîchir à nouveau la session après la sauvegarde
    req.session.touch();
    await req.session.save();
    
    res.redirect('/user/dashboard');
  } catch (err) {
    console.error('Erreur lors de la publication du commentaire:', err);
    res.redirect('/user/dashboard?error=true');
  }
});

// Dans user.js, modifiez la route dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.session.user.id.toString();
    
    // Vérifier si l'utilisateur est blacklisté
    const user = await User.findById(userId);
    if (user && user.blacklisted) {
      // Supprimer l'utilisateur de global.activeUsers
      if (global.activeUsers && global.activeUsers[userId]) {
        delete global.activeUsers[userId];
      }
      req.session.destroy((err) => {
        if (err) {
          console.error('Erreur lors de la destruction de la session:', err);
        }
        return res.redirect('/?blacklisted=true');
      });
      return;
    }
    
    // Vérifier et mettre à jour la session si nécessaire
    if (global.activeUsers && global.activeUsers[userId]) {
      const storedExpiry = global.activeUsers[userId].sessionExpiry;
      if (storedExpiry && storedExpiry !== req.session.user.sessionExpiry) {
        req.session.user.sessionExpiry = storedExpiry;
        req.session.save();
      }
    }
    
    // Calculer le temps restant à partir de la session actuelle
    const now = new Date();
    const expiry = new Date(req.session.user.sessionExpiry);
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

module.exports = router;