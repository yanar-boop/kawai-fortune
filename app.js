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
                this.ctx.drawImage(seg.imgObj, -30, -80, 60, 60);
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

    // Retourne icône + classe CSS selon le type de gain
    _segMeta(text) {
        if (text === 'Retry')      return { icon: '☁️',  cls: 'win-card',            rarity: '' };
        if (text.includes('WAX')) return { icon: '💰',  cls: 'win-card wax',        rarity: '✨' };
        if (text === 'Motte')      return { icon: '🌱',  cls: 'win-card motte',      rarity: '🟤' };
        if (text === 'Mycélium')   return { icon: '🔮',  cls: 'win-card mycelium',   rarity: '💜' };
        if (text === 'Champignon') return { icon: '🍄',  cls: 'win-card champignon', rarity: '🌸' };
        if (text === 'Origin')     return { icon: '💎',  cls: 'win-card origin',     rarity: '🌟' };
        return { icon: '🎁', cls: 'win-card', rarity: '' };
    }

    renderHistory(entries) {
        const hist = document.getElementById('history');
        if (!hist) return;
        hist.innerHTML = entries.map(e => {
            const { icon, cls } = this._segMeta(e.text);
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
        const { icon, rarity } = this._segMeta(seg.text);

        const popup = document.getElementById('win-popup');
        const emoji = document.getElementById('popup-emoji');
        const title = document.getElementById('popup-title');
        const sub   = document.getElementById('popup-sub');

        if (!popup) return;

        if (isRetry) {
            emoji.innerText = '☁️';
            title.innerText = 'Pas de chance…';
            sub.innerText   = 'Retente ta chance ! La roue est capricieuse.';
        } else if (isWax) {
            emoji.innerText = '💰';
            title.innerText = `${seg.text} GAGNÉ !`;
            sub.innerText   = 'Récompense enregistrée — distribution en fin de semaine.';
        } else {
            emoji.innerText = icon;
            title.innerText = `NFT ${seg.text} ${rarity}`;
            const msgs = {
                'Motte':      'Un NFT Motte de Terre de la collection te sera envoyé sur WAX !',
                'Mycélium':   'Rare ! Un NFT Mycélium mystique arrive sur ton wallet WAX. 🔮',
                'Champignon': 'Un joli Champignon NFT est en chemin sur WAX ! 🍄',
                'Origin':     'LÉGENDAIRE ! Le NFT Origin te sera envoyé très bientôt. 💎',
            };
            sub.innerText = msgs[seg.text] || 'Un NFT de la collection te sera envoyé sur WAX.';
        }

        popup.classList.add('show');
    }
}

// ─── CHARGEMENT HISTORIQUE AU DÉMARRAGE ───────────────────────────────────

function segMeta(text) {
    if (text === 'Retry')      return { icon: '☁️',  cls: 'win-card'            };
    if (text.includes('WAX')) return { icon: '💰',  cls: 'win-card wax'        };
    if (text === 'Motte')      return { icon: '🌱',  cls: 'win-card motte'      };
    if (text === 'Mycélium')   return { icon: '🔮',  cls: 'win-card mycelium'   };
    if (text === 'Champignon') return { icon: '🍄',  cls: 'win-card champignon' };
    if (text === 'Origin')     return { icon: '💎',  cls: 'win-card origin'     };
    return { icon: '🎁', cls: 'win-card' };
}

function loadSavedHistory() {
    const saved = JSON.parse(localStorage.getItem('kawai_history') || '[]');
    if (saved.length === 0) return;
    const hist = document.getElementById('history');
    if (!hist) return;
    hist.innerHTML = saved.map(e => {
        const { icon, cls } = segMeta(e.text);
        return `<div class="${cls}">
            <span class="win-icon">${icon}</span>
            <span class="win-label">${e.text}</span>
            <span class="win-time">${e.time}</span>
        </div>`;
    }).join('');
}

// ─── DONNÉES DE LA ROUE ───────────────────────────────────────────────────

// 24 segments — répartition finale :
//  10 × Retry       (41.7%)
//   6 × Motte       (25.0%)
//   3 × Mycélium    (12.5%)
//   2 × Champignon  ( 8.3%)
//   1 × 0.1 WAX     ( 4.2%)
//   1 × 1 WAX       ( 4.2%)
//   1 × Origin      ( 4.2%)
const segments = [
    // 0
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'   },
    // 1
    { color: '#C8935A', text: 'Motte',      imgSrc: 'nft-motte.png'     },
    // 2
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'   },
    // 3
    { color: '#FFB3E6', text: 'Champignon', imgSrc: 'nft-champignon.png'},
    // 4
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'   },
    // 5
    { color: '#C8935A', text: 'Motte',      imgSrc: 'nft-motte.png'     },
    // 6
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'   },
    // 7
    { color: '#7B4FA6', text: 'Mycélium',   imgSrc: 'nft-mycelium.png'  },
    // 8
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'   },
    // 9
    { color: '#C8935A', text: 'Motte',      imgSrc: 'nft-motte.png'     },
    // 10
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'   },
    // 11
    { color: '#FFD700', text: '0.1 WAX',    imgSrc: 'wax-token.png'     },
    // 12
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'   },
    // 13
    { color: '#C8935A', text: 'Motte',      imgSrc: 'nft-motte.png'     },
    // 14
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'   },
    // 15
    { color: '#7B4FA6', text: 'Mycélium',   imgSrc: 'nft-mycelium.png'  },
    // 16
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'   },
    // 17
    { color: '#FFB3E6', text: 'Champignon', imgSrc: 'nft-champignon.png'},
    // 18
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'   },
    // 19
    { color: '#C8935A', text: 'Motte',      imgSrc: 'nft-motte.png'     },
    // 20
    { color: '#D6BBFF', text: 'Retry',      imgSrc: 'retry-cloud.png'   },
    // 21
    { color: '#7B4FA6', text: 'Mycélium',   imgSrc: 'nft-mycelium.png'  },
    // 22
    { color: '#FFD700', text: '1 WAX',      imgSrc: 'wax-token.png'     },
    // 23
    { color: '#A2D9F9', text: 'Origin',     imgSrc: 'nft-diamant.png'   },
];

// ─── INIT ─────────────────────────────────────────────────────────────────

const roue = new KawaiWheel('canvas', segments);
loadSavedHistory();

// ─── SÉCURITÉ ANTI-MULTI-ONGLETS ──────────────────────────────────────────

window.onbeforeunload = () => {
    localStorage.setItem('is_spinning', 'false');
};

// ─── CONNEXION WAX — Multi-wallet (Cloud Wallet + Anchor + Wombat) ────────
//
// Stratégie :
//   • Clic sur le bouton → modal de choix du wallet
//   • Cloud Wallet : popup mycloudwallet.com  (via WaxJS)
//   • Anchor       : deeplink / QR code       (via UAL_Anchor)
//   • Wombat       : extension browser        (via WaxJS fallback)
//
// Le bundle wax.js expose : window.WaxJS, window.UAL_Wax, window.UAL_Anchor

// ── Styles de la modal wallet ─────────────────────────────────────────────
(function injectWalletModalStyles() {
    const s = document.createElement('style');
    s.textContent = `
    #wallet-modal-overlay {
        display: none; position: fixed; inset: 0;
        background: rgba(45,45,45,0.55); backdrop-filter: blur(4px);
        z-index: 1000; justify-content: center; align-items: center;
    }
    #wallet-modal-overlay.open { display: flex; }
    #wallet-modal {
        background: white; border: 4px solid #2D2D2D; border-radius: 28px;
        padding: 28px 32px; min-width: 300px; max-width: 90vw;
        box-shadow: 8px 8px 0 #2D2D2D;
        animation: modal-pop 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes modal-pop {
        from { transform: scale(0.6); opacity: 0; }
        to   { transform: scale(1);   opacity: 1; }
    }
    #wallet-modal h2 {
        font-family: 'Nunito', sans-serif; font-weight: 900;
        font-size: 20px; margin: 0 0 6px; color: #2D2D2D; text-align: center;
    }
    #wallet-modal p {
        font-size: 13px; color: #888; text-align: center; margin: 0 0 20px;
    }
    .wallet-btn {
        display: flex; align-items: center; gap: 14px;
        width: 100%; padding: 14px 18px; margin-bottom: 10px;
        background: #F9F7FF; border: 3px solid #2D2D2D; border-radius: 18px;
        font-family: 'Quicksand', sans-serif; font-weight: 700; font-size: 15px;
        cursor: pointer; box-shadow: 3px 3px 0 #2D2D2D;
        transition: all 0.1s;
    }
    .wallet-btn:hover { background: #ede8ff; transform: translateY(-2px); box-shadow: 3px 5px 0 #2D2D2D; }
    .wallet-btn:active { transform: translateY(2px); box-shadow: 1px 1px 0 #2D2D2D; }
    .wallet-btn img { width: 36px; height: 36px; border-radius: 10px; }
    .wallet-btn .wname { flex: 1; text-align: left; }
    .wallet-btn .warrow { color: #aaa; font-size: 18px; }
    #wallet-modal-close {
        display: block; width: 100%; margin-top: 6px; padding: 10px;
        background: none; border: 2px dashed #ccc; border-radius: 14px;
        font-family: 'Quicksand', sans-serif; font-weight: 700;
        color: #aaa; cursor: pointer; font-size: 13px;
    }
    #wallet-modal-close:hover { border-color: #999; color: #666; }
    `;
    document.head.appendChild(s);
})();

// ── HTML de la modal ──────────────────────────────────────────────────────
(function injectWalletModal() {
    const div = document.createElement('div');
    div.id = 'wallet-modal-overlay';
    div.innerHTML = `
    <div id="wallet-modal">
        <h2>Choisir un wallet</h2>
        <p>Connecte-toi avec ton wallet WAX préféré</p>
        <button class="wallet-btn" id="btn-wallet-wax">
            <img src="https://avatars.githubusercontent.com/u/36253920" alt="WAX">
            <span class="wname">WAX Cloud Wallet</span>
            <span class="warrow">›</span>
        </button>
        <button class="wallet-btn" id="btn-wallet-anchor">
            <img src="https://avatars.githubusercontent.com/u/56041890" alt="Anchor">
            <span class="wname">Anchor</span>
            <span class="warrow">›</span>
        </button>
        <button class="wallet-btn" id="btn-wallet-wombat">
            <img src="https://avatars.githubusercontent.com/u/78037905" alt="Wombat">
            <span class="wname">Wombat</span>
            <span class="warrow">›</span>
        </button>
        <button id="wallet-modal-close">Annuler</button>
    </div>`;
    document.body.appendChild(div);
})();

// ── Helpers ───────────────────────────────────────────────────────────────
function showWaxConnected(account, walletName) {
    const btn = document.getElementById('btn-connect');
    const truncated = account.length > 14
        ? account.slice(0, 6) + '…' + account.slice(-4) : account;
    btn.innerText        = `✅ ${truncated}`;
    btn.style.background = '#D6BBFF';
    btn.style.cursor     = 'default';
    btn.disabled         = true;
    sessionStorage.setItem('wax_account', account);
    sessionStorage.setItem('wax_wallet',  walletName);
    console.log(`WAX connecté via ${walletName} :`, account);
}

function openWalletModal()  { document.getElementById('wallet-modal-overlay').classList.add('open'); }
function closeWalletModal() { document.getElementById('wallet-modal-overlay').classList.remove('open'); }

// Fermer en cliquant l'overlay ou "Annuler"
document.getElementById('wallet-modal-overlay').onclick = (e) => {
    if (e.target.id === 'wallet-modal-overlay') closeWalletModal();
};
document.getElementById('wallet-modal-close').onclick = closeWalletModal;

// ── WAX Cloud Wallet ──────────────────────────────────────────────────────
const wax = new WaxJS({
    rpcEndpoint:  'https://wax.greymass.com',
    tryAutoLogin: true,
});

document.getElementById('btn-wallet-wax').onclick = async () => {
    closeWalletModal();
    const btn = document.getElementById('btn-connect');
    btn.innerText = '⏳ Cloud Wallet…'; btn.disabled = true;
    try {
        const account = await wax.login();
        showWaxConnected(account, 'WAX Cloud Wallet');
    } catch (e) {
        console.warn('Cloud Wallet annulé :', e.message);
        btn.innerText = '⚡ CONNEXION WAX'; btn.disabled = false;
    }
};

// ── Anchor ────────────────────────────────────────────────────────────────
const WAX_CHAIN = {
    chainId: '1064487b3cd1a897ce03ae5b6a865651747e2e152090f99c1d19d44e01aea5a4',
    rpcEndpoints: [{ protocol: 'https', host: 'wax.greymass.com', port: 443 }],
};

document.getElementById('btn-wallet-anchor').onclick = async () => {
    closeWalletModal();
    const btn = document.getElementById('btn-connect');
    btn.innerText = '⏳ Anchor…'; btn.disabled = true;
    try {
        const anchor = new UAL_Anchor([WAX_CHAIN], { appName: 'Kawaï Fortune' });
        await anchor.init();
        const users = await anchor.login();
        const account = await users[0].getAccountName();
        showWaxConnected(account, 'Anchor');
    } catch (e) {
        console.warn('Anchor annulé :', e.message);
        btn.innerText = '⚡ CONNEXION WAX'; btn.disabled = false;
    }
};

// ── Wombat (via WaxJS avec endpoint Wombat) ───────────────────────────────
document.getElementById('btn-wallet-wombat').onclick = async () => {
    closeWalletModal();
    const btn = document.getElementById('btn-connect');
    btn.innerText = '⏳ Wombat…'; btn.disabled = true;
    try {
        // Wombat injecte window.wax comme provider EOS/WAX
        if (window.wax && window.wax.wombat) {
            await window.wax.login();
            const account = window.wax.userAccount;
            showWaxConnected(account, 'Wombat');
        } else {
            // Wombat non détecté → rediriger vers l'extension
            window.open('https://www.wombat.app/', '_blank');
            btn.innerText = '⚡ CONNEXION WAX'; btn.disabled = false;
        }
    } catch (e) {
        console.warn('Wombat annulé :', e.message);
        btn.innerText = '⚡ CONNEXION WAX'; btn.disabled = false;
    }
};

// ── Auto-login au chargement ──────────────────────────────────────────────
(async () => {
    // Reconnexion auto si session WAX Cloud Wallet active
    try {
        const ok = await wax.isAutoLoginAvailable();
        if (ok && wax.userAccount) showWaxConnected(wax.userAccount, 'WAX Cloud Wallet');
    } catch (_) {}
    // Ou session mémorisée
    const saved = sessionStorage.getItem('wax_account');
    const savedWallet = sessionStorage.getItem('wax_wallet');
    if (saved) showWaxConnected(saved, savedWallet || 'WAX');
})();

// ── Bouton principal → ouvre la modal ────────────────────────────────────
document.getElementById('btn-connect').onclick = () => {
    if (sessionStorage.getItem('wax_account')) return; // déjà connecté
    openWalletModal();
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
