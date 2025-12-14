// CNelson - Great Balls of Fire 2
// Press L + P to skip levels for testing
//Boot Scene
function BootScene() { Phaser.Scene.call(this, { key: "BootScene" }); }
BootScene.prototype = Object.create(Phaser.Scene.prototype);
BootScene.prototype.constructor = BootScene;

BootScene.prototype.preload = function () {
    //Load assets
    this.load.spritesheet("player", "assets/player.png", {
        frameWidth: 64,
        frameHeight: 64
    });
    //Background music
    this.load.audio("cast", "assets/cast.mp3");
    this.load.audio("key_pickup", "assets/key_pickup.mp3");
    this.load.audio("evade", "assets/evade.mp3");
    this.load.audio("bgm",  "assets/bgm.mp3");
    this.load.audio("boss_bgm",  "assets/boss_bgm.mp3");
    this.load.audio("winTheme", "assets/winTheme.mp3");
    this.load.audio("loseTheme", "assets/loseTheme.mp3");
    this.load.image("darkbackground", "assets/dark_background.png");
    this.load.image("background", "assets/background.png");
    this.load.image("lava", "assets/lava.png");
    this.load.image("keySprite", "assets/key.png");
    this.load.image("healthSprite", "assets/health.png");
    this.load.atlas("ui", "assets/nine-slice.png", "assets/nine-slice.json");
    this.load.image("projectile", "assets/projectile.png");
    this.load.atlas("shapes", "assets/shapes.png", "assets/shapes.json");
    this.load.atlas("flares", "assets/flares.png", "assets/flares.json");
    this.load.image("bossProjectile", "assets/bossProjectile.png");
    this.load.spritesheet("enemySheet", "assets/enemy.png", {
        frameWidth: 153,
        frameHeight: 362,
    });
    this.load.image("door", "assets/door.png");
};

BootScene.prototype.create = function () {
    //Unlock audio on first interaction
    this.input.once("pointerdown", () => {
    if (this.sound.locked) this.sound.unlock();

    //Start bgm
    this.game.playBGM("bgm");
});
   
    //Player anims
    this.anims.create({
        key: "walk_down",
        frames: this.anims.generateFrameNumbers("player", { start: 18, end: 23 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: "walk_up",
        frames: this.anims.generateFrameNumbers("player", { start: 6, end: 11 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: "walk_right",
        frames: this.anims.generateFrameNumbers("player", { start: 12, end: 17 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: "walk_left",
        frames: this.anims.generateFrameNumbers("player", { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: "idle",
        frames: this.anims.generateFrameNumbers("player", { frames: [18, 21] }),
        frameRate: 4,
        repeat: -1
    });

    this.anims.create({
        key: "enemy-walk",
        frames: this.anims.generateFrameNumbers("enemySheet", { start: 0, end: 8 }),
        frameRate: 8,
        repeat: -1
    });
    this.scene.start("OpeningScene");
};
//Player shoot ext method
Phaser.Scene.prototype.shootAtPointer = function (pointer) {
    if (!this.player || !this.player.body || !this.canShoot) return;

    this.canShoot = false;
    this.time.delayedCall(this.shootCooldown, () => (this.canShoot = true));

    const worldX = pointer.worldX ?? pointer.x;
    const worldY = pointer.worldY ?? pointer.y;

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldX, worldY);

    const offset = 24;
    const spawnX = this.player.x + Math.cos(angle) * offset;
    const spawnY = this.player.y + Math.sin(angle) * offset;

    const proj = this.physics.add.sprite(spawnX, spawnY, "projectile");
    proj.isPlayerProjectile = true;
    proj.body.setAllowGravity(false);
    proj.body.setCollideWorldBounds(false);

    this.playerProjectiles.add(proj);

    proj.body.setVelocity(Math.cos(angle) * 450, Math.sin(angle) * 450);
    proj.setRotation(angle);

    proj.body.checkCollision.none = true;
    this.time.delayedCall(200, () => {
        if (proj && proj.body) proj.body.checkCollision.none = false;
    });

    const particles = this.add.particles("flares");
    const emitter = particles.createEmitter({
        frame: "white",
        color: [0x96e0da, 0x937ef3],
        colorEase: "quart.out",
        lifespan: 500,
        alpha: { start: 0.9, end: 0 },
        scale: { start: 0.25, end: 0, ease: "sine.in" },
        speed: { min: 20, max: 60 },
        quantity: 2,
        frequency: 40,
        blendMode: "ADD"
    });

    emitter.startFollow(proj);
    proj.on("destroy", () => {
        emitter.stop();
        particles.destroy();
    });
    this.time.delayedCall(1200, () => proj?.destroy?.());

    if (this.game && this.game.playSFX)
        this.game.playSFX("cast");
};
//Handle Player Movement function
Phaser.Scene.prototype.handlePlayerMovement = function (movement) {
    if (!this.player || !this.player.body) return;

    //If evading, skip manual control
    if (this.isEvading) return;
    
    let mvx = 0, mvy = 0;
    const speed = this.player.speed ?? 150;

    //Movement input
    if (this.A.isDown || this.cursors.left.isDown)  mvx = -speed;
    else if (this.D.isDown || this.cursors.right.isDown) mvx = speed;

    if (this.W.isDown || this.cursors.up.isDown)    mvy = -speed;
    else if (this.S.isDown || this.cursors.down.isDown) mvy = speed;

    this.player.body.setVelocity(mvx, mvy);

    //Update facing direction for shooting & evade
    if (mvx !== 0 || mvy !== 0) {
        const L = Math.hypot(mvx, mvy) || 1;
        this.lastMove.x = mvx / L;
        this.lastMove.y = mvy / L;
    }

    //Animations
    if (mvx < 0) this.player.play("walk_left", true);
    else if (mvx > 0) this.player.play("walk_right", true);
    else if (mvy < 0) this.player.play("walk_up", true);
    else if (mvy > 0) this.player.play("walk_down", true);
    else this.player.play("idle", true);
}
//Pits effects
Phaser.Scene.prototype.lavaPit = function (pit) {
    this.lavaParticles = this.add.particles("shapes");
    this.lavaParticles.setDepth(3);
    const emitter = this.lavaParticles.createEmitter({
        frame: "scorch_03",
        tint: [0xff4400, 0xffaa00, 0xff6600],
        emitZone: {
            type: "edge",
            source: new Phaser.Geom.Rectangle(
                -pit.width,
                -pit.height,
                pit.width,
                pit.height
                
            ),
            quantity: 20,
            stepRate: 0,
        },

        speedY: { min: -10, max: -20 },
        speedX: { min: -30, max: 30 },
        gravityY: -1,

        lifespan: { min: 700, max: 1000 },

        scale: { start: 0.25, end: 0.05, ease: "sine.out" },
        alpha: { start: .8, end: 0 },

        blendMode: "ADD"
    });

    emitter.startFollow(pit, pit.width / 2, pit.height / 2);
    pit.lavaEmitter = emitter;
};
//Pit smoke emitter
Phaser.Scene.prototype.smokeEmitter = function (pit) {

    if (!this.smokeParticles) {
        this.smokeParticles = this.add.particles("shapes");
        this.smokeParticles.setDepth(4);
    }

    const emitter = this.smokeParticles.createEmitter({
        frame: "smoke_04",

        emitZone: {
            type: "edge",
            source: new Phaser.Geom.Rectangle(
                -pit.width,
                -pit.height,
                pit.width,
                pit.height
            ),
            quantity: 6
        },

        speedY: { min: -10, max: -25 },
        speedX: { min: -5, max: 5 },

        lifespan: { min: 1200, max: 1800 },

        scale: { start: 0.2, end: 0.8 },
        alpha: { start: 1.5, end: 0 },

        frequency: 300,
        blendMode: "NORMAL"
    });

    emitter.startFollow(pit, pit.width / 2, pit.height / 2);
    pit.smokeEmitter = emitter;
};

//Opening Scene
function OpeningScene() { Phaser.Scene.call(this, { key: "OpeningScene" }); }
OpeningScene.prototype = Object.create(Phaser.Scene.prototype);
OpeningScene.prototype.constructor = OpeningScene;
OpeningScene.prototype.create = function () {
    this.add.text(150, 60,
        "Great Balls of Fire 2",
        { fontSize: "50px", color: "#00e1ffff", align: "center", fontStyle: "bold",
          fontFamily: "Tahoma" }
          
    );
    this.add.text(150, 100,
        "\n-The Prequel-\nThe Unending Quest for Stuff",
        { fontSize: "35px", color: "#00e1ffff", align: "center", fontFamily: "Tahoma" }
    );
    this.add.text(120, 200,
        "\n\nDefeat all enemies\n\nCollect keys to open doors\n\n WASD to Move\nLeft click to shoot at pointer\nRight Click to evade\n Collect All 4 to open the last door and defeat the Fire Boss\n\nPress SPACE to Start",
        { fontSize: "20px", color: "#0d92ebff", align: "center", fontFamily: "Tahoma" }
    );
    this.input.keyboard.once("keydown-SPACE", () => this.scene.start("Room1", { hp: 100, keys: 0 }));
};

//Base Rooms (Rooms 1-4)
class BaseRoom extends Phaser.Scene {
    constructor(key) { super(key); this.roomKey = key; }
    
    init(data) {
        this.maxHP = 100;
        this.hp = (typeof data.hp === "number") ? data.hp : this.maxHP;
        this.keys = (typeof data.keys === "number") ? data.keys : 0;

        //Movement
        this.lastMove = { x: 0, y: -1 }; //fallback facing shoot direction
        this.canEvade = true;
        this.isEvading = false;

        //Invulnerability
        this.isInvulnerable = false;
        this.invulnDuration = 1000; // ms

        //Lava pit tick time
        this.lastPitDamageAt = 0;

        //Shooting cooldown
        this.canShoot = true;
        this.shootCooldown = 600; // ms

        //Key spawning flag
        this.hasSpawnedKey = false;
    }
    isSpawnPositionSafe(x, y) {
    //Pillars check
    for (const p of this.pillars.getChildren()) {
        if (Phaser.Geom.Intersects.RectangleToRectangle(
            new Phaser.Geom.Rectangle(x - 14, y - 14, 28, 28),
            p.getBounds()
        )) {
            return false;
        }
    }
    //Pits check
    for (const pit of this.pits.getChildren()) {
        if (Phaser.Geom.Intersects.RectangleToRectangle(
            new Phaser.Geom.Rectangle(x - 14, y - 14, 28, 28),
            pit.getBounds()
        )) {
            return false;
        }
    }
    return true;
}
    create() {

    this.debugL = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
    this.debugP = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    //Escape key for pause menu
    this.keyESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    //Play Boss BGM
    this.game.stopBGM();
    this.game.playBGM("boss_bgm", { loop: true });

    //DEBUG key binding
    this.debugJumpHandler = () => {
    if (this.debugL.isDown && this.debugP.isDown) {
        
        const hpToPass = (typeof this.hp === "number") ? this.hp : 100;
        console.log("DEBUG: Jumping to NextRoom (keys=+1, hp=" + hpToPass + ")");

        //Remove listener to avoid duplicates
        this.input.keyboard.off("keydown", this.debugJumpHandler, this);
        this.debugBindInstalled = false;

        this.scene.start("BossRoom", { hp: hpToPass, keys: this.keys + 1 });

        this.time.delayedCall(50, () => {
            this.game.playBGM("boss_bgm");
        });
    }
};

    //Keydown listener
    this.input.keyboard.on("keydown-L", this.debugJumpHandler, this);
    this.input.keyboard.on("keydown-P", this.debugJumpHandler, this);
       
    //Background
    this.bg = this.add.tileSprite(400, 300, 800, 600, "darkbackground");
    this.bg.setOrigin(0.5, 0.5);
    this.bg.tileScaleX = 0.05;
    this.bg.tileScaleY = 0.05;

    //Static walls
    this.walls = this.physics.add.staticGroup();
    const top = this.add.rectangle(400, 25, 800, 35).setOrigin(0.5);
    //fillRectangle(x, y, width, height)
    const bottom = this.add.rectangle(400, 575, 800, 35).setOrigin(0.5);
    const left = this.add.rectangle(10, 300, 35, 500).setOrigin(0.5);
    const right = this.add.rectangle(790, 300, 35, 500).setOrigin(0.5);
    [top, bottom, left, right].forEach(r => { this.physics.add.existing(r, true); this.walls.add(r); });

    //Pillars & pits
    this.pillars = this.physics.add.staticGroup();
    this.pits = this.physics.add.staticGroup();
    this.lavaParticles = this.add.particles("shapes");
    this.spawnPillarsAndPits();
    this.pits.getChildren().forEach(pit => {
    this.lavaPit(pit);
    this.smokeEmitter(pit);
});

    
    //Player
    this.player = this.physics.add.sprite(80, 200, "player", 0);
    this.player.setScale(1);
    this.player.setCollideWorldBounds(true);
    //Compute hitbox size
    this.player.body.setSize(20, 35);
    this.player.speed = 150;
    //HealthBar
    this.player.maxHp = this.maxHP;   //Reads player.maxHp
    this.player.hp = this.hp;         //Reads player.hp

    //Creates external HealthBar UI
    this.hpUI = new HealthBar(this, 20, 20, this.player);


    //Collisions with environment
    this.walls.getChildren().forEach(b => this.physics.add.collider(this.player, b));
    this.physics.add.collider(this.player, this.pillars);

        //Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.W = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.A = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.S = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.D = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        this.evadeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT); //optional

        //Mouse right-click dodge
        this.input.on("pointerdown", pointer => {
        if (pointer.leftButtonDown()) this.shootAtPointer(pointer);
        if (pointer.rightButtonDown()) this.evade();
    });
        //Disable context menu on right-click
        this.input.mouse.disableContextMenu();
        
        //Projectiles groups (player)
        this.playerProjectiles = this.physics.add.group({ runChildUpdate: true });

        //Projectiles vs environment -> destroy
        this.physics.add.collider(this.playerProjectiles, this.pillars, (proj) => { if (proj && proj.destroy) proj.destroy(); });
        this.physics.add.collider(this.playerProjectiles, this.walls, (proj) => { if (proj && proj.destroy) proj.destroy(); });

        //Stop player from hitting themselves with bullets
        //Uses a collider callback - returns false
        this.physics.add.collider(this.player, this.playerProjectiles,
            null,
            function () { return false; }, //Ignore collision
            this
        );

        //Player animations
        if (this.textures.exists("playerSprite")) {
        this.anims.create({
        key: "idle",
        frames: this.anims.generateFrameNumbers("player", { start: 0, end: 0 }),
        frameRate: 1,
        repeat: -1
    });

    }
        //Enemy animations
        if (this.textures.exists("enemySheet")) {
        this.anims.create({
        key: "enemy-idle",
        frames: this.anims.generateFrameNumbers("enemySheet", { start: 0 , end: 5 }),
        frameRate: 8,
        repeat: -1
    });
    } 
    else {
    console.error("enemySheet texture not loaded! check filename in preload()");
    }

        this.enemies = this.physics.add.group();
        this.spawnEnemiesSafe(7, { x: this.player.x, y: this.player.y }, 120);
        //Enemy collisions vs environment
        this.walls.getChildren().forEach(b => this.physics.add.collider(this.enemies, b));
        this.physics.add.collider(this.enemies, this.pillars);
        //Key spawning
        this.keysGroup = this.physics.add.group();

        this.physics.add.overlap(this.player, this.keysGroup, (player, key) => {
            key.destroy();
            this.keys += 1;
            this.game.playSFX("key_pickup");
        });

        //Overlap player & enemies => damage & knockback
        this.physics.add.overlap(this.player, this.enemies, (player, enemy) => this.handlePlayerEnemyOverlap(enemy));

        //Player projectiles hit enemies
        this.physics.add.overlap(this.playerProjectiles, this.enemies, (a, b) => {
            //Projectile vs enemy ident
            const proj = (a && a.isPlayerProjectile) ? a : (b && b.isPlayerProjectile) ? b : null;
            const enemy = (proj === a) ? b : a;
            if (!proj || !enemy) return;

            //Destroy projectile on hit (prevent multi-hit)
            if (proj.destroy) proj.destroy();

            //Enemy hp
            if (enemy.hp === undefined) enemy.hp = 50;

            //Subtract damage
            enemy.hp -= 25;

            //If 0hp remove enemy
           if (enemy.hp <= 0) {

        if (enemy.idleTimer) enemy.idleTimer.remove();
        enemy.destroy();

        //Health drop chance
        if (Phaser.Math.Between(0, 100) < 30) {
            this.spawnHealthDrop(enemy.x, enemy.y);
        }

        //Last enemy drops a key
        if (this.enemies.countActive(true) === 0) {
        this.spawnKey(enemy.x, enemy.y);
    }

    }

        });

        //Health pickups
        this.items = this.physics.add.group();
        this.physics.add.overlap(this.player, this.items, (p, item) => {
            if (!item) return;
            if (item.isHealth) {
                if (item.destroy) item.destroy();
                this.hp = Math.min(this.maxHP, this.hp + 25);
                this.updateHUD();
            }
        });

        //Pits damage player on overlap with cooldown
        this.physics.add.overlap(this.player, this.pits, () => {
            const now = this.time.now;
            if (now - this.lastPitDamageAt > 800) {
                this.lastPitDamageAt = now;
                this.applyPlayerDamage(10, { knockback: false });
            }
        });


        //Init HUD values
        this.updateHUD();
    }

    //Spawn pillars & pits
    spawnPillarsAndPits() {
        const pillarCount = Phaser.Math.Between(2, 6);
        const pitCount = Phaser.Math.Between(2, 4);
        const avoid = [{ x: 100, y: 300, r: 120 }, { x: 600, y: 300, r: 120 }];
        const isTooClose = (x, y) => avoid.some(z => Phaser.Math.Distance.Between(x, y, z.x, z.y) < z.r);

        for (let i = 0; i < pillarCount; i++) {
            let tries = 0;
            while (tries++ < 30) {
                const x = Phaser.Math.Between(160, 640), y = Phaser.Math.Between(120, 480);
                if (!isTooClose(x, y)) {
                    const w = Phaser.Math.Between(40, 80), h = Phaser.Math.Between(40, 80);
                //Pillar texture
                const pillar = this.add.tileSprite(x, y, w, h, "background");
                pillar.setOrigin(0.5);
                pillar.tileScaleX = 0.05;
                pillar.tileScaleY = 0.05;
                pillar.setTint(0x888888);
                pillar.setDepth(200);

                //Pillar hitbox
                const hitbox = this.add.rectangle(x, y, w, h);
                this.physics.add.existing(hitbox, true);
                hitbox.owner = pillar;
                this.pillars.add(hitbox);

                break;

                }
            }
        }
        for (let i = 0; i < pitCount; i++) {
    let tries = 0;
    while (tries++ < 30) {
        const x = Phaser.Math.Between(160, 640),
              y = Phaser.Math.Between(120, 480);

        if (!isTooClose(x, y)) {
            const w = Phaser.Math.Between(60, 120),
                  h = Phaser.Math.Between(30, 60);

            //Moving-texture lava pit
            const pit = this.add.tileSprite(x, y, w, h, "lava");
            pit.setOrigin(0.5);             
            //Enable static physics
            pit.isLavaPit = true;

        // Pit static hitbox
        const hitbox = this.add.rectangle(x, y, w, h);
        this.physics.add.existing(hitbox, true);
        hitbox.owner = pit;
        this.pits.add(hitbox);
                    pit.tileScaleX = 0.05;
                    pit.tileScaleY = 0.05;
                    break;
                }
            }
        }

}

    //Enemy Spawn
    spawnEnemiesSafe(count, center, minDist = 48) {
        for (let i = 0; i < count; i++) {
        let tries = 0, placed = false;

        while (!placed && tries++ < 80) {

            const x = Phaser.Math.Between(120, 680);
            const y = Phaser.Math.Between(80, 520);

            if (Phaser.Math.Distance.Between(x, y, center.x, center.y) >= minDist) {

                const e = this.physics.add.sprite(x, y, "enemySheet");
                console.log("spawned enemy at", x, y, "textureExists:", this.textures.exists("enemySheet"));

                e.setScale(.25);

                let w = e.body.width;
                let h = e.body.height;
                let radius = w * 0.45; //Tweak radius scale
                e.body.setCircle(radius,
                    (w / 2) - radius,    //Center X
                    (h / 1.2) - radius   //Center Y
                );

                e.play("enemy-idle");
                e.setDepth(5);
                e.setAlpha(1);

                e.hp = 50;
                e.speed = Phaser.Math.Between(45, 110);
                e.setCollideWorldBounds(true);

                this.enemies.add(e);
                placed = true;
            }
        }

        if (!placed) {
            const e = this.physics.add.sprite(center.x, center.y, "enemySheet");

            e.setScale(0.25);

            let w = e.body.width;
            let h = e.body.height;

            let radius = w * 0.45; //Tweak radius

            e.body.setCircle(radius, 
                (w) - radius,    //center X
                (h) - radius     //center Y
            );

            e.play("enemy-idle");
            e.setDepth(5);
            e.setAlpha(1);
            e.hp = 50;
            e.speed = Phaser.Math.Between(40, 70);
            e.setCollideWorldBounds(true);
            this.enemies.add(e);
        }
    }
}
    //Key and Health Drop
    spawnKey(x, y) {
    if (this.hasSpawnedKey) return;
    this.hasSpawnedKey = true;

    //Create key
    const key = this.physics.add.sprite(x, y, "keySprite");
    key.setScale(0.5);
    this.keyItem = key;

    //Float animation
    this.tweens.add({
        targets: key,
        y: key.y - 4,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
    });

    //Pickup trigger
    this.physics.add.overlap(this.player, key, () => {
        this.keys++;
        key.destroy();
        this.keyItem = null;

        this.spawnDoor();
    });
}
    spawnHealthDrop(x, y) {
    const drop = this.physics.add.sprite(x, y, "healthSprite");

    //Health drop scale
    drop.setScale(0.5);
  
    //Health drop bobbing
    this.tweens.add({
        targets: drop,
        y: drop.y - 3,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
    });

    drop.isHealth = true;
    this.items.add(drop);

    //Auto-despawn health drop in 6 seconds
    this.time.delayedCall(6000, () => {
        if (drop && drop.destroy) drop.destroy();
    });
}
    
    //Doors
    spawnDoor() {
        if (this.exitDoor) return;
        this.exitDoor = this.physics.add.staticSprite(750, 300, 40, 80);
        this.exitDoor.setScale(.2);
        this.exitDoor.body.setSize(40, 80);   //Width/height of hitbox
        this.exitDoor.body.setOffset(0, -20); //Centering

        this.exitDoor.setTexture("door");
        this.physics.add.overlap(this.player, this.exitDoor, () => this.gotoNextRoom());
    }

     spawnAfterImage() {
        const ghost = this.add.sprite(
        this.player.x,
        this.player.y,
        "player",
        this.player.frame.name   
);
        this.sound.play("evade", {
        volume: this.game.sfxVolume ?? 1
    });

        this.tweens.add({
            targets: ghost,
            alpha: 0,
            scale: this.player.scale * 0.8,
            duration: 200,
            onComplete: () => ghost.destroy()
        });
    }
    

    //Evade
    evade() {
    
    if (!this.canEvade || this.isEvading) return;

    const dir = this.getInputDirOrLast();
    if (!dir || (dir.x === 0 && dir.y === 0)) return;
    this.time.addEvent({
        delay: 30,
        repeat: 3,
        callback: () => this.spawnAfterImage()
    });
    const L = Math.hypot(dir.x, dir.y) || 1;
    const nx = dir.x / L, ny = dir.y / L;

    this.applyEvadeVelocity(nx, ny);
    this.time.delayedCall(200, () => {
    });
    
    }

    getInputDirOrLast() {
        let dx = 0, dy = 0;
        if (this.A.isDown || this.cursors.left.isDown) dx = -1;
        else if (this.D.isDown || this.cursors.right.isDown) dx = 1;
        if (this.W.isDown || this.cursors.up.isDown) dy = -1;
        else if (this.S.isDown || this.cursors.down.isDown) dy = 1;
        if (dx === 0 && dy === 0) return { x: this.lastMove.x, y: this.lastMove.y };
        return { x: dx, y: dy };
    }

    //Damage application and knockback
    applyPlayerDamage(amount, options = { knockback: true, source: null }) {
        if (this.isInvulnerable) return;
        this.hp = Math.max(0, this.hp - amount);
        this.updateHUD();
        this.hpUI.update();

        //Knockback if hit by an enemy or projectile
        if (options.knockback && options.source) {
            const src = options.source;
            const dx = (this.player.x - src.x);
            const dy = (this.player.y - src.y);
            const L = Math.hypot(dx, dy) || 1;
            const kx = (dx / L) * 320;
            const ky = (dy / L) * 320;
            if (this.player && this.player.body) this.player.body.setVelocity(kx, ky);
        }

        //Invulnerability blink
        this.isInvulnerable = true;
        const blinkCount = Math.ceil(this.invulnDuration / 120);
        let blink = 0;
        const blinkTimer = this.time.addEvent({
            delay: 120,
            callback: () => {
                if (!this.player) return;
                this.player.alpha = (this.player.alpha === 1) ? 0.25 : 1;
                blink++;
                if (blink >= blinkCount) {
                    if (this.player) this.player.alpha = 1;
                    this.isInvulnerable = false;
                    blinkTimer.remove(false);
                }
            },
            loop: true
        });

        if (this.hp <= 0) {
            this.time.delayedCall(500, () => this.scene.start("GameOverScene"));
        }
    }
    
    //Player & Enemy overlap
    handlePlayerEnemyOverlap(enemy) {
        if (!enemy) return;
        if (this.isInvulnerable) return;
        this.applyPlayerDamage(10, { knockback: true, source: enemy });
    }

        updateHUD() {
        if (this.hpText) this.hpText.setText("HP: " + this.hp + " / " + this.maxHP);
        if (this.keyText) this.keyText.setText("Key: " + this.keys);

        // Keep the player object fields in sync for HealthBar
        if (this.player) {
            this.player.hp = this.hp;
            this.player.maxHp = this.maxHP;
        }

        //Update the external HealthBar
        if (this.hpUI && typeof this.hpUI.update === "function") {
            this.hpUI.update();
        }
    }

    applyEvadeVelocity(nx, ny) {
    this.isEvading = true;
    this.canEvade = false;

    //Set fast movement
    this.player.body.setVelocity(nx * 520, ny * 520);
    
    //End evade
    this.time.delayedCall(220, () => {
        if (this.player && this.player.body) {
            this.player.body.setVelocity(0, 0);
        }
        this.isEvading = false;

        this.time.delayedCall(300, () => {
            this.canEvade = true;
        });
    });
}

    //Update loop
    update() {
    //Pause menu
    if (this.keyESC && Phaser.Input.Keyboard.JustDown(this.keyESC)) {
    this.scene.pause();
    this.scene.launch("PauseMenu", { parent: this.scene.key });
    return;
}


    //Evade input
    if (Phaser.Input.Keyboard.JustDown(this.evadeKey)) {
        this.evade();
        return;
    }

    //Unified movement
    this.handlePlayerMovement();

    //Pits animation
    this.pits.getChildren().forEach(hitbox => {
    const pit = hitbox.owner;
    if (!pit) return;

    pit.tilePositionX += 0.08;
    pit.tilePositionY += 0.03;

    const pulse = Math.sin(this.time.now * 0.005) * 0.15 + 0.85;
    pit.setAlpha(pulse);
});

    //Enemy AI
    const detectionRadius = (this.player.displayWidth || 32) * 5;
    this.enemies.getChildren().forEach(e => {
        if (!e || !e.body) return;
        const dist = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
        if (dist <= detectionRadius) {
            const ang = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
            e.body.setVelocity(Math.cos(ang) * e.speed, Math.sin(ang) * e.speed);
        } else {
            if (!e.idleTimer) {
                e.idleTimer = this.time.addEvent({
                    delay: Phaser.Math.Between(600, 1600),
                    callback: () => {
                        if (e && e.body)
                            e.body.setVelocity(Phaser.Math.Between(-20, 20), Phaser.Math.Between(-20, 20));
                    },
                    loop: true
                });
            }
        }
    });

    this.updateHUD();
}
    gotoNextRoom() { /* overridden by subclasses */ }
}

//Room classes
class Room1 extends BaseRoom { constructor() { super("Room1"); } gotoNextRoom() { this.scene.start("Room2", { hp: this.hp, keys: this.keys }); } }
class Room2 extends BaseRoom { constructor() { super("Room2"); } gotoNextRoom() { this.scene.start("Room3", { hp: this.hp, keys: this.keys }); } }
class Room3 extends BaseRoom { constructor() { super("Room3"); } gotoNextRoom() { this.scene.start("Room4", { hp: this.hp, keys: this.keys }); } }
class Room4 extends BaseRoom { constructor() { super("Room4"); } gotoNextRoom() { if (this.keys >= 4) this.scene.start("BossRoom", { hp: this.hp, keys: this.keys }); } }

//Boss room
class BossRoom extends Phaser.Scene {
    constructor() { super("BossRoom"); }

    init(data) {
        if ((data.keys || 0) < 4) {
            this.scene.start("Room4", data);
            return;
        }
        this.maxHP = 100;
        this.bossMaxHP = 1000;
        this.bossHP = 1000;
        this.hp = (typeof data.hp === "number") ? data.hp : this.maxHP;
        this.keys = (typeof data.keys === "number") ? data.keys : 4;
        this.lastMove = { x: 0, y: -1 };
        this.canEvade = true;
        this.isEvading = false;
        this.isInvulnerable = false;
        this.lastPitDamageAt = 0;
        this.lastBossContactDamageAt = 0;

        //Shooting cooldown
        this.canShoot = true;
        this.shootCooldown = 600; // ms

        //Boss invuln state to prevent rapid-multi hits
        this.bossInvuln = false;
        this.bossHP = 1000;
    }
    //Boss Create
    create() {
        this.time.delayedCall(50, () => {
        this.game.playBGM("bgm");
    });

        //Background
        this.bg = this.add.tileSprite(400, 300, 800, 600, "background");
        this.bg.tileScaleX = 0.05;
        this.bg.tileScaleY = 0.05;
        //Static walls
        this.walls = this.physics.add.staticGroup();
        const top = this.add.rectangle(400, 25, 800, 35).setOrigin(0.5);
        //fillRectangle(x, y, width, height)
        const bottom = this.add.rectangle(400, 575, 800, 35).setOrigin(0.5);
        const left = this.add.rectangle(10, 300, 35, 500).setOrigin(0.5);
        const right = this.add.rectangle(790, 300, 35, 500).setOrigin(0.5);
        [top, bottom, left, right].forEach(r => { this.physics.add.existing(r, true); this.walls.add(r); });

        //Player
        this.player = this.physics.add.sprite(80, 200, "player", 0);
        this.player.setScale(1);
        this.player.setCollideWorldBounds(true);
        //Compute hitbox size
        let w = this.player.body.width;
        let h = this.player.body.height;
        this.player.body.setSize(20, 35);
        this.player.speed = 150;
        //HealthBar
        this.player.maxHp = this.maxHP;   //HealthBar reads player.maxHp
        this.player.hp = this.hp;         //HealthBar reads player.hp
        this.hpUI = new HealthBar(this, 20, 20, this.player);
        
        //Shoot/evade input
        this.input.on("pointerdown", pointer => {
            if (pointer.leftButtonDown()) this.shootAtPointer(pointer);
            if (pointer.rightButtonDown()) this.evade();
        });

        //Disable browser right-click menu
        this.input.mouse.disableContextMenu();

        //Evade key
        this.evadeKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

        //Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.W = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
        this.A = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
        this.S = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
        this.D = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        
        //Boss
        this.boss = this.physics.add.sprite(300, 300, "enemySheet");
        this.boss.play("enemy-idle");
        this.boss.setScale(0.4);
        //Boss Hitbox
        let bw = this.boss.width;
        let bh = this.boss.height;
        let radius = bw * 0.35;
        this.boss.body.setCircle(
            radius,
            (bw / 2) - radius,  //center X
            (bh / 1.2 ) - radius    //center Y
        );
        this.bossSpeed = Phaser.Math.Between(30, 55);

        //Projectiles
        this.playerProjectiles = this.physics.add.group({
        allowGravity: false,
        collideWorldBounds: false,
        drag: 0,
        angularDrag: 0,
        setXY: {},
        runChildUpdate: false
        });

        this.bossProjectiles = this.physics.add.group({
        allowGravity: false,
        collideWorldBounds: false,
        immovable: false,
        dragX: 0,
        dragY: 0,
        runChildUpdate: false
    });
        //Pillars & pits
        this.pillars = this.physics.add.staticGroup();
        this.pits = this.physics.add.staticGroup();

        // Spawn visuals + hitboxes
        BaseRoom.prototype.spawnPillarsAndPits.call(this);

        // Attach lava + smoke EXACTLY like BaseRoom
        this.pits.getChildren().forEach(hitbox => {
            const pit = hitbox.owner;
            if (!pit) return;

            this.lavaPit(pit);
            this.smokeEmitter(pit);
        });


        //Player vs walls
        this.physics.add.collider(this.player, this.walls);

        //Player vs pillars
        this.physics.add.collider(this.player, this.pillars);

        //Boss vs walls
        this.physics.add.collider(this.boss, this.walls);

        //Boss vs pillars
        this.physics.add.collider(this.boss, this.pillars);

        //Player vs boss
        this.physics.add.collider(this.player, this.boss);
        this.physics.add.overlap(this.player, this.boss, () => {
            this.applyPlayerDamage(15, { knockback: true, source: this.boss });
        });

        //Player vs pits (overlap damage)
        this.physics.add.overlap(this.player, this.pits, () => {
            const now = this.time.now;
            if (now - this.lastPitDamageAt > 800) {
                this.lastPitDamageAt = now;
                this.applyPlayerDamage(5, { knockback: true });
            }
        });

        //Collisions: Player bullets -> Boss
        this.physics.add.overlap(this.playerProjectiles, this.boss, (a, b) => {
            //Identify projectile vs boss 
            const proj = (a && a.isPlayerProjectile) ? a : (b && b.isPlayerProjectile) ? b : null;
            const boss = (proj === a) ? b : a;
            if (!boss || !boss.active) return;
            if (!proj) return;

            //Destroy projectile on hit
            if (proj.destroy) proj.destroy();

            //If boss is invulnerable, ignore
            if (this.bossInvuln) return;

            //Apply damage
            this.bossHP -= 25;

            //If boss dead, destroy and win
            if (this.bossHP <= 0) {
                if (boss && boss.destroy) boss.destroy();
                this.scene.start("WinScene");
                return;
            }

            //Invul flash to avoid multi hits
            this.bossInvuln = true;
            if (boss.setAlpha) boss.setAlpha(0.4);
            this.time.delayedCall(150, () => {
                if (boss && boss.active && boss.setAlpha) boss.setAlpha(1);
                this.bossInvuln = false;
            });
        });
 
        //Boss bullets -> Player
        this.physics.add.overlap(this.bossProjectiles, this.player, (a, b) => {
            //Projectile vs player
            const proj = (a && a.isBossProjectile) ? a : (b && b.isBossProjectile) ? b : null;
            const player = (proj === a) ? b : a;
            if (!player || !player.active) return;
            if (!proj) return;

            //Destroy proj/apply player damage (invuln handled in applyPlayerDamage)
            if (proj.destroy) proj.destroy();
            this.applyPlayerDamage(12, { knockback: true, source: proj });
        });

        //Prevent boss projectiles colliding with boss itself
        this.physics.add.collider(
        this.boss,
        this.bossProjectiles,
        null,
        (boss, proj) => {
        proj.body.checkCollision.none = true;
        return false;
        },
        this
);

        //Player & Boss overlap damage
        this.physics.add.overlap(this.player, this.boss, () => {
            //If player invulnerable -overlap handler = early-return within applyPlayerDamage
            this.applyPlayerDamage(15, { knockback: true, source: this.boss });
        });

        //Lava pits damage player
        this.physics.add.overlap(this.player, this.pits, () => {
            const now = this.time.now;
            if (now - this.lastPitDamageAt > 800) {
                this.lastPitDamageAt = now;
                this.applyPlayerDamage(5, { knockback: true });
            }
        });

        //HUD
        this.createBossHealthBar();
        this.hpText = this.add.text(400, 20, "", { fontSize: "18px", color: "#525252ff" }).setOrigin(0.5, 0);
        this.bossText = this.add.text(
        this.hpBarX + this.hpBarW / 2,
        this.hpBarY + this.hpBarH / 2,
        "Boss HP: " + this.bossHP,
        { fontSize: "20px", color: "#000000ff", setStrokeStyle: "#7c7c7cff", strokeThickness: 2, depth: 999}).setOrigin(0.5);

        

        //Boss firing timer
        this.time.addEvent({ delay: 1200, loop: true, callback: () => this.bossFireAtPlayer() });

        //Stop player from hitting themselves with bullets in boss scene too (processCallback false)
        this.physics.add.collider(this.player, this.playerProjectiles,
            null,
            function () { return false; },
            this
        );

        //Projectiles VS Environment - destroy projectiles on collision
        this.physics.add.collider(this.playerProjectiles, this.pillars, (proj) => { if (proj && proj.destroy) proj.destroy(); });
        this.physics.add.collider(this.playerProjectiles, this.walls, (proj) => { if (proj && proj.destroy) proj.destroy(); });
        this.physics.add.collider(this.bossProjectiles, this.pillars, (proj) => { if (proj && proj.destroy) proj.destroy(); });
        this.physics.add.collider(this.bossProjectiles, this.walls, (proj) => { if (proj && proj.destroy) proj.destroy(); });

        this.updateHUD();
    }
    //Boss HealthBar
    createBossHealthBar() {
        this.hpBarBg = this.add.graphics();
        this.hpBarFill = this.add.graphics();
        this.hpBarX = 40; this.hpBarY = 560; this.hpBarW = 720; this.hpBarH = 20;
        this.hpBarBg.clear();
        this.hpBarBg.fillStyle(0x000000, 0.6);
        this.hpBarBg.fillRect(this.hpBarX - 2, this.hpBarY - 2, this.hpBarW + 4, this.hpBarH + 4);
    }

    //Afterimage spawn
     spawnAfterImage() {
        const ghost = this.add.sprite(
        this.player.x,
        this.player.y,
        "player",
        this.player.frame.name   
);
        //evade sound
        this.sound.play("evade", {
        volume: this.game.sfxVolume ?? 1
    });


        this.tweens.add({
            targets: ghost,
            alpha: 0,
            scale: this.player.scale * 0.8,
            duration: 200,
            onComplete: () => ghost.destroy()
        });
    }
    //Evade
    evade() {
        if (!this.canEvade || this.isEvading) return;
        const dir = this.getInputDirOrLast();
        if (!dir || (dir.x === 0 && dir.y === 0)) return;
        this.time.addEvent({
        delay: 30,
        repeat: 3,
        callback: () => this.spawnAfterImage()
        
    });
        const L = Math.hypot(dir.x, dir.y) || 1;
        const nx = dir.x / L, ny = dir.y / L;

        this.canEvade = false;
        this.isEvading = true;
        this.player.body.setVelocity(nx * 520, ny * 520);

        this.time.delayedCall(220, () => {
            if (this.player && this.player.body) this.player.body.setVelocity(0, 0);
            this.isEvading = false;
            this.time.delayedCall(300, () => { this.canEvade = true; });
        });
    }

    getInputDirOrLast() {
        let dx = 0, dy = 0;
        if (this.A.isDown || this.cursors.left.isDown) dx = -1;
        else if (this.D.isDown || this.cursors.right.isDown) dx = 1;
        if (this.W.isDown || this.cursors.up.isDown) dy = -1;
        else if (this.S.isDown || this.cursors.down.isDown) dy = 1;
        if (dx === 0 && dy === 0) return { x: this.lastMove.x, y: this.lastMove.y };
        return { x: dx, y: dy };
    }

   bossFireAtPlayer() {
    if (!this.boss || !this.player) return;
    const angle = Phaser.Math.Angle.Between(this.boss.x, this.boss.y, this.player.x, this.player.y);
    let spawnDistance = 80;
    let spawnX, spawnY;
    let safe = false;
    let attempts = 0;

    //Spawn projectile at
    while (!safe && attempts < 20) {
        spawnX = this.boss.x + Math.cos(angle) * spawnDistance;
        spawnY = this.boss.y + Math.sin(angle) * spawnDistance;
        safe = this.isSafeForProjectile(spawnX, spawnY);
        spawnDistance += 1;
        attempts++;
    }

    //Spawn boss projectile
    const proj = this.physics.add.sprite(spawnX, spawnY, "bossProjectile");
    proj.setScale(0.9);
    proj.body.setAllowGravity(false);
    proj.body.setBounce(0);
    proj.body.setDrag(2, 2);
    proj.body.setFriction(0, 0);
    proj.body.setCollideWorldBounds(false);

    proj.isBossProjectile = true;
    //Create trail emitter
    const particles = this.add.particles("shapes");
    const emitter = particles.createEmitter({
    frame: "flare_05",
    colorEase: "quart.out",  
    lifespan: 450,
    alpha: { start: 0.9, end: 0 },
    scale: { start: 0.4, end: 0, ease: "sine.in"},
    speed: { min: 20, max: 60 },
    quantity: 2,
    frequency: 40,
    blendMode: "ADD"
});

// Attach emitter to projectile
emitter.startFollow(proj);

// Stop emitter when projectile dies
proj.on('destroy', () => {
    emitter.stop();
    particles.destroy();
});

    proj.setRotation(angle);

    const speed = 150;
    proj.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.bossProjectiles.add(proj, true);
    proj.body.velocity.set(
    Math.cos(angle) * speed,
    Math.sin(angle) * speed
    
);

    proj.body.checkCollision.none = true;
    this.time.delayedCall(100, () => {
        if (proj && proj.body) proj.body.checkCollision.none = false;
    });

    this.time.delayedCall(2000, () => { proj?.destroy?.(); });
}
    isSafeForProjectile(x, y) {
    const radius = 16;
    const box = new Phaser.Geom.Rectangle(x - radius, y - radius, radius * 2, radius * 2);

    const groups = [this.walls, this.pillars, this.pits];

    for (let g of groups) {
        for (let obj of g.getChildren()) {
            if (Phaser.Geom.Intersects.RectangleToRectangle(box, obj.getBounds())) {
                return false;
            }
        }
    }
    return true;
}

    applyPlayerDamage(amount, options = { knockback: true, source: null }) {
        if (this.isInvulnerable) return;

        this.hp -= amount;
        this.hp = Math.max(0, this.hp);
        this.updateHUD();

        //Knockback
        if (options.knockback && options.source) {
            const src = options.source;
            const dx = this.player.x - src.x;
            const dy = this.player.y - src.y;
            const L = Math.hypot(dx, dy) || 1;

            this.player.body.setVelocity((dx / L) * 320, (dy / L) * 320);
        }

        //Invuln
        this.isInvulnerable = true;
        this.player.setAlpha(0.4);

        this.time.delayedCall(600, () => {
            if (!this.player) return;
            this.player.setAlpha(1);
            this.isInvulnerable = false;
        });

        if (this.hp <= 0) {
            this.time.delayedCall(400, () => {
                this.scene.start("GameOverScene");
            });
        }
    }

    updateHUD() {
        //Boss HP bar update
        const pct = Phaser.Math.Clamp(this.bossHP / this.bossMaxHP, 0, 1);
        const w = this.hpBarW * pct;

        this.hpBarFill.clear(); 

        //Pick color
        let color = 0x44ff44;
        if (pct < 0.35) color = 0xff4444;
        else if (pct < 0.65) color = 0xffcc44;

        this.hpBarFill.fillStyle(color);
        this.hpBarFill.fillRect(this.hpBarX, this.hpBarY, w, this.hpBarH);

        //Sync player HP values (HealthBar.js)
        if (this.player) {
            this.player.hp = this.hp;
            this.player.maxHp = this.maxHP;
        }
        if (this.hpUI) this.hpUI.update();


    }
    //Boss room update loop
    update() {
        //Pause menu
    if (this.keyESC && Phaser.Input.Keyboard.JustDown(this.keyESC)) {
    this.scene.pause();
    this.scene.launch("PauseMenu", { parent: this.scene.key });
    return;
}

        if (!this.player || !this.boss || !this.boss.body) return;

        const px = this.player.x;
        const py = this.player.y;

        const bx = this.boss.x;
        const by = this.boss.y;

        //Boss direction
        const angle = Phaser.Math.Angle.Between(bx, by, px, py);

        //Boss movement
        const speed = this.bossSpeed;
        this.boss.body.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        );
    
    //Boss room player movement
    this.handlePlayerMovement();

    //Lava pits (scroll texture)
    this.pits.getChildren().forEach(hitbox => {
    const pit = hitbox.owner;
    if (!pit) return;

    pit.tilePositionX += 0.08;
    pit.tilePositionY -= 0.03;

    const pulse = Math.sin(this.time.now * 0.005) * 0.15 + 0.85;
    pit.setAlpha(pulse);
});


    //Update HUD
    this.updateHUD();
    }
}

//Game Over Scene
function GameOverScene() { Phaser.Scene.call(this, { key: "GameOverScene" }); }
GameOverScene.prototype = Object.create(Phaser.Scene.prototype);
GameOverScene.prototype.constructor = GameOverScene;
GameOverScene.prototype.create = function () {
    this.add.rectangle(400, 300, 800, 600, 0x000000, 0.75);
    this.add.text(400, 240, "You Failed...\nYour Quest Ends Here...\n\n...or does it?",
        {
            fontFamily: "Tahoma",
            fontSize: "48px",
            color: "#f10e0eff"
        })
        .setOrigin(0.5);
    this.add.text(400, 420, "Press SPACE to Restart",
        {
            fontFamily: "Tahoma",
            fontSize: "26px",
            color: "#ffffffff"
        })
        .setOrigin(0.5);
    this.input.keyboard.once("keydown-SPACE", () => this.scene.start("OpeningScene"));
    //Hard stop last played bgm
    if (this.game.currentBGM) {
        this.game.currentBGM.stop();
        this.game.currentBGM.destroy();
        this.game.currentBGM = null;
        this.game.currentBGMKey = null;
    }

    //Play lose theme
    this.game.currentBGM = this.sound.add("loseTheme", {
        loop: false,
        volume: this.game.musicVolume
    });
    this.game.currentBGMKey = "loseTheme";

    this.game.currentBGM.play();
    this.game.currentBGM.setLoop(false);
};

//Win Scene
function WinScene() { Phaser.Scene.call(this, { key: "WinScene" }); }
WinScene.prototype = Object.create(Phaser.Scene.prototype);
WinScene.prototype.constructor = WinScene;
WinScene.prototype.create = function () {
    this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6);
    this.add.text(400, 260, "Congratulations!\nThe Evil Fire Ball Boss!\nHas Been Defeated!",
    {
        fontFamily: "Tahoma",
        fontSize: "48px",
        align: "center",
        color: "#0fc90fff"
    })
    .setOrigin(0.5);
    this.add.text(400, 420, "Press SPACE to Play Again", 
    { fontFamily: "Tahoma",
        fontSize: "26px",
        align: "center",
        color: "#fff"
    })
    .setOrigin(0.5);
    this.input.keyboard.once("keydown-SPACE", () => this.scene.start("OpeningScene"));
    //Hard stop last played bgm
    if (this.game.currentBGM) {
        this.game.currentBGM.stop();
        this.game.currentBGM.destroy();
        this.game.currentBGM = null;
        this.game.currentBGMKey = null;
    }

    //Play win theme exactly once
    this.game.currentBGM = this.sound.add("winTheme", {
        loop: false,
        volume: this.game.musicVolume
    });
    this.game.currentBGMKey = "winTheme";

    this.game.currentBGM.play();
    this.game.currentBGM.setLoop(false);
};
//Pause Menu Scene
class PauseMenu extends Phaser.Scene {
    constructor() { super("PauseMenu"); }

    init(data) {
        this.parentSceneKey = data.parent;
    }
    //Make slider
    createSlider(x, y, width, initialValue, label, onChange) {

        const trackHeight = 10;
        const knobRadius = 12;

        //Label
        this.add.text(x - width/2 - 20, y, label, {
            fontSize: "20px",
            color: "#ffffff"
        }).setOrigin(1, 0.5);

        //Track
        const track = this.add.rectangle(x, y, width, trackHeight, 0x333333)
            .setOrigin(0.5);

        //Fill
        const fill = this.add.rectangle(
            x - width/2, y,
            width * initialValue,
            trackHeight,
            0x66ccff
        ).setOrigin(0, 0.5);

        //Knob
        const knob = this.add.circle(
            x - width/2 + width * initialValue,
            y,
            knobRadius,
            0xffffff
        )
        .setStrokeStyle(2, 0x000000)
        .setInteractive({ useHandCursor: true });

        //Value %
        const valueText = this.add.text(
            x + width/2 + 20, y,
            Math.round(initialValue * 100) + "%",
            { fontSize: "18px", color: "#ffffff" }
        ).setOrigin(0, 0.5);


        //Hover effect
        knob.on("pointerover", () => knob.setFillStyle(0xffffaa));
        knob.on("pointerout",  () => knob.setFillStyle(0xffffff));

        //Drag event
        knob.on("pointerdown", pointer => {
            this.input.on("pointermove", drag, this);
            this.input.on("pointerup", stopDrag, this);
            drag(pointer);
        });

        const drag = pointer => {
            let localX = Phaser.Math.Clamp(pointer.x - (x - width/2), 0, width);
            let pct = localX / width;

            fill.width = width * pct;
            knob.x = x - width/2 + localX;

            valueText.setText(Math.round(pct * 100) + "%");

            if (onChange) onChange(pct);
        };

        const stopDrag = () => {
            this.input.off("pointermove", drag, this);
            this.input.off("pointerup", stopDrag, this);
        };

    }

    //Create UI
    create() {

        //Background overlay
        this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6);

        this.add.text(400, 120, "Paused", {
            fontSize: "52px",
            fontFamily: "Tahoma",
            color: "#ffffff"
        }).setOrigin(0.5);

        //Buttons
        const makeButton = (y, label, color) => {
            const btn = this.add.text(400, y, label, {
                fontSize: "32px",
                color,
                backgroundColor: "#111111",
                padding: { x: 10, y: 6 }
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

            btn.on("pointerover", () => btn.setStyle({ backgroundColor: "#333333" }));
            btn.on("pointerout",  () => btn.setStyle({ backgroundColor: "#111111" }));

            return btn;
        };

        //Resume
        makeButton(230, "Resume", "#00ff88")
        .setStyle({ fontFamily: "Tahoma", fontSize: "36px" })
            .on("pointerup", () => {
                this.scene.stop();
                this.scene.resume(this.parentSceneKey);
            });

        //Restart
        makeButton(300, "Restart", "#00aaff")
        .setStyle({ fontFamily: "Tahoma", fontSize: "36px" })
            .on("pointerup", () => {
                this.scene.stop();
                this.scene.stop(this.parentSceneKey);
                this.scene.start(this.parentSceneKey, { hp: 100, keys: 0 });
            });

        //Quit
        makeButton(370, "Quit to Menu", "#ff4444")
        .setStyle({ fontFamily: "Tahoma", fontSize: "36px" })
            .on("pointerup", () => {
                this.scene.stop();
                this.scene.stop(this.parentSceneKey);
                this.scene.start("OpeningScene");
            });

        //Music Slider       
        const parent = this.scene.get(this.parentSceneKey);

        this.createSlider(
            400, 470, 260,
            Phaser.Math.Clamp(this.game.musicVolume ?? 1, 0, 1),
            
            "Music",
            pct => {
                this.game.musicVolume = pct;
                let parent = this.scene.get(this.parentSceneKey);

        //Update music volume on any active music in the parent scene
        if (parent && parent.sound) {
            parent.sound.setVolume = parent.sound.setVolume || function (v) {
                //If sound.setVolume isn't found
            };
            
            //Iterate through all current sounds
            parent.sound.sounds.forEach(snd => {
                if (snd.key === "bgm") snd.setVolume(pct);
            });
        }

            }
        );

        //SFX Slider
        this.createSlider(
            400, 530, 260,
            Phaser.Math.Clamp(this.game.sfxVolume ?? 1, 0, 1),
            "SFX",
            pct => { this.game.sfxVolume = pct; }
        );
    }
}
//Global audio manager (inside the Phaser.Game instance)
function installGlobalAudio(game) {
    game.musicVolume = 0.03;   //default value = 3%
    game.sfxVolume   = 0.1;    //default value = 10%

    game.currentBGMKey = null;
    game.currentBGM = null;

    game.playBGM = function (key) {
        if (this.currentBGMKey === key && this.currentBGM) {
            this.currentBGM.setVolume(this.musicVolume);
            return;
        }

        if (this.currentBGM) {
            this.currentBGM.stop();
            this.currentBGM.destroy();
        }

        this.currentBGMKey = key;
        this.currentBGM = this.sound.add(key, {
            loop: true,
            volume: this.musicVolume
        });

        this.currentBGM.play();
    };

    game.stopBGM = function () {
        if (this.currentBGM) {
            this.currentBGM.stop();
            this.currentBGM.destroy();
            this.currentBGM = null;
            this.currentBGMKey = null;
        }
    };

    //Play SFX with global SFX volume
    game.playSFX = function (key, config = {}) {
        const volume = (this.sfxVolume ?? 1);
        this.sound.play(key, { volume, ...config });
    };
}

//Game config
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: "#1d1d1d",
    physics: { default: "arcade", arcade: { debug: false } }, //debug: true for hitbox view
    render: {
        pixelArt: true,
        antialias: false,
        contextCreation: { willReadFrequently: true }
    },
    scene: [BootScene, OpeningScene, Room1, Room2, Room3, Room4, BossRoom, GameOverScene, WinScene, PauseMenu]
};

const game = new Phaser.Game(config);
installGlobalAudio(game);
