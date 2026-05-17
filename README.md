# Survivors Quest (modular para GitHub Pages)

Jogo roguelite inspirado em Vampire Survivors com visual isometrico em Phaser 3.
Agora com um modulo ARPG estilo Diablo:

- selecao de classe (Barbaro, Feiticeiro, Ladino)
- atributos de combate mais realistas (armadura, resistencia, critico, esquiva)
- recurso de classe (Furia, Mana, Energia)
- habilidade ativa exclusiva por classe
- loot com raridade e afixos que melhora o personagem durante a run

## Estrutura

```text
.
├── index.html
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
