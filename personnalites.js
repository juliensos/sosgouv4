// ============================================
// SOSGOUV - Gestion des personnalités
// ============================================

const Personnalites = {
  personnalites: [],
  filtreStatut: null,
  filtreOrdre: 'alpha',

  // Charger toutes les personnalités
  async loadPersonnalites() {
    try {
      let query = supabase
        .from('personnalites')
        .select(`
          *,
          created_by_user:users!personnalites_created_by_fkey(username)
        `);

      // Appliquer le filtre de statut si nécessaire
      if (this.filtreStatut !== null && this.filtreStatut !== 'all') {
        query = query.eq('statut', this.filtreStatut);
      }

      // Ordre
      if (this.filtreOrdre === 'alpha') {
        query = query.order('nom', { ascending: true });
      } else if (this.filtreOrdre === 'profession') {
        query = query.order('metiers', { ascending: true });
      }

      const { data, error } = await query;

      if (error) throw error;

      this.personnalites = data || [];

      // Charger les likes et épingles pour l'utilisateur connecté
      if (Auth.isLoggedIn()) {
        await this.loadUserInteractions();
      }

      this.displayPersonnalites();

    } catch (error) {
      console.error('Erreur chargement personnalités:', error);
      UI.showNotification('Erreur de chargement des personnalités', 'error');
    }
  },

  // Charger les likes et épingles de l'utilisateur
  async loadUserInteractions() {
    try {
      // Likes
      const { data: likes } = await supabase
        .from('personnalites_likes')
        .select('personnalite_id')
        .eq('user_id', Auth.currentUser.id);

      const likedIds = likes ? likes.map(l => l.personnalite_id) : [];

      // Épingles
      const { data: epingles } = await supabase
        .from('personnalites_epingles')
        .select('personnalite_id')
        .eq('user_id', Auth.currentUser.id);

      const epingleIds = epingles ? epingles.map(e => e.personnalite_id) : [];

      // Ajouter les infos aux personnalités
      this.personnalites.forEach(p => {
        p.isLiked = likedIds.includes(p.id);
        p.isEpingle = epingleIds.includes(p.id);
      });

    } catch (error) {
      console.error('Erreur chargement interactions:', error);
    }
  },

  // Afficher les personnalités dans la liste
  displayPersonnalites() {
    const container = document.querySelector('._3-4_sous-menu-content-4 .div-block-290');
    if (!container) return;

    // Grouper par première lettre
    const groupes = {};
    this.personnalites.forEach(p => {
      const lettre = p.nom[0].toUpperCase();
      if (!groupes[lettre]) groupes[lettre] = [];
      groupes[lettre].push(p);
    });

    // Générer le HTML
    let html = '';
    Object.keys(groupes).sort().forEach(lettre => {
      html += `
        <div class="_3-tile-bloc-padd-20-left">
          <h2 class="heading-31">${lettre}</h2>
        </div>
      `;

      groupes[lettre].forEach(perso => {
        const statutIcon = this.getStatutIcon(perso.statut);
        const metiers = Array.isArray(perso.metiers) ? perso.metiers.join(', ') : perso.metiers || '';
        
        html += `
          <div class="_3-grid-perso" data-perso-id="${perso.id}">
            <div class="nom-prenom-metier">
              <a href="#" class="w-inline-block" onclick="Personnalites.showFiche('${perso.id}'); return false;">
                <div class="nom-pr-nom">
                  <h4 class="heading-4-nom-prenom">${perso.nom}</h4>
                  <h4 class="heading-4-nom-prenom">${perso.prenom}</h4>
                </div>
              </a>
              <div class="bloc-metier">
                <h4 class="heading-4-nom-prenom grey">${metiers}</h4>
              </div>
              <div class="fontello-statut ${statutIcon.class}">${statutIcon.code}</div>
            </div>
            <div class="boutons-perso-group">
              <div class="like-bloc" onclick="Personnalites.toggleLike('${perso.id}')">
                <div class="_2-picto-fontello-bouton black-stroke" style="cursor: pointer;">${perso.isLiked ? '' : ''}</div>
                <div class="_w-courant _w-bold _w-pink"><sup id="like-count-${perso.id}">0</sup></div>
              </div>
              <a href="#" class="_2-mini-bouton mini w-inline-block" onclick="Personnalites.toggleEpingle('${perso.id}'); return false;">
                <div class="_2-picto-fontello-bouton"></div>
                <h6 class="heading-dyn mini">${perso.isEpingle ? 'épinglé' : 'épingler'}</h6>
              </a>
              <a href="#" class="_2-mini-bouton mini w-inline-block" onclick="Personnalites.ajouterAuBrouillon('${perso.id}'); return false;">
                <div class="_2-picto-fontello-bouton"></div>
                <h6 class="heading-dyn mini">Brouillon</h6>
              </a>
            </div>
            <p class="short-bio">${perso.bio_courte || ''}</p>
          </div>
        `;
      });
    });

    container.innerHTML = html;

    // Charger les compteurs de likes
    this.loadLikeCounts();
  },

  // Obtenir l'icône de statut
  getStatutIcon(statut) {
    const icons = {
      0: { code: '', class: '' },           // néant
      1: { code: '', class: '_1' },        // jamais
      2: { code: '', class: '_2' },        // sous condition
      3: { code: '', class: '_3' }         // ok
    };
    return icons[statut] || icons[0];
  },

  // Charger les compteurs de likes
  async loadLikeCounts() {
    try {
      const { data, error } = await supabase
        .from('personnalites_likes')
        .select('personnalite_id');

      if (error) throw error;

      // Compter les likes par personnalité
      const counts = {};
      data.forEach(like => {
        counts[like.personnalite_id] = (counts[like.personnalite_id] || 0) + 1;
      });

      // Mettre à jour l'affichage
      Object.keys(counts).forEach(id => {
        const countEl = document.getElementById(`like-count-${id}`);
        if (countEl) countEl.textContent = counts[id];
      });

    } catch (error) {
      console.error('Erreur chargement likes:', error);
    }
  },

  // Liker/unliker une personnalité
  async toggleLike(persoId) {
    if (!Auth.isLoggedIn()) {
      UI.showNotification('Vous devez être connecté pour liker', 'error');
      UI.openModal('connect');
      return;
    }

    try {
      const perso = this.personnalites.find(p => p.id === persoId);
      if (!perso) return;

      if (perso.isLiked) {
        // Supprimer le like
        const { error } = await supabase
          .from('personnalites_likes')
          .delete()
          .eq('user_id', Auth.currentUser.id)
          .eq('personnalite_id', persoId);

        if (error) throw error;
        perso.isLiked = false;
      } else {
        // Ajouter le like
        const { error } = await supabase
          .from('personnalites_likes')
          .insert([{
            user_id: Auth.currentUser.id,
            personnalite_id: persoId
          }]);

        if (error) throw error;
        perso.isLiked = true;
      }

      // Recharger l'affichage
      this.displayPersonnalites();

    } catch (error) {
      console.error('Erreur toggle like:', error);
      UI.showNotification('Erreur lors du like', 'error');
    }
  },

  // Épingler/désépingler une personnalité
  async toggleEpingle(persoId) {
    if (!Auth.isLoggedIn()) {
      UI.showNotification('Vous devez être connecté pour épingler', 'error');
      UI.openModal('connect');
      return;
    }

    try {
      const perso = this.personnalites.find(p => p.id === persoId);
      if (!perso) return;

      if (perso.isEpingle) {
        // Désépingler
        const { error } = await supabase
          .from('personnalites_epingles')
          .delete()
          .eq('user_id', Auth.currentUser.id)
          .eq('personnalite_id', persoId);

        if (error) throw error;
        perso.isEpingle = false;
        UI.showNotification('Personnalité désépinglée', 'success');
      } else {
        // Épingler
        const { error } = await supabase
          .from('personnalites_epingles')
          .insert([{
            user_id: Auth.currentUser.id,
            personnalite_id: persoId
          }]);

        if (error) throw error;
        perso.isEpingle = true;
        UI.showNotification('Personnalité épinglée', 'success');
      }

      // Recharger l'affichage
      this.displayPersonnalites();

    } catch (error) {
      console.error('Erreur toggle épingle:', error);
      UI.showNotification('Erreur lors de l\'épinglage', 'error');
    }
  },

  // Ajouter une nouvelle personnalité
  async ajouterPersonnalite(nom, prenom) {
    if (!Auth.isLoggedIn()) {
      UI.showNotification('Vous devez être connecté', 'error');
      return;
    }

    try {
      // Vérifier les doublons
      const { data: existing } = await supabase
        .from('personnalites')
        .select('id')
        .eq('nom', nom)
        .eq('prenom', prenom)
        .single();

      if (existing) {
        UI.showNotification('Cette personnalité existe déjà', 'error');
        return { success: false };
      }

      // Créer la personnalité
      const { data, error } = await supabase
        .from('personnalites')
        .insert([{
          nom: nom,
          prenom: prenom,
          created_by: Auth.currentUser.id,
          statut: 0 // néant par défaut
        }])
        .select()
        .single();

      if (error) throw error;

      UI.showNotification('Personnalité ajoutée avec succès !', 'success');
      
      // Afficher le message de succès du formulaire
      const successMsg = document.querySelector('._3-3_sous-menu-content-3 ._3-success-message');
      if (successMsg) {
        successMsg.style.display = 'block';
      }

      return { success: true, data };

    } catch (error) {
      console.error('Erreur ajout personnalité:', error);
      UI.showNotification('Erreur lors de l\'ajout', 'error');
      return { success: false, error: error.message };
    }
  },

  // Afficher la fiche d'une personnalité
  async showFiche(persoId) {
    try {
      const { data, error } = await supabase
        .from('personnalites')
        .select(`
          *,
          created_by_user:users!personnalites_created_by_fkey(username)
        `)
        .eq('id', persoId)
        .single();

      if (error) throw error;

      // Remplir le modal fiche personnalité
      const modal = document.querySelector('.bm-parent.fiche-personnalit');
      if (!modal) return;

      // Nom et prénom
      const nomPrenomEls = modal.querySelectorAll('.heading-4-nom-prenom');
      if (nomPrenomEls.length >= 2) {
        nomPrenomEls[0].textContent = data.nom;
        nomPrenomEls[1].textContent = data.prenom;
      }

      // Métier
      const metierEl = modal.querySelector('.heading-4-nom-prenom.grey');
      if (metierEl) {
        const metiers = Array.isArray(data.metiers) ? data.metiers.join(', ') : data.metiers || '';
        metierEl.textContent = metiers;
      }

      // Bio
      const bioEls = modal.querySelectorAll('p');
      if (bioEls.length > 0) {
        bioEls[0].textContent = data.bio_courte || '';
      }

      // Expertise
      if (bioEls.length > 1) {
        bioEls[1].textContent = data.expertise || '';
      }

      // Engagement politique
      if (bioEls.length > 2) {
        bioEls[2].textContent = data.engagement_politique || '';
      }

      // Vidéos (si présentes)
      // TODO: implémenter l'affichage des vidéos

      // Liens (si présents)
      const linksContainer = modal.querySelector('.bloc-links');
      if (linksContainer && data.liens_articles) {
        let linksHTML = '';
        data.liens_articles.forEach(lien => {
          linksHTML += `<a href="${lien}" target="_blank">${lien}</a>`;
        });
        linksContainer.innerHTML = linksHTML;
      }

      // Statut
      const statutIcon = this.getStatutIcon(data.statut);
      const statutEl = modal.querySelector('.fontello-statut');
      if (statutEl) {
        statutEl.className = `fontello-statut ${statutIcon.class}`;
        statutEl.textContent = statutIcon.code;
      }

      // Boutons d'action
      this.setupFicheButtons(modal, persoId);

      // Ouvrir le modal
      modal.style.display = 'block';

    } catch (error) {
      console.error('Erreur affichage fiche:', error);
      UI.showNotification('Erreur lors du chargement de la fiche', 'error');
    }
  },

  // Configuration des boutons de la fiche
  setupFicheButtons(modal, persoId) {
    // Bouton épingler
    const btnEpingle = modal.querySelector('[data-w-id="b2045fae-12b4-ea3f-0bb2-97be9918a779"]');
    if (btnEpingle) {
      btnEpingle.onclick = (e) => {
        e.preventDefault();
        this.toggleEpingle(persoId);
      };
    }

    // Bouton brouillon
    const btnBrouillon = modal.querySelector('[data-w-id="b2045fae-12b4-ea3f-0bb2-97be9918a77e"]');
    if (btnBrouillon) {
      btnBrouillon.onclick = (e) => {
        e.preventDefault();
        this.ajouterAuBrouillon(persoId);
      };
    }

    // Bouton faire suivre
    const btnSuivre = modal.querySelector('[data-w-id="b2045fae-12b4-ea3f-0bb2-97be9918a783"]');
    if (btnSuivre) {
      btnSuivre.onclick = (e) => {
        e.preventDefault();
        this.faireSuivre(persoId);
      };
    }
  },

  // Ajouter au brouillon
  ajouterAuBrouillon(persoId) {
    if (!Auth.isLoggedIn()) {
      UI.showNotification('Vous devez être connecté', 'error');
      UI.openModal('connect');
      return;
    }

    // TODO: Implémenter la logique d'ajout au brouillon
    // Ouvrir le modal de choix de brouillon
    UI.openModal('choix-brouillon');
  },

  // Faire suivre une fiche
  faireSuivre(persoId) {
    // TODO: Implémenter la fonction de partage
    UI.showNotification('Fonctionnalité à venir', 'info');
  },

  // Configuration du formulaire d'ajout de personnalité
  setupAjouterForm() {
    const form = document.querySelector('._3-3_sous-menu-content-3 form');
    if (!form) return;

    const btnAjouter = form.querySelector('[data-w-id="e4dc8c14-6403-205c-27f1-3ed54d54765a"]');
    if (btnAjouter) {
      btnAjouter.addEventListener('click', async (e) => {
        e.preventDefault();

        const inputs = form.querySelectorAll('input');
        const nom = inputs[0]?.value.trim();
        const prenom = inputs[1]?.value.trim();

        if (!nom || !prenom) {
          UI.showNotification('Veuillez remplir tous les champs', 'error');
          return;
        }

        const result = await this.ajouterPersonnalite(nom, prenom);
        
        if (result.success) {
          // Vider les champs
          inputs[0].value = '';
          inputs[1].value = '';
        }
      });
    }

    // Bouton pour ajouter une autre personnalité
    const btnAutre = document.querySelector('._3-3_sous-menu-content-3 ._2-code-link-button-big');
    if (btnAutre) {
      btnAutre.addEventListener('click', (e) => {
        e.preventDefault();
        const successMsg = document.querySelector('._3-3_sous-menu-content-3 ._3-success-message');
        if (successMsg) {
          successMsg.style.display = 'none';
        }
      });
    }
  },

  // Configuration des filtres
  setupFiltres() {
    // Filtre statut
    const selectStatut = document.querySelector('._3-4_sous-menu-content-4 select[id="field-15"]');
    if (selectStatut) {
      selectStatut.addEventListener('change', (e) => {
        const value = e.target.value;
        if (value === '') {
          this.filtreStatut = null;
        } else {
          this.filtreStatut = parseInt(value);
        }
        this.loadPersonnalites();
      });
    }

    // Filtre ordre
    const selectOrdre = document.querySelector('._3-4_sous-menu-content-4 select:first-of-type');
    if (selectOrdre) {
      selectOrdre.addEventListener('change', (e) => {
        this.filtreOrdre = e.target.value === 'First' ? 'profession' : 'alpha';
        this.loadPersonnalites();
      });
    }
  }
};

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
  Personnalites.setupAjouterForm();
  Personnalites.setupFiltres();
});
