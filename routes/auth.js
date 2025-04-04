const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcrypt');

router.get('/', (req, res) => {
  const error = req.query.error || '';
  const expired = req.query.expired || false;
  const blacklisted = req.query.blacklisted || false;
  
  res.render('login', { error, expired, blacklisted });
});

router.post('/login', async (req, res) => {
  try {
    console.log('Tentative de connexion avec:', req.body);
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      console.log('Utilisateur non trouvé:', username);
      return res.redirect('/?error=Identifiants incorrects');
    }

    if (user.blacklisted) {
      console.log('Utilisateur blacklisté:', username);
      return res.redirect('/?blacklisted=true');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Mot de passe correct:', isMatch);

    if (!isMatch) {
      console.log('Mot de passe incorrect pour:', username);
      return res.redirect('/?error=Identifiants incorrects');
    }

    // Définir l'expiration de la session uniquement pour les utilisateurs non-admin
    const expiryTime = user.isAdmin ? null : Date.now() + (60 * 60 * 1000); // 1 heure pour les non-admins, pas d'expiration pour les admins

    // Stocker les informations utilisateur dans la session
    req.session.user = {
      id: user._id,
      username: user.username,
      isAdmin: user.isAdmin,
      blacklisted: user.blacklisted,
      sessionExpiry: expiryTime // null pour les admins
    };

    console.log('Session créée:', req.session.user);

    // Mettre à jour les informations de connexion
    user.ipAddress = req.ip;
    user.lastLogin = new Date();
    user.sessionExpiry = expiryTime; // null pour les admins
    await user.save();

    // S'assurer que la session est sauvegardée avant la redirection
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Erreur lors de la sauvegarde de la session:', err);
          reject(err);
        }
        resolve();
      });
    });

    if (user.isAdmin) {
      console.log('Redirection vers le dashboard admin');
      return res.redirect('/admin/dashboard');
    } else {
      console.log('Redirection vers le dashboard utilisateur');
      return res.redirect('/user/dashboard');
    }
  } catch (err) {
    console.error('Erreur lors de la connexion:', err);
    res.redirect('/?error=Erreur serveur');
  }
});


router.get('/register', (req, res) => {
  res.render('register', { error: '' });
});

router.post('/register', async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;
    
    if (password !== confirmPassword) {
      return res.render('register', { error: 'Les mots de passe ne correspondent pas' });
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.render('register', { error: 'Nom d\'utilisateur déjà utilisé' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const newUser = new User({
      username,
      password: hashedPassword,
      ipAddress: req.ip,
      lastLogin: new Date()
    });
    
    await newUser.save();
    res.redirect('/?success=true');
  } catch (err) {
    console.error(err);
    res.render('register', { error: 'Erreur serveur' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;