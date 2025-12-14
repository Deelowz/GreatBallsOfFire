// LavaPixelationPipeline.js
(function () {

    if (!window.Phaser || !Phaser.Renderer || !Phaser.Renderer.WebGL) {
        console.warn("LavaPixelationPipeline loaded before Phaser WebGL.");
        return;
    }

    class LavaPixelationPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {

        constructor(game) {
            super({
                game: game,
                fragShader: `
                precision mediump float;
                uniform float uPixelSize;
                uniform vec2 uResolution;
                uniform sampler2D uMainSampler;
                varying vec2 outTexCoord;

                void main(void) {
                    float px = max(uPixelSize, 1.0);
                    vec2 pixel = px / uResolution;
                    vec2 coord = floor(outTexCoord / pixel) * pixel + pixel * 0.5;
                    gl_FragColor = texture2D(uMainSampler, coord);
                }`
            });

            this._pixelSize = 6.0;
        }

        onPreRender() {
            this.set1f("uPixelSize", this._pixelSize);
            this.set2f("uResolution", this.renderer.width, this.renderer.height);
        }

        setPixelSize(v) {
            this._pixelSize = v;
        }
    }

    window.LavaPixelationPipeline = LavaPixelationPipeline;
})();
