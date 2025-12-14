class HealthBar {
    constructor(scene, x, y, player) {
        this.scene = scene;
        this.player = player;

        this.x = x;
        this.y = y;

        //Background bar
        this.bg = scene.add.image(x, y, "ui", "enemy_hp_bar")
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(900);

        //Fill bar
        this.fill = scene.add.image(x, y, "ui", "enemy_hp_fill")
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(901);

        //Cache dimensions from sprite
        this.fullWidth = this.fill.width;
        this.height = this.fill.height;

        //Create mask
        this.maskGfx = scene.make.graphics({ x: 0, y: 0, add: false });
        this.mask = this.maskGfx.createGeometryMask();
        this.fill.setMask(this.mask);

        //Text
        this.text = scene.add.text(
            x + this.bg.width / 2,
            y + this.bg.height / 2,
            "",
            {
                fontSize: "12px",
                fontFamily: "Tahoma",
                color: "#ffffff"
            }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(902);

        this.update();
    }

    update() {
        const hp = this.player.hp;
        const max = this.player.maxHp;
        const pct = Phaser.Math.Clamp(hp / max, 0, 1);

        const fillWidth = this.fullWidth * pct;

        // Update mask
        this.maskGfx.clear();
        this.maskGfx.fillRect(
            this.x,
            this.y,
            fillWidth,
            this.height
        );

        this.fill.setVisible(pct > 0);
        this.text.setText(`${hp} / ${max}`);
    }

    destroy() {
        this.bg.destroy();
        this.fill.destroy();
        this.text.destroy();
        this.maskGfx.destroy();
    }
}

window.HealthBar = HealthBar;
