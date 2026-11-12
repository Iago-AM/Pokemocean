// Conquistas tranquilas: pequenas metas sem pressa, salvas no navegador.

export const ACHIEVEMENTS = [
  { id: 'mergulho', name: 'Primeiro mergulho', desc: 'Segurou o fôlego e desceu até o fundo.' },
  { id: 'nado1', name: 'Nadou 1 km', desc: 'Uma voltinha tranquila.' },
  { id: 'nado5', name: 'Nadou 5 km', desc: 'A Lapras já conhece o caminho.' },
  { id: 'nado10', name: 'Nadou 10 km', desc: 'Grande navegador dos mares.' },
  { id: 'fundo', name: 'Vizinhos do fundo', desc: 'Encontrou um Pokémon que vive no fundo do mar.' },
  { id: 'amigo', name: 'Companhia', desc: 'Um Pokémon nadou junto com você.' },
  { id: 'shiny', name: 'Que brilho!', desc: 'Encontrou um Pokémon shiny.' },
  { id: 'foto10', name: 'Fotógrafo', desc: 'Tirou 10 fotos.' },
  { id: 'aurora', name: 'Luzes do norte', desc: 'Viu a aurora sobre a montanha gelada.' },
  { id: 'arcoiris', name: 'Depois da chuva', desc: 'Viu um arco-íris.' },
  { id: 'estrela', name: 'Faça um pedido', desc: 'Viu uma estrela cadente.' },
  { id: 'desejo', name: 'Desejo atendido', desc: 'O Jirachi ouviu o seu pedido.' },
  { id: 'dianoite', name: 'Do dia para a noite', desc: 'Viu o sol se pôr navegando.' },
  { id: 'explorador', name: 'Explorador', desc: 'Visitou o farol, o píer, a ilhota e o Monte Arco-Íris.' },
  { id: 'garrafas', name: 'Correio do mar', desc: 'Leu todas as mensagens nas garrafas.' },
  { id: 'diario', name: 'Diário completo', desc: 'Avistou todos os Pokémon.' },
  { id: 'santuario', name: 'Santuário das Estrelas', desc: 'Encontrou a ilha secreta e celebrou com todos.' },
];

export function createAchievements({ load, save, onUnlock }) {
  const unlocked = new Set(load('pokemocean-conquistas', []));
  const stats = load('pokemocean-estatisticas', { swum: 0, visited: [] });
  const visited = new Set(stats.visited);
  let saveTimer = 0;

  function unlock(id) {
    if (unlocked.has(id)) return;
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return;
    unlocked.add(id);
    save('pokemocean-conquistas', [...unlocked]);
    onUnlock(a, unlocked);
  }

  return {
    unlocked,
    unlock,
    get swumKm() { return stats.swum / 8000; }, // ~8 unidades = 1 metro
    // distância nadada (unidades do mundo) e lugares visitados
    addSwim(units, dt) {
      stats.swum += units;
      const km = stats.swum / 8000;
      if (km >= 1) unlock('nado1');
      if (km >= 5) unlock('nado5');
      if (km >= 10) unlock('nado10');
      saveTimer -= dt;
      if (saveTimer <= 0) { saveTimer = 5; save('pokemocean-estatisticas', { swum: stats.swum, visited: [...visited] }); }
    },
    visit(place) {
      if (visited.has(place)) return;
      visited.add(place);
      save('pokemocean-estatisticas', { swum: stats.swum, visited: [...visited] });
      if (['farol', 'pier', 'ilhota', 'monte'].every((p) => visited.has(p))) unlock('explorador');
    },
    reset() {
      unlocked.clear(); visited.clear(); stats.swum = 0;
      save('pokemocean-conquistas', []); save('pokemocean-estatisticas', { swum: 0, visited: [] });
    },
  };
}
