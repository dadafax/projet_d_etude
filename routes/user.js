
const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');

router.get('/dashboard', async (req, res) => {
  try {
    // Calculer le temps restant de session
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