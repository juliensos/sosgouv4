// ============================================
// SOSGOUV - Gestion de l'interface utilisateur
// ============================================

const UI = {
  currentSection: null,

  // Initialiser l'UI
  init() {
    this.setupMenuNavigation();
    this.setupModalControls();
    this.setupForms();
    this.showSection('a-propos'); // Page par défaut
  },

  // Configuration de la navigation du menu principal
  setupMenuNavigation() {
    // Bouton "gouvernements publiés"
    const btnGouv = document.querySelector('[data-w-id="25cab02f-af32-8a74-54c8-57aeb41a9c5f"]');
    if (btnGouv) {
      btnGouv.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSection('gouvernements-publies');
      });
    }

    // Bouton "composer un gouvernement"
    const btnComposer = document.querySelector('[data-w-id="08facb67-cf85-5b41-76f3-6e759d191557"]');
    if (btnComposer) {
      btnComposer.addEventListener('click', (e) => {
        e.preventDefault();
        if (!Auth.isLoggedIn()) {
          this.showNotification('Vous devez être connecté pour composer un gouvernement', 'error');
          this.openModal('connect');
          return;
        }
        this.showSection('composer-gouvernement');
      });
    }

    // Bouton "ajouter une personnalité"
    const btnAjouter = document.querySelector('[data-w-id="00af5ef5-d7cd-e1cf-6721-cae94375086b"]');
    if (btnAjouter) {
      btnAjouter.addEventListener('click', (e) => {
        e.preventDefault();
        if (!Auth.isLoggedIn()) {
          this.showNotification('Vous devez être connecté pour ajouter une personnalité', 'error');
          this.openModal('connect');
          return;
        }
        this.showSection('ajouter-personnalite');
      });
    }

    // Bouton "liste des personnalités"
    const btnListe = document.querySelector('[data-w-id="5524d704-f9fb-a64d-b2f1-84add1a2864e"]');
    if (btnListe) {
      btnListe.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSection('liste-personnalites');
      });
    }

    // Logo - retour à propos
    const logo = document.querySelector('[data-w-id="36ede9ba-fdf2-e3a6-749e-26f4a5712771"]');
    if (logo) {
      logo.addEventListener('click', (e) => {
        e.preventDefault();
        this.showSection('a-propos');
      });
    }
  },

  // Afficher une section (simuler des pages)
  showSection(sectionName) {
    // Masquer toutes les sections
    const sections = [
      '._3-0_sous-menu-content-0',  // a-propos
      '._3-1_sous-menu-content-1',  // gouvernements publiés
      '._3-2_sous-menu-content-2',  // composer gouvernement
      '._3-3_sous-menu-content-3',  // ajouter personnalité
      '._3-4_sous-menu-content-4'   // liste personnalités
    ];

    sections.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) el.style.display = 'none';
    });

    // Afficher la section demandée
    let selectorToShow = null;
    switch(sectionName) {
      case 'a-propos':
        selectorToShow = '._3-0_sous-menu-content-0';
        break;
      case 'gouvernements-publies':
        selectorToShow = '._3-1_sous-menu-content-1';
        Gouvernement.loadPublishedGovernments();
        break;
      case 'composer-gouvernement':
        selectorToShow = '._3-2_sous-menu-content-2';
        Gouvernement.initComposerForm();
        break;
      case 'ajouter-personnalite':
        selectorToShow = '._3-3_sous-menu-content-3';
        break;
      case 'liste-personnalites':
        selectorToShow = '._3-4_sous-menu-content-4';
        Personnalites.loadPersonnalites();
        break;
    }

    if (selectorToShow) {
      const el = document.querySelector(selectorToShow);
      if (el) {
        el.style.display = 'block';
        this.currentSection = sectionName;
      }
    }
  },

  // Configuration des contrôles des modaux
  setupModalControls() {
    // Tous les boutons de fermeture des modaux
    const closeButtons = document.querySelectorAll('._3-close-bouton, ._3-fond-modal, ._3-fond-modal-pages');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        // Trouver le modal parent
        const modal = btn.closest('.pm-parent, .bm-parent');
        if (modal) {
          modal.style.display = 'none';
        }
      });
    });

    // Bouton "me connecter" dans le menu compte
    const btnConnect = document.querySelector('[data-w-id="c7b424b0-8e01-36ef-981e-7b7a15c21b64"]');
    if (btnConnect) {
      btnConnect.addEventListener('click', (e) => {
        e.preventDefault();
        if (Auth.isLoggedIn()) {
          Auth.logout();
        } else {
          this.openModal('connect');
        }
      });
    }

    // Bouton infos personnelles
    const btnInfosPerso = document.querySelector('[data-w-id="07fe5148-322e-ebe4-f25a-924dc8e0ab2f"]');
    if (btnInfosPerso) {
      btnInfosPerso.addEventListener('click', (e) => {
        e.preventDefault();
        if (!Auth.isLoggedIn()) {
          this.showNotification('Vous devez être connecté', 'error');
          this.openModal('connect');
          return;
        }
        this.openModal('donnees-perso');
      });
    }

    // Toggle menu compte
    const btnMenuCompte = document.querySelector('[data-w-id="c81e0f28-5e42-2d75-638a-3843b4fc30eb"]');
    const menuCompte = document.querySelector('._3-menu-mon-compte');
    if (btnMenuCompte && menuCompte) {
      btnMenuCompte.addEventListener('click', (e) => {
        e.preventDefault();
        const isVisible = menuCompte.style.display === 'block';
        menuCompte.style.display = isVisible ? 'none' : 'block';
      });
    }

    // Toggle menu général
    const btnMenuGeneral = document.querySelector('[data-w-id="268e8b95-4ff6-f11e-b7be-0b50c8ae2d30"]');
    const menuGeneral = document.querySelector('._3-menu-general');
    if (btnMenuGeneral && menuGeneral) {
      btnMenuGeneral.addEventListener('click', (e) => {
        e.preventDefault();
        const isVisible = menuGeneral.style.display === 'block';
        menuGeneral.style.display = isVisible ? 'none' : 'block';
      });
    }

    // Lien page admin
    const btnAdmin = document.querySelector('.admine-part a');
    if (btnAdmin) {
      btnAdmin.addEventListener('click', (e) => {
        e.preventDefault();
        if (!Auth.isAdmin()) {
          this.showNotification('Accès réservé aux administrateurs', 'error');
          return;
        }
        this.openModal('admin-perso');
      });
    }
  },

  // Ouvrir un modal
  openModal(modalName) {
    const modals = {
      'connect': '.pm-parent.connect',
      'ajouter-personnalite': '.pm-parent.ajouter-personnalit',
      'liste-personnalite': '.pm-parent.liste-personnalit',
      'fiche-personnalite': '.bm-parent.fiche-personnalit',
      'admin-perso': '.bm-parent.admin-perso',
      'donnees-perso': '.bm-parent.donn-es-perso',
      'utilisateur': '.pm-parent.utilisateur',
      'gouv-detail': '.bm-parent.gouv-detail',
      'commenter': '.pm-parent.commenter',
      'choix-brouillon': '.pm-parent.choix-brouillon',
      'secteur-regalien': '.pm-parent.secteur-r-galien',
      'secteur-non-regalien': '.pm-parent.secteur-non-regalien',
      'definir-delegue': '.pm-parent.definir-delegu',
      'modifier-intitule': '.pm-parent.modifier-intitul',
      'choisir-sous-secteur': '.pm-parent.choisir-sous-secteur',
      'faq': '.bm-parent.faq'
    };

    const selector = modals[modalName];
    if (selector) {
      const modal = document.querySelector(selector);
      if (modal) {
        modal.style.display = 'block';
      }
    }
  },

  // Fermer un modal
  closeModal(modalName) {
    const modals = {
      'connect': '.pm-parent.connect',
      'ajouter-personnalite': '.pm-parent.ajouter-personnalit',
      'liste-personnalite': '.pm-parent.liste-personnalit',
      'fiche-personnalite': '.bm-parent.fiche-personnalit',
      'admin-perso': '.bm-parent.admin-perso',
      'donnees-perso': '.bm-parent.donn-es-perso',
      'utilisateur': '.pm-parent.utilisateur',
      'gouv-detail': '.bm-parent.gouv-detail',
      'commenter': '.pm-parent.commenter',
      'choix-brouillon': '.pm-parent.choix-brouillon',
      'secteur-regalien': '.pm-parent.secteur-r-galien',
      'secteur-non-regalien': '.pm-parent.secteur-non-regalien',
      'definir-delegue': '.pm-parent.definir-delegu',
      'modifier-intitule': '.pm-parent.modifier-intitul',
      'choisir-sous-secteur': '.pm-parent.choisir-sous-secteur',
      'faq': '.bm-parent.faq'
    };

    const selector = modals[modalName];
    if (selector) {
      const modal = document.querySelector(selector);
      if (modal) {
        modal.style.display = 'none';
      }
    }
  },

  // Configuration des formulaires
  setupForms() {
    // Formulaire de connexion
    const loginForm = document.querySelector('.pm-parent.connect form');
    if (loginForm) {
      const submitBtn = loginForm.querySelector('a[href="#"]');
      if (submitBtn) {
        submitBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          const inputs = loginForm.querySelectorAll('input');
          const username = inputs[0]?.value;
          const password = inputs[1]?.value;

          if (!username || !password) {
            this.showNotification('Veuillez remplir tous les champs', 'error');
            return;
          }

          const result = await Auth.login(username, password);
          if (!result.success) {
            this.showNotification(result.error, 'error');
          }
        });
      }
    }

    // Formulaire de création de compte
    const signupForms = document.querySelectorAll('.pm-parent.connect ._w-connect-bloc.creation form');
    if (signupForms.length > 1) {
      const signupForm = signupForms[1]; // Le deuxième formulaire
      const submitBtn = signupForm.querySelector('a[href="#"]');
      if (submitBtn) {
        submitBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          const inputs = signupForm.querySelectorAll('input[type="text"]');
          const username = inputs[0]?.value;
          const password1 = inputs[1]?.value;
          const password2 = inputs[2]?.value;

          if (!username || !password1 || !password2) {
            this.showNotification('Veuillez remplir tous les champs', 'error');
            return;
          }

          if (password1 !== password2) {
            this.showNotification('Les mots de passe ne correspondent pas', 'error');
            return;
          }

          const result = await Auth.signup(username, password1);
          if (!result.success) {
            this.showNotification(result.error, 'error');
          }
        });
      }
    }
  },

  // Afficher une notification
  showNotification(message, type = 'info') {
    // Créer la notification si elle n'existe pas
    let notif = document.getElementById('sosgouv-notification');
    if (!notif) {
      notif = document.createElement('div');
      notif.id = 'sosgouv-notification';
      notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-family: Lato, sans-serif;
        font-weight: bold;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        display: none;
      `;
      document.body.appendChild(notif);
    }

    // Définir le style selon le type
    const colors = {
      success: '#4CAF50',
      error: '#b81515',
      info: '#2196F3',
      warning: '#FF9800'
    };

    notif.style.backgroundColor = colors[type] || colors.info;
    notif.style.color = 'white';
    notif.textContent = message;
    notif.style.display = 'block';

    // Masquer après 3 secondes
    setTimeout(() => {
      notif.style.display = 'none';
    }, 3000);
  }
};

// Initialiser l'UI au chargement
document.addEventListener('DOMContentLoaded', () => {
  UI.init();
});
