/* Voyage des Sens — groupes d'allergies et d'intolérances
   Chaque groupe retire les familles (fams) et les senteurs (ids) listées de toutes les formules. */
(function (G) {
  'use strict';
  const L = s => s.split(' ');
  const ALLERGENS = [
    { id: 'agrumes', n: 'Agrumes', hint: 'limonène, citral', fams: ['ag'], ids: L('citronnelle verveine limoncello limonade orangina jusorange tartecitron fleurcitronnier mojito margarita spritz tonic cola earlgrey crepesuzette') },
    { id: 'noix', n: 'Fruits à coque & cacahuète', hint: 'noisette, amande, pistache…', fams: [], ids: L('noisette amande pistache noix cajou pecan cacahuete beurrecacahuete chataigne marronglace praline patemande orgeat amaretto nougat pateatartiner macaron dragee fleuramandier') },
    { id: 'lait', n: 'Lait & produits laitiers', hint: 'beurre, crème, fromage…', fams: [], ids: L('lait creme beurre beurresale beurrenoisette mozzarella fromage chevre camembert parmesan mascarpone yaourt laitconcentre dulce glacevanille glacepistache milkshake cappuccino latte bailey cheesecake tiramisu pannacotta chocolatlait chocolatblanc chocolatchaud lassi rizlait chipsfromage chipsoignon crepe brioche croissant painchoco caramelsale cremebrulee eclair crepesuzette painperdu') },
    { id: 'gluten', n: 'Gluten', hint: 'blé, orge, seigle', fams: [], ids: L('painchaud brioche crepe biscuit gaufre croissant painchoco madeleine bretzel cracker patepizza granola avoine cereales biere speculoos cookie brownie churros painperdu nouilles chouquette eclair tiramisu painepices paingrille carvi houblon crepesuzette cheesecake tatin tartecitron friture hamburger kebab') },
    { id: 'oeuf', n: 'Œufs', hint: 'meringue, crème, pâtisseries', fams: [], ids: L('meringue cremebrulee painperdu eclair crepe brioche madeleine tiramisu cheesecake tartecitron gaufre crepesuzette cookie brownie') },
    { id: 'soja', n: 'Soja & sésame', hint: 'soja, miso, sésame', fams: [], ids: L('soja miso sesame halva nouilles') },
    { id: 'miel', n: 'Miel & produits de la ruche', hint: 'miel, cire, propolis', fams: [], ids: L('miel mielfonce cire propolis bonbonmiel painepices nougat') },
    { id: 'baumes', n: 'Baumes & résines', hint: 'baume du Pérou, benjoin, styrax', fams: [], ids: L('perou tolu benjoin styrax labdanum opoponax propolis') },
    { id: 'mousse', n: 'Mousse de chêne', hint: 'allergène réglementé', fams: [], ids: L('moussechene lichen') },
    { id: 'cannelle', n: 'Cannelle & girofle', hint: 'cinnamal, eugénol', fams: [], ids: L('cannelle girofle oeillet quatreepices painepices speculoos vinchaud chai cola ylang rasalhanout') },
    { id: 'linalol', n: 'Lavande & linalol', hint: 'lavande, coriandre, bois de rose', fams: [], ids: L('lavande boisrose coriandre herbesprovence sauge marjolaine thym muguet') },
    { id: 'pollens', n: 'Pollens & herbes', hint: 'fleurs, foin, herbe coupée', fams: ['fl'], ids: L('herbecoupee foin paille armoise trefle bruyere nuitete') },
    { id: 'tropicaux', n: 'Fruits tropicaux (latex)', hint: 'banane, kiwi, mangue, ananas…', fams: [], ids: L('banane kiwi mangue papaye ananas passion goyave litchi fruitdragon carambole figue melon melonjaune pasteque tamarin') },
    { id: 'epices', n: 'Piment & épices piquantes', hint: 'piment, poivre, wasabi…', fams: [], ids: L('piment poivrenoir poivrerose poivrevert sichuan paprika curry cumin gingembre wasabi moutarde curcuma') },
    { id: 'ail', n: 'Ail & oignon', hint: 'ail, oignon, ciboulette', fams: [], ids: L('ail oignonfrit chipsoignon ciboulette') },
    { id: 'alcool', n: 'Alcools', hint: 'spiritueux, vin, bière', fams: [], ids: L('whisky rhum cognac vodka gin tequila vinrouge vinblanc champagne biere calvados kirsch bailey bourbon absinthe limoncello amaretto pastis sangria spritz mojito margarita pinacolada vinchaud cidre') }
  ];
  G.VS = G.VS || {};
  G.VS.ALLERGENS = ALLERGENS;
  G.VS.EXCL = new Set();     // senteurs écartées (calculé depuis les préférences)
})(typeof window !== 'undefined' ? window : globalThis);
