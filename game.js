// 切水果游戏 - 移动端优化版
class FruitSlicerGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // 自定义鼠标
        this.customCursor = document.getElementById('customCursor');
        this.slashContainer = document.getElementById('slashContainer');
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.slashTimer = 0;
        this.cursorActive = false;

        // 游戏状态
        this.isPlaying = false;
        this.score = 0;
        this.lives = 3;
        this.highScore = localStorage.getItem('fruitSlicerHighScore') || 0;

        // 游戏对象
        this.fruits = [];
        this.particles = [];
        this.slashTrail = [];
        this.scorePopups = [];

        // 鼠标/触摸轨迹
        this.mousePath = [];
        this.isMouseDown = false;

        // Combo 系统
        this.combo = 0;
        this.comboTimer = 0;
        this.lastSliceTime = 0;

        // 慢动作效果
        this.slowMotion = false;
        this.slowMotionTimer = 0;

        // 生成定时器
        this.spawnTimer = 0;
        this.spawnInterval = 100;

        // 难度
        this.difficulty = 1;
        this.frames = 0;

        // 屏幕震动
        this.shakeIntensity = 0;

        // 音效
        this.audioContext = null;

        // 响应式 Canvas 尺寸
        this.baseWidth = 800;
        this.baseHeight = 600;
        this.scale = 1;
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // 检测设备类型
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        // 隐藏鼠标（触摸设备）
        if (this.isTouch) {
            this.customCursor.style.display = 'none';
        }

        // 水果类型
        this.fruitTypes = [
            {
                name: 'watermelon',
                color: '#2d5016',
                innerColor: '#ff6b6b',
                seedColor: '#1a1a1a',
                radius: 50,
                points: 10,
                texture: 'striped',
                hasSeeds: true,
                leafColor: '#4a7c23',
                juiceColor: 'rgba(255, 107, 107, 0.8)'
            },
            {
                name: 'orange',
                color: '#ff8c00',
                innerColor: '#ffb347',
                radius: 45,
                points: 15,
                texture: 'dimpled',
                segments: 8,
                leafColor: '#228b22',
                juiceColor: 'rgba(255, 179, 71, 0.8)'
            },
            {
                name: 'kiwi',
                color: '#8b4513',
                innerColor: '#90ee90',
                radius: 42,
                points: 20,
                texture: 'fuzzy',
                hasSeeds: true,
                seedColor: '#1a1a1a',
                leafColor: '#6b8e23',
                juiceColor: 'rgba(144, 238, 144, 0.8)'
            },
            {
                name: 'strawberry',
                color: '#e63946',
                innerColor: '#ff6b7a',
                radius: 40,
                points: 25,
                texture: 'seeded',
                hasSeeds: true,
                seedColor: '#ffcc00',
                leafColor: '#228b22',
                juiceColor: 'rgba(255, 107, 122, 0.8)'
            },
            {
                name: 'blueberry',
                color: '#4169e1',
                innerColor: '#6495ed',
                radius: 38,
                points: 30,
                texture: 'smooth',
                leafColor: '#228b22',
                juiceColor: 'rgba(100, 149, 237, 0.8)'
            },
            {
                name: 'mango',
                color: '#ff6f00',
                innerColor: '#ffcc00',
                radius: 48,
                points: 35,
                texture: 'smooth',
                hasSeeds: false,
                leafColor: '#228b22',
                juiceColor: 'rgba(255, 204, 0, 0.8)'
            },
            // 特殊水果 - 金色奖励水果
            {
                name: 'golden',
                color: '#ffd700',
                innerColor: '#ffec8b',
                radius: 35,
                points: 100,
                texture: 'golden',
                hasSeeds: false,
                leafColor: '#228b22',
                juiceColor: 'rgba(255, 215, 0, 0.9)',
                isSpecial: true
            }
        ];

        this.bindEvents();
        this.updateUI();
    }

    // 响应式 Canvas 尺寸调整
    resizeCanvas() {
        const maxWidth = Math.min(window.innerWidth - 20, 800);
        const maxHeight = Math.min(window.innerHeight - 180, 600);

        // 计算合适的尺寸（保持 4:3 比例）
        let targetWidth = this.baseWidth;
        let targetHeight = this.baseHeight;

        if (targetWidth > maxWidth) {
            const ratio = maxWidth / targetWidth;
            targetWidth = maxWidth;
            targetHeight = this.baseHeight * ratio;
        }

        if (targetHeight > maxHeight) {
            const ratio = maxHeight / targetHeight;
            targetHeight = maxHeight;
            targetWidth = this.baseWidth * ratio;
        }

        // 设置 Canvas 显示尺寸
        this.canvas.style.width = targetWidth + 'px';
        this.canvas.style.height = targetHeight + 'px';

        // 设置 Canvas 实际分辨率（支持高 DPI）
        this.canvas.width = this.baseWidth;
        this.canvas.height = this.baseHeight;

        // 计算缩放比例
        this.scale = targetWidth / this.baseWidth;
        this.width = this.baseWidth;
        this.height = this.baseHeight;
    }

    bindEvents() {
        // 自定义鼠标移动
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.customCursor.style.left = this.mouseX + 'px';
            this.customCursor.style.top = this.mouseY + 'px';

            // 移动时旋转刀片
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;

            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;

            // 创建刀光轨迹
            if (this.isMouseDown && this.isPlaying) {
                this.slashTimer++;
                if (this.slashTimer % 2 === 0) {
                    this.createSlashEffect(e.clientX, e.clientY, angle);
                }
            }
        });

        this.canvas.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.mousePath = [];
            const pos = this.getCanvasCoordinates(e);
            this.mousePath.push(pos);

            // 点击特效 - 缩小外圈
            if (!this.isTouch) {
                this.customCursor.classList.add('cursor-active');
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.isMouseDown || !this.isPlaying) return;
            const pos = this.getCanvasCoordinates(e);
            this.mousePath.push({ x: pos.x, y: pos.y, time: Date.now() });
            this.slashTrail.push({ x: pos.x, y: pos.y, life: 15, maxLife: 15 });
            this.checkSlice(pos.x, pos.y);
        });

        this.canvas.addEventListener('mouseup', () => {
            this.isMouseDown = false;
            this.mousePath = [];
            this.slashTimer = 0;
            this.customCursor.classList.remove('cursor-active');
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isMouseDown = false;
            this.mousePath = [];
            this.customCursor.style.display = 'none';
            this.cursorBlade.style.display = 'none';
        });

        this.canvas.addEventListener('mouseenter', () => {
            if (this.isPlaying) {
                this.customCursor.style.display = 'block';
            }
        });

        // 触摸事件 - 支持多点触控
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.isMouseDown = true;
            this.mousePath = [];
            const touch = e.touches[0];
            const pos = this.getCanvasCoordinates(touch);
            this.mousePath.push(pos);

            // 触摸反馈
            if (this.isPlaying) {
                this.createTouchFeedback(pos.x, pos.y);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.isMouseDown || !this.isPlaying) return;

            // 支持多点触控切割
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                const pos = this.getCanvasCoordinates(touch);
                this.mousePath.push({ x: pos.x, y: pos.y, time: Date.now() });
                this.slashTrail.push({ x: pos.x, y: pos.y, life: 15, maxLife: 15 });
                this.checkSlice(pos.x, pos.y);
            }
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (e.touches.length === 0) {
                this.isMouseDown = false;
                this.mousePath = [];
            }
        });

        this.canvas.addEventListener('touchcancel', () => {
            this.isMouseDown = false;
            this.mousePath = [];
        });
    }

    // 获取 Canvas 坐标（考虑缩放）
    getCanvasCoordinates(event) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }

    // 触摸反馈效果
    createTouchFeedback(x, y) {
        const touchRing = document.createElement('div');
        touchRing.style.cssText = `
            position: fixed;
            left: ${x * this.scale}px;
            top: ${y * this.scale}px;
            width: 40px;
            height: 40px;
            border: 2px solid rgba(255, 215, 0, 0.8);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 9999;
            animation: touchRipple 0.3s ease-out forwards;
        `;
        document.body.appendChild(touchRing);
        setTimeout(() => touchRing.remove(), 300);
    }

    start() {
        this.isPlaying = true;
        this.score = 0;
        this.lives = 3;
        this.combo = 0;
        this.comboTimer = 0;
        this.fruits = [];
        this.particles = [];
        this.slashTrail = [];
        this.scorePopups = [];
        this.difficulty = 1;
        this.frames = 0;
        this.spawnInterval = 100;
        this.shakeIntensity = 0;
        this.slowMotion = false;

        // 触摸设备不显示自定义鼠标
        if (!this.isTouch) {
            this.customCursor.style.display = 'block';
        }

        document.getElementById('welcomeScreen').classList.add('hidden');
        document.getElementById('gameOverScreen').classList.add('hidden');

        this.initAudio();
        this.updateUI();
        this.gameLoop();
    }

    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        // 移动端需要用户交互后才能播放声音
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    playSound(type) {
        if (!this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        const now = this.audioContext.currentTime;

        switch (type) {
            case 'slice':
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(1200, now);
                oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.08);
                gainNode.gain.setValueAtTime(0.25, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                oscillator.start(now);
                oscillator.stop(now + 0.1);
                break;
            case 'slice_alt':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(900, now);
                oscillator.frequency.exponentialRampToValueAtTime(500, now + 0.1);
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                oscillator.start(now);
                oscillator.stop(now + 0.12);
                break;
            case 'bomb':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(200, now);
                oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.4);
                gainNode.gain.setValueAtTime(0.4, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                oscillator.start(now);
                oscillator.stop(now + 0.4);
                break;
            case 'combo':
                [523, 659, 784, 1046].forEach((freq, i) => {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(this.audioContext.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + i * 0.05);
                    gain.gain.setValueAtTime(0.15, now + i * 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.3);
                    osc.start(now + i * 0.05);
                    osc.stop(now + i * 0.05 + 0.3);
                });
                return;
            case 'highscore':
                [523, 659, 784, 1046, 1318].forEach((freq, i) => {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(this.audioContext.destination);
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + i * 0.1);
                    gain.gain.setValueAtTime(0.2, now + i * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.4);
                    osc.start(now + i * 0.1);
                    osc.stop(now + i * 0.1 + 0.4);
                });
                return;
            case 'whoosh':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(400, now);
                oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.1);
                gainNode.gain.setValueAtTime(0.15, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                oscillator.start(now);
                oscillator.stop(now + 0.15);
                break;
            case 'golden':
                // 金色水果特殊音效 - 更欢快的音阶
                [784, 988, 1175, 1568].forEach((freq, i) => {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(this.audioContext.destination);
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + i * 0.08);
                    gain.gain.setValueAtTime(0.2, now + i * 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.4);
                    osc.start(now + i * 0.08);
                    osc.stop(now + i * 0.08 + 0.4);
                });
                return;
        }
    }

    calculateArtisticTrajectory() {
        const minTargetY = this.height * 0.15;
        const maxTargetY = this.height * 0.35;
        const targetY = Math.random() * (maxTargetY - minTargetY) + minTargetY;

        const baseGravity = 0.05;
        const distanceToTravel = this.height - targetY;
        const initialVelocity = -Math.sqrt(2 * baseGravity * distanceToTravel);

        return {
            vy: initialVelocity * (0.95 + Math.random() * 0.1),
            gravity: baseGravity * (0.8 + Math.random() * 0.4),
            hoverTime: 3 + Math.random() * 4
        };
    }

    spawnFruit() {
        const rand = Math.random();
        const isBomb = rand < 0.08 * this.difficulty;
        const isGolden = rand > 0.92 && !isBomb; // 8% 概率生成金色水果

        const trajectory = this.calculateArtisticTrajectory();
        const margin = 80;
        const x = Math.random() * (this.width - margin * 2) + margin;

        if (isBomb) {
            this.fruits.push({
                type: 'bomb',
                x: x,
                y: this.height + 40,
                vx: (Math.random() - 0.5) * 1,
                vy: trajectory.vy,
                gravity: trajectory.gravity,
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                radius: 42,
                hoverFrames: trajectory.hoverTime,
                hoverTimer: 0,
                phase: 'rising'
            });
        } else if (isGolden) {
            // 金色奖励水果
            const fruitType = this.fruitTypes.find(f => f.name === 'golden');
            this.fruits.push({
                type: 'fruit',
                fruitType: fruitType,
                x: x,
                y: this.height + 40,
                vx: (Math.random() - 0.5) * 0.5,
                vy: trajectory.vy * 0.8, // 飞得更高
                gravity: trajectory.gravity * 0.8,
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.01,
                radius: fruitType.radius,
                sliced: false,
                hoverFrames: trajectory.hoverTime,
                hoverTimer: 0,
                phase: 'rising',
                wobble: Math.random() * Math.PI * 2,
                glow: true // 发光标记
            });
        } else {
            const fruitType = this.fruitTypes[Math.floor(Math.random() * this.fruitTypes.length)];

            this.fruits.push({
                type: 'fruit',
                fruitType: fruitType,
                x: x,
                y: this.height + 40,
                vx: (Math.random() - 0.5) * 0.8 + Math.sin(this.frames * 0.02) * 0.3,
                vy: trajectory.vy,
                gravity: trajectory.gravity,
                rotation: 0,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                radius: fruitType.radius,
                sliced: false,
                hoverFrames: trajectory.hoverTime,
                hoverTimer: 0,
                phase: 'rising',
                wobble: Math.random() * Math.PI * 2
            });
        }
    }

    checkSlice(mouseX, mouseY) {
        const now = Date.now();
        let slicedSomething = false;

        // 获取刀光轨迹的最后一个点
        const lastTrail = this.slashTrail.length > 0 ?
            this.slashTrail[this.slashTrail.length - 1] : null;
        const prevTrail = this.slashTrail.length > 1 ?
            this.slashTrail[this.slashTrail.length - 2] : null;

        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const fruit = this.fruits[i];

            if (fruit.sliced) continue;

            // 方法 1：检查鼠标当前位置
            const dx = mouseX - fruit.x;
            const dy = mouseY - fruit.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // 方法 2：检查刀光轨迹是否与水果相交（解决连续切割问题）
            let intersecting = false;
            if (prevTrail && lastTrail) {
                intersecting = this.lineCircleIntersection(
                    prevTrail.x, prevTrail.y,
                    lastTrail.x, lastTrail.y,
                    fruit.x, fruit.y,
                    fruit.radius
                );
            }

            if (distance < fruit.radius || intersecting) {
                slicedSomething = true;

                if (fruit.type === 'bomb') {
                    this.playSound('bomb');
                    this.shakeIntensity = 25;
                    // 炸弹爆炸特效
                    this.createBombExplosion(fruit.x, fruit.y);
                    this.fruits.splice(i, 1);
                    // 延迟结束游戏，让玩家看到爆炸效果
                    setTimeout(() => this.gameOver(), 500);
                    return;
                } else {
                    // 检查是否是金色水果
                    if (fruit.fruitType.isSpecial) {
                        this.playSound('golden');
                        this.createGoldenFlash(fruit.x, fruit.y);
                    } else {
                        this.playSound(Math.random() > 0.5 ? 'slice' : 'slice_alt');
                    }

                    fruit.sliced = true;

                    if (now - this.lastSliceTime < 400) {
                        this.combo++;
                        if (this.combo >= 3) {
                            this.showCombo(this.combo);
                            this.playSound('combo');

                            if (this.combo >= 5) {
                                this.triggerSlowMotion();
                            }
                        }
                    } else {
                        this.combo = 1;
                    }
                    this.lastSliceTime = now;
                    this.comboTimer = 80;

                    const points = fruit.fruitType.points * Math.min(this.combo, 5);
                    this.score += points;

                    this.scorePopups.push({
                        x: fruit.x,
                        y: fruit.y - 30,
                        points: points,
                        combo: this.combo,
                        life: 40,
                        maxLife: 40,
                        vy: -3
                    });

                    // 创建连击数字弹出效果
                    this.createComboPopup(fruit.x, fruit.y - 20, points, this.combo);

                    this.createSlicedFruit(fruit);
                    this.createJuiceSplash(fruit.x, fruit.y, fruit.fruitType, 25);
                    this.createParticles(fruit.x, fruit.y, fruit.fruitType.color, 12);
                    this.createFleshParticles(fruit.x, fruit.y, fruit.fruitType, 15);

                    this.fruits.splice(i, 1);
                    slicedSomething = true;
                    this.updateUI();
                }
            }
        }

        if (slicedSomething && this.combo > 1) {
            this.shakeIntensity = Math.min(this.shakeIntensity + 2, 5);
        }
    }

    triggerSlowMotion() {
        this.slowMotion = true;
        this.slowMotionTimer = 60;
        this.playSound('whoosh');

        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%);
            pointer-events: none;
            z-index: 100;
            animation: comboFlash 0.5s ease-out;
        `;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 500);
    }

    // 金色水果特效
    createGoldenFlash(x, y) {
        // 创建全屏闪光
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, transparent 70%);
            pointer-events: none;
            z-index: 9996;
            animation: goldenFlash 0.6s ease-out;
        `;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 600);

        // 金色粒子爆炸
        for (let i = 0; i < 30; i++) {
            this.particles.push({
                type: 'golden',
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                gravity: 0.2,
                radius: Math.random() * 5 + 3,
                color: '#ffd700',
                life: 60,
                maxLife: 60,
                sparkle: true
            });
        }
    }

    createSlicedFruit(fruit) {
        // 创建两半水果，向不同方向飞散
        for (let i = 0; i < 2; i++) {
            const direction = i === 0 ? -1 : 1;
            this.particles.push({
                type: 'slicedFruitHalf',
                x: fruit.x,
                y: fruit.y,
                vx: direction * (Math.random() * 4 + 3) + fruit.vx * 0.3,
                vy: fruit.vy * 0.5 - Math.random() * 2,
                gravity: 0.25,
                rotation: fruit.rotation,
                rotationSpeed: direction * (Math.random() * 0.15 + 0.1),
                color: fruit.fruitType.color,
                innerColor: fruit.fruitType.innerColor,
                radius: fruit.radius,
                life: 50 + Math.random() * 20,
                maxLife: 70,
                sliceDirection: i,
                fruitType: fruit.fruitType,
                wobble: 0
            });
        }

        // 添加果汁飞溅
        this.createJuiceSplash(fruit.x, fruit.y, fruit.fruitType, 20);
    }

    createJuiceSplash(x, y, fruitType, count) {
        for (let i = 0; i < count; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
            const speed = Math.random() * 8 + 4;

            this.particles.push({
                type: 'juice',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed * (Math.random() * 0.5 + 0.5),
                vy: Math.sin(angle) * speed,
                gravity: 0.25,
                radius: Math.random() * 4 + 3,
                color: fruitType.juiceColor,
                life: 50 + Math.random() * 20,
                maxLife: 70,
                trail: [],
                splash: false
            });
        }
    }

    createFleshParticles(x, y, fruitType, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;

            this.particles.push({
                type: 'flesh',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0.15,
                radius: Math.random() * 3 + 2,
                color: fruitType.innerColor,
                life: 40 + Math.random() * 20,
                maxLife: 60,
                shape: Math.floor(Math.random() * 3)
            });
        }
    }

    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 2;

            this.particles.push({
                type: 'particle',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0.08,
                radius: Math.random() * 4 + 2,
                color: color,
                life: 30 + Math.random() * 20,
                maxLife: 50
            });
        }
    }

    // 炸弹爆炸特效 - 升级版
    createBombExplosion(x, y) {
        // 全屏红色闪光
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(circle, rgba(255, 0, 0, 0.5) 0%, rgba(100, 0, 0, 0.3) 50%, transparent 70%);
            pointer-events: none;
            z-index: 9995;
            animation: bombFlash 0.8s ease-out;
        `;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 800);

        // 大量爆炸粒子
        for (let i = 0; i < 60; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 15 + 8;
            this.particles.push({
                type: 'bomb_explosion',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0.3,
                radius: Math.random() * 10 + 5,
                color: Math.random() > 0.5 ? '#ff4500' : '#333',
                life: 80 + Math.random() * 40,
                maxLife: 120,
                smoke: true
            });
        }

        // 烟雾粒子
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            this.particles.push({
                type: 'smoke',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                gravity: -0.05,
                radius: Math.random() * 20 + 15,
                color: 'rgba(100, 100, 100, 0.5)',
                life: 100 + Math.random() * 50,
                maxLife: 150
            });
        }
    }

    // 线段与圆相交检测（用于连切）
    lineCircleIntersection(x1, y1, x2, y2, cx, cy, r) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const fx = x1 - cx;
        const fy = y1 - cy;

        const a = dx * dx + dy * dy;
        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - r * r;

        let discriminant = b * b - 4 * a * c;

        if (discriminant < 0) {
            return false;
        }

        discriminant = Math.sqrt(discriminant);
        const t1 = (-b - discriminant) / (2 * a);
        const t2 = (-b + discriminant) / (2 * a);

        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
    }

    createExplosion(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 10 + 5;

            this.particles.push({
                type: 'explosion',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0.15,
                radius: Math.random() * 8 + 4,
                color: color,
                life: 50 + Math.random() * 30,
                maxLife: 80
            });
        }
    }

    // 创建刀光特效
    createSlashEffect(x, y, angle) {
        const slash = document.createElement('div');
        slash.className = 'slash';
        slash.style.left = x + 'px';
        slash.style.top = y + 'px';
        slash.style.width = '20px';
        slash.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
        this.slashContainer.appendChild(slash);

        setTimeout(() => slash.remove(), 250);
    }

    // 连击数字弹出效果
    createComboPopup(x, y, points, combo) {
        const popup = document.createElement('div');
        popup.className = 'combo-popup';

        // 根据连击数设置颜色
        let colors, fontSize;
        if (combo >= 10) {
            colors = ['#ff0000', '#ff8800', '#ffcc00'];
            fontSize = '42px';
        } else if (combo >= 5) {
            colors = ['#ff6b6b', '#ffa500', '#ffd700'];
            fontSize = '36px';
        } else if (combo >= 3) {
            colors = ['#ff9999', '#ffcc00', '#ffff99'];
            fontSize = '28px';
        } else {
            colors = ['#ffffff', '#ffffcc', '#cccccc'];
            fontSize = '24px';
        }

        const gradient = `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`;

        popup.style.cssText = `
            left: ${x}px;
            top: ${y}px;
            font-size: ${fontSize};
            background: ${gradient};
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-shadow: none;
            filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5));
        `;

        const text = combo >= 3 ? `+${points} (${combo}x!)` : `+${points}`;
        popup.textContent = text;
        document.body.appendChild(popup);

        setTimeout(() => popup.remove(), 800);
    }

    update() {
        this.frames++;

        if (this.slowMotion) {
            this.slowMotionTimer--;
            if (this.slowMotionTimer <= 0) {
                this.slowMotion = false;
            }
        }

        const timeScale = this.slowMotion ? 0.3 : 1;

        if (this.frames % 600 === 0) {
            this.difficulty += 0.15;
            this.spawnInterval = Math.max(40, this.spawnInterval - 5);
        }

        if (this.shakeIntensity > 0) {
            this.shakeIntensity *= 0.85;
            if (this.shakeIntensity < 0.5) this.shakeIntensity = 0;
        }

        this.spawnTimer++;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            const count = Math.floor(Math.random() * (this.difficulty * 1.5)) + 1;
            for (let i = 0; i < Math.min(count, 6); i++) {
                setTimeout(() => this.spawnFruit(), i * 120);
            }
        }

        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer <= 0) this.combo = 0;
        }

        for (let i = this.fruits.length - 1; i >= 0; i--) {
            const fruit = this.fruits[i];

            if (fruit.type === 'fruit') {
                fruit.wobble += 0.05 * timeScale;
                fruit.x += Math.sin(fruit.wobble) * 0.3 * timeScale;
            }

            fruit.x += fruit.vx * timeScale;
            fruit.y += fruit.vy * timeScale;

            const midpoint = this.height * 0.5;
            if (fruit.y < midpoint) {
                fruit.vy += fruit.gravity * 0.7 * timeScale;
            } else {
                fruit.vy += fruit.gravity * 1.2 * timeScale;
            }

            if (fruit.phase === 'rising' && fruit.vy > -0.5 && fruit.vy < 0.5) {
                fruit.phase = 'hovering';
                fruit.hoverTimer = fruit.hoverFrames;
            }

            if (fruit.phase === 'hovering') {
                fruit.hoverTimer--;
                fruit.vy *= 0.9;
                if (fruit.hoverTimer <= 0) {
                    fruit.phase = 'falling';
                }
            }

            fruit.rotation += fruit.rotationSpeed * timeScale;

            if (fruit.y > this.height + 60) {
                if (fruit.type === 'fruit' && !fruit.sliced) {
                    this.lives--;
                    this.createParticles(fruit.x, this.height, '#666', 8);
                    this.updateUI();
                    if (this.lives <= 0) {
                        this.gameOver();
                    }
                }
                this.fruits.splice(i, 1);
            }

            if (fruit.x < fruit.radius || fruit.x > this.width - fruit.radius) {
                fruit.vx *= -0.3;
                fruit.x = Math.max(fruit.radius, Math.min(this.width - fruit.radius, fruit.x));
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.x += p.vx * timeScale;
            p.y += p.vy * timeScale;
            p.vy += p.gravity * timeScale;
            p.rotation += p.rotationSpeed * timeScale;
            p.life--;

            if (p.type === 'juice') {
                if (!p.splash && p.vy > 0) {
                    p.trail.push({ x: p.x, y: p.y, life: 15, radius: p.radius });
                }
                if (p.y >= this.height - 10 && !p.splash) {
                    p.splash = true;
                    for (let j = 0; j < 3; j++) {
                        this.particles.push({
                            type: 'droplet',
                            x: p.x,
                            y: p.y,
                            vx: (Math.random() - 0.5) * 4,
                            vy: -Math.random() * 3 - 2,
                            gravity: 0.2,
                            radius: p.radius * 0.5,
                            color: p.color,
                            life: 20,
                            maxLife: 20
                        });
                    }
                }
            }

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        for (let i = this.scorePopups.length - 1; i >= 0; i--) {
            const popup = this.scorePopups[i];
            popup.y += popup.vy * timeScale;
            popup.vy += 0.1 * timeScale;
            popup.life--;
            if (popup.life <= 0) {
                this.scorePopups.splice(i, 1);
            }
        }

        for (let i = this.slashTrail.length - 1; i >= 0; i--) {
            this.slashTrail[i].life--;
            if (this.slashTrail[i].life <= 0) {
                this.slashTrail.splice(i, 1);
            }
        }
    }

    draw() {
        if (this.slowMotion) {
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.1)';
            this.ctx.fillRect(0, 0, this.width, this.height);
        }

        this.ctx.save();
        if (this.shakeIntensity > 0) {
            const dx = (Math.random() - 0.5) * this.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(dx, dy);
        }

        // 温馨背景 - 暖色调渐变
        const bgGradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        bgGradient.addColorStop(0, '#4a3728');
        bgGradient.addColorStop(0.5, '#3d2817');
        bgGradient.addColorStop(1, '#2a1a15');
        this.ctx.fillStyle = bgGradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 刀光轨迹
        if (this.slashTrail.length > 1) {
            // 外层光晕
            this.ctx.beginPath();
            this.ctx.moveTo(this.slashTrail[0].x, this.slashTrail[0].y);
            for (let i = 1; i < this.slashTrail.length; i++) {
                const point = this.slashTrail[i];
                const alpha = point.life / point.maxLife;
                this.ctx.strokeStyle = `rgba(100, 180, 255, ${alpha * 0.5})`;
                this.ctx.lineWidth = 8 + alpha * 8;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
                this.ctx.lineTo(point.x, point.y);
            }
            this.ctx.stroke();

            // 中层
            this.ctx.beginPath();
            this.ctx.moveTo(this.slashTrail[0].x, this.slashTrail[0].y);
            for (let i = 1; i < this.slashTrail.length; i++) {
                const point = this.slashTrail[i];
                const alpha = point.life / point.maxLife;
                this.ctx.strokeStyle = `rgba(150, 200, 255, ${alpha * 0.7})`;
                this.ctx.lineWidth = 5 + alpha * 5;
                this.ctx.lineTo(point.x, point.y);
            }
            this.ctx.stroke();

            // 核心白光
            this.ctx.beginPath();
            this.ctx.moveTo(this.slashTrail[0].x, this.slashTrail[0].y);
            for (let i = 1; i < this.slashTrail.length; i++) {
                const point = this.slashTrail[i];
                this.ctx.strokeStyle = `rgba(255, 255, 255, ${point.life / point.maxLife})`;
                this.ctx.lineWidth = 2;
                this.ctx.lineTo(point.x, point.y);
            }
            this.ctx.stroke();
        }

        // 绘制水果
        for (const fruit of this.fruits) {
            this.ctx.save();
            this.ctx.translate(fruit.x, fruit.y);
            this.ctx.rotate(fruit.rotation);

            if (fruit.type === 'bomb') {
                this.drawBomb(fruit);
            } else {
                // 金色水果发光效果
                if (fruit.fruitType.isSpecial) {
                    const glow = this.ctx.createRadialGradient(0, 0, fruit.radius * 0.5, 0, 0, fruit.radius * 1.5);
                    glow.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
                    glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
                    this.ctx.fillStyle = glow;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, fruit.radius * 1.5, 0, Math.PI * 2);
                    this.ctx.fill();
                }
                this.drawGradientFruit(this.ctx, fruit);
            }

            this.ctx.restore();
        }

        // 绘制粒子
        for (const particle of this.particles) {
            this.ctx.save();

            if (particle.type === 'slicedFruitHalf') {
                // 切开的水果半块 - 旋转飞散
                this.ctx.translate(particle.x, particle.y);
                this.ctx.rotate(particle.rotation);
                particle.wobble += 0.1;

                const gradient = this.ctx.createRadialGradient(
                    -particle.radius * 0.2, -particle.radius * 0.2, 0,
                    0, 0, particle.radius
                );
                gradient.addColorStop(0, this.lightenColor(particle.innerColor, 30));
                gradient.addColorStop(1, particle.innerColor);

                this.ctx.beginPath();
                if (particle.sliceDirection === 0) {
                    this.ctx.arc(0, 0, particle.radius, 0, Math.PI);
                    this.ctx.lineTo(0, 0);
                } else {
                    this.ctx.arc(0, 0, particle.radius, Math.PI, Math.PI * 2);
                    this.ctx.lineTo(0, 0);
                }
                this.ctx.fillStyle = gradient;
                this.ctx.fill();

                // 切面高光
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(-particle.radius, 0);
                this.ctx.lineTo(particle.radius, 0);
                this.ctx.stroke();

                // 果汁滴落效果
                if (particle.life > particle.maxLife * 0.5 && Math.random() > 0.7) {
                    this.particles.push({
                        type: 'juice',
                        x: particle.x,
                        y: particle.y,
                        vx: (Math.random() - 0.5) * 2,
                        vy: Math.random() * 3 + 2,
                        gravity: 0.3,
                        radius: Math.random() * 3 + 2,
                        color: particle.fruitType.juiceColor,
                        life: 30,
                        maxLife: 30,
                        trail: []
                    });
                }

            } else if (particle.type === 'slicedFruit') {
                this.ctx.translate(particle.x, particle.y);
                this.ctx.rotate(particle.rotation);

                const gradient = this.ctx.createRadialGradient(
                    -particle.radius * 0.2, -particle.radius * 0.2, 0,
                    0, 0, particle.radius
                );
                gradient.addColorStop(0, this.lightenColor(particle.innerColor, 30));
                gradient.addColorStop(1, particle.innerColor);

                this.ctx.beginPath();
                if (particle.sliceDirection === 0) {
                    this.ctx.arc(0, 0, particle.radius, 0, Math.PI);
                    this.ctx.lineTo(0, 0);
                } else {
                    this.ctx.arc(0, 0, particle.radius, Math.PI, Math.PI * 2);
                    this.ctx.lineTo(0, 0);
                }
                this.ctx.fillStyle = gradient;
                this.ctx.fill();

                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(-particle.radius, 0);
                this.ctx.lineTo(particle.radius, 0);
                this.ctx.stroke();

            } else if (particle.type === 'juice' || particle.type === 'droplet') {
                if (particle.type === 'juice') {
                    for (let i = particle.trail.length - 1; i >= 0; i--) {
                        const trail = particle.trail[i];
                        trail.life--;
                        if (trail.life <= 0) {
                            particle.trail.splice(i, 1);
                        }
                    }

                    for (const trail of particle.trail) {
                        this.ctx.beginPath();
                        this.ctx.arc(trail.x, trail.y, trail.radius * (trail.life / 15), 0, Math.PI * 2);
                        this.ctx.fillStyle = particle.color.replace(')', `, ${trail.life / 15 * 0.5})`).replace('rgba', 'rgba');
                        this.ctx.fill();
                    }
                }

                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = particle.color;
                this.ctx.fill();

                this.ctx.beginPath();
                this.ctx.arc(particle.x - particle.radius * 0.3, particle.y - particle.radius * 0.3, particle.radius * 0.3, 0, Math.PI * 2);
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
                this.ctx.fill();

            } else if (particle.type === 'flesh') {
                this.ctx.fillStyle = particle.color;
                this.ctx.beginPath();

                if (particle.shape === 0) {
                    this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                } else if (particle.shape === 1) {
                    this.ctx.ellipse(particle.x, particle.y, particle.radius * 1.5, particle.radius, 0, 0, Math.PI * 2);
                } else {
                    this.ctx.moveTo(particle.x, particle.y - particle.radius);
                    this.ctx.lineTo(particle.x + particle.radius, particle.y);
                    this.ctx.lineTo(particle.x, particle.y + particle.radius);
                    this.ctx.lineTo(particle.x - particle.radius, particle.y);
                    this.ctx.closePath();
                }
                this.ctx.fill();

            } else if (particle.type === 'golden') {
                // 金色闪烁粒子
                const alpha = particle.life / particle.maxLife;
                const sparkle = Math.sin(this.frames * 0.5) * 0.3 + 0.7;

                const gradient = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.radius
                );
                gradient.addColorStop(0, `rgba(255, 255, 255, ${sparkle})`);
                gradient.addColorStop(0.4, `rgba(255, 215, 0, ${alpha})`);
                gradient.addColorStop(1, `rgba(255, 140, 0, 0)`);

                this.ctx.globalAlpha = alpha;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = gradient;
                this.ctx.fill();

                // 绘制十字星光
                this.ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(particle.x - particle.radius * 2, particle.y);
                this.ctx.lineTo(particle.x + particle.radius * 2, particle.y);
                this.ctx.moveTo(particle.x, particle.y - particle.radius * 2);
                this.ctx.lineTo(particle.x, particle.y + particle.radius * 2);
                this.ctx.stroke();

            } else if (particle.type === 'bomb_explosion') {
                // 炸弹爆炸粒子
                const alpha = particle.life / particle.maxLife;
                this.ctx.globalAlpha = alpha;

                const gradient = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.radius
                );
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
                gradient.addColorStop(0.3, particle.color);
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');

                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = gradient;
                this.ctx.fill();

            } else if (particle.type === 'smoke') {
                // 烟雾粒子
                const alpha = particle.life / particle.maxLife * 0.5;
                this.ctx.globalAlpha = alpha;

                const gradient = this.ctx.createRadialGradient(
                    particle.x, particle.y, 0,
                    particle.x, particle.y, particle.radius
                );
                gradient.addColorStop(0, 'rgba(150, 150, 150, 0.6)');
                gradient.addColorStop(1, 'rgba(100, 100, 100, 0)');

                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = gradient;
                this.ctx.fill();

            } else {
                const alpha = particle.life / particle.maxLife;
                this.ctx.globalAlpha = alpha;

                if (particle.type === 'explosion') {
                    const gradient = this.ctx.createRadialGradient(
                        particle.x, particle.y, 0,
                        particle.x, particle.y, particle.radius
                    );
                    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
                    gradient.addColorStop(0.5, particle.color);
                    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');

                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                    this.ctx.fillStyle = gradient;
                    this.ctx.fill();
                } else {
                    this.ctx.beginPath();
                    this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
                    this.ctx.fillStyle = particle.color;
                    this.ctx.fill();
                }
            }

            this.ctx.restore();
        }

        // 绘制分数弹出
        for (const popup of this.scorePopups) {
            const alpha = popup.life / popup.maxLife;
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.font = 'bold 24px Segoe UI';
            this.ctx.textAlign = 'center';

            this.ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 2;

            const pointsText = popup.combo >= 3 ? `+${popup.points} (${popup.combo}x!)` : `+${popup.points}`;
            this.ctx.fillStyle = popup.combo >= 3 ? '#ffd700' : '#fff';
            this.ctx.fillText(pointsText, popup.x, popup.y);
            this.ctx.restore();
        }

        // 慢动作提示
        if (this.slowMotion) {
            this.ctx.save();
            this.ctx.font = 'bold 20px Segoe UI';
            this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = 'rgba(255, 215, 0, 1)';
            this.ctx.shadowBlur = 15;
            this.ctx.fillText('⚡ SLOW MOTION ⚡', this.width / 2, 50);
            this.ctx.restore();
        }

        this.ctx.restore();
    }

    drawBomb(fruit) {
        const { radius } = fruit;

        const bombGradient = this.ctx.createRadialGradient(
            -radius * 0.3, -radius * 0.3, 0,
            0, 0, radius
        );
        bombGradient.addColorStop(0, '#333');
        bombGradient.addColorStop(0.5, '#1a1a1a');
        bombGradient.addColorStop(1, '#0a0a0a');

        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = bombGradient;
        this.ctx.fill();

        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(-radius * 0.5 + i * radius * 0.5, -radius * 0.3);
            this.ctx.lineTo(radius * 0.5 - i * radius * 0.5, radius * 0.3);
            this.ctx.stroke();
        }

        this.ctx.strokeStyle = '#8b4513';
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -radius * 0.8);
        this.ctx.quadraticCurveTo(10, -radius * 1.2, 15, -radius * 1.1);
        this.ctx.stroke();

        const sparkSize = 6 + Math.sin(this.frames * 0.8) * 4;
        const sparkGradient = this.ctx.createRadialGradient(
            15, -radius * 1.1, 0,
            15, -radius * 1.1, sparkSize
        );
        sparkGradient.addColorStop(0, '#fff');
        sparkGradient.addColorStop(0.3, '#ffcc00');
        sparkGradient.addColorStop(0.6, '#ff6600');
        sparkGradient.addColorStop(1, 'rgba(255, 69, 0, 0)');

        this.ctx.fillStyle = sparkGradient;
        this.ctx.beginPath();
        this.ctx.arc(15, -radius * 1.1, sparkSize, 0, Math.PI * 2);
        this.ctx.fill();

        const pulseAlpha = 0.2 + Math.sin(this.frames * 0.3) * 0.1;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, radius * 1.1, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(255, 0, 0, ${pulseAlpha})`;
        this.ctx.fill();
    }

    drawGradientFruit(ctx, fruit) {
        const { fruitType } = fruit;
        const radius = fruit.radius;

        const outerGradient = ctx.createRadialGradient(
            -radius * 0.3, -radius * 0.3, 0,
            0, 0, radius
        );

        if (fruitType.texture === 'striped') {
            outerGradient.addColorStop(0, '#3d6b1e');
            outerGradient.addColorStop(0.3, fruitType.color);
            outerGradient.addColorStop(0.5, '#1a3d0f');
            outerGradient.addColorStop(0.7, fruitType.color);
            outerGradient.addColorStop(1, '#1a3d0f');
        } else if (fruitType.texture === 'dimpled') {
            outerGradient.addColorStop(0, '#ffa500');
            outerGradient.addColorStop(0.5, fruitType.color);
            outerGradient.addColorStop(1, '#cc5500');
        } else if (fruitType.texture === 'fuzzy') {
            outerGradient.addColorStop(0, '#a0522d');
            outerGradient.addColorStop(1, '#654321');
        } else if (fruitType.texture === 'golden') {
            // 金色水果特殊渐变
            outerGradient.addColorStop(0, '#fffacd');
            outerGradient.addColorStop(0.5, '#ffd700');
            outerGradient.addColorStop(1, '#ff8c00');
        } else {
            outerGradient.addColorStop(0, this.lightenColor(fruitType.color, 30));
            outerGradient.addColorStop(0.5, fruitType.color);
            outerGradient.addColorStop(1, this.darkenColor(fruitType.color, 30));
        }

        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = outerGradient;
        ctx.fill();

        const highlightGradient = ctx.createRadialGradient(
            -radius * 0.4, -radius * 0.4, 0,
            -radius * 0.4, -radius * 0.4, radius * 0.3
        );
        highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.beginPath();
        ctx.arc(-radius * 0.4, -radius * 0.4, radius * 0.25, 0, Math.PI * 2);
        ctx.fillStyle = highlightGradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.88, 0, Math.PI * 2);

        const innerGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 0.88);
        innerGradient.addColorStop(0, this.lightenColor(fruitType.innerColor, 20));
        innerGradient.addColorStop(0.7, fruitType.innerColor);
        innerGradient.addColorStop(1, fruitType.innerColor);

        ctx.fillStyle = innerGradient;
        ctx.fill();

        if (fruitType.hasSeeds && fruitType.name === 'watermelon') {
            this.drawWatermelonSeeds(ctx, radius);
        } else if (fruitType.hasSeeds && fruitType.name === 'kiwi') {
            this.drawKiwiSeeds(ctx, radius);
        } else if (fruitType.hasSeeds && fruitType.name === 'strawberry') {
            this.drawStrawberrySeeds(ctx, radius);
        } else if (fruitType.segments) {
            this.drawOrangeSegments(ctx, radius, fruitType.segments);
        }

        this.drawFruitLeaf(ctx, fruitType, radius);
    }

    lightenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.min(255, (num >> 16) + amt);
        const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
        const B = Math.min(255, (num & 0x0000FF) + amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    darkenColor(hex, percent) {
        const num = parseInt(hex.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = Math.max(0, (num >> 16) - amt);
        const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
        const B = Math.max(0, (num & 0x0000FF) - amt);
        return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
    }

    drawWatermelonSeeds(ctx, radius) {
        ctx.fillStyle = '#1a1a1a';
        const seedPositions = [
            [-15, -10], [15, -10], [0, 15],
            [-20, 5], [20, 5], [-10, 25], [10, 25]
        ];
        for (const [x, y] of seedPositions) {
            ctx.beginPath();
            ctx.ellipse(x, y, 3, 5, Math.random(), 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawKiwiSeeds(ctx, radius) {
        ctx.fillStyle = '#1a1a1a';
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const dist = radius * 0.5 * Math.random() + radius * 0.2;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawStrawberrySeeds(ctx, radius) {
        ctx.fillStyle = '#ffcc00';
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * radius * 0.7;
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawOrangeSegments(ctx, radius, segments) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * radius * 0.85, Math.sin(angle) * radius * 0.85);
            ctx.stroke();
        }
    }

    drawFruitLeaf(ctx, fruitType, radius) {
        ctx.fillStyle = fruitType.leafColor || '#228b22';
        ctx.beginPath();
        ctx.ellipse(radius * 0.3, -radius * 0.9, 8, 4, -0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#4a3728';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -radius * 0.95);
        ctx.quadraticCurveTo(5, -radius * 1.1, 8, -radius * 1.05);
        ctx.stroke();
    }

    updateUI() {
        const scoreEl = document.getElementById('score');
        const highScoreEl = document.getElementById('highScore');

        scoreEl.style.transform = 'scale(1.3)';
        scoreEl.style.transition = 'transform 0.1s';
        setTimeout(() => {
            scoreEl.style.transform = 'scale(1)';
        }, 100);

        scoreEl.textContent = this.score;
        highScoreEl.textContent = this.highScore;

        if (this.score >= this.highScore && this.score > 0) {
            highScoreEl.parentElement.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.8)';
        } else {
            highScoreEl.parentElement.style.boxShadow = '';
        }

        let hearts = '';
        for (let i = 0; i < this.lives; i++) {
            hearts += '<span style="display:inline-block; animation: heartBeat 0.3s;">❤️</span>';
        }
        document.getElementById('lives').innerHTML = hearts;
    }

    gameOver() {
        this.isPlaying = false;

        // 隐藏自定义鼠标
        this.customCursor.style.display = 'none';
        this.customCursor.classList.remove('cursor-active');

        const isNewRecord = this.score > this.highScore;

        if (isNewRecord) {
            this.highScore = this.score;
            localStorage.setItem('fruitSlicerHighScore', this.highScore);
            this.playSound('highscore');
            document.getElementById('newRecord').classList.remove('hidden');
        } else {
            document.getElementById('newRecord').classList.add('hidden');
        }

        document.getElementById('finalScore').textContent = `最终得分：${this.score}`;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }

    gameLoop() {
        if (!this.isPlaying) return;

        this.update();
        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    }
}

// 启动游戏
const game = new FruitSlicerGame();
