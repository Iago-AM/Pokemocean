// Configuração do Vite.
// - base: './' faz o site funcionar em qualquer subpasta (como no GitHub Pages:
//   https://<usuario>.github.io/<repositorio>/).
// - O jogo carrega os modelos pelo caminho "assets/...", que o Vite não copia sozinho.
//   O plugin abaixo copia a pasta assets para dist/ no "npm run build", deixando de fora
//   o que não é usado no jogo (pacotes originais já convertidos, zips e modelos removidos).
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

// pastas de assets que NÃO vão para o site (nem para o GitHub, veja o .gitignore)
export const EXCLUDED_ASSETS = [
  // backups em zip
  'Usados',
  // pacotes originais: as peças usadas foram extraídas para assets/cenario
  '70_stylized_rocks', 'stone_pack', 'tropical_plants_pack_m02p', 'stylized_palm_tree_set',
  'stylized_bush', 'stylized_tropical_grass', 'wooden_bridge_pack', 'cute_little_star', 'seashell',
  // modelos tirados do jogo (extraídos de jogos oficiais ou sem licença livre)
  'lugia-official', 'dragonite-official', 'greninja-official', 'barraskewda', 'ocean_buoy', 'Pokemon',
  'Articuno', 'Kyogre', 'Rayquaza', 'tentacool', 'vaporeon', 'wingull',
  // não usados na cena
  'Glaceon', 'Ilha_Pequena',
];

function copyAssets() {
  return {
    name: 'copiar-assets',
    apply: 'build',
    closeBundle() {
      const src = path.resolve('assets');
      const dst = path.resolve('dist/assets');
      fs.cpSync(src, dst, {
        recursive: true,
        filter: (file) => {
          const rel = path.relative(src, file).split(path.sep);
          if (EXCLUDED_ASSETS.includes(rel[0])) return false;
          if (/\.(zip|rar|blend|blend1)$/i.test(file)) return false;
          // nas pastas que têm versão animada (*_animado.glb, feita no Blender), só ela
          // e o license.txt vão junto: o modelo original fica de fora
          if (rel.length >= 2) {
            const dir = path.join(src, rel[0]);
            const animated = fs.readdirSync(dir).some((f) => f.endsWith('_animado.glb'));
            if (animated && rel.length === 2) return rel[1].endsWith('_animado.glb') || rel[1] === 'license.txt';
            if (animated) return false;
          }
          return true;
        },
      });
      console.log('assets copiados para dist/assets');
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [copyAssets()],
});
