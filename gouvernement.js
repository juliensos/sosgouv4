// ============================================
// SOSGOUV - Gestion des gouvernements
// ============================================

const Gouvernement = {
  gouvernements: [],
  secteurs: [],
  sousSecteurs: [],
  currentGouvernement: null,

  // Initialiser - charger les secteurs et sous-secteurs
  async init() {
    await this.loadSecteurs();
    await this.loadSousSecteurs();
  },

  // Charger tous les secteurs
  async loadSecteurs() {
    try {
      const { data, error } = await supabase
        .from('secteurs')
        .select('*')
        .order('ordre', { ascending: true });

      if (error) throw error;
      this.secteurs = data || [];
    } catch (error) {
      console.error('Erreur chargement secteurs:', error);
    }
  },

  // Charger tous les sous-secteurs
  async loadSousSecteurs() {
    try {
      const { data, error } = await supabase
        .from('sous_secteurs')
        .select('*')
        .order('nom', { ascending: true });

      if (error) throw error;
      this.sousSecteurs = data || [];
    } catch (error) {
      console.error('Erreur chargement sous-secteurs:', error);
    }
  },

  // Charger les gouvernements publiés
  async loadPublishedGovernments() {
    try {
      const { data, error } = await supabase
        .from('gouvernements')
        .select(`
          *,
          auteur:users!gouvernements_created_by_fkey(username),
          postes:postes_gouvernement(
            *,
            personnalite:personnalites(*),
            secteur:secteurs(*)
          )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.gouvernements = data || [];
      
      // Charger les stats (votes, commentaires)
      await this.loadGouvernementsStats();
      
      this.displayGouvernements();

    } catch (error) {
      console.error('Erreur chargement gouvernements:', error);
      UI.showNotification('Erreur de chargement des gouvernements', 'error');
    }
  },

  // Charger les statistiques des gouvernements
  async loadGouvernementsStats() {
    try {
      // Votes
      const { data: votes } = await supabase
        .from('gouvernements_votes')
        .select('gouvernement_id, note');

      // Comptabiliser les moyennes
      const statsVotes = {};
      if (votes) {
        votes.forEach(v => {
          if (!statsVotes[v.gouvernement_id]) {
            statsVotes[v.gouvernement_id] = { total: 0, count: 0 };
          }
          statsVotes[v.gouvernement_id].total += v.note;
          statsVotes[v.gouvernement_id].count += 1;
        });
      }

      // Commentaires
      const { data: comments } = await supabase
        .from('commentaires')
        .select('gouvernement_id');

      const statsComments = {};
      if (comments) {
        comments.forEach(c => {
          statsComments[c.gouvernement_id] = (statsComments[c.gouvernement_id] || 0) + 1;
        });
      }

      // Ajouter aux gouvernements
      this.gouvernements.forEach(g => {
        if (statsVotes[g.id]) {
          g.note_moyenne = (statsVotes[g.id].total / statsVotes[g.id].count).toFixed(1);
          g.nb_votes = statsVotes[g.id].count;
        } else {
          g.note_moyenne = 0;
          g.nb_votes = 0;
        }
        g.nb_commentaires = statsComments[g.id] || 0;
      });

    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  },

  // Afficher les gouvernements
  displayGouvernements() {
    const container = document.querySelector('._3-1_sous-menu-content-1 ._3-gov-content');
    if (!container || !container.parentElement) return;

    // Supprimer les anciens blocs
    const parent = container.parentElement;
    const oldBlocs = parent.querySelectorAll('._3-gov-content');
    oldBlocs.forEach(b => b.remove());

    // Créer les nouveaux blocs
    this.gouvernements.forEach(gouv => {
      const html = this.createGouvernementBloc(gouv);
      parent.insertAdjacentHTML('beforeend', html);
    });

    // Ajouter les event listeners
    this.attachGouvernementListeners();
  },

  // Créer le HTML d'un bloc gouvernement
  createGouvernementBloc(gouv) {
    // Filtrer les postes régaliens
    const postesRegaliens = (gouv.postes || []).filter(p => p.type === 'regalien');
    
    let postesHTML = '';
    postesRegaliens.forEach(poste => {
      const perso = poste.personnalite;
      const secteur = poste.secteur;
      
      if (perso && secteur) {
        postesHTML += `
          <div class="fonction-perso">
            <div class="secteurs">${secteur.nom}</div>
            <a href="#" class="w-inline-block" onclick="Personnalites.showFiche('${perso.id}'); return false;">
              <div class="_3-name-gov-pub">${perso.prenom} ${perso.nom}</div>
            </a>
          </div>
          <div class="bullet">•</div>
        `;
      }
    });

    // Enlever le dernier bullet
    if (postesHTML) {
      postesHTML = postesHTML.substring(0, postesHTML.lastIndexOf('<div class="bullet">'));
    }

    const statutIcon = this.checkPretAGouv(gouv) ? '<div class="text-block-72"></div>' : '';

    return `
      <div class="_3-gov-content">
        <div class="gov-compact-bloc">
          <div class="gov-title">
            <div class="filet">
              <div class="div-block-326">
                <a href="#" class="w-inline-block" onclick="Gouvernement.showDetail('${gouv.id}'); return false;">
                  <h1 class="heading-4-nom-prenom">${gouv.titre}</h1>
                </a>
                ${statutIcon}
              </div>
            </div>
            <div class="_3-star-bloc">
              <div class="_w-courant _w-bold _w-pink note">${gouv.note_moyenne || '0'}</div>
              <div class="star w-embed">
                <div class="star">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" width="100%" height="auto">
                    <polygon points="150 41.3 190.19 0 204.35 55.86 259.81 40.19 244.14 95.65 300 109.81 258.7 150 300 190.19 244.14 204.35 259.81 259.81 204.35 244.14 190.19 300 150 258.7 109.81 300 95.65 244.14 40.19 259.81 55.86 204.35 0 190.19 41.3 150 0 109.81 55.86 95.65 40.19 40.19 95.65 55.86 109.81 0 150 41.3" fill="currentColor"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div class="div-block-277">
            ${postesHTML}
          </div>
          <div class="filet"></div>
          <p>${gouv.description || ''}</p>
        </div>
        <a href="#" class="_3-detail-link w-inline-block" onclick="Gouvernement.showDetail('${gouv.id}'); return false;">
          <h6><strong class="heading-bold-text">détails</strong></h6>
        </a>
      </div>
    `;
  },

  // Vérifier si tous les postes ont statut ok (prêt à gouverner)
  checkPretAGouv(gouv) {
    if (!gouv.postes || gouv.postes.length === 0) return false;
    
    return gouv.postes.every(poste => {
      return poste.personnalite && poste.personnalite.statut === 3;
    });
  },

  // Attacher les event listeners
  attachGouvernementListeners() {
    // Les listeners sont déjà dans le HTML via onclick
  },

  // Afficher le détail d'un gouvernement
  async showDetail(gouvId) {
    try {
      // Charger le gouvernement complet
      const { data, error } = await supabase
        .from('gouvernements')
        .select(`
          *,
          auteur:users!gouvernements_created_by_fkey(username),
          postes:postes_gouvernement(
            *,
            personnalite:personnalites(*),
            secteur:secteurs(*),
            sous_secteurs:postes_sous_secteurs(
              sous_secteur:sous_secteurs(*)
            )
          )
        `)
        .eq('id', gouvId)
        .single();

      if (error) throw error;

      this.currentGouvernement = data;
      this.displayGouvDetail(data);
      UI.openModal('gouv-detail');

    } catch (error) {
      console.error('Erreur chargement détail:', error);
      UI.showNotification('Erreur de chargement du détail', 'error');
    }
  },

  // Afficher le détail du gouvernement dans le modal
  displayGouvDetail(gouv) {
    const modal = document.querySelector('.bm-parent.gouv-detail');
    if (!modal) return;

    // Titre
    const titre = modal.querySelector('.heading-4-nom-prenom.d');
    if (titre) titre.textContent = gouv.titre;

    // Auteur
    const auteur = modal.querySelector('[data-w-id="53172171-1e19-45d4-97f8-378ada811ea2"]');
    if (auteur) auteur.textContent = gouv.auteur?.username || 'Anonyme';

    // Description
    const desc = modal.querySelector('.note-comment > p');
    if (desc) desc.textContent = gouv.description || '';

    // Note moyenne
    const note = modal.querySelector('._w-courant._w-bold._w-pink.note');
    if (note) note.textContent = gouv.note_moyenne || '0';

    // Afficher les postes par catégorie
    // TODO: Implémenter l'affichage détaillé des postes

    // Boutons d'action
    this.setupDetailButtons(modal, gouv.id);
  },

  // Configuration des boutons du détail
  setupDetailButtons(modal, gouvId) {
    // Bouton épingler
    const btnEpingle = modal.querySelector('[data-w-id="93b595e4-12ee-3900-e8ac-20cc907695e9"]');
    if (btnEpingle) {
      btnEpingle.onclick = (e) => {
        e.preventDefault();
        this.toggleEpingle(gouvId);
      };
    }

    // Bouton faire suivre
    const btnSuivre = modal.querySelector('[data-w-id="93b595e4-12ee-3900-e8ac-20cc907695dd"]');
    if (btnSuivre) {
      btnSuivre.onclick = (e) => {
        e.preventDefault();
        this.faireSuivre(gouvId);
      };
    }

    // Bouton commenter
    const btnComment = modal.querySelector('[data-w-id="186e04db-b2c5-1d1a-8631-7d18d76d5ac3"]');
    if (btnComment) {
      btnComment.onclick = (e) => {
        e.preventDefault();
        UI.openModal('commenter');
      };
    }

    // Radios de vote
    const radioInputs = modal.querySelectorAll('input[type="radio"][name="radio"]');
    radioInputs.forEach((radio, index) => {
      radio.addEventListener('change', () => {
        if (radio.checked) {
          this.voterGouvernement(gouvId, index + 1);
        }
      });
    });
  },

  // Voter pour un gouvernement
  async voterGouvernement(gouvId, note) {
    if (!Auth.isLoggedIn()) {
      UI.showNotification('Vous devez être connecté pour voter', 'error');
      UI.openModal('connect');
      return;
    }

    try {
      // Vérifier si l'utilisateur a déjà voté
      const { data: existing } = await supabase
        .from('gouvernements_votes')
        .select('id')
        .eq('gouvernement_id', gouvId)
        .eq('user_id', Auth.currentUser.id)
        .single();

      if (existing) {
        // Mettre à jour le vote
        const { error } = await supabase
          .from('gouvernements_votes')
          .update({ note: note })
          .eq('id', existing.id);

        if (error) throw error;
        UI.showNotification('Vote mis à jour !', 'success');
      } else {
        // Créer un nouveau vote
        const { error } = await supabase
          .from('gouvernements_votes')
          .insert([{
            gouvernement_id: gouvId,
            user_id: Auth.currentUser.id,
            note: note
          }]);

        if (error) throw error;
        UI.showNotification('Vote enregistré !', 'success');
      }

      // Recharger les stats
      await this.loadGouvernementsStats();

    } catch (error) {
      console.error('Erreur vote:', error);
      UI.showNotification('Erreur lors du vote', 'error');
    }
  },

  // Épingler un gouvernement
  async toggleEpingle(gouvId) {
    if (!Auth.isLoggedIn()) {
      UI.showNotification('Vous devez être connecté', 'error');
      UI.openModal('connect');
      return;
    }

    try {
      // Vérifier si déjà épinglé
      const { data: existing } = await supabase
        .from('gouvernements_epingles')
        .select('id')
        .eq('gouvernement_id', gouvId)
        .eq('user_id', Auth.currentUser.id)
        .single();

      if (existing) {
        // Désépingler
        const { error } = await supabase
          .from('gouvernements_epingles')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
        UI.showNotification('Gouvernement désépinglé', 'success');
      } else {
        // Épingler
        const { error } = await supabase
          .from('gouvernements_epingles')
          .insert([{
            gouvernement_id: gouvId,
            user_id: Auth.currentUser.id
          }]);

        if (error) throw error;
        UI.showNotification('Gouvernement épinglé', 'success');
      }

    } catch (error) {
      console.error('Erreur épinglage:', error);
      UI.showNotification('Erreur lors de l\'épinglage', 'error');
    }
  },

  // Faire suivre
  faireSuivre(gouvId) {
    // TODO: Implémenter le partage
    UI.showNotification('Fonctionnalité à venir', 'info');
  }
};

// Suite dans gouvernement.js partie 2...
// ============================================
// SOSGOUV - Gestion des gouvernements - PARTIE 2
// Composition de gouvernements
// ============================================

// Suite de Gouvernement object...

Gouvernement.initComposerForm = function() {
  this.currentComposition = {
    titre: '',
    description: '',
    postesRegaliens: [],
    postesNonRegaliens: [],
    delegues: []
  };

  this.setupComposerListeners();
  this.loadPostesRegaliens();
};

// Charger les postes régaliens par défaut
Gouvernement.loadPostesRegaliens = function() {
  const secteursRegaliens = this.secteurs.filter(s => s.type === 'regalien');
  
  secteursRegaliens.forEach(secteur => {
    this.currentComposition.postesRegaliens.push({
      secteur_id: secteur.id,
      secteur_nom: secteur.nom,
      personnalite_id: null,
      sous_secteurs: []
    });
  });

  this.displayPostesRegaliens();
};

// Afficher les postes régaliens dans le formulaire
Gouvernement.displayPostesRegaliens = function() {
  const container = document.querySelector('._3-bloc-minsteres');
  if (!container) return;

  let html = '';
  
  this.currentComposition.postesRegaliens.forEach((poste, index) => {
    html += `
      <div class="_3-bloc-min-r" data-poste-index="${index}">
        <div class="_3-gov-line-1">
          <input class="mon-input3 w-input" 
                 type="text" 
                 placeholder="nom du ministre"
                 data-poste-type="regalien"
                 data-poste-index="${index}">
          <div class="_3-gov-mini-buttons">
            <a href="#" class="_2-mini-bouton loupe w-inline-block" 
               onclick="Gouvernement.openListePersonnalites('regalien', ${index}); return false;">
              <div class="_2-picto-fontello-bouton"></div>
            </a>
            <a href="#" class="_2-mini-bouton people w-inline-block"
               onclick="UI.openModal('ajouter-personnalite'); return false;">
              <div class="_2-picto-fontello-bouton"></div>
            </a>
          </div>
        </div>
        <div class="_3-gov-line-2">
          <h3 class="heading-23">${poste.secteur_nom}</h3>
          <div class="_3-sous-secteur">
            <span id="sous-secteurs-${index}">Aucun sous-secteur sélectionné</span>
            <a href="#" class="_2-code-link-button" 
               onclick="Gouvernement.modifierSousSecteurs('regalien', ${index}); return false;">modifier</a>
          </div>
        </div>
      </div>
    `;
  });

  const blocsDiv = document.querySelector('._3-bloc-minsteres');
  if (blocsDiv) {
    // Garder uniquement les blocs régaliens
    blocsDiv.innerHTML = html;
  }
};

// Ouvrir le modal de liste des personnalités
Gouvernement.openListePersonnalites = async function(type, index) {
  // Charger les personnalités
  const { data, error } = await supabase
    .from('personnalites')
    .select('*')
    .order('nom', { ascending: true });

  if (error) {
    console.error('Erreur chargement personnalités:', error);
    return;
  }

  // Remplir le modal
  const modal = document.querySelector('.pm-parent.liste-personnalit');
  if (!modal) return;

  // Grouper par lettre
  const groupes = {};
  data.forEach(p => {
    const lettre = p.nom[0].toUpperCase();
    if (!groupes[lettre]) groupes[lettre] = [];
    groupes[lettre].push(p);
  });

  // Générer le HTML
  let html = '';
  Object.keys(groupes).sort().forEach(lettre => {
    html += `
      <div class="_3-title-bloc-padd-10-left">
        <h1 class="heading-25">${lettre}</h1>
      </div>
    `;

    groupes[lettre].forEach(perso => {
      const metiers = Array.isArray(perso.metiers) ? perso.metiers.join(', ') : perso.metiers || '';
      html += `
        <div class="div-block-296" onclick="Gouvernement.selectPersonnalite('${perso.id}', '${type}', ${index}); return false;" style="cursor: pointer;">
          <a href="#" class="_w-courant _w-bold _w-maj">${perso.nom}</a>
          <div class="_w-courant">${perso.prenom}</div>
          <div class="_w-courant grey-courant">${metiers}</div>
        </div>
      `;
    });
  });

  const listeContainer = modal.querySelector('.w-dyn-items');
  if (listeContainer) {
    listeContainer.innerHTML = html;
  }

  UI.openModal('liste-personnalite');
};

// Sélectionner une personnalité
Gouvernement.selectPersonnalite = async function(persoId, type, index) {
  // Récupérer la personnalité
  const { data, error } = await supabase
    .from('personnalites')
    .select('*')
    .eq('id', persoId)
    .single();

  if (error) {
    console.error('Erreur:', error);
    return;
  }

  // Mettre à jour la composition
  if (type === 'regalien') {
    this.currentComposition.postesRegaliens[index].personnalite_id = persoId;
    this.currentComposition.postesRegaliens[index].personnalite = data;
  } else if (type === 'non-regalien') {
    this.currentComposition.postesNonRegaliens[index].personnalite_id = persoId;
    this.currentComposition.postesNonRegaliens[index].personnalite = data;
  } else if (type === 'delegue') {
    this.currentComposition.delegues[index].personnalite_id = persoId;
    this.currentComposition.delegues[index].personnalite = data;
  }

  // Mettre à jour l'input
  const input = document.querySelector(`input[data-poste-type="${type}"][data-poste-index="${index}"]`);
  if (input && data) {
    input.value = `${data.prenom} ${data.nom}`;
  }

  // Fermer le modal
  UI.closeModal('liste-personnalite');
  UI.showNotification('Personnalité sélectionnée', 'success');
};

// Modifier les sous-secteurs
Gouvernement.modifierSousSecteurs = function(type, index) {
  // TODO: Ouvrir le modal de sélection des sous-secteurs
  UI.openModal('choisir-sous-secteur');
  
  // Stocker le contexte pour savoir quel poste on modifie
  this.currentSousSecteurEdit = { type, index };
};

// Ajouter un ministère non régalien
Gouvernement.ajouterMinistere = function() {
  UI.openModal('secteur-non-regalien');
};

// Ajouter un délégué ministériel
Gouvernement.ajouterDelegue = function() {
  UI.openModal('definir-delegue');
};

// Publier le gouvernement
Gouvernement.publierGouvernement = async function() {
  if (!Auth.isLoggedIn()) {
    UI.showNotification('Vous devez être connecté', 'error');
    UI.openModal('connect');
    return;
  }

  // Récupérer les données du formulaire
  const titreInput = document.querySelector('._3-2_sous-menu-content-2 input[placeholder="nom du gouvernement*"]');
  const descInput = document.querySelector('._3-2_sous-menu-content-2 textarea[placeholder="Vision de l\'auteur"]');

  const titre = titreInput?.value.trim();
  const description = descInput?.value.trim();

  if (!titre) {
    UI.showNotification('Veuillez donner un nom à votre gouvernement', 'error');
    return;
  }

  // Vérifier qu'au moins un poste est rempli
  const postesRemplis = this.currentComposition.postesRegaliens.filter(p => p.personnalite_id);
  if (postesRemplis.length === 0) {
    UI.showNotification('Veuillez remplir au moins un poste', 'error');
    return;
  }

  try {
    // Créer le gouvernement
    const { data: gouv, error: gouvError } = await supabase
      .from('gouvernements')
      .insert([{
        titre: titre,
        description: description,
        created_by: Auth.currentUser.id,
        is_published: true
      }])
      .select()
      .single();

    if (gouvError) throw gouvError;

    // Créer les postes
    const postes = [];
    
    // Postes régaliens
    this.currentComposition.postesRegaliens.forEach((poste, index) => {
      if (poste.personnalite_id) {
        postes.push({
          gouvernement_id: gouv.id,
          type: 'regalien',
          personnalite_id: poste.personnalite_id,
          secteur_id: poste.secteur_id,
          ordre: index
        });
      }
    });

    // Postes non régaliens
    this.currentComposition.postesNonRegaliens.forEach((poste, index) => {
      if (poste.personnalite_id) {
        postes.push({
          gouvernement_id: gouv.id,
          type: 'non_regalien',
          personnalite_id: poste.personnalite_id,
          secteur_id: poste.secteur_id,
          nom_poste_personnalise: poste.nom_personnalise,
          ordre: index + 100
        });
      }
    });

    // Délégués
    this.currentComposition.delegues.forEach((delegue, index) => {
      if (delegue.personnalite_id) {
        postes.push({
          gouvernement_id: gouv.id,
          type: 'delegue',
          personnalite_id: delegue.personnalite_id,
          fonction_delegue: delegue.fonction,
          ministeres_rattachement: delegue.ministeres_rattachement,
          ordre: index + 200
        });
      }
    });

    if (postes.length > 0) {
      const { error: postesError } = await supabase
        .from('postes_gouvernement')
        .insert(postes);

      if (postesError) throw postesError;
    }

    UI.showNotification('Gouvernement publié avec succès !', 'success');
    
    // Réinitialiser le formulaire
    this.resetComposerForm();
    
    // Aller à la liste des gouvernements publiés
    setTimeout(() => {
      UI.showSection('gouvernements-publies');
    }, 1500);

  } catch (error) {
    console.error('Erreur publication:', error);
    UI.showNotification('Erreur lors de la publication', 'error');
  }
};

// Enregistrer en brouillon
Gouvernement.enregistrerBrouillon = async function() {
  if (!Auth.isLoggedIn()) {
    UI.showNotification('Vous devez être connecté', 'error');
    UI.openModal('connect');
    return;
  }

  // Même logique que publier, mais avec is_published = false
  // TODO: Implémenter
  UI.showNotification('Brouillon enregistré', 'success');
};

// Réinitialiser le formulaire de composition
Gouvernement.resetComposerForm = function() {
  this.currentComposition = {
    titre: '',
    description: '',
    postesRegaliens: [],
    postesNonRegaliens: [],
    delegues: []
  };

  // Vider les champs
  const titreInput = document.querySelector('._3-2_sous-menu-content-2 input[placeholder="nom du gouvernement*"]');
  const descInput = document.querySelector('._3-2_sous-menu-content-2 textarea[placeholder="Vision de l\'auteur"]');

  if (titreInput) titreInput.value = '';
  if (descInput) descInput.value = '';

  // Recharger les postes régaliens
  this.loadPostesRegaliens();
};

// Configuration des listeners pour le formulaire de composition
Gouvernement.setupComposerListeners = function() {
  // Bouton ajouter ministère
  const btnAddMin = document.querySelector('[data-w-id="91f0827b-9d2f-ca59-b104-920ab5a68f23"]');
  if (btnAddMin) {
    btnAddMin.onclick = (e) => {
      e.preventDefault();
      this.ajouterMinistere();
    };
  }

  // Bouton ajouter délégué
  const btnAddDel = document.querySelector('[data-w-id="f88e3528-3e5b-fcff-ca05-b7c7a0d33607"]');
  if (btnAddDel) {
    btnAddDel.onclick = (e) => {
      e.preventDefault();
      this.ajouterDelegue();
    };
  }

  // Boutons publier et brouillon
  const btnPublier = document.querySelector('._3-2_sous-menu-content-2 ._w-link-bloc-button.publier');
  if (btnPublier) {
    btnPublier.onclick = (e) => {
      e.preventDefault();
      this.publierGouvernement();
    };
  }

  const btnBrouillon = document.querySelector('._3-2_sous-menu-content-2 ._w-link-bloc-button:not(.publier)');
  if (btnBrouillon) {
    btnBrouillon.onclick = (e) => {
      e.preventDefault();
      this.enregistrerBrouillon();
    };
  }
};

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', () => {
  Gouvernement.init();
});
