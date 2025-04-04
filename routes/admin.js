const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');

router.get('/dashboard', async (req, res) => {
  try {
    // Récupérer tous les utilisateurs (sauf admins)
    const users = await User.find({ isAdmin: false });
    
    // Récupérer tous les commentaires
    const comments = await Comment.find().populate('author', 'username').sort({ createdAt: -1 });

    // Récupérer les notifications non lues
    const notifications = await Notification.find().sort({ date: -1 });
    
    res.render('adminDashboard', { 
      user: req.session.user,
      users,
      comments,
      notifications,
      error: req.query.error || null,
      success: req.query.success || null
    });
  } catch (err) {
    console.error(err);
    res.render('error', { message: 'Erreur serveur' });
  }
});

router.post('/delete-user/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    // Ajouter une notification pour l'admin
    const notif = new Notification({
      message: `L'utilisateur ${user.username} a été supprimé.`,
    });
    await notif.save();

    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/dashboard?error=delete');
  }
});

router.post('/delete-comment/:id', async (req, res) => {
  try {
    console.log('Tentative de suppression du commentaire:', req.params.id);
    console.log('Session utilisateur:', req.session.user);
    
    const comment = await Comment.findById(req.params.id);
    console.log('Commentaire trouvé:', comment);

    if (!comment) {
      console.error('Commentaire non trouvé');
      return res.redirect('/admin/dashboard?error=comment-not-found');
    }

    await comment.deleteOne();
    console.log('Commentaire supprimé avec succès');

    // Ajouter une notification pour l'admin
    const notif = new Notification({
      message: "Un commentaire a été supprimé.",
    });
    await notif.save();
    console.log('Notification créée');

    res.redirect('/admin/dashboard?success=comment-deleted');
  } catch (err) {
    console.error('Erreur lors de la suppression du commentaire:', err);
    res.redirect('/admin/dashboard?error=delete-comment');
  }
});

router.post('/blacklist/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.blacklisted = !user.blacklisted;
    await user.save();

    // Ajouter une notification pour l'admin
    const notif = new Notification({
      message: `L'utilisateur ${user.username} a été ${user.blacklisted ? 'blacklisté' : 'déblacklisté'}.`,
    });
    await notif.save();

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
    } else {
      // Si l'utilisateur est débloqué, on le réintègre dans global.activeUsers
      if (!global.activeUsers) {
        global.activeUsers = {};
      }
      global.activeUsers[user._id.toString()] = {
        sessionExpiry: user.sessionExpiry ? user.sessionExpiry.getTime() : null
      };
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
      const reductionMs = parseInt(minutes) * 60 * 1000;
      const currentExpiry = new Date(user.sessionExpiry);
      const newExpiry = new Date(currentExpiry.getTime() - reductionMs);
      user.sessionExpiry = newExpiry;
      await user.save();

      global.activeUsers[user._id.toString()] = { sessionExpiry: newExpiry.getTime() };

      // Ajouter une notification pour la réduction de temps
      const notif = new Notification({
        message: `Le temps de session de ${user.username} a été réduit de ${minutes} minutes.`,
      });
      await notif.save();

      console.log(`Temps de session réduit de ${minutes} minutes pour l'utilisateur ${user.username}. Temps restant: ${Math.floor(newExpiry.getTime() / 60000)} minutes`);
    }
    
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error("Erreur lors de la réduction du temps:", err);
    res.redirect('/admin/dashboard?error=reduce');
  }
});

router.post('/mark-as-read/:id', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (notification) {
      notification.isRead = true;
      await notification.save();
    }
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error('Erreur lors du marquage de la notification:', err);
    res.redirect('/admin/dashboard?error=notification');
  }
});

router.post('/delete-notification/:id', async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      console.error('Notification non trouvée');
      return res.redirect('/admin/dashboard?error=notification-not-found');
    }

    await notification.deleteOne();
    res.redirect('/admin/dashboard?success=notification-deleted');
  } catch (err) {
    console.error('Erreur lors de la suppression de la notification:', err);
    res.redirect('/admin/dashboard?error=delete-notification');
  }
});

module.exports = router;