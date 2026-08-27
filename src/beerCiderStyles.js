// Liste complète des styles de bière et de cidre, retranscrite depuis le document de
// référence. Organisée en groupes, affichés un par un en accordéon pour ne pas surcharger la
// vue — chaque style reste un tag sélectionnable indépendamment (plusieurs tags cumulables).

export const BEER_STYLE_GROUPS = [
  {
    title: "Lagers, Pils & fermentation basse",
    tags: [
      "Pils / Pilsner", "Czech Pale Lager", "Czech Premium Pale Lager", "Czech Amber Lager", "Czech Dark Lager", "German Pils",
      "Helles", "Dortmunder / Export", "International Pale Lager", "American Lager", "Light Lager", "Mexican Lager",
      "Rice Lager", "Vienna Lager", "Märzen", "Oktoberfest / Festbier", "Kellerbier", "Zwickelbier",
      "Dunkel", "Schwarzbier", "Rauchbier Lager", "Bock", "Helles Bock / Maibock", "Doppelbock",
      "Eisbock", "India Pale Lager (IPL)", "Cold IPA", "Baltic Porter",
    ],
  },
  {
    title: "Pale Ale, Blonde, Golden & Amber",
    tags: [
      "Blonde Ale", "Golden Ale", "American Blonde Ale", "English Golden Ale", "Belgian Blonde Ale", "Pale Ale",
      "English Pale Ale", "American Pale Ale", "Belgian Pale Ale", "Australian Pale Ale", "Extra Pale Ale (XPA)", "Strong Pale Ale",
      "Amber Ale", "American Amber Ale", "Red Ale", "Irish Red Ale", "Belgian Amber Ale", "Spéciale Belge",
      "California Common / Steam Beer", "Cream Ale", "Kölsch", "Altbier",
    ],
  },
  {
    title: "IPA & dérivés",
    tags: [
      "IPA", "English IPA", "American IPA", "West Coast IPA", "East Coast IPA", "New England IPA (NEIPA)",
      "Hazy IPA", "Session IPA", "Double IPA (DIPA)", "Imperial IPA", "Triple IPA (TIPA)", "Black IPA / Cascadian Dark Ale",
      "White IPA", "Red IPA", "Belgian IPA", "Brut IPA", "Cold IPA", "Milkshake IPA",
      "Sour IPA", "Fruit IPA", "Rye IPA", "New Zealand IPA", "Pacific IPA", "Mountain IPA",
      "Fresh Hop IPA / Wet Hop IPA", "DDH IPA (Double Dry Hopped)", "TDH IPA (Triple Dry Hopped)",
    ],
  },
  {
    title: "Belges, abbaye & Farmhouse",
    tags: [
      "Belgian Single / Patersbier", "Dubbel", "Tripel", "Quadrupel", "Belgian Golden Strong Ale", "Belgian Dark Strong Ale",
      "Belgian Strong Ale", "Belgian Blonde Ale", "Belgian Pale Ale", "Belgian Amber Ale", "Saison", "Farmhouse Ale",
      "Grisette", "Bière de Garde", "Bière de Mars", "Witbier / Blanche belge", "Abbey Ale / Bière d'abbaye", "Trappist",
      "Spéciale Belge", "Champagne Beer / Bière Brut",
    ],
  },
  {
    title: "Blé, seigle & céréales",
    tags: [
      "Wheat Beer / Bière de blé", "Hefeweizen", "Weissbier", "Dunkelweizen", "Kristallweizen", "Weizenbock",
      "American Wheat Ale", "Wheatwine", "Roggenbier / Rye Beer", "Rye Ale", "Corn Beer", "Spelt Beer / Bière d'épeautre",
      "Oat Ale", "Rice Beer",
    ],
  },
  {
    title: "Stout, Porter & bières noires",
    tags: [
      "Stout", "Dry Stout / Irish Stout", "Sweet Stout", "Milk Stout", "Oatmeal Stout", "Foreign Extra Stout",
      "Export Stout", "American Stout", "Imperial Stout", "Russian Imperial Stout", "Pastry Stout", "Coffee Stout",
      "Chocolate Stout", "Oyster Stout", "Tropical Stout", "Porter", "English Porter", "Brown Porter",
      "Robust Porter", "American Porter", "Baltic Porter", "Smoked Porter",
    ],
  },
  {
    title: "Maltées, fortes & tradition britannique",
    tags: [
      "Brown Ale", "English Brown Ale", "American Brown Ale", "Mild Ale", "Dark Mild", "Scottish Light",
      "Scottish Heavy", "Scottish Export", "Scotch Ale", "Wee Heavy", "Old Ale", "Strong Ale",
      "English Strong Ale", "Barley Wine", "English Barley Wine", "American Barley Wine", "Stock Ale", "Winter Warmer",
    ],
  },
  {
    title: "Sour, Lambic & fermentation sauvage",
    tags: [
      "Sour Ale", "Berliner Weisse", "Gose", "Lambic", "Gueuze", "Kriek",
      "Fruit Lambic", "Faro", "Oud Bruin", "Flanders Red Ale", "American Wild Ale", "Wild Ale",
      "Mixed Fermentation", "Spontaneous Fermentation", "Brett Ale", "Fruited Sour", "Kettle Sour", "Catharina Sour",
      "Pastry Sour", "Smoothie Sour", "Sour IPA", "Sour Stout", "Lichtenhainer",
    ],
  },
  {
    title: "Fruitées, épicées & ingrédients spéciaux",
    tags: [
      "Fruit Beer / Bière fruitée", "Herb Beer / Bière aux herbes", "Spiced Beer / Bière épicée", "Pumpkin Ale", "Honey Beer / Bière au miel", "Chili Beer",
      "Coffee Beer", "Chocolate Beer", "Vanilla Beer", "Coconut Beer", "Maple Beer", "Tea Beer",
      "Botanical Beer", "Floral Beer", "Smoked Beer / Bière fumée", "Rauchbier", "Salted Beer", "Pastry Beer",
      "Dessert Beer",
    ],
  },
  {
    title: "Bois, barrique & maturation",
    tags: [
      "Barrel Aged", "Wood Aged", "Bourbon Barrel Aged", "Whisky Barrel Aged", "Rum Barrel Aged", "Wine Barrel Aged",
      "Cognac Barrel Aged", "Armagnac Barrel Aged", "Port Barrel Aged", "Sherry Barrel Aged", "Tequila Barrel Aged", "Oak Aged",
      "Foeder Aged",
    ],
  },
  {
    title: "Sans alcool, faible alcool & profils spéciaux",
    tags: [
      "Alcohol-Free / Sans alcool 0.0%", "Low Alcohol / Faible alcool", "Table Beer", "Session Beer", "Gluten-Free / Sans gluten", "Gluten-Reduced",
      "Organic / Bio", "Vegan", "Experimental / Expérimentale", "Hybrid Beer / Hybride", "Collaboration Brew / Collaboration",
    ],
  },
  {
    title: "Styles historiques & régionaux",
    tags: [
      "Sahti", "Grodziskie / Grätzer", "Kentucky Common", "Pre-Prohibition Lager", "Pre-Prohibition Porter", "Steinbier",
      "Adambier", "Kottbusser", "Dampfbier", "Kvass / Kvas", "Gotlandsdricka", "Piwo Grodziskie",
      "Bière de Coupage", "Historical Beer / Style historique",
    ],
  },
];

export const CIDER_STYLE_GROUPS = [
  {
    title: "Base produit",
    tags: ["Cidre", "Poiré / Perry", "Cidre de pomme", "Cidre de poire", "Cidre pomme-poire", "Cidre de fruits / Fruit Cider"],
  },
  {
    title: "Douceur / sucrosité",
    tags: ["Extra-brut", "Brut", "Sec / Dry", "Demi-sec", "Demi-doux", "Doux / Sweet", "Dessert Cider"],
  },
  {
    title: "Effervescence",
    tags: ["Tranquille / Still", "Pétillant", "Effervescent / Sparkling", "Perlant", "Naturellement pétillant", "Carbonaté"],
  },
  {
    title: "Méthode & fermentation",
    tags: [
      "Traditionnel", "Farmhouse Cider", "Artisanal", "Fermentation spontanée", "Fermentation sauvage", "Fermentation contrôlée",
      "Keeved / Cidre bouché par défécation", "Méthode traditionnelle", "Méthode ancestrale", "Pét-Nat", "Refermenté en bouteille", "Non filtré",
      "Filtré", "Non pasteurisé", "Pasteurisé", "Pur jus", "À base de concentré",
    ],
  },
  {
    title: "Spécialités",
    tags: [
      "Cidre rosé", "Cidre houblonné / Hopped Cider", "Cidre aromatisé", "Cidre fruité", "Cidre aux épices", "Cidre botanique",
      "Cidre au miel", "Cidre de glace / Ice Cider", "Poiré de glace / Ice Perry", "Cidre vieilli en fût", "Cidre boisé", "Cidre fort / Imperial Cider",
      "Cidre sans alcool", "Cidre faible alcool",
    ],
  },
  {
    title: "Origines / traditions stylistiques",
    tags: [
      "Cidre normand", "Cidre breton", "Cidre basque / Sagardo", "Cidre asturien / Sidra", "Cidre anglais", "Cidre gallois",
      "Cidre irlandais", "Cidre américain / Modern American Cider", "Cidre canadien / québécois", "Cidre fermier / de terroir",
    ],
  },
];

export const PRODUCT_STATUSES = ["Permanent", "Saisonnier", "Édition limitée", "Temporaire", "Arrêté / discontinué", "Inconnu"];

export const BEVERAGE_SUBTYPES = ["Bière", "Cidre", "Poiré"];
