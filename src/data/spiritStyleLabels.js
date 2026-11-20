// ============================================================
// Noms des styles des Spiritueux — copiés fidèlement depuis la liste de départ de la plateforme de gestion (dépôt
// Bibamus-Management, src/data/spiritStyles.js : SPIRIT_STYLE_GROUPS_BY_SUBTYPE, 13 sous-catégories, 128 styles).
//
// FICHIER GÉNÉRÉ — ne pas le modifier à la main : node scripts/generate-spirit-style-labels.mjs
// (sans option pour le réécrire, avec --check pour vérifier qu'il est à jour).
//
// Un tableau de groupes par sous-catégorie (beverageSubtype), comme dans la gestion. Utilisé uniquement pour AFFICHER les
// styles déjà choisis (fiche produit, carte BibaPulse, filtre de la liste des produits) : la sélection se fait côté gestion.
// Les styles de spiritueux n'ont pas de table en base (contrairement aux bières et aux softs) : un style ajouté, renommé ou supprimé
// dans le code de la gestion se reporte ici avec le script ci-dessus.
// ============================================================

export const SPIRIT_STYLE_GROUPS_BY_SUBTYPE = {
  whisky: [
    {
      title: "Style",
      tags: [
        { code: "single_malt", fr: "Single Malt" },
        { code: "single_grain", fr: "Single Grain" },
        { code: "blended_malt", fr: "Blended Malt" },
        { code: "blended_grain", fr: "Blended Grain" },
        { code: "blended_whisky", fr: "Blended Whisky" },
        { code: "bourbon", fr: "Bourbon" },
        { code: "rye_whiskey", fr: "Rye Whiskey" },
        { code: "wheat_whiskey", fr: "Wheat Whiskey" },
        { code: "corn_whiskey", fr: "Corn Whiskey" },
        { code: "tennessee_whiskey", fr: "Tennessee Whiskey" },
        { code: "pot_still_whiskey", fr: "Pot Still Whiskey" },
        { code: "moonshine_new_make_white_whiskey", fr: "Moonshine / New Make / White Whiskey" },
        { code: "autre_whisky_whiskey", fr: "Autre Whisky / Whiskey" },
      ],
    },
  ],

  rhum: [
    {
      title: "Style",
      tags: [
        { code: "rhum_agricole", fr: "Rhum agricole" },
        { code: "rhum_traditionnel_de_melasse", fr: "Rhum traditionnel / de mélasse" },
        { code: "rhum_de_pur_jus_de_canne", fr: "Rhum de pur jus de canne" },
        { code: "rhum_blanc", fr: "Rhum blanc" },
        { code: "rhum_ambre", fr: "Rhum ambré" },
        { code: "rhum_eleve_sous_bois", fr: "Rhum élevé sous bois" },
        { code: "rhum_vieux", fr: "Rhum vieux" },
        { code: "rhum_tres_vieux", fr: "Rhum très vieux" },
        { code: "rhum_overproof", fr: "Rhum overproof" },
        { code: "navy_rum", fr: "Navy Rum" },
        { code: "rhum_arrange", fr: "Rhum arrangé" },
        { code: "spiced", fr: "Spiced" },
      ],
    },
  ],

  gin_genievre: [
    {
      title: "Gin",
      tags: [
        { code: "gin", fr: "Gin" },
        { code: "distilled_gin", fr: "Distilled Gin" },
        { code: "london_gin_london_dry_gin", fr: "London Gin / London Dry Gin" },
        { code: "old_tom_gin", fr: "Old Tom Gin" },
        { code: "navy_strength_gin", fr: "Navy Strength Gin" },
        { code: "contemporary_new_western_gin", fr: "Contemporary / New Western Gin" },
        { code: "compound_gin", fr: "Compound Gin" },
        { code: "sloe_gin", fr: "Sloe Gin" },
      ],
    },
    {
      title: "Genever / Jenever",
      tags: [
        { code: "genever_jenever", fr: "Genever / Jenever" },
        { code: "jonge_jenever", fr: "Jonge Jenever" },
        { code: "oude_jenever", fr: "Oude Jenever" },
        { code: "graanjenever", fr: "Graanjenever" },
        { code: "korenwijn", fr: "Korenwijn" },
        { code: "genievre_aromatise", fr: "Genièvre aromatisé" },
      ],
    },
  ],

  vodka: [
    {
      title: "Style",
      tags: [
        { code: "vodka", fr: "Vodka" },
        { code: "vodka_aromatisee", fr: "Vodka aromatisée" },
        { code: "vodka_vieillie", fr: "Vodka vieillie" },
      ],
    },
  ],

  agave: [
    {
      title: "Style",
      tags: [
        { code: "tequila", fr: "Tequila" },
        { code: "mezcal", fr: "Mezcal" },
        { code: "raicilla", fr: "Raicilla" },
        { code: "bacanora", fr: "Bacanora" },
        { code: "autre_spiritueux_d_agave", fr: "Autre spiritueux d'agave" },
      ],
    },
  ],

  brandy_eaux_de_vie_de_vin: [
    {
      title: "Style",
      tags: [
        { code: "brandy", fr: "Brandy" },
        { code: "cognac", fr: "Cognac" },
        { code: "armagnac", fr: "Armagnac" },
        { code: "pisco", fr: "Pisco" },
        { code: "brandy_de_jerez", fr: "Brandy de Jerez" },
        { code: "weinbrand", fr: "Weinbrand" },
        { code: "eau_de_vie_de_vin", fr: "Eau-de-vie de vin" },
        { code: "autre_eau_de_vie_de_vin", fr: "Autre eau-de-vie de vin" },
      ],
    },
  ],

  eaux_de_vie_de_fruits: [
    {
      title: "Style",
      tags: [
        { code: "eau_de_vie_de_pomme", fr: "Eau-de-vie de pomme" },
        { code: "eau_de_vie_de_poire", fr: "Eau-de-vie de poire" },
        { code: "eau_de_vie_de_cerise_kirsch", fr: "Eau-de-vie de cerise / Kirsch" },
        { code: "eau_de_vie_de_prune", fr: "Eau-de-vie de prune" },
        { code: "eau_de_vie_de_mirabelle", fr: "Eau-de-vie de mirabelle" },
        { code: "eau_de_vie_de_framboise", fr: "Eau-de-vie de framboise" },
        { code: "eau_de_vie_d_abricot", fr: "Eau-de-vie d'abricot" },
        { code: "eau_de_vie_de_peche", fr: "Eau-de-vie de pêche" },
        { code: "eau_de_vie_de_coing", fr: "Eau-de-vie de coing" },
        { code: "eau_de_vie_de_baies", fr: "Eau-de-vie de baies" },
        { code: "calvados", fr: "Calvados" },
        { code: "slivovitz_slivovica", fr: "Slivovitz / Slivovica" },
        { code: "obstler", fr: "Obstler" },
        { code: "autre_eau_de_vie_de_fruits", fr: "Autre eau-de-vie de fruits" },
      ],
    },
  ],

  eaux_de_vie_de_marc: [
    {
      title: "Style",
      tags: [
        { code: "grappa", fr: "Grappa" },
        { code: "marc", fr: "Marc" },
        { code: "orujo", fr: "Orujo" },
        { code: "tsipouro", fr: "Tsipouro" },
        { code: "tsikoudia_raki_cretois", fr: "Tsikoudia / Raki crétois" },
        { code: "bagaceira", fr: "Bagaceira" },
        { code: "autre_eau_de_vie_de_marc", fr: "Autre eau-de-vie de marc" },
      ],
    },
  ],

  liqueurs_cremes: [
    {
      title: "Style",
      tags: [
        { code: "liqueur_de_fruits", fr: "Liqueur de fruits" },
        { code: "liqueur_d_agrumes", fr: "Liqueur d'agrumes" },
        { code: "liqueur_de_plantes_herbes", fr: "Liqueur de plantes / herbes" },
        { code: "liqueur_d_epices", fr: "Liqueur d'épices" },
        { code: "liqueur_de_fleurs", fr: "Liqueur de fleurs" },
        { code: "liqueur_de_noix_fruits_a_coque", fr: "Liqueur de noix / fruits à coque" },
        { code: "liqueur_de_cafe", fr: "Liqueur de café" },
        { code: "liqueur_de_cacao_chocolat", fr: "Liqueur de cacao / chocolat" },
        { code: "liqueur_de_miel", fr: "Liqueur de miel" },
        { code: "liqueur_de_whisky", fr: "Liqueur de whisky" },
        { code: "liqueur_de_rhum", fr: "Liqueur de rhum" },
        { code: "liqueur_de_brandy_cognac", fr: "Liqueur de brandy / cognac" },
        { code: "liqueur_de_creme", fr: "Liqueur de crème" },
        { code: "creme_de_fruits", fr: "Crème de fruits" },
        { code: "creme_de_plantes", fr: "Crème de plantes" },
        { code: "creme_de_noix_fruits_a_coque", fr: "Crème de noix / fruits à coque" },
        { code: "advocaat_liqueur_aux_oeufs", fr: "Advocaat / liqueur aux œufs" },
        { code: "autre_liqueur", fr: "Autre liqueur" },
      ],
    },
  ],

  anises: [
    {
      title: "Style",
      tags: [
        { code: "anis", fr: "Anis" },
        { code: "pastis", fr: "Pastis" },
        { code: "pastis_de_marseille", fr: "Pastis de Marseille" },
        { code: "absinthe", fr: "Absinthe" },
        { code: "ouzo", fr: "Ouzo" },
        { code: "sambuca", fr: "Sambuca" },
        { code: "raki", fr: "Rakı" },
        { code: "arak", fr: "Arak" },
        { code: "mastika", fr: "Mastika" },
        { code: "anis_anisette", fr: "Anís / Anisette" },
        { code: "autre_spiritueux_anise", fr: "Autre spiritueux anisé" },
      ],
    },
  ],

  amers_bitters_amaros: [
    {
      title: "Style",
      tags: [
        { code: "amaro", fr: "Amaro" },
        { code: "fernet", fr: "Fernet" },
        { code: "bitter", fr: "Bitter" },
        { code: "krauterlikor_liqueur_aux_herbes", fr: "Kräuterlikör / liqueur aux herbes" },
        { code: "amer_aperitif", fr: "Amer apéritif" },
        { code: "amer_digestif", fr: "Amer digestif" },
        { code: "autre_amer", fr: "Autre amer" },
      ],
    },
  ],

  spiritueux_de_canne: [
    {
      title: "Style",
      tags: [
        { code: "cachaca", fr: "Cachaça" },
        { code: "aguardiente_de_canne", fr: "Aguardiente de canne" },
        { code: "clairin", fr: "Clairin" },
        { code: "charanda", fr: "Charanda" },
        { code: "autre_spiritueux_de_canne", fr: "Autre spiritueux de canne" },
      ],
    },
  ],

  autres_spiritueux: [
    {
      title: "Style",
      tags: [
        { code: "aquavit_akvavit", fr: "Aquavit / Akvavit" },
        { code: "korn", fr: "Korn" },
        { code: "shochu", fr: "Shochu" },
        { code: "soju", fr: "Soju" },
        { code: "baijiu", fr: "Baijiu" },
        { code: "arrack", fr: "Arrack" },
        { code: "aguardiente", fr: "Aguardiente" },
        { code: "spiritueux_de_cereales", fr: "Spiritueux de céréales" },
        { code: "spiritueux_de_miel", fr: "Spiritueux de miel" },
        { code: "spiritueux_de_plantes", fr: "Spiritueux de plantes" },
        { code: "autre_spiritueux", fr: "Autre spiritueux" },
      ],
    },
  ],
};
