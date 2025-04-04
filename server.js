const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const { checkAuth, checkAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/loginApp')
.then(() => console.log('Connecté à MongoDB'))
.catch(err => console.error('Erreur de connexion MongoDB:', err));

// Dans server.js, après avoir configuré mongoose et avant d'initialiser les routes
global.activeUsers = {};

// Middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuration de la session avant toute autre route
app.use(session({
  secret: 'secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: 'mongodb://localhost:27017/loginApp',
    ttl: 30 * 24 * 60 * 60, // 30 jours
    autoRemove: 'native',
    touchAfter: 24 * 3600 // Rafraîchir la session une fois par jour
  }),
  cookie: { 
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 jours
    secure: false,
    httpOnly: true
  }
}));

// Middleware pour vérifier la session à chaque requête
app.use((req, res, next) => {
  console.log('Session actuelle:', req.session);
  console.log('Utilisateur actuel:', req.session.user);
  next();
});

// Configuration des vues
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', authRoutes);
app.use('/user', checkAuth, userRoutes);
app.use('/admin', checkAuth, checkAdmin, adminRoutes);

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});