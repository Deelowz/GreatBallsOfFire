class AudioManager extends Phaser.Scene {
    constructor() {
        super("AudioManager");
        this.currentMusic = null;
        this.fadeDuration = 800;
    }

    playMusic(key) {
        const newTrack = this.sound.get(key) || this.sound.add(key, {
            volume: this.game.musicVolume ?? 1,
            loop: true
        });

        if (!newTrack) {
            console.warn("AudioManager: Missing track:", key);
            return;
        }

        //If no music is playing, start new track immediately
        if (!this.currentMusic) {
            this.currentMusic = newTrack;
            newTrack.play();
            return;
        }

        const oldTrack = this.currentMusic;
        this.currentMusic = newTrack;

        //Fade out old
        this.tweens.add({
            targets: oldTrack,
            volume: 0,
            duration: this.fadeDuration,
            onComplete: () => oldTrack.stop()
        });

        //Fade in new
        newTrack.setVolume(0);
        newTrack.play();

        this.tweens.add({
            targets: newTrack,
            volume: this.game.musicVolume ?? 1,
            duration: this.fadeDuration
        });
    }

    pauseMusic() {
        if (this.currentMusic) this.currentMusic.pause();
    }

    resumeMusic() {
        if (this.currentMusic) this.currentMusic.resume();
    }
}

// Make it global so Phaser can see it
window.AudioManager = AudioManager;
