// ============================================
// SOSGOUV - Gestion de l'authentification
// ============================================

const Auth = {
  currentUser: null,

  // Initialiser l'authentification
  async init() {
    // Vérifier si un utilisateur est connecté (stocké en localStorage)
    const storedUser = localStorage.getItem('sosgouv_user');
    if (storedUser) {
      this.currentUser = JSON.parse(storedUser);
      this.updateUIForLoggedInUser();
    }
  },

  // Connexion
  async login(username, password) {
    try {
      // Récupérer l'utilisateur depuis la table users
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !data) {
        throw new Error('Nom d\'utilisateur ou mot de passe incorrect');
      }

      // Vérifier le mot de passe (simple comparaison - à améliorer avec hash)
      if (data.password_hash !== password) {
        throw new Error('Nom d\'utilisateur ou mot de passe incorrect');
      }

      // Stocker l'utilisateur connecté
      this.currentUser = data;
      localStorage.setItem('sosgouv_user', JSON.stringify(data));
      
      this.updateUIForLoggedInUser();
      UI.closeModal('connect');
      UI.showNotification('Connexion réussie !', 'success');

      return { success: true };
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return { success: false, error: error.message };
    }
  },

  // Créer un compte
  async signup(username, password, email = null) {
    try {
      // Vérifier si le username existe déjà
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      if (existing) {
        throw new Error('Ce nom d\'utilisateur existe déjà');
      }

      // Créer le nouvel utilisateur
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            username: username,
            password_hash: password, // À améliorer avec un vrai hash
            email: email,
            is_admin: false
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Connecter automatiquement l'utilisateur
      this.currentUser = data;
      localStorage.setItem('sosgouv_user', JSON.stringify(data));
      
      this.updateUIForLoggedInUser();
      UI.closeModal('connect');
      UI.showNotification('Compte créé avec succès !', 'success');

      return { success: true };
    } catch (error) {
      console.error('Erreur de création de compte:', error);
      return { success: false, error: error.message };
    }
  },

  // Déconnexion
  logout() {
    this.currentUser = null;
    localStorage.removeItem('sosgouv_user');
    this.updateUIForLoggedOut();
    UI.showNotification('Déconnexion réussie', 'success');
    // Retour à la page d'accueil
    UI.showSection('a-propos');
  },

  // Vérifier si l'utilisateur est admin
  isAdmin() {
    return this.currentUser && this.currentUser.is_admin;
  },

  // Vérifier si l'utilisateur est connecté
  isLoggedIn() {
    return this.currentUser !== null;
  },

  // Mettre à jour l'UI quand l'utilisateur est connecté
  updateUIForLoggedInUser() {
    const user = this.currentUser;
    
    // Afficher le nom d'utilisateur dans le header
    const usernameDisplay = document.querySelector('.connected-username');
    if (usernameDisplay) {
      usernameDisplay.textContent = user.username;
      usernameDisplay.style.display = 'block';
    }

    // Changer "me connecter" en "me déconnecter"
    const loginLink = document.querySelector('[data-w-id="c7b424b0-8e01-36ef-981e-7b7a15c21b64"]');
    if (loginLink) {
      loginLink.textContent = 'me déconnecter';
      loginLink.onclick = (e) => {
        e.preventDefault();
        this.logout();
      };
    }

    // Afficher le div admin si l'utilisateur est admin
    if (this.isAdmin()) {
      const adminDiv = document.querySelector('.admine-part');
      if (adminDiv) {
        adminDiv.style.display = 'block';
      }
    }
  },

  // Mettre à jour l'UI quand l'utilisateur est déconnecté
  updateUIForLoggedOut() {
    // Masquer le nom d'utilisateur
    const usernameDisplay = document.querySelector('.connected-username');
    if (usernameDisplay) {
      usernameDisplay.style.display = 'none';
    }

    // Remettre "me connecter"
    const loginLink = document.querySelector('[data-w-id="c7b424b0-8e01-36ef-981e-7b7a15c21b64"]');
    if (loginLink) {
      loginLink.textContent = 'me connecter';
      loginLink.onclick = (e) => {
        e.preventDefault();
        UI.openModal('connect');
      };
    }

    // Masquer le div admin
    const adminDiv = document.querySelector('.admine-part');
    if (adminDiv) {
      adminDiv.style.display = 'none';
    }
  },

  // Mettre à jour le profil utilisateur
  async updateProfile(updates) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', this.currentUser.id)
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour l'utilisateur courant
      this.currentUser = { ...this.currentUser, ...data };
      localStorage.setItem('sosgouv_user', JSON.stringify(this.currentUser));
      
      this.updateUIForLoggedInUser();
      UI.showNotification('Profil mis à jour !', 'success');

      return { success: true };
    } catch (error) {
      console.error('Erreur de mise à jour du profil:', error);
      return { success: false, error: error.message };
    }
  }
};

// Initialiser l'authentification au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
