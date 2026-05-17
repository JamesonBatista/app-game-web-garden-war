# Survivors Quest (modular para GitHub Pages)

Jogo roguelite inspirado em Vampire Survivors com visual isometrico em Phaser 3.
Agora com um modulo ARPG estilo Diablo:

- selecao de classe (Barbaro, Feiticeiro, Ladino)
- atributos de combate mais realistas (armadura, resistencia, critico, esquiva)
- recurso de classe (Furia, Mana, Energia)
- habilidade ativa exclusiva por classe
- loot com raridade e afixos que melhora o personagem durante a run
- drops de itens no chao com clique/toque para equipar
- painel de equipamento (arma, armadura, reliquia)
- inimigos elite e mini-boss com afixos perigosos
- VFX reforcado nas habilidades (impacto, trilha, anel de energia, explosao)
- feedback premium de combate (hit-stop, flash de impacto, camada cinematica, sombras dinamicas)
- telegrafia de ataques inimigos, numeros de dano e barra de vida de mini-boss

## Dependencias em runtime

- Phaser 3.60.0 versionado localmente em `vendor/phaser/phaser.min.js`
- Nenhuma dependencia externa via CDN para executar o jogo

## Assets visuais (personagens)

O jogo usa sprites locais em `assets/sprites/` para player e inimigos, com fallback interno caso algum arquivo nao carregue.

Pack principal consistente:

- `assets/sprites/player/notlink_down.png`
- `assets/sprites/player/notlink_side.png`
- `assets/sprites/player/notlink_use.png`
- `assets/sprites/enemies/sword_beast_side.png`
- `assets/sprites/enemies/goo_walk.png`
- `assets/sprites/enemies/giant_walk.png`
- `assets/sprites/effects/whelp_fire.png`

Creditos completos em `assets/CREDITS.md`.

## Estrutura

```text
.
├── index.html
├── vendor/
│   └── phaser/
│       └── phaser.min.js
├── styles/
│   └── main.css
└── src/
    ├── main.js
    ├── constants.js
    ├── state.js
    ├── systems/
    │   └── diabloModule.js
    ├── utils/
    │   └── iso.js
    └── scenes/
        ├── BootScene.js
        ├── MenuScene.js
        ├── GameScene.js
        ├── LevelUpScene.js
        └── GameOverScene.js
```

## Como jogar localmente

Use qualquer servidor estatico:

```bash
python3 -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Controles

- Desktop: WASD ou setas
- Mobile: joystick virtual na metade inferior esquerda da tela

## Publicar no GitHub Pages

1. Suba a branch `main` para o GitHub.
2. No repositorio, abra **Settings > Pages**.
3. Em **Build and deployment**, selecione:
   - Source: `Deploy from a branch`
   - Branch: `main` e pasta `/ (root)`
4. Salve e aguarde o deploy.

Seu jogo ficara em:

`https://SEU_USUARIO.github.io/NOME_DO_REPOSITORIO/`
