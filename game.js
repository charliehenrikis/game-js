// Obtém o elemento canvas do HTML e seu contexto de desenho 2D
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Define as dimensões do canvas para 800x600 pixels
canvas.width = 800;
canvas.height = 600;

// Objeto CONFIG que armazena as constantes globais do jogo
const CONFIG = {
    GRAVITY: 0.5,                           // Força da gravidade aplicada aos objetos
    JUMP_FORCE: -12,                        // Força do pulo do jogador (negativa pois Y cresce para baixo)
    PLAYER_SPEED: 5,                        // Velocidade de movimento horizontal do jogador
    GROUND_HEIGHT: canvas.height - 100,     // Altura do chão (100 pixels acima da parte inferior)
    PLATFORM_HEIGHT: 20,                    // Altura das plataformas
    ENEMY_SPEED: 0.8,                       // Velocidade dos inimigos
    COIN_VALUE: 50,                         // Valor de pontos por moeda coletada
    ENEMY_DEFEAT_VALUE: 100,                // Valor de pontos por derrotar um inimigo
    ANIMATION_SPEED: 10,                    // Velocidade das animações
    PLAYER_WIDTH: 60,                       // Largura do sprite do jogador
    PLAYER_HEIGHT: 90                       // Altura do sprite do jogador
};

// resourceManager.js
// Classe que gerencia o carregamento e acesso aos recursos do jogo (imagens e sons)
class ResourceManager {
    constructor() {
        this.images = {};                   // Objeto para armazenar as imagens carregadas
        this.soundEffects = {};             // Objeto para armazenar efeitos sonoros (não implementado ainda)
        this.loaded = false;                // Flag que indica se todos os recursos foram carregados
        this.totalResources = 0;            // Contador do total de recursos a serem carregados
        this.loadedResources = 0;           // Contador de recursos já carregados
        this.loadingErrors = false;         // Flag para indicar se houve erros no carregamento
    }

    // Método assíncrono para carregar uma imagem específica
    async loadImage(key, src) {
        this.totalResources++;              // Incrementa o contador de recursos totais
        try {
            // Cria uma Promise para carregar a imagem de forma assíncrona
            const img = await new Promise((resolve, reject) => {
                const img = new Image();    // Cria um novo objeto de imagem
                img.onload = () => {
                    console.log(`Image loaded: ${src}`);  // Log quando a imagem é carregada com sucesso
                    resolve(img);           // Resolve a Promise com a imagem carregada
                };
                img.onerror = () => reject(new Error(`Failed to load image: ${src}`));  // Rejeita a Promise em caso de erro
                setTimeout(() => reject(new Error('Image load timeout')), 5000);  // Define um timeout de 5 segundos
                img.src = src;              // Inicia o carregamento da imagem
            });
            this.images[key] = img;         // Armazena a imagem no objeto de imagens com a chave fornecida
            this.loadedResources++;         // Incrementa o contador de recursos carregados
            return img;                     // Retorna a imagem carregada
        } catch (error) {
            // Tratamento de erro caso a imagem falhe ao carregar
            console.warn(`Failed to load image ${key}, using fallback`, error);
            this.loadedResources++;         // Incrementa o contador mesmo em caso de falha
            return null;                    // Retorna null para indicar falha
        }
    }

    // Método para carregar todas as imagens do jogo
    async loadAll() {
        try {
            // Carrega todas as imagens em paralelo usando Promise.all
            await Promise.all([
                // Lista de todas as imagens a serem carregadas com suas chaves e caminhos
                // Inclui sprites do jogador em diversos estados
                this.loadImage('player_idle', 'assets/liniker.png'),
                this.loadImage('player_walk1', 'assets/liniker_walk1.png'),
                this.loadImage('player_walk2', 'assets/liniker_walk2.png'),
                this.loadImage('player_jump', 'assets/liniker.png'),
                this.loadImage('player_speed', 'assets/liniker_speed.png'),
                this.loadImage('player_jump_power', 'assets/liniker_walk1.png.png'),
                this.loadImage('player_invincible', 'assets/liniker_invincible.png'),
                // Sprites de inimigos
                this.loadImage('enemy1', 'assets/enemy.png'),
                this.loadImage('enemy2', 'assets/enemy2.png'),
                this.loadImage('enemy3', 'assets/enemy3.png'),
                // Outros elementos do jogo
                this.loadImage('coin', 'assets/coin.png'),
                this.loadImage('background', 'assets/background.png'),
                this.loadImage('cloud1', 'assets/cloud1.png'),
                this.loadImage('cloud2', 'assets/cloud2.png'),
                this.loadImage('tree', 'assets/tree.png'),
                this.loadImage('platform', 'assets/platform.png'),
                // Power-ups do jogo
                this.loadImage('powerup_speed', 'assets/powerup_speed.png'),
                this.loadImage('powerup_jump', 'assets/powerup_jump.png'),
                this.loadImage('powerup_invincibility', 'assets/powerup_invincibility.png'),
            ]);
        } catch (error) {
            // Tratamento de erro caso alguma imagem falhe ao carregar
            console.warn('Some resources failed to load, using fallbacks');
        } finally {
            // Marca o carregamento como concluído, independentemente de sucessos ou falhas
            this.loaded = true;
        }
    }

    // Método para obter uma imagem específica pelo seu identificador
    getImage(key) {
        return this.images[key];
    }
    
    // Método para calcular o progresso de carregamento (0 a 1)
    getLoadingProgress() {
        return this.totalResources === 0 ? 0 : (this.loadedResources / this.totalResources);
    }
}


// Classe responsável por gerenciar as animações de sprites
class SpriteAnimation {
    constructor(frames, frameDuration = CONFIG.ANIMATION_SPEED) {
        this.frames = frames;                 // Array com os nomes dos frames da animação
        this.frameDuration = frameDuration;   // Duração de cada frame (em ticks)
        this.currentFrameIndex = 0;           // Índice do frame atual
        this.frameTimer = 0;                  // Contador de tempo para controlar mudança de frames
        this.isPlaying = false;               // Flag para indicar se a animação está em execução
    }
    
    // Inicia a animação do início
    start() {
        this.isPlaying = true;                // Ativa a animação
        this.currentFrameIndex = 0;           // Reset para o primeiro frame
        this.frameTimer = 0;                  // Reset do timer
    }
    
    // Para a animação e retorna ao primeiro frame
    stop() {
        this.isPlaying = false;               // Desativa a animação
        this.currentFrameIndex = 0;           // Reset para o primeiro frame
    }
    
    // Atualiza o estado da animação a cada tick do jogo
    update() {
        if (!this.isPlaying) return;          // Se não estiver em execução, não faz nada
        this.frameTimer++;                    // Incrementa o contador de tempo
        
        // Quando atinge a duração definida para o frame atual
        if (this.frameTimer >= this.frameDuration) {
            this.frameTimer = 0;              // Reset do timer
            // Avança para o próximo frame, voltando ao início se chegar ao fim (loop)
            this.currentFrameIndex = (this.currentFrameIndex + 1) % this.frames.length;
        }
    }
    
    // Retorna o nome do frame atual da animação
    getCurrentFrame() {
        return this.frames[this.currentFrameIndex];
    }
}


// Classe base para todos os objetos visuais do jogo
class Sprite {
    constructor(x, y, width, height, color) {
        this.x = x;                // Posição X no canvas
        this.y = y;                // Posição Y no canvas
        this.width = width;        // Largura do sprite
        this.height = height;      // Altura do sprite
        this.color = color;        // Cor de preenchimento (usado como fallback)
        this.active = true;        // Flag para indicar se o sprite está ativo/visível
    }

    // Método para desenhar o sprite no canvas
    draw() {
        if (!this.active) return;  // Se não estiver ativo, não desenha
        ctx.fillStyle = this.color; // Define a cor de preenchimento
        ctx.fillRect(this.x, this.y, this.width, this.height); // Desenha um retângulo
    }

    // Método de atualização (vazio na classe base, será sobrescrito nas subclasses)
    update() {}
    
    // Retorna os limites do sprite para detecção de colisões
    getBounds() {
        return {
            left: this.x,
            top: this.y,
            right: this.x + this.width,
            bottom: this.y + this.height
        };
    }
}

// Classe do jogador, que herda de Sprite
class Player extends Sprite {
    constructor(x, y, resourceManager) {
        // Chama o construtor da classe pai
        super(x, y, CONFIG.PLAYER_WIDTH, CONFIG.PLAYER_HEIGHT, 'red');
        this.velocityX = 0;         // Velocidade horizontal
        this.velocityY = 0;         // Velocidade vertical
        this.isJumping = false;     // Flag para indicar se está pulando
        this.direction = 1;         // Direção (1 = direita, -1 = esquerda)
        this.resources = resourceManager; // Referência ao gerenciador de recursos
        this.invulnerable = false;  // Flag de invulnerabilidade 
        this.invulnerableTimer = 0; // Timer de invulnerabilidade
        this.lives = 1;             // Número de vidas
        this.state = 'idle';        // Estado atual da animação
        
        // Define as animações para diferentes estados
        this.animations = {
            idle: new SpriteAnimation(['player_idle']), // Parado
            walking: new SpriteAnimation(['player_walk1', 'player_idle', 'player_walk2']), // Andando
            jumping: new SpriteAnimation(['player_jump']) // Pulando
        };
        
        this.animations.idle.start(); // Inicia com a animação 'idle'
        this.isFallingIntoHole = false; // Flag para animação de queda em buraco
        this.fallScale = 1;           // Escala para animação de queda
        this.fadeOutTimer = 0;        // Timer para efeito de fade out
    }

    // Atualiza o estado do jogador
    update(deltaTime) {
        // Animação especial se estiver caindo em um buraco
        if (this.isFallingIntoHole) {
            // Aumenta a velocidade da queda
            this.velocityY += CONFIG.GRAVITY * 1.5;
            this.y += this.velocityY;
            
            // Diminui a escala gradualmente para efeito de fade out
            this.fallScale = Math.max(0, this.fallScale - 0.002 * deltaTime);
            
            // Game over quando desaparecer completamente
            if (this.fallScale <= 0) {
                this.deathByHole = true;
                this.gameOver = true;
            }
            return;
        }

        // Verificação de objetivo (chegada na bandeira)
        if (this.x >= 3800) {
            this.x = 3800;         // Limita a posição
            this.velocityX = 0;    // Para o movimento
            return;
        }

        // Aplica gravidade
        this.velocityY += CONFIG.GRAVITY;
        
        // Limita a velocidade máxima de queda para evitar que passe através do chão
        if (this.velocityY > 15) {
            this.velocityY = 15;
        }
        
        // Atualiza a posição baseado na velocidade
        this.x += this.velocityX;
        this.y += this.velocityY;
        
        // Impede que o jogador saia pela borda esquerda
        if (this.x < 0) {
            this.x = 0;
            this.velocityX = 0;
        }
        
        // Colisão com o chão
        if (this.y + this.height > CONFIG.GROUND_HEIGHT) {
            this.y = CONFIG.GROUND_HEIGHT - this.height;
            this.velocityY = 0;
            this.isJumping = false;
        }
        
        // Gerencia o timer de invulnerabilidade
        if (this.invulnerable) {
            this.invulnerableTimer -= deltaTime;
            if (this.invulnerableTimer <= 0) {
                this.invulnerable = false;
            }
        }
        
        // Atualiza o estado da animação
        this.updateAnimationState();
        // Atualiza todas as animações
        Object.values(this.animations).forEach(anim => anim.update());
    }
    
    // Atualiza o estado da animação com base no movimento
    updateAnimationState() {
        const previousState = this.state;
        
        // Determina o estado atual
        if (this.isJumping) {
            this.state = 'jumping';
        } else if (this.velocityX !== 0) {
            this.state = 'walking';
        } else {
            this.state = 'idle';
        }
        
        // Se o estado mudou, para a animação anterior e inicia a nova
        if (previousState !== this.state) {
            this.animations[previousState].stop();
            this.animations[this.state].start();
        }
    }

    // Desenha o jogador no canvas
    draw() {
        // Animação especial para queda em buraco
        if (this.isFallingIntoHole) {
            ctx.save();
            // Aplica transparência progressiva
            ctx.globalAlpha = this.fallScale;
            
            const sprite = this.resources.getImage('player_jump');
            if (sprite) {
                ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
            } else {
                // Fallback se a imagem não carregar
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
            
            ctx.restore();
            return;
        }
        
        // Efeito de piscar durante invulnerabilidade
        if (this.invulnerable && Math.floor(Date.now() / 100) % 2 === 0) return;
        
        // Obtém a animação atual e o nome do frame
        const currentAnimation = this.animations[this.state];
        const spriteName = currentAnimation.getCurrentFrame();
        const sprite = this.resources.getImage(spriteName);
        
        // Efeito de brilho para power-ups
        if (this.powerUpColor) {
            ctx.save();
            ctx.shadowColor = this.powerUpColor;
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        
        // Desenha o sprite com a orientação correta conforme a direção
        if (sprite) {
            if (this.direction === 1) {
                // Desenha normalmente se estiver olhando para a direita
                ctx.drawImage(sprite, this.x, this.y, CONFIG.PLAYER_WIDTH, CONFIG.PLAYER_HEIGHT);
            } else {
                // Inverte horizontalmente se estiver olhando para a esquerda
                ctx.save();
                ctx.scale(-1, 1);
                ctx.drawImage(sprite, -this.x - CONFIG.PLAYER_WIDTH, this.y, CONFIG.PLAYER_WIDTH, CONFIG.PLAYER_HEIGHT);
                ctx.restore();
            }
        } else {
            // Fallback se a imagem não carregar
            super.draw();
        }
        
        // Restaura o contexto se tiver power-up ativo
        if (this.powerUpColor) {
            ctx.restore();
        }
    }

    // Faz o jogador pular
    jump() {
        if (!this.isJumping) {
            this.velocityY = CONFIG.JUMP_FORCE;   // Aplica força de pulo (negativa para subir)
            this.isJumping = true;                // Marca como pulando
            this.y -= 1;                          // Pequeno ajuste para evitar colisão imediata
        }
    }

    // Ativa o estado de invulnerabilidade por uma duração específica
    makeInvulnerable(duration) {
        this.invulnerable = true;
        this.invulnerableTimer = duration;
    }
    
    // Reduz uma vida e ativa invulnerabilidade temporária
    loseLife() {
        if (!this.invulnerable) {
            this.lives--;                        // Reduz uma vida
            this.makeInvulnerable(2000);         // 2 segundos de invulnerabilidade
            return this.lives <= 0;              // Retorna true se morreu (vidas ≤ 0)
        }
        return false;                            // Não perdeu vida se estiver invulnerável
    }
}

// platform.js
class Platform extends Sprite {
    constructor(x, y, width, moveHorizontal = false, moveVertical = false, range = 150, speed = 1, resourceManager = null) {
        super(x, y, width, CONFIG.PLATFORM_HEIGHT, 'green');
        this.originalX = x;
        this.originalY = y;
        this.moveHorizontal = moveHorizontal;
        this.moveVertical = moveVertical;
        this.range = range;
        this.speed = speed;
        this.direction = 1;
        this.attachedPlayer = null;
        this.resources = resourceManager;
        this.animationOffset = Math.random() * Math.PI * 2; // Offset aleatório para animação
        this.grassHeight = 5; // Altura da grama no topo da plataforma
    }
    
    update() {
        const previousX = this.x;
        const previousY = this.y;
        
        if (this.moveHorizontal) {
            this.x += this.speed * this.direction;
            if (Math.abs(this.x - this.originalX) > this.range) {
                this.direction *= -1;
            }
        }
        
        if (this.moveVertical) {
            this.y += this.speed * this.direction;
            if (Math.abs(this.y - this.originalY) > this.range) {
                this.direction *= -1;
            }
        }
        
        // Move player along with platform if standing on it
        if (this.attachedPlayer) {
            const deltaX = this.x - previousX;
            const deltaY = this.y - previousY;
            this.attachedPlayer.x += deltaX;
            this.attachedPlayer.y += deltaY;
        }
    }
    
    attachPlayer(player) {
        this.attachedPlayer = player;
    }
    
    detachPlayer() {
        this.attachedPlayer = null;
    }

    draw() {
        if (!this.active) return;
        
        const platformImage = this.resources ? this.resources.getImage('platform') : null;
        
        // Adicionar efeito de flutuação suave para plataformas móveis
        let offsetY = 0;
        if (this.moveHorizontal || this.moveVertical) {
            offsetY = Math.sin(Date.now() * 0.003 + this.animationOffset) * 2;
        }
        
        // Desenhar sombra sob a plataforma para dar profundidade
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(this.x + 5, this.y + CONFIG.PLATFORM_HEIGHT + offsetY + 2, this.width - 10, 5);
            
        if (platformImage) {
            // Calcular a largura real da plataforma baseada na imagem
            const repeatCount = Math.ceil(this.width / platformImage.width);
            const actualWidth = repeatCount * platformImage.width;
            
            // Atualizar a largura da plataforma para corresponder exatamente à imagem
            this.width = actualWidth;
            
            // Desenhar a imagem da plataforma, repetindo horizontalmente
            for (let i = 0; i < repeatCount; i++) {
                ctx.drawImage(
                    platformImage,
                    this.x + i * platformImage.width,
                    this.y + offsetY,
                    platformImage.width,
                    CONFIG.PLATFORM_HEIGHT
                );
            }
        } else {
            // Desenhar terra (parte principal da plataforma)
            const earthGradient = ctx.createLinearGradient(this.x, this.y + offsetY, this.x, this.y + offsetY + CONFIG.PLATFORM_HEIGHT);
            earthGradient.addColorStop(0, '#8B4513'); // Marrom escuro no topo
            earthGradient.addColorStop(0.7, '#A0522D'); // Marrom médio no meio
            earthGradient.addColorStop(1, '#6B4226'); // Marrom mais escuro na base
            ctx.fillStyle = earthGradient;
            ctx.fillRect(this.x, this.y + offsetY + this.grassHeight, this.width, CONFIG.PLATFORM_HEIGHT - this.grassHeight);
            
            // Desenhar grama no topo
            const grassGradient = ctx.createLinearGradient(this.x, this.y + offsetY, this.x, this.y + offsetY + this.grassHeight);
            grassGradient.addColorStop(0, '#7CFC00'); // Verde claro no topo
            grassGradient.addColorStop(1, '#4CAF50'); // Verde mais escuro na base
            ctx.fillStyle = grassGradient;
            ctx.fillRect(this.x, this.y + offsetY, this.width, this.grassHeight);
            
            // Adicionar textura de terra (pequenos pontos)
            ctx.fillStyle = 'rgba(139, 69, 19, 0.3)';
            for (let i = 0; i < this.width; i += 5) {
                for (let j = this.grassHeight; j < CONFIG.PLATFORM_HEIGHT; j += 4) {
                    if (Math.random() > 0.7) {
                        ctx.fillRect(this.x + i, this.y + offsetY + j, 2, 2);
                    }
                }
            }
            
            // Adicionar detalhes de grama (pequenas linhas verticais)
            ctx.strokeStyle = '#8BC34A';
            ctx.lineWidth = 1;
            for (let i = 0; i < this.width; i += 8) {
                if (Math.random() > 0.5) {
                    const grassHeight = Math.random() * 3 + 2;
            ctx.beginPath();
                    ctx.moveTo(this.x + i, this.y + offsetY + this.grassHeight);
                    ctx.lineTo(this.x + i, this.y + offsetY - grassHeight);
                    ctx.stroke();
                }
            }
        }
        
        // Adicionar brilho nas bordas para plataformas móveis
        if (this.moveHorizontal || this.moveVertical) {
            const glowIntensity = (Math.sin(Date.now() * 0.005) + 1) * 0.5;
            ctx.fillStyle = `rgba(255, 255, 255, ${glowIntensity * 0.3})`;
            ctx.fillRect(this.x, this.y + offsetY, 5, CONFIG.PLATFORM_HEIGHT);
            ctx.fillRect(this.x + this.width - 5, this.y + offsetY, 5, CONFIG.PLATFORM_HEIGHT);
        }
    }
}

// enemy.js
class Enemy extends Sprite {
    constructor(x, y, patrolArea = 100, type = 'enemy1', resourceManager = null) {
        super(x, y, 60, 60, 'blue');
        this.type = type; // 'enemy1', 'enemy2' ou 'enemy3'
        this.velocityX = -CONFIG.ENEMY_SPEED;
        this.startX = x;
        this.patrolArea = patrolArea;
        this.resources = resourceManager;
        this.animationFrame = 0;
        this.frameCounter = 0;
        this.changeDirectionDelay = 0;
        this.onPlatform = null;
        this.platformOffsetX = 0;
        this.platformBounds = { left: 0, right: 0 }; // Adicionado para armazenar os limites da plataforma
    }

    update() {
        if (!this.active) return;
        
        // Se estiver em uma plataforma
        if (this.onPlatform) {
            // Atualizar posição baseada na plataforma
            const platformCurrentX = this.onPlatform.x;
            
            // Calcular a posição relativa à plataforma
            let relativeX = this.platformOffsetX + this.velocityX;
            
            // Verificar limites da plataforma
            const platformLeft = this.onPlatform.x;
            const platformRight = this.onPlatform.x + this.onPlatform.width;
            
            // Verificar se o inimigo está saindo da plataforma
            if (relativeX < 0 || relativeX + this.width > this.onPlatform.width) {
                this.velocityX *= -1;
                relativeX = this.platformOffsetX + this.velocityX;
            }
            
            // Atualizar offset e posição
            this.platformOffsetX = relativeX;
            this.x = platformCurrentX + this.platformOffsetX;
            this.y = this.onPlatform.y - this.height;
        } else {
            // Comportamento normal para inimigos no chão
            this.x += this.velocityX;
            
            // Patrulhar dentro da área definida
            if (this.x < this.startX - this.patrolArea || this.x > this.startX + this.patrolArea) {
                if (this.changeDirectionDelay <= 0) {
                    this.velocityX *= -1;
                    this.changeDirectionDelay = 30;
                }
            }
        }
        
        if (this.changeDirectionDelay > 0) {
            this.changeDirectionDelay--;
        }
        
        // Animação mais lenta
        this.frameCounter++;
        if (this.frameCounter >= 30) {
            this.frameCounter = 0;
            this.animationFrame = (this.animationFrame + 1) % 2;
        }
    }
    
    draw() {
        if (!this.active) return;
        
        const sprite = this.resources ? this.resources.getImage(this.type) : null;
        
        if (sprite) {
            // Invertendo a direção do desenho do inimigo
            if (this.velocityX < 0) {
                ctx.save();
                ctx.scale(-1, 1);
                ctx.drawImage(sprite, -this.x - this.width, this.y, this.width, this.height);
                ctx.restore();
            } else {
                ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
            }
        } else {
            // Fallback para o retângulo colorido
            super.draw();
        }
    }
}

class Coin extends Sprite {
    constructor(x, y, resourceManager = null) {
        super(x, y, 40, 40, 'gold');
        this.resources = resourceManager;
        this.animationFrame = 0;
        this.frameCounter = 0;
    }

    update() {
        // Animação simples de rotação
        this.frameCounter++;
        if (this.frameCounter >= 10) {
            this.frameCounter = 0;
            this.animationFrame = (this.animationFrame + 1) % 4;
        }
    }

    draw() {
        if (!this.active) return;
        
        const sprite = this.resources ? this.resources.getImage('coin') : null;
        
        if (sprite) {
            ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
        } else {
            // Efeito de brilho para as moedas
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Reflexo de luz
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(this.x + this.width/3, this.y + this.height/3, this.width/6, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

class BackgroundElement extends Sprite {
    constructor(x, y, width, height, type, speed, resourceManager) {
        super(x, y, width, height, 'rgba(255, 255, 255, 0.5)');
        this.type = type;
        this.speed = speed;
        this.resources = resourceManager;
    }
    
    update(playerVelocityX) {
        // Mover com o jogador, mas mais lento (efeito parallax)
        this.x -= playerVelocityX * this.speed;
        
        // Reposicionar quando sair da tela
        if (this.x + this.width < 0) {
            this.x = canvas.width;
        } else if (this.x > canvas.width) {
            this.x = -this.width;
        }
    }
    
    draw() {
        const sprite = this.resources ? this.resources.getImage(this.type) : null;
        
        if (sprite) {
            ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
        } else {
            // Fallback simples
            super.draw();
        }
    }
}

class Checkpoint extends Sprite {
    constructor(x, y) {
        super(x, y, 30, 50, 'yellow');
        this.activated = false;
    }
    
    activate() {
        this.activated = true;
        this.color = 'green';
    }
    
    draw() {
        // Bandeira de checkpoint
        ctx.fillStyle = 'brown';
        ctx.fillRect(this.x, this.y, 5, this.height);
        
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 5, this.y, this.width - 5, 20);
    }
}

class PowerUp extends Sprite {
    constructor(x, y, type, resourceManager = null) {
        super(x, y, 40, 40, 'purple');
        this.type = type; // 'speed', 'jump', 'invincibility'
        this.animationFrame = 0;
        this.frameCounter = 0;
        this.resources = resourceManager;
    }
    
    update() {
        // Animação flutuante
        this.frameCounter++;
        if (this.frameCounter >= 5) {
            this.frameCounter = 0;
            this.y += Math.sin(this.animationFrame * 0.2) * 0.5;
            this.animationFrame++;
        }
    }
    
    draw() {
        if (!this.active) return;
        
        // Usar imagem do recurso se disponível
        const powerUpImage = this.resources ? this.resources.getImage(`powerup_${this.type}`) : null;
        
        if (powerUpImage) {
            // Removido o efeito de borda piscante para o power-up de velocidade
            ctx.drawImage(powerUpImage, this.x, this.y, this.width, this.height);
        } else {
            // Fallback para desenho original
            ctx.fillStyle = this.type === 'speed' ? 'red' : 
                            this.type === 'jump' ? 'lime' : 'gold';
            
            ctx.beginPath();
            ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Símbolo dentro do power-up
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const symbol = this.type === 'speed' ? '→' : 
                          this.type === 'jump' ? '↑' : '★';
            
            ctx.fillText(symbol, this.x + this.width/2, this.y + this.height/2);
            ctx.textAlign = 'left';
        }
        
        // Restaurar configurações originais (mantido para outros casos)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
    }
}

// Gerenciador de colisões
class CollisionManager {
    static checkCollision(obj1, obj2) {
        if (!obj1.active || !obj2.active) return false;
        
        // Adicionar uma pequena margem de tolerância para evitar colisões falsas
        const margin = 2;
        
        const bounds1 = {
            left: obj1.x + margin,
            top: obj1.y + margin,
            right: obj1.x + obj1.width - margin,
            bottom: obj1.y + obj1.height - margin
        };
        
        const bounds2 = {
            left: obj2.x + margin,
            top: obj2.y + margin,
            right: obj2.x + obj2.width - margin,
            bottom: obj2.y + obj2.height - margin
        };
        
        return bounds1.left < bounds2.right &&
               bounds1.right > bounds2.left &&
               bounds1.top < bounds2.bottom &&
               bounds1.bottom > bounds2.top;
    }
}

// Gerenciador de entrada
class InputManager {
    constructor() {
        this.keys = {};
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });
    }
    
    isKeyDown(key) {
        return !!this.keys[key];
    }
}

// Classe de gerenciamento de nível
class LevelManager {
    constructor(resourceManager) {
        this.resources = resourceManager;
    }
    
    generateLevel() {
        const platforms = [];
        const enemies = [];
        const coins = [];
        const backgroundElements = [];
        const powerUps = [];
        const checkpoints = [];
        const holes = [];
        
        const scaleFactor = 1.5;
        
        // Elementos de fundo - nuvens
        backgroundElements.push(
            new BackgroundElement(100, 50, 100, 50, 'cloud1', 0.1, this.resources),
            new BackgroundElement(400, 30, 120, 60, 'cloud2', 0.05, this.resources),
            new BackgroundElement(700, 70, 90, 40, 'cloud1', 0.08, this.resources),
            new BackgroundElement(1000, 40, 110, 55, 'cloud2', 0.07, this.resources),
            new BackgroundElement(1300, 60, 95, 45, 'cloud1', 0.09, this.resources),
            new BackgroundElement(1600, 35, 115, 58, 'cloud2', 0.06, this.resources),
            new BackgroundElement(1900, 65, 105, 52, 'cloud1', 0.08, this.resources),
            new BackgroundElement(2200, 45, 100, 50, 'cloud2', 0.07, this.resources),
            new BackgroundElement(2500, 55, 110, 45, 'cloud1', 0.09, this.resources),
            new BackgroundElement(2800, 40, 95, 55, 'cloud2', 0.06, this.resources),
            new BackgroundElement(3100, 60, 115, 50, 'cloud1', 0.08, this.resources),
            new BackgroundElement(3400, 50, 105, 60, 'cloud2', 0.07, this.resources),
            new BackgroundElement(3700, 45, 100, 45, 'cloud1', 0.09, this.resources),
            new BackgroundElement(4000, 55, 110, 50, 'cloud2', 0.06, this.resources)
        );
        
        // Árvores de fundo
        backgroundElements.push(
            new BackgroundElement(200, CONFIG.GROUND_HEIGHT - 120, 150, 120, 'tree', 0.2, this.resources),
            new BackgroundElement(600, CONFIG.GROUND_HEIGHT - 100, 130, 100, 'tree', 0.2, this.resources),
            new BackgroundElement(1000, CONFIG.GROUND_HEIGHT - 110, 140, 110, 'tree', 0.2, this.resources),
            new BackgroundElement(1400, CONFIG.GROUND_HEIGHT - 130, 160, 130, 'tree', 0.2, this.resources),
            new BackgroundElement(1800, CONFIG.GROUND_HEIGHT - 120, 150, 120, 'tree', 0.2, this.resources),
            new BackgroundElement(2200, CONFIG.GROUND_HEIGHT - 100, 130, 100, 'tree', 0.2, this.resources),
            new BackgroundElement(2600, CONFIG.GROUND_HEIGHT - 110, 140, 110, 'tree', 0.2, this.resources),
            new BackgroundElement(3000, CONFIG.GROUND_HEIGHT - 120, 150, 120, 'tree', 0.2, this.resources),
            new BackgroundElement(3400, CONFIG.GROUND_HEIGHT - 100, 130, 100, 'tree', 0.2, this.resources),
            new BackgroundElement(3800, CONFIG.GROUND_HEIGHT - 110, 140, 110, 'tree', 0.2, this.resources)
        );
        
        // SEÇÃO 1: Início da fase - plataformas básicas
        platforms.push(
            new Platform(300, 400, 200, false, false, 0, 0, this.resources),
            new Platform(600, 350, 150, false, false, 0, 0, this.resources),
            new Platform(850, 300, 180, false, false, 0, 0, this.resources)
        );
        
        // Inimigos da seção 1
        enemies.push(
            new Enemy(350, 340, 100, 'enemy1', this.resources),
            new Enemy(700, CONFIG.GROUND_HEIGHT - 60, 120, 'enemy2', this.resources)
        );
        
        // Moedas da seção 1
        coins.push(
            new Coin(350, 350, this.resources),
            new Coin(650, 300, this.resources),
            new Coin(900, 250, this.resources)
        );
        
        // SEÇÃO 2: Plataformas móveis e primeiro buraco
        holes.push({ x: 1200, width: 200 });
        
        // Plataforma móvel horizontal sobre o buraco
        const movingPlatform1 = new Platform(1150, 350, 150, true, false, 100, 1, this.resources);
        platforms.push(movingPlatform1);
        
        // Plataforma móvel vertical
        const movingPlatform2 = new Platform(1450, 300, 120, false, true, 80, 0.8, this.resources);
        platforms.push(movingPlatform2);
        
        // Plataforma estática após o buraco
        platforms.push(new Platform(1650, 350, 180, false, false, 0, 0, this.resources));
        
        // Inimigo na plataforma móvel horizontal
        const platformEnemy = new Enemy(1200, movingPlatform1.y - 60, 50, 'enemy1', this.resources);
        platformEnemy.onPlatform = movingPlatform1;
        platformEnemy.platformOffsetX = 50; // Posição inicial relativa à plataforma
        platformEnemy.initialPlatformX = movingPlatform1.x;
        enemies.push(platformEnemy);
        
        // Inimigo na plataforma móvel vertical
        const platformEnemy2 = new Enemy(1450, movingPlatform2.y - 60, 40, 'enemy2', this.resources);
        platformEnemy2.onPlatform = movingPlatform2;
        platformEnemy2.platformOffsetX = 30;
        platformEnemy2.initialPlatformX = movingPlatform2.x;
        enemies.push(platformEnemy2);
        
        // Moedas da seção 2
        coins.push(
            new Coin(1200, 300, this.resources),
            new Coin(1450, 250, this.resources),
            new Coin(1700, 300, this.resources)
        );
        
        // SEÇÃO 3: Segundo buraco e plataformas em escada com power-up de velocidade
        holes.push({ x: 1900, width: 180 });
        
        // Adicionar plataforma móvel vertical antes da escada
        const elevatorPlatform = new Platform(2000, 400, 120, false, true, 100, 0.7, this.resources);
        platforms.push(elevatorPlatform);
        
        // Power-up de velocidade após o segundo buraco
        powerUps.push(new PowerUp(2000, 340, 'speed', this.resources)); // Posicionado na plataforma móvel
        
        // Plataformas em escada ajustadas
        platforms.push(
            new Platform(2150, 320, 150, false, false, 0, 0, this.resources),
            new Platform(2350, 270, 120, false, false, 0, 0, this.resources),
            new Platform(2550, 220, 100, false, false, 0, 0, this.resources)
        );
        
        // Adicionar inimigo na plataforma elevatória
        const elevatorEnemy = new Enemy(2020, elevatorPlatform.y - 60, 40, 'enemy3', this.resources);
        elevatorEnemy.onPlatform = elevatorPlatform;
        elevatorEnemy.platformOffsetX = 30;
        enemies.push(elevatorEnemy);
        
        // SEÇÃO 5: Desafio final com power-up de velocidade no chão
        holes.push({ x: 3000, width: 220 });
        
        // Adicionar power-up de velocidade no chão antes do buraco
        powerUps.push(new PowerUp(2950, CONFIG.GROUND_HEIGHT - 60, 'speed', this.resources));
        
        // Plataformas finais
        platforms.push(
            new Platform(3300, 270, 150, false, false, 0, 0, this.resources),
            new Platform(3500, 320, 200, false, false, 0, 0, this.resources)
        );
        
        // Inimigos finais
        enemies.push(
            new Enemy(3350, CONFIG.GROUND_HEIGHT - 60, 70, 'enemy3', this.resources),
            new Enemy(3550, CONFIG.GROUND_HEIGHT - 60, 100, 'enemy1', this.resources)
        );
        
        // Power-up de invencibilidade antes do final
        powerUps.push(new PowerUp(3400, 220, 'invincibility', this.resources));
        
        // Moedas finais
        coins.push(
            new Coin(3350, 220, this.resources),
            new Coin(3550, 270, this.resources)
        );
        
        // Checkpoint final (bandeira)
        checkpoints.push(new Checkpoint(3800, CONFIG.GROUND_HEIGHT - 50));
        
        return {
            platforms,
            enemies,
            coins,
            backgroundElements,
            powerUps,
            checkpoints,
            holes
        };
    }
}

// Classe principal do jogo
class Game {
    constructor() {
        this.resourceManager = new ResourceManager();
        this.inputManager = new InputManager();
        this.levelManager = null;
        
        this.player = null;
        this.platforms = [];
        this.enemies = [];
        this.coins = [];
        this.backgroundElements = [];
        this.powerUps = [];
        this.checkpoints = [];
        this.holes = [];
        this.camera = { x: 0, y: 0 };
        
        this.score = 0;
        this.gameOver = false;
        this.paused = false;
        this.loading = false;
        this.powerUpActive = null;
        this.powerUpTimer = 0;
        this.deathByHole = false;
        
        this.lastTime = 0;
        this.accumulatedTime = 0;
        this.timeStep = 1000 / 60; // 60 FPS
        
        // Adicionar evento para reiniciar o jogo
        window.addEventListener('keydown', (e) => {
            if (this.gameOver && (e.key === 'r' || e.key === 'R')) {
                this.reset();
            }
            
            if (e.key === 'p' || e.key === 'P') {
                this.togglePause();
            }
        });
        
        // Adicionar tratamento de erro para recursos não carregados
        this.resourceLoadingErrors = false;
        
        // Adicionar cache para elementos fora da tela
        this.offscreenEntities = new Set();
        
        // Adicionar variável para rastrear o estado original do contexto
        this.originalCtxSettings = {
            fillStyle: '#000000',
            strokeStyle: '#000000',
            lineWidth: 1,
            shadowColor: 'rgba(0, 0, 0, 0)',
            shadowBlur: 0
        };
        
        // Novas propriedades para a tela inicial
        this.titleScreen = false; // Alterado de true para false
    }
    
    async init() {
        // Modificar inicialização para carregar direto
        this.loading = true;
        await this.loadGameResources(); // Carregar recursos imediatamente
        this.startGameLoop();
    }
    
    reset() {
        this.player = new Player(100, 300, this.resourceManager);
        
        // Gerar nível único
        const levelData = this.levelManager.generateLevel();
        this.platforms = levelData.platforms;
        this.enemies = levelData.enemies;
        this.coins = levelData.coins;
        this.backgroundElements = levelData.backgroundElements;
        this.powerUps = levelData.powerUps;
        this.checkpoints = levelData.checkpoints;
        this.holes = levelData.holes; // Inicializar buracos
        
        this.score = 0;
        this.gameOver = false;
        this.victory = false; // Inicializar victory como false
        this.powerUpActive = null;
        this.powerUpTimer = 0;
        this.camera = { x: 0, y: 0 };
        this.deathByHole = false;
        
        // Resetar configurações do contexto gráfico
        ctx.fillStyle = this.originalCtxSettings.fillStyle;
        ctx.strokeStyle = this.originalCtxSettings.strokeStyle;
        ctx.lineWidth = this.originalCtxSettings.lineWidth;
        ctx.shadowColor = this.originalCtxSettings.shadowColor;
        ctx.shadowBlur = this.originalCtxSettings.shadowBlur;
    }
    
    gameComplete() {
        // Mostrar tela de vitória
        this.gameOver = true;
        this.victory = true;
    }
    
    togglePause() {
        this.paused = !this.paused;
    }
    
    renderLoadingScreen() {
        const renderLoading = () => {
            if (this.loading) {
                const progress = this.resourceManager.getLoadingProgress();
                
                // Limpar canvas
                ctx.fillStyle = '#222';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Desenhar texto
                ctx.fillStyle = 'white';
                ctx.font = '24px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Carregando...', canvas.width / 2, canvas.height / 2 - 50);
                
                // Desenhar barra de progresso
                const barWidth = canvas.width * 0.6;
                const barHeight = 20;
                const barX = (canvas.width - barWidth) / 2;
                const barY = canvas.height / 2;
                
                // Borda da barra
                ctx.strokeStyle = 'white';
                ctx.strokeRect(barX, barY, barWidth, barHeight);
                
                // Preenchimento da barra
                ctx.fillStyle = '#4CAF50';
                ctx.fillRect(barX, barY, barWidth * progress, barHeight);
                
                requestAnimationFrame(renderLoading);
            }
        };
        
        renderLoading();
    }
    
    startGameLoop() {
        const gameLoop = (currentTime) => {
            if (this.lastTime === 0) {
                this.lastTime = currentTime;
            }
            
            const deltaTime = currentTime - this.lastTime;
            this.accumulatedTime += deltaTime;
            
            while (this.accumulatedTime >= this.timeStep) {
                if (!this.titleScreen && !this.loading) {
                    this.update(this.timeStep);
                }
                this.accumulatedTime -= this.timeStep;
            }
            
            this.render();
            this.lastTime = currentTime;
            
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }
    
    update(deltaTime) {
        if (this.gameOver || this.paused) return;

        // Verificar colisão com buracos
        this.holes.forEach(hole => {
            const playerCenterX = this.player.x + this.player.width/2;
            
            if (playerCenterX > hole.x && 
                playerCenterX < hole.x + hole.width &&
                this.player.y + this.player.height >= CONFIG.GROUND_HEIGHT - 5 &&
                !this.player.isFallingIntoHole) {
                
                // Centralizar o jogador no buraco
                const holeCenterX = hole.x + hole.width/2;
                this.player.x = holeCenterX - this.player.width/2;
                this.player.isFallingIntoHole = true;
                this.player.velocityY = -5;
                this.player.velocityX = 0;
                
                setTimeout(() => {
                    this.deathByHole = true;
                    this.gameOver = true;
                }, 1500);
            }
        });

        // Verificar se o jogador chegou na bandeira
        if (this.player.x >= 3800) {
            this.gameComplete();
            return;
        }

        // Atualizar apenas entidades visíveis na tela
        const screenLeft = this.camera.x;
        const screenRight = this.camera.x + canvas.width;
        
        this.offscreenEntities.clear();
        
        [...this.enemies, ...this.platforms, ...this.coins].forEach(entity => {
            if (entity.x + entity.width < screenLeft || entity.x > screenRight) {
                this.offscreenEntities.add(entity);
            } else {
                entity.update(deltaTime);
            }
        });
        
        // Atualizar power-up ativo
        if (this.powerUpActive) {
            this.powerUpTimer -= deltaTime;
            if (this.powerUpTimer <= 0) {
                // Restaurar valores normais quando o power-up terminar
                if (this.powerUpActive === 'speed') {
                    CONFIG.PLAYER_SPEED = 5;  // Valor original
                } else if (this.powerUpActive === 'jump') {
                    CONFIG.JUMP_FORCE = -12;  // Valor original
                }
                
                // Restaurar as imagens originais do jogador
                if (this.player.originalImages) {
                    this.player.animations.idle.frames = [this.player.originalImages.idle];
                    this.player.animations.walking.frames = this.player.originalImages.walking;
                    this.player.animations.jumping.frames = [this.player.originalImages.jumping];
                    
                    // Reiniciar a animação atual para mostrar a imagem original imediatamente
                    const currentState = this.player.state;
                    this.player.animations[currentState].stop();
                    this.player.animations[currentState].start();
                    
                    this.player.originalImages = null;
                }
                
                // Remover efeito visual
                this.player.powerUpColor = null;
                
                this.powerUpActive = null;
            }
        }
        
        // Controles do jogador - apenas teclado
        if (this.inputManager.isKeyDown('ArrowLeft')) {
            this.player.velocityX = -CONFIG.PLAYER_SPEED;
            this.player.direction = -1;
        } else if (this.inputManager.isKeyDown('ArrowRight')) {
            this.player.velocityX = CONFIG.PLAYER_SPEED;
            this.player.direction = 1;
        } else {
            this.player.velocityX = 0;
        }
        
        // Pular com a barra de espaço ou seta para cima
        if ((this.inputManager.isKeyDown(' ') || this.inputManager.isKeyDown('ArrowUp')) && !this.player.isJumping) {
            this.player.jump();
        }
        
        // Atualizar entidades
        this.player.update(deltaTime);
        this.platforms.forEach(platform => platform.update());
        this.enemies.forEach(enemy => enemy.update());
        this.coins.forEach(coin => coin.update());
        this.backgroundElements.forEach(bg => bg.update(this.player.velocityX));
        this.powerUps.forEach(powerUp => powerUp.update());
        
        // Verificar colisões
        this.checkCollisions();
        
        // Atualizar câmera
        this.updateCamera();
    }
    
    checkCollisions() {
        // Colisão com plataformas
        this.platforms.forEach(platform => {
            const playerBounds = this.player.getBounds();
            const platformBounds = platform.getBounds();
            
            if (CollisionManager.checkCollision(this.player, platform)) {
                // Calcular sobreposição em cada direção
                const overlapLeft = playerBounds.right - platformBounds.left;
                const overlapRight = platformBounds.right - playerBounds.left;
                const overlapTop = playerBounds.bottom - platformBounds.top;
                const overlapBottom = platformBounds.bottom - playerBounds.top;
                
                // Encontrar a menor sobreposição
                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
                
                // Resolver colisão baseado na menor sobreposição
                if (minOverlap === overlapTop && this.player.velocityY >= 0) {
                    // Colisão por cima
                    this.player.y = platformBounds.top - this.player.height;
                    this.player.velocityY = 0;
                    this.player.isJumping = false;
                    
                    // Mover com a plataforma
                    if (platform.moveHorizontal) {
                        this.player.x += platform.speed * platform.direction;
                    }
                    if (platform.moveVertical) {
                        this.player.y += platform.speed * platform.direction;
                    }
                } else if (minOverlap === overlapBottom && this.player.velocityY < 0) {
                    // Colisão por baixo
                    this.player.y = platformBounds.bottom;
                    this.player.velocityY = 0;
                } else if (minOverlap === overlapLeft && this.player.velocityX > 0) {
                    // Colisão pela esquerda
                    this.player.x = platformBounds.left - this.player.width;
                    this.player.velocityX = 0;
                } else if (minOverlap === overlapRight && this.player.velocityX < 0) {
                    // Colisão pela direita
                    this.player.x = platformBounds.right;
                    this.player.velocityX = 0;
                }
            }
        });
        
        // Colisão com inimigos
        this.enemies.forEach(enemy => {
            if (enemy.active && CollisionManager.checkCollision(this.player, enemy)) {
                const playerBounds = this.player.getBounds();
                const enemyBounds = enemy.getBounds();
                
                // Aumentar a margem para detecção de pulo na cabeça
                const headStompMargin = 15; // Aumentei de 5 para 15 pixels
                const minHorizontalOverlap = 10; // Mínimo de sobreposição horizontal requerida
                
                // Verificar se é um pulo na cabeça com margem maior
                const isHeadStomp = 
                    playerBounds.bottom <= enemyBounds.top + headStompMargin && 
                    this.player.velocityY >= 0 &&  // Qualquer movimento para baixo
                    (playerBounds.right - enemyBounds.left) > minHorizontalOverlap && 
                    (enemyBounds.right - playerBounds.left) > minHorizontalOverlap;

                if (isHeadStomp) {
                    // Jogador pula no inimigo
                    enemy.active = false;
                    this.player.velocityY = CONFIG.JUMP_FORCE * 0.6; // Reduzi o impulso
                    this.score += CONFIG.ENEMY_DEFEAT_VALUE;
                    // Ajuste mais suave da posição
                    this.player.y = enemyBounds.top - this.player.height + 2;
                } else if (!this.player.invulnerable) {
                    // Reduzir força do empurrão
                    const pushBackForce = 10;
                    if (this.player.x < enemy.x) {
                        this.player.x -= pushBackForce;
                        this.player.velocityX = -pushBackForce;
                    } else {
                        this.player.x += pushBackForce;
                        this.player.velocityX = pushBackForce;
                    }
                    
                    if (this.player.loseLife()) {
                        this.gameOver = true;
                        this.victory = false;
                    }
                }
            }
        });
        
        // Colisão com moedas
        this.coins.forEach(coin => {
            if (coin.active && CollisionManager.checkCollision(this.player, coin)) {
                coin.active = false;
                this.score += CONFIG.COIN_VALUE;
            }
        });
        
        // Colisão com power-ups
        this.powerUps.forEach(powerUp => {
            if (powerUp.active && CollisionManager.checkCollision(this.player, powerUp)) {
                this.activatePowerUp(powerUp);
                powerUp.active = false;
            }
        });
        
        // Colisão com checkpoints
        this.checkpoints.forEach(checkpoint => {
            if (!checkpoint.activated && CollisionManager.checkCollision(this.player, checkpoint)) {
                checkpoint.activate();
                this.gameComplete(); // Completar o jogo ao atingir o checkpoint
            }
        });
    }
    
    activatePowerUp(powerUp) {
        this.powerUpActive = powerUp.type;
        this.powerUpTimer = 5000; // 5 segundos
        
        // Guardar as imagens originais do jogador
        this.player.originalImages = {
            idle: this.player.animations.idle.frames[0],
            walking: [...this.player.animations.walking.frames],
            jumping: this.player.animations.jumping.frames[0]
        };
        
        switch (powerUp.type) {
            case 'speed':
                CONFIG.PLAYER_SPEED = 7.5;  // 1.5x velocidade normal
                
                // Usar a nova imagem para o power-up de velocidade
                const speedImage = 'player_speed';
                this.player.animations.idle.frames = [speedImage];
                this.player.animations.walking.frames = [speedImage];
                this.player.animations.jumping.frames = [speedImage];
                
                // Adicionar efeito visual - brilho vermelho
                this.player.powerUpColor = 'red';
                break;
                
            case 'jump':
                CONFIG.JUMP_FORCE = -15.6;  // 1.3x força de pulo normal
                
                // Usar a nova imagem para o power-up de pulo
                const jumpImage = 'player_jump_power';
                this.player.animations.idle.frames = [jumpImage];
                this.player.animations.walking.frames = [jumpImage];
                this.player.animations.jumping.frames = [jumpImage];
                
                // Adicionar efeito visual - brilho verde
                this.player.powerUpColor = 'lime';
                break;
                
            case 'invincibility':
                this.player.makeInvulnerable(5000);
                
                // Usar a nova imagem para o power-up de invencibilidade
                const invincibleImage = 'player_invincible';
                this.player.animations.idle.frames = [invincibleImage];
                this.player.animations.walking.frames = [invincibleImage];
                this.player.animations.jumping.frames = [invincibleImage];
                
                // Adicionar efeito visual - brilho dourado
                this.player.powerUpColor = 'gold';
                break;
        }
        
        // Reiniciar a animação atual para mostrar a nova imagem imediatamente
        const currentState = this.player.state;
        this.player.animations[currentState].stop();
        this.player.animations[currentState].start();
    }
    
    updateCamera() {
        // Seguir o jogador horizontalmente com suavização
        const targetX = Math.max(0, this.player.x - canvas.width / 3);
        this.camera.x += (targetX - this.camera.x) * 0.1;
        
        // Não limitar a câmera para permitir avançar indefinidamente
    }

    render() {
        // Remover verificação de titleScreen
        if(this.loading) {
            this.renderLoadingScreen();
            return;
        }
        
        // Limpar o canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Desenhar fundo
        const backgroundImage = this.resourceManager.getImage('background');
        if (backgroundImage) {
            // Paralaxe simples para o fundo
            const bgOffset = this.camera.x * 0.3;
            ctx.drawImage(backgroundImage, -bgOffset, 0, canvas.width, canvas.height);
        } else {
            // Fallback para um gradiente simples
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
            gradient.addColorStop(0, '#87CEEB');
            gradient.addColorStop(1, '#E0F7FA');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Salvar o contexto antes de aplicar a transformação da câmera
        ctx.save();
        
        // Aplicar transformação da câmera
        ctx.translate(-this.camera.x, 0);
        
        // Desenhar elementos de fundo
        this.backgroundElements.forEach(bg => bg.draw());
        
        // Desenhar o chão em segmentos, pulando os buracos
        let lastX = 0;
        const groundSegments = [];
        
        this.holes.forEach(hole => {
            if (lastX < hole.x) {
                groundSegments.push({ x: lastX, width: hole.x - lastX });
            }
            lastX = hole.x + hole.width;
        });
        
        if (lastX < 5000) {
            groundSegments.push({ x: lastX, width: 5000 - lastX });
        }
        
        // Desenhar cada segmento de chão
        groundSegments.forEach(segment => {
            // Terra
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(segment.x, CONFIG.GROUND_HEIGHT, segment.width, canvas.height - CONFIG.GROUND_HEIGHT);
            
            // Grama
            ctx.fillStyle = '#7CFC00';
            ctx.fillRect(segment.x, CONFIG.GROUND_HEIGHT, segment.width, 10);
        });
        
        // Desenhar buracos com fundo do céu
        this.holes.forEach(hole => {
            if (backgroundImage) {
                const bgOffset = this.camera.x * 0.3;
                ctx.save();
                ctx.beginPath();
                ctx.rect(hole.x, 0, hole.width, canvas.height);
                ctx.clip();
                ctx.drawImage(backgroundImage, -bgOffset, 0, canvas.width, canvas.height);
                ctx.restore();
            } else {
                const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                gradient.addColorStop(0, '#87CEEB');
                gradient.addColorStop(1, '#E0F7FA');
                ctx.fillStyle = gradient;
                ctx.fillRect(hole.x, 0, hole.width, canvas.height);
            }
        });
        
        // Desenhar entidades - Alterado a ordem para que os inimigos apareçam em primeiro plano
        [...this.platforms, ...this.coins].forEach(entity => {
            if (!this.offscreenEntities.has(entity)) {
                entity.draw();
            }
        });
        this.powerUps.forEach(powerUp => powerUp.draw());
        this.checkpoints.forEach(checkpoint => checkpoint.draw());
        this.player.draw();
        
        // Desenhar inimigos por último para que fiquem em primeiro plano
        this.enemies.forEach(enemy => {
            if (!this.offscreenEntities.has(enemy)) {
                enemy.draw();
            }
        });
        
        // Restaurar o contexto
        ctx.restore();
        
        // Desenhar UI (não afetada pela câmera)
        this.drawUI();
        
        // Desenhar tela de game over se necessário
        if (this.gameOver) {
            this.drawGameOver();
        }
        
        // Desenhar tela de pausa se necessário
        if (this.paused) {
            this.drawPauseScreen();
        }
    }
    drawUI() {
        ctx.save(); // Salvar estado do contexto
        const iconSize = '24px';
        const padding = 40;
    
        // Ícone de pontuação (moeda do Mario)
        ctx.font = `${iconSize} FontAwesome`;
        ctx.fillStyle = '#FFD700'; // Amarelo ouro
        ctx.fillText('\uf005', 20, 40); // Ícone de estrela
        ctx.fillStyle = 'white';
        ctx.font = '20px "Press Start 2P"'; // Fonte pixelada
        ctx.fillText(`${this.score}`, 60, 40);
    
        // Ícone de vidas (cogumelo)
        ctx.fillStyle = '#FF6B6B'; // Vermelho vivo
        ctx.font = `${iconSize} FontAwesome`;
        ctx.fillText('\uf004', 20, 80); // Ícone de coração
        ctx.fillStyle = 'white';
        ctx.font = '20px "Press Start 2P"';
        ctx.fillText(`x${this.player.lives}`, 60, 80);
    
        // Power-up ativo com barra de progresso
        if (this.powerUpActive) {
            ctx.fillStyle = '#9370DB'; // Roxo
            ctx.font = `${iconSize} FontAwesome`;
            ctx.fillText('\uf0e7', 20, 120); // Ícone de raio
            ctx.fillStyle = 'white';
            ctx.fillText(`${this.powerUpActive}`, 60, 120);
    
            // Barra de progresso estilizada
            ctx.fillStyle = '#4B0082';
            ctx.fillRect(20, 130, 200, 10);
            ctx.fillStyle = '#DA70D6';
            ctx.fillRect(20, 130, (this.powerUpTimer / 1000) * 33, 10); // 33px por segundo
        }
        ctx.restore(); // Restaurar estado original
    }
    
    drawGameOver() {
        ctx.save(); // Salvar estado do contexto
        const time = Date.now() * 0.001; // Tempo para animações
        
        // Fundo animado com gradiente radial pulsante
        const gradient = ctx.createRadialGradient(
            canvas.width/2, canvas.height/2, 
            100 + 50*Math.sin(time*2), 
            canvas.width/2, canvas.height/2, 
            canvas.width
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
        gradient.addColorStop(1, 'rgba(25, 25, 25, 0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Configurações de texto
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Título principal com efeito de arco-íris e contorno duplo
        const titleY = 200 + 10*Math.sin(time*2);
        const gradientText = ctx.createLinearGradient(
            0, titleY - 50, 0, titleY + 50
        );
        
        let mainMessage, subMessage;
        if (this.victory) {
            mainMessage = 'Vitória!';
            subMessage = 'Você alcançou a bandeira!';
        } else if (this.deathByHole) {
            mainMessage = 'Queda Fatal!';
            subMessage = 'O abismo te engoliu...';
        } else {
            mainMessage = 'Game Over';
            subMessage = 'Tente novamente!';
        }

        ctx.font = '64px "Press Start 2P"';
        ctx.lineWidth = 8;
        
        // Contorno duplo para melhor contraste
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.strokeText(mainMessage, canvas.width/2, titleY);
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.strokeText(mainMessage, canvas.width/2, titleY);
        
        ctx.fillStyle = gradientText;
        ctx.fillText(mainMessage, canvas.width/2, titleY);

        // Ícone de vitória animado
        if (this.victory) {
            ctx.save();
            ctx.font = '96px FontAwesome';
            ctx.fillStyle = '#FFEC6C';
            ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
            ctx.shadowBlur = 20;
            ctx.fillText('\uf024', canvas.width/2, titleY + 120 + 10*Math.sin(time*3));
            ctx.restore();
        }

        // Seção de pontuação com efeito de brilho
        ctx.save();
        ctx.font = '48px FontAwesome';
        ctx.fillStyle = '#C0C0C0';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
        ctx.shadowBlur = 15;
        ctx.fillText('\uf091', canvas.width/2 - 120, 380);
        
        // Pontuação fixa
        ctx.font = '32px "Press Start 2P"';
        ctx.fillStyle = '#00FF00';
        ctx.shadowBlur = 0;
        ctx.fillText(
            this.score.toString(),
            canvas.width/2 + 20, 
            380
        );
        ctx.restore();

        // Instrução de reiniciar com efeito de piscar
        ctx.font = '24px FontAwesome';
        ctx.fillStyle = '#00FF00';
        ctx.shadowColor = 'rgba(0, 255, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillText('\uf0e7', canvas.width/2 - 40, 450 + 10*Math.sin(time*2));
        
        ctx.font = '18px "Press Start 2P"';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(subMessage, canvas.width/2, titleY + 50);

        // Partículas flutuantes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        for(let i = 0; i < 50; i++) {
            ctx.beginPath();
            ctx.arc(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                Math.random() * 2,
                0, Math.PI*2
            );
            ctx.fill();
        }

        // Add hole-specific effects
        if (this.deathByHole) {
            // Dark vortex animation
            ctx.save();
            ctx.beginPath();
            ctx.arc(canvas.width/2, canvas.height/2 + 100, 50 + 20*Math.sin(time*3), 0, Math.PI*2);
            const gradient = ctx.createRadialGradient(
                canvas.width/2, canvas.height/2 + 100, 10,
                canvas.width/2, canvas.height/2 + 100, 70
            );
            gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(139, 0, 0, 0.5)');
            ctx.fillStyle = gradient;
            ctx.fill();
            ctx.restore();

            // Falling particles
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            for(let i = 0; i < 20; i++) {
                ctx.beginPath();
                ctx.arc(
                    canvas.width/2 + Math.random()*100 - 50,
                    canvas.height/2 + 150 + (time*100 % 300),
                    2 + Math.random()*3,
                    0, Math.PI*2
                );
                ctx.fill();
            }
        }
        ctx.restore(); // Restaurar estado original
    }
    
    drawPauseScreen() {
        ctx.save(); // Salvar estado do contexto
        // Fundo estilizado
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    
        // Ícone de pausa grande
        ctx.font = '96px FontAwesome';
        ctx.fillStyle = '#1E90FF';
        ctx.textAlign = 'center';
        ctx.fillText('\uf04c', canvas.width/2, 250); // Ícone de pausa
    
        // Texto de instrução
        ctx.font = '24px "Press Start 2P"';
        ctx.fillStyle = 'white';
        ctx.fillText('PRESSIONE P PARA CONTINUAR', canvas.width/2, 350);
    
        // Adicionar detalhes de botão
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width/2 - 100, 360, 200, 50);
        ctx.font = '18px FontAwesome';
        ctx.fillStyle = '#40E0D0';
        ctx.fillText('\uf11b', canvas.width/2 - 70, 400); // Ícone de gamepad
        ctx.restore(); // Restaurar estado original
    }

    async loadGameResources() {
        try {
            this.renderLoadingScreen();
            
            // Carregar recursos primeiro
            await this.resourceManager.loadAll();
            
            // Inicializar levelManager APÓS carregar recursos
            this.levelManager = new LevelManager(this.resourceManager);
            
            // Só resetar depois de tudo carregado
            this.reset();
            
            // Garantir que sai do estado de loading
            this.loading = false;
            
            // Forçar redesenho imediato
            this.render();
            
        } catch (error) {
            console.error('Erro no carregamento:', error);
            this.loading = false;
            this.titleScreen = true; // Volta para a tela inicial
            this.showErrorScreen();
        }
    }

    // Adicionar este método para debug
    showErrorScreen() {
        ctx.fillStyle = '#ffebee';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#d32f2f';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Erro ao carregar recursos!', canvas.width/2, canvas.height/2 - 30);
        ctx.fillText('Recarregue a página para tentar novamente', canvas.width/2, canvas.height/2 + 30);
        
        // Botão de recarregar
        ctx.fillStyle = '#1976d2';
        ctx.fillRect(canvas.width/2 - 75, canvas.height/2 + 60, 150, 40);
        ctx.fillStyle = 'white';
        ctx.fillText('Recarregar', canvas.width/2, canvas.height/2 + 85);
    }
}

// Inicializar e começar o jogo
window.onload = () => {
    const game = new Game();
    game.init();
    
    // Remover event listeners do menu
    canvas.removeEventListener('mousemove');
    canvas.removeEventListener('click');
};
