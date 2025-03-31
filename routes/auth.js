
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
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.redirect('/?error=Identifiants incorrects');
    }
    
    if (user.blacklisted) {
      return res.redirect('/?blacklisted=true');
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.redirect('/?error=Identifiants incorrects');
    }
    
    // Définir l'expiration de la session (1 heure par défaut)
    const expiryTime = new Date();
    expiryTime.setHours(expiryTime.getHours() + 1);
    
    // Mettre à jour les informations de connexion
    user.ipAddress = req.ip;
    user.lastLogin = new Date();
    user.sessionExpiry = expiryTime;
    await user.save();
    
    // Stocker les informations utilisateur dans la session
    req.session.user = {
      id: user._id,
      username: user.username,
      isAdmin: user.isAdmin,
      sessionExpiry: expiryTime,
      blacklisted: user.blacklisted
    };
    
    if (user.isAdmin) {
      return res.redirect('/admin/dashboard');
    } else {
      return res.redirect('/user/dashboard');
    }
  } catch (err) {
    console.error(err);
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