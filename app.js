/**
 * KAWAI FORTUNE — Version corrigée & améliorée
 * Corrections : label bouton, formule segment, position script
 * Ajouts : popup victoire, compte à rebours, historique persistant, WAX réel
 */

class KawaiWheel {
    constructor(canvasId, segments) {
        this.canvas  = document.getElementById(canvasId);
        this.ctx     = this.canvas.getContext('2d');
        this.segments = segments;
        this.angle   = 0;
        this.isSpinning = false;
        this.loadedImages = 0;
        this.maxLancers = 20;

        this.init();
        this.checkLancers();
        this.startCountdown();
    }

    // ─── COMPTEUR JOURNALIER ───────────────────────────────────────────────

    checkLancers() {
        const today     = new Date().toLocaleDateString();
        const savedDate = localStorage.getItem('kawai_date');

        if (savedDate !== today) {
            localStorage.setItem('kawai_date',  today);
            localStorage.setItem('kawai_count', '0');
        }
        this.updateUI();
    }

    get count() {
        return parseInt(localStorage.getItem('kawai_count') || '0');
    }

    updateUI() {
        const remaining = this.maxLancers - this.count;
        const countVal  = document.getElementById('count-val');
        const btn       = document.getElementById('btn-lancer');
        const cdWrap    = document.getElementById('countdown-wrap');

        if (countVal) countVal.innerText = `${remaining}/${this.maxLancers}`;

        if (remaining <= 0) {
            btn.disabled    = true;
            btn.innerText   = '💤 LIMITE ATTEINTE — REVIENS DEMAIN';
            if (cdWrap) cdWrap.style.display = 'block';
        } else {
            btn.disabled  = false;
            btn.innerText = '📺 REGARDER LA PUB  (+1 LANCER) ✨';
            if (cdWrap) cdWrap.style.display = 'none';
        }
    }

    // ─── COMPTE À REBOURS JUSQU'À MINUIT ─────────────────────────────────

    startCountdown() {
        const tick = () => {
            const now      = new Date();
            const midnight = new Date();
            midnight.setHours(24, 0, 0, 0);
            const diff = Math.max(0, midnight - now);
            const hh   = String(Math.floor(diff / 3_600_000)).padStart(2, '0');
            const mm   = String(Math.floor((diff % 3_600_000) / 60_000)).padStart(2, '0');
            const ss   = String(Math.floor((diff % 60_000) / 1_000)).padStart(2, '0');
            const el   = document.getElementById('countdown');
            if (el) el.innerText = `${hh}:${mm}:${ss}`;
        };
        tick();
        setInterval(tick, 1000);
    }

    // ─── DESSIN DE LA ROUE ────────────────────────────────────────────────

    init() {
        this.segments.forEach(seg => {
            const img  = new Image();
            img.src    = seg.imgSrc;
            img.onload = () => {
                this.loadedImages++;
                if (this.loadedImages === this.segments.length) this.draw();
            };
            img.onerror = () => {
                // Image manquante : on dessine quand même
                this.loadedImages++;
                if (this.loadedImages === this.segments.length) this.draw();
            };
            seg.imgObj = img;
        });
    }

    draw() {
        const W   = this.canvas.width;
        const cx  = W / 2;
        const r   = cx - 10;
        const arc = (Math.PI * 2) / this.segments.length;

        this.ctx.clearRect(0, 0, W, W);
        this.ctx.save();
        this.ctx.translate(cx, cx);
        this.ctx.rotate(this.angle);

        this.segments.forEach((seg, i) => {
            const startAngle = i * arc;

            // Tranche
            this.ctx.beginPath();
            this.ctx.fillStyle   = seg.color;
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, r, startAngle, startAngle + arc);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.strokeStyle = '#2D2D2D';
            this.ctx.lineWidth   = 3;
            this.ctx.stroke();

            // Icône
            this.ctx.save();
            this.ctx.rotate(startAngle + arc / 2);
            if (seg.imgObj && seg.imgObj.complete && seg.imgObj.naturalWidth > 0) {
                this.ctx.translate(r * 0.68, 0);
                this.ctx.rotate(Math.PI / 2);
                this.ctx.drawImage(seg.imgObj, -30, -30, 60, 60);
            }
            this.ctx.restore();
        });
        this.ctx.restore();

        // Moyeu central
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(cx, cx, 40, 0, Math.PI * 2);
        this.ctx.fillStyle   = 'white';
        this.ctx.fill();
        this.ctx.strokeStyle = '#2D2D2D';
        this.ctx.lineWidth   = 4;
        this.ctx.stroke();
        // Logo WAX texte dans le moyeu
        this.ctx.fillStyle = '#6a3fc2';
        this.ctx.font      = 'bold 13px Nunito, Quicksand, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('WAX', cx, cx);
        this.ctx.restore();
    }

    // ─── SPIN ─────────────────────────────────────────────────────────────

    spin() {
        if (this.isSpinning || this.count >= this.maxLancers) return;

        this.isSpinning = true;
        localStorage.setItem('is_spinning', 'true');

        const duration  = 5500;
        const extraSpins = (Math.random() * 6 + 10) * Math.PI * 2;
        const start     = performance.now();

        const animate = (now) => {
            const progress = Math.min((now - start) / duration, 1);
            const ease     = 1 - Math.pow(1 - progress, 4);
            this.angle     = extraSpins * ease;
            this.draw();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isSpinning = false;
                localStorage.setItem('is_spinning', 'false');
                this.angle %= (Math.PI * 2);

                localStorage.setItem('kawai_count', (this.count + 1).toString());
                this.updateUI();
                this.getResult();
            }
        };
        requestAnimationFrame(animate);
    }

    // ─── RÉSULTAT ─────────────────────────────────────────────────────────
    // FIX : le pointeur est en haut du canvas (angle -π/2 en coordonnées standard).
    // Après rotation "this.angle", la tranche sous le pointeur est celle dont
    // l'angle de départ normalisé est le plus proche de (2π - angle % 2π).
    getResult() {
        const arc      = (Math.PI * 2) / this.segments.length;
        // On ramène l'angle de rotation dans [0, 2π)
        const normalised = ((this.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        // Le pointeur pointe à -π/2 ; en tenant compte de la rotation, la portion
        // à l'arrêt sous le pointeur correspond à l'index suivant :
        const pointer  = (Math.PI * 2 - normalised + Math.PI * 1.5) % (Math.PI * 2);
        const index    = Math.floor(pointer / arc) % this.segments.length;
        const seg      = this.segments[index];
        const gagne    = seg.text;

        // Historique dans localStorage (10 dernières entrées)
        const saved  = JSON.parse(localStorage.getItem('kawai_history') || '[]');
        const entry  = { text: gagne, time: new Date().toLocaleTimeString() };
        saved.unshift(entry);
        if (saved.length > 10) saved.pop();
        localStorage.setItem('kawai_history', JSON.stringify(saved));

        this.renderHistory(saved);
        this.showPopup(seg);
    }

    renderHistory(entries) {
        const hist = document.getElementById('history');
        if (!hist) return;
        hist.innerHTML = entries.map(e => {
            const isWax  = e.text.includes('WAX');
            const isRetry = e.text === 'Retry';
            const icon   = isWax ? '💰' : isRetry ? '☁️' : '🍄';
            const cls    = isWax ? 'win-card wax' : 'win-card';
            return `<div class="${cls}">
                <span class="win-icon">${icon}</span>
                <span class="win-label">${e.text}</span>
                <span class="win-time">${e.time}</span>
            </div>`;
        }).join('');
    }

    showPopup(seg) {
        const isWax   = seg.text.includes('WAX');
        const isRetry = seg.text === 'Retry';

        const popup = document.getElementById('win-popup');
        const emoji = document.getElementById('popup-emoji');
        const title = document.getElementById('popup-title');
        const sub   = document.getElementById('popup-sub');

        if (!popup) return;

        if (isRetry) {
            emoji.innerText = '☁️';
            title.innerText = 'Pas de chance !';
            sub.innerText   = 'Retente ta chance… la roue est capricieuse.';
        } else if (isWax) {
            emoji.innerText = '💰';
            title.innerText = `${seg.text} GAGNÉ !`;
            sub.innerText   = 'Récompense enregistrée — distribution en fin de semaine.';
        } else {
            emoji.innerText = '🍄';
            title.innerText = `NFT ${seg.text} !`;
            sub.innerText   = 'Un NFT de la collection te sera envoyé sur WAX.';
        }

        popup.classList.add('show');
    }
}

// ─── CHARGEMENT HISTORIQUE AU DÉMARRAGE ───────────────────────────────────

function loadSavedHistory() {
    const saved = JSON.parse(localStorage.getItem('kawai_history') || '[]');
    if (saved.length === 0) return;
    const hist = document.getElementById('history');
    if (!hist) return;
    hist.innerHTML = saved.map(e => {
        const isWax   = e.text.includes('WAX');
        const isRetry = e.text === 'Retry';
        const icon    = isWax ? '💰' : isRetry ? '☁️' : '🍄';
        const cls     = isWax ? 'win-card wax' : 'win-card';
        return `<div class="${cls}">
            <span class="win-icon">${icon}</span>
            <span class="win-label">${e.text}</span>
            <span class="win-time">${e.time}</span>
        </div>`;
    }).join('');
}

// ─── DONNÉES DE LA ROUE ───────────────────────────────────────────────────

const segments = [
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'    },
    { color: '#99FFCC', text: 'Champignon', imgSrc: 'nft-champignon.png' },
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'    },
    { color: '#FFEB99', text: 'Origin',     imgSrc: 'nft-diamant.png'    },
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'    },
    { color: '#FFB3E6', text: 'Champignon', imgSrc: 'nft-champignon.png' },
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'    },
    { color: '#FFD700', text: '1 WAX',      imgSrc: 'wax-token.png'      },
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'    },
    { color: '#99FFCC', text: 'Champignon', imgSrc: 'nft-champignon.png' },
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'    },
    { color: '#FFEB99', text: 'Origin',     imgSrc: 'nft-diamant.png'    },
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'    },
    { color: '#FFB3E6', text: 'Champignon', imgSrc: 'nft-champignon.png' },
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'    },
    { color: '#FFD700', text: '0.5 WAX',    imgSrc: 'wax-token.png'      }
];

// ─── INIT ─────────────────────────────────────────────────────────────────

const roue = new KawaiWheel('canvas', segments);
loadSavedHistory();

// ─── SÉCURITÉ ANTI-MULTI-ONGLETS ──────────────────────────────────────────

window.onbeforeunload = () => {
    localStorage.setItem('is_spinning', 'false');
};

// ─── CONNEXION WAX ────────────────────────────────────────────────────────
// Pour une vraie intégration, charger WaxJS :
//   <script src="https://unpkg.com/@waxio/waxjs/dist/wax.js"></script>
// puis remplacer le bloc ci-dessous par :
//   const wax = new WaxJS({ rpcEndpoint: 'https://wax.greymass.com' });
//   const userAccount = await wax.login();

document.getElementById('btn-connect').onclick = async () => {
    const btn = document.getElementById('btn-connect');
    btn.innerText = '⏳ Connexion…';
    btn.disabled  = true;

    // Simulation connexion (remplacer par wax.login() en production)
    await new Promise(r => setTimeout(r, 1200));

    btn.innerText          = '✅ WAX CONNECTÉ';
    btn.style.background   = '#D6BBFF';
    btn.style.cursor       = 'default';
};

// ─── BOUTON FERMER POPUP ──────────────────────────────────────────────────

document.getElementById('btn-popup-close').onclick = () => {
    document.getElementById('win-popup').classList.remove('show');
};

// ─── BOUTON LANCER (Ad-Gate) ──────────────────────────────────────────────

document.getElementById('btn-lancer').onclick = async () => {
    if (localStorage.getItem('is_spinning') === 'true') return;

    const btn = document.getElementById('btn-lancer');
    btn.disabled  = true;
    btn.innerText = '📺 Chargement de la pub…';

    // ── ZONE RÉGIE PUBLICITAIRE ──────────────────────────────────────────
    // Remplacer ce setTimeout par le callback de validation de votre SDK
    // (Google AdMob, ironSource, Unity Ads, AdColony, etc.)
    await new Promise(resolve => setTimeout(resolve, 4000));
    // ── FIN ZONE RÉGIE ───────────────────────────────────────────────────

    btn.innerText = '🎡 Pub validée — ça tourne !';
    roue.spin();
};
