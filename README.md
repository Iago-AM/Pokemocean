# Pokémocean

Um passeio tranquilo pelo oceano nas costas de uma Lapras, feito com [three.js](https://threejs.org/) e [Vite](https://vitejs.dev/). Sem pressa: nade entre ilhas, encontre Pokémon para completar o diário, mude a hora e o clima e tire fotos.

## Como rodar

Precisa do [Node.js](https://nodejs.org/) (testado com a versão 22).

```bash
npm install
npm run dev
```

Depois abra http://localhost:5173 no navegador.

Para gerar uma versão estática (pasta `dist/`): `npm run build`.

## Controles

| Tecla | Ação |
| --- | --- |
| W / ↑ e S / ↓ | Nadar para frente / para trás |
| A / ← e D / → | Virar |
| Shift | Nadar mais rápido |
| Espaço (segurar) | Mergulhar (o fôlego dura uns 10 s) |
| Mouse (arrastar) e roda | Girar a câmera e zoom |
| T | Abrir o console de comandos |
| J | Abrir/fechar o diário de avistamentos |
| M | Abrir/fechar o mapa (abas Perto e Tudo) |
| K | Abrir/fechar as conquistas |
| G | Abrir/fechar a galeria de fotos |
| P | Modo foto (Esc ou P para sair) |
| F | Tirar foto (no modo foto) |
| C | Cartão-postal com moldura Pokémocean (no modo foto): baixar, copiar ou compartilhar |
| H | Mostrar/esconder a ajuda |

No canto inferior direito, uma bússola pequena mostra para onde a câmera olha (N, S, L, O).

No **modo foto** a interface some e a câmera fica solta: WASD move, Q/E desce e sobe, Shift acelera, botão direito do mouse arrasta.

## No celular

O jogo funciona no celular e no tablet (de preferência deitado). Encoste o dedo na metade esquerda da tela para aparecer o **joystick**; à direita ficam os botões de **mergulhar** e **acelerar** (segure). Eles somem sozinhos alguns segundos depois do último toque. Arrastar o dedo no resto da tela gira a câmera. No canto de cima há atalhos para diário, mapa, conquistas, galeria e modo foto, e a **engrenagem** deixa escolher se os controles ficam sempre visíveis, somem sozinhos ou ficam desligados, além do tamanho e do lado do joystick.

## Recomeçar do zero

Na tela inicial há um botão pequeno no canto, **↺ recomeçar do zero**, que apaga diário, shinies, garrafas, fotos, conquistas e a Lapras dourada. O mesmo pelo console: `reset tudo`. (O `dex reset` apaga só o diário, os shinies e as conquistas.)

## Comandos (tecla T)

| Comando | O que faz |
| --- | --- |
| `help` | Lista os comandos |
| `play rayquaza` / `play rayquaza2` | Grito e rugido do Rayquaza |
| `set speed 2` | Velocidade da Lapras (de 0.2 a 10, 1 = normal) |
| `set time 18:30` | Muda a hora (também aceita `manha`, `tarde`, `noite`, `amanhecer`...) |
| `set cycle 10` | Um dia dura 10 minutos (`0` para o relógio) |
| `set weather chuva` | Clima: `seco`, `nublado`, `chuva`, `neblina` |
| `set volume 40` | Volume dos sons e da música (0 a 100) |
| `set musica off` | Desliga a música (`on` liga de novo) |
| `time` | Mostra a hora e o clima |
| `photo` | Liga/desliga o modo foto |
| `dex` / `dex reset` | Abre o diário / apaga os avistamentos e shinies |
| `galeria` | Abre a galeria de fotos |
| `garrafas` | Relê as mensagens das garrafas já encontradas |
| `set shiny 50` | Chance de shiny: 1 em 50 (`set shiny 1` deixa todos shiny) |
| `arcoiris` | Mostra o arco-íris agora |
| `estrelas` | Chama uma chuva de estrelas (só à noite) |
| `desejo` | Faz um pedido durante a chuva de estrelas |
| `conquistas` | Abre as conquistas |
| `play psyduck` | Toca o grito do Pokémon (veja "Gritos" abaixo) |
| `tp gyarados` | Leva a Lapras para perto de um Pokémon (ou `tp inicio`) |
| `pos` | Mostra onde você está |
| `clear` | Limpa o console |

Setas ↑/↓ dentro do console repetem comandos anteriores.

## O que tem para fazer

- **Diário de avistamentos (J):** chegar perto de um Pokémon registra ele. Cada entrada tem uma dica de onde procurar.
- **Shiny:** cada Pokémon tem 1 chance em 50 de aparecer com cores trocadas e brilhinhos. Achar um marca uma estrela ★ no diário.
- **Fotos (P e depois F):** a foto vai para a galeria (G) e, se tiver um Pokémon em destaque, vira a foto oficial dele no diário. Clique numa foto para ampliar e baixar.
- **Garrafas com mensagem:** 10 garrafas boiam pelo mar. Encoste nelas para ler.
- **Mergulho:** segure Espaço para descer até o fundo do mar, com areia, algas e grama marinha.
- **Companheiro:** ao chegar perto do Psyduck, Totodile, Popplio ou Sobble, há 20% de chance de ele nadar junto. Depois de 1 a 3 minutos, ou se você se afastar correndo, ele volta para casa.
- **Mapa (M):** mostra as ilhas, a Lapras, as garrafas achadas e os Pokémon já vistos.
- **Noite:** a água brilha com plâncton azul por onde a Lapras passa.
- **Música:** calma e gerada no próprio navegador; muda de dia, à noite e embaixo d'água.
- **Estrelas cadentes:** passam de vez em quando à noite; algumas noites têm chuva de estrelas. Faça um pedido (`desejo`) e veja quem aparece.
- **Ondas e maré:** a água sobe e desce de verdade (mais forte na chuva), e a maré muda com a hora.
- **Conquistas (K):** 16 metas tranquilas, como nadar 10 km, ver a aurora ou ler todas as garrafas.
- **Farol:** à noite (ou na chuva e na neblina) o farol acende, com o feixe de luz girando pelo mar.
- **Fundo do mar inteiro com vegetação:** a grama e as algas acompanham você pelo mar todo, com clareiras, sem pesar.
- **Segredo:** complete o diário e veja o que acontece... (a recompensa fica guardada para quem chegar lá).
- **Céu:** ciclo de dia e noite com estrelas e lua, aurora sobre a montanha gelada em noites limpas e arco-íris quando a chuva para de dia.

Tudo (diário, shinies, garrafas, fotos) fica salvo no navegador.

## Gritos dos Pokémon

Coloque arquivos em `assets/Sounds/cries/<id>.mp3` (ou `.ogg`/`.wav`), por exemplo `cries/psyduck.mp3`. O jogo toca o grito quando você avista o Pokémon, quando ele vira companheiro e com `play <id>`. A lista de ids está em `assets/Sounds/cries/LEIA-ME.txt`.

## Diário de avistamentos

Chegar perto de um Pokémon registra ele no diário (tecla J). O progresso fica salvo no navegador. Cada entrada tem uma dica de onde procurar.

## Estrutura

- `main.js`: junta tudo; Lapras (jogador), câmera, modo foto, diário e comandos.
- `src/environment.js`: água, céu, ciclo dia/noite, estrelas, lua, clima e chuva.
- `src/creatures.js`: Pokémon do mapa, trajetos e animações; também as dicas do diário.
- `src/terrain.js`: colisão com ilhas e montanhas (usa [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh)).
- `src/audio.js`: som do mar, chuva (gerada no código) e gritos.
- `src/underwater.js`: fundo do mar, algas balançando, visão submersa e bolhas.
- `src/extras.js`: garrafas com mensagem, aurora e arco-íris.
- `src/world.js`: farol, píer, ilhota com coqueiros, Monte Arco-Íris e veleiro.
- `src/map.js`: o mapa (tecla M).
- `src/music.js`: a música gerada no navegador.
- `src/achievements.js`: as conquistas.
- `src/secret.js`: a ilha secreta e a festa final.
- `src/touch.js`: controles de toque (joystick, botões e ajustes).
- `src/postcard.js`: o cartão-postal com moldura.
- `src/scenery.js`: ilhotas de pedra, pontes, praia do Monte e conchas no fundo (peças em `assets/cenario`, separadas e otimizadas no Blender; a ponte de cordas foi feita no Blender).
- `src/ui.js` e `style.css`: interface na tela e console.
- `assets/<Modelo>/`: modelos glTF do Sketchfab, cada um com seu `license.txt`.
- `main.original.js`: versão original de 2022, guardada como referência.

Lapras, Magikarp, Gyarados e Groudon ganharam esqueleto e animações no Blender; os outros movimentos (trajetos, pulos, voo em círculos) são feitos em código.

## Como publicar no GitHub Pages

O projeto já vem pronto para publicar: o `vite.config.js` copia para o site só os assets usados, o `.gitignore` deixa de fora os pacotes originais, os zips e os modelos que não podem ser publicados, e o arquivo `.github/workflows/deploy.yml` monta e publica o site sozinho a cada envio.

1. Crie um repositório vazio no GitHub (por exemplo `pokemocean`), sem README.
2. Na pasta do projeto:

   ```bash
   git init
   git add .
   git commit -m "Pokémocean"
   git branch -M main
   git remote add origin https://github.com/<seu-usuario>/pokemocean.git
   git push -u origin main
   ```

3. No GitHub, abra o repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Na aba **Actions**, espere o "Publicar no GitHub Pages" ficar verde (1 a 3 minutos).
5. O jogo fica em `https://<seu-usuario>.github.io/pokemocean/`.

Para atualizar depois: `git add .`, `git commit -m "o que mudou"` e `git push`. O site se atualiza sozinho.

Para testar a versão final no próprio PC antes de enviar: `npm run build` e depois `npm run preview`.

## Créditos dos modelos 3D

Todos os modelos vieram do [Sketchfab](https://sketchfab.com/). Os textos abaixo seguem o pedido de crédito de cada licença.

| Modelo | Autor | Licença |
| --- | --- | --- |
| [Pokemon - Lapras](https://sketchfab.com/3d-models/pokemon-lapras-3d7364edd4e2406d87850524dcd5499b) | [Katerina Novakova](https://sketchfab.com/KaterinaNovakova) | [CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/) |
| [Pokemon - Magikarp](https://sketchfab.com/3d-models/pokemon-magikarp-aed89b4ee4f1421abc2b1613911d0ca8) | [Katerina Novakova](https://sketchfab.com/KaterinaNovakova) | [CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/) |
| [Psyduck](https://sketchfab.com/3d-models/psyduck-4db3a123e5c245eab678c566ec225709) | [Squirmy Worm](https://sketchfab.com/squirmyworm064) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Popplio](https://sketchfab.com/3d-models/popplio-ffc81e12128b4c39a0fde93bda8ab25e) | [Squirmy Worm](https://sketchfab.com/squirmyworm064) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Totodile](https://sketchfab.com/3d-models/totodile-5bb89a18fe9341b9ba75a77ff1681e91) | [Squirmy Worm](https://sketchfab.com/squirmyworm064) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Froakie](https://sketchfab.com/3d-models/froakie-946f56feb0244e45b2c86bb7058bab26) | [Squirmy Worm](https://sketchfab.com/squirmyworm064) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Wiglett](https://sketchfab.com/3d-models/wiglett-734a840e6de04bea8ba4682af37782b1) | [Squirmy Worm](https://sketchfab.com/squirmyworm064) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Clodsire](https://sketchfab.com/3d-models/clodsire-f9f86eae289a46ac85feca7e8bd52757) | [Squirmy Worm](https://sketchfab.com/squirmyworm064) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Keldeo](https://sketchfab.com/3d-models/keldeo-6d6660973c644b3490f6341caa134d78) | [Squirmy Worm](https://sketchfab.com/squirmyworm064) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Jirachi](https://sketchfab.com/3d-models/jirachi-4cf313e8ba764976bec2c12e802a6e8d) | [Squirmy Worm](https://sketchfab.com/squirmyworm064) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [The Legendary Birds](https://sketchfab.com/3d-models/the-legendary-birds-afd65324ba284183a05147566fc4a913) (Articuno, Zapdos e Moltres, separados em 3 modelos) | [Squirmy Worm](https://sketchfab.com/squirmyworm064) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Sobble](https://sketchfab.com/3d-models/sobble-e3e078c72f694533b503bb353fb6910d) | [HardyC](https://sketchfab.com/HardyC) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Chinchou](https://sketchfab.com/3d-models/chinchou-1cb12e74ab6f48079da5a7c4f8eedd65) | [Isabel Cotta Pérez](https://sketchfab.com/cicutta) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Rayquaza - Remastered](https://sketchfab.com/3d-models/rayquaza-remastered-cc5f5189dcaf47e9a4c4ba4e77d183af) | [Master Galanodel](https://sketchfab.com/Master_Galanodel) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [#250 Hooh flying animation](https://sketchfab.com/3d-models/250-hooh-flying-animation-03ecc28f369c49a3bf7a19a78be4c140) | [kaiyi97](https://sketchfab.com/kaiyi97) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [The Lighthouse](https://sketchfab.com/3d-models/the-lighthouse-1a85945dd2a840f594bf6cb003176a54) | [cotman sam](https://sketchfab.com/cotman_sam) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Simple Wooden Pier or Dock](https://sketchfab.com/3d-models/simple-wooden-pier-or-dock-5bf117cb734a46559d10971c3098165c) | [Jungle Jim](https://sketchfab.com/jungle_jim) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Mini Schooner Pirateship Sailboat](https://sketchfab.com/3d-models/mini-schooner-pirateship-sailboat-9dc7cc2b94584ed8bfa89af668887c18) | [Savy](https://sketchfab.com/SavyTheCreator) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Coconut Tree](https://sketchfab.com/3d-models/coconut-tree-d141941578044b0f861ca83b36d4c411) | [sujirour](https://sketchfab.com/sujirour) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Stone Pack](https://sketchfab.com/3d-models/stone-pack-f3e0a67b9ca243b09119177649f21e17) | [ashkan.fancy](https://sketchfab.com/ashkan.fancy) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [70 Stylized Rocks](https://sketchfab.com/3d-models/70-stylized-rocks-bf0051544c9c41f998c154c546b09669) | [OndyRen](https://sketchfab.com/saurondra) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Stylized Palm tree set](https://sketchfab.com/3d-models/stylized-palm-tree-set-b84b734847344cb6a81b9102a64ac63b) | [Parelaxel](https://sketchfab.com/parelaxel) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Tropical Plants Pack M02P](https://sketchfab.com/3d-models/tropical-plants-pack-m02p-2f093afb792742438f0f7ba7eaab90f0) | [MozzarellaARC](https://sketchfab.com/mozzarellaARC) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Stylized Bush](https://sketchfab.com/3d-models/stylized-bush-9d9ce79d3ae040619e96d5b22c7de1a6) | [Daniel](https://sketchfab.com/danielpetrov) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Wooden Bridge Pack](https://sketchfab.com/3d-models/wooden-bridge-pack-bbcda64fe4fa4af29edf096c6e039ae2) (textura da ponte) | [padmadev_designs](https://sketchfab.com/padmadev_designs) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Cute little Star](https://sketchfab.com/3d-models/cute-little-star-1fc3bdccaad9455db5a9ed80f5a61cb9) | [totomori](https://sketchfab.com/totomori) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Seashell](https://sketchfab.com/3d-models/seashell-410be9cdc3d84f6a9f139189309b4891) | [TraianDumbrava](https://sketchfab.com/TraianDumbrava) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Free Pack - Rocks Stylized](https://sketchfab.com/3d-models/free-pack-rocks-stylized-7c60b4d1b8ab4187965f30c5e0212fc0) | [PolyOne Studio](https://sketchfab.com/polyone) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Gyarados by Stam](https://sketchfab.com/3d-models/gyarados-by-stam-cd4aad0cd73d406fb2140903b5f0e0b0) | [stam3D](https://sketchfab.com/stam3D) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [GROUDON](https://sketchfab.com/3d-models/groudon-cee6f5272ba647ad954f73cbd95d6838) | [Ayush_Bharti](https://sketchfab.com/Nothing_special) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Mew Pokémon](https://sketchfab.com/3d-models/mew-pokemon-4c9dfbb590744368a05f1bed1fbf8d3e) | [germydan](https://sketchfab.com/germydan) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Test Model - Sitting Anime Girl](https://sketchfab.com/3d-models/test-model-sitting-anime-girl-aeb0caeddddb40729fbe7761d6d107b9) | [jasetroy](https://sketchfab.com/jasetroy) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Stylized Mini Floating Island](https://sketchfab.com/3d-models/stylized-mini-floating-island-48ef6c69479541d3b4aed13ff7290ff8) | [Tom Verbeeck](https://sketchfab.com/VerbeeckTom) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Green Island](https://sketchfab.com/3d-models/green-island-79445f7196e24f4e833247f82aeaea0b) | [bilgehan.korkmaz](https://sketchfab.com/bilgehan.korkmaz) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Great Mountain](https://sketchfab.com/3d-models/great-mountain-dd826f1f05c544ccb671949ebca59721) | [Gesy](https://sketchfab.com/mrgesy) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |

Incluídos na pasta `assets/` mas ainda não usados na cena:

| Modelo | Autor | Licença |
| --- | --- | --- |
| [Glaceon 3D Render](https://sketchfab.com/3d-models/glaceon-3d-render-b6d07fdd0771491aad1c84a4c5bd52ea) | [hkgiao79](https://sketchfab.com/hkgiao79) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |
| [Island (Spongebob)](https://sketchfab.com/3d-models/island-spongebob-2d80f66d644d48a38c62cca05fab0e26) | [Anthony Yanez](https://sketchfab.com/paulyanez) | [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/) |

Outros recursos:

- Letreiro 3D "Pokémocean" (`assets/Pokemocean_Logo/`), a ilha "Monte Arco-Íris" (`assets/Monte_Arco_Iris/`, textura pintada e assada no Blender) e a ilha secreta (`assets/Ilha_Secreta/`) feitos no Blender para este projeto.
- Música: gerada no código (`src/music.js`), sem arquivos de áudio.
- Esqueletos e animações feitos no Blender para este projeto, sobre os modelos originais: `Lapras/lapras_animado.glb` (Parado, Nadar), `Magikarp/magikarp_animado.glb` (Nadar, Debater), `Gyarados/gyarados_animado.glb` (Nadar) e `Groudon/groudon_animado.glb` (Idle, Roar), Psyduck, Popplio, Totodile, Sobble, Chinchou, Froakie, Wiglett, Jirachi e Clodsire (`<nome>_animado.glb`, com Idle e Nadar), Keldeo (Idle, Correr) e as aves lendárias (`the_legendary_birds/<ave>_animado.glb`, com Voar e Planar). Lapras e Magikarp são CC BY-SA 4.0, então estas versões modificadas seguem a mesma licença.
- Sons em `assets/Sounds/` (mar e gritos do Rayquaza): fonte ainda não identificada.
- Textura de normais da água (`assets/waternormals.jpg`) e os objetos `Water` e `Sky` vêm dos exemplos oficiais do three.js (licença MIT).

## Aviso

Projeto de fã, sem fins comerciais. Pokémon e seus personagens são marcas da Nintendo, Game Freak e The Pokémon Company. Os modelos acima são trabalhos de fãs publicados por seus autores no Sketchfab.
