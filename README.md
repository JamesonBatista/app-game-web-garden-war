# Survivors Quest (3D para GitHub Pages)

Jogo ARPG Survivors em 3D (camera estilo Diablo) rodando 100% no browser com Three.js.
Recursos implementados:

- selecao de classe (Barbaro, Feiticeiro, Ladino)
- personagem 3D animado (GLB) e inimigos 3D (GLB)
- atributos de combate (armadura, critico, esquiva, recurso)
- recurso de classe (Furia, Mana, Energia)
- habilidade ativa exclusiva por classe
- loot/progressao que aumenta poder durante a run
- inimigos elite e mini-boss com afixos perigosos
- VFX reforcado nas habilidades (impacto, trilha, anel de energia, explosao)
- feedback premium de combate (hit-stop, flash de impacto, camada cinematica, sombras dinamicas)
- telegrafia de ataques inimigos, numeros de dano e barra de vida de mini-boss
- estatisticas completas de run + recorde salvo localmente

## Dependencias em runtime

- Three.js versionado localmente em `vendor/three/`
- loaders locais em `vendor/three/addons/`
- Nenhuma dependencia externa via CDN para executar o jogo

## Assets visuais (personagens)

O jogo usa modelos 3D locais em `assets/models/`:

- `assets/models/player.glb`
- `assets/models/enemy.glb`

Creditos completos em `assets/CREDITS.md`.

## Estrutura

```text
.
├── index.html
├── vendor/
│   ├── phaser/
│   │   └── phaser.min.js
│   └── three/
│       ├── three.module.js
│       └── addons/
│           ├── loaders/
│           │   └── GLTFLoader.js
│           └── utils/
│               └── SkeletonUtils.js
├── assets/
│   ├── models/
│   │   ├── player.glb
│   │   └── enemy.glb
│   └── CREDITS.md
├── styles/
│   └── main.css
└── src/
    ├── game3d.js
    ├── main.js
    ├── constants.js
    ├── state.js
    ├── systems/
    │   ├── diabloModule.js
    │   └── progression.js
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
