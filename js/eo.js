/* Voyage des Sens — mode « huiles essentielles »
   Seules les senteurs qui existent réellement en huile essentielle (ou en absolue / CO2 vendue comme telle) sont gardées ;
   les autres sont remplacées par la plus proche, comme pour les allergies. La formule se lit en gouttes pour un diffuseur. */
(function (G) {
  'use strict';
  const W = s => s.split(' ');
  const EO = new Set([].concat(
    W('bergamote citron citronvert mandarine orange pamplemousse yuzu cedrat orangesang combava bigarade'),
    W('rose rosedamas jasmin sambac tubereuse ylang neroli fleuroranger geranium camomille immortelle tilleul mimosa osmanthus champaca narcisse lotus magnolia genet acacia'),
    W('citronnelle galbanum foin'),
    W('lavande romarin thym basilic mentheP mentheV sauge eucalyptus estragon origan armoise verveine laurier marjolaine coriandre fenouil genievre aneth'),
    W('poivrenoir poivrerose cardamome cannelle girofle muscade gingembre cumin curcuma anis sichuan carvi macis'),
    W('vanille tonka cacao cafe'),
    W('cedre santal vetiver gaiac boisrose cypres pin sapin oud bouleau cade cedreatlas'),
    W('encens myrrhe benjoin labdanum perou tolu elemi opoponax copal mastic styrax cire'),
    W('ambrette ciste tabac tabacblond'),
    W('patchouli moussechene lichen')
  ));
  // précautions par huile : photosensibilisante en application cutanée, déconseillée enceinte, dès quel âge, irritante pure
  const PHOTO = W('bergamote citron citronvert pamplemousse yuzu cedrat combava bigarade');
  const GROSSESSE = W('sauge romarin thym origan armoise estragon basilic genievre fenouil anis carvi cannelle girofle muscade mentheP mentheV eucalyptus cypres laurier marjolaine cumin cade');
  const ENFANTS = W('eucalyptus mentheP mentheV romarin sauge thym origan armoise cannelle girofle cade');
  const IRRITANTE = W('cannelle girofle origan thym cumin anis poivrenoir gingembre cade');
  const WARN = {};
  const add = (ids, tag) => ids.forEach(id => { (WARN[id] = WARN[id] || []).push(tag); });
  add(PHOTO, '☀ photosensibilisante sur la peau'); add(GROSSESSE, 'déconseillée pendant la grossesse');
  add(ENFANTS, 'pas avant 6 ans'); add(IRRITANTE, 'irritante pure');

  // gouttes pour un diffuseur : au moins une par huile, total ajusté au plus proche
  function drops(notes, total) {
    const N = Math.max(total || 12, notes.length);
    const raw = notes.map(n => n.pct / 100 * N), out = raw.map(v => Math.max(1, Math.floor(v)));
    let sum = out.reduce((a, b) => a + b, 0);
    const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
    for (let k = 0; sum < N && k < 200; k++, sum++) out[order[k % order.length][1]]++;
    for (let k = order.length - 1, g = 0; sum > N && g < 400; g++, k = (k - 1 + order.length) % order.length) { const i = order[k][1]; if (out[i] > 1) { out[i]--; sum--; } }
    return { total: sum, list: notes.map((n, i) => ({ id: n.id, n: out[i], warn: WARN[n.id] || [] })) };
  }
  G.VS = G.VS || {};
  G.VS.EO = EO; G.VS.EO_WARN = WARN; G.VS.drops = drops;
})(typeof window !== 'undefined' ? window : globalThis);
