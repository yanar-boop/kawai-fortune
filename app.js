/**
 * PROJET : KAWAÏ FORTUNE - VERSION SÉCURISÉE
 * Fonctions : Roue de la fortune, Limite journalière, Anti-triche, Ad-Gate.
 */

class KawaiWheel {
    constructor(canvasId, segments) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.segments = segments;
        this.angle = 0;
        this.isSpinning = false;
        this.loadedImages = 0;
        
        // Configuration de la limite (3 lancers max par jour)
        this.maxLancers = 20;
        
        this.init();
        this.checkLancers();
    }

    // --- LOGIQUE DE COMPTEUR ET SÉCURITÉ ---

    checkLancers() {
        const today = new Date().toLocaleDateString();
        const savedDate = localStorage.getItem('kawai_date');
        
        // Réinitialisation si on change de jour
        if (savedDate !== today) {
            localStorage.setItem('kawai_date', today);
            localStorage.setItem('kawai_count', '0');
        }
        
        this.updateUI();
    }

    get count() {
        return parseInt(localStorage.getItem('kawai_count') || '0');
    }

    updateUI() {
        const remaining = this.maxLancers - this.count;
        const countVal = document.getElementById('count-val');
        const btn = document.getElementById('btn-lancer');

        if (countVal) countVal.innerText = `${remaining}/${this.maxLancers}`;
        
        if (remaining <= 0) {
            btn.disabled = true;
            btn.innerText = "LIMITE ATTEINTE (REVIENS DEMAIN) 💤";
            btn.style.background = "#ccc";
            btn.style.boxShadow = "none";
        }
    }

    // --- DESSIN ET RENDU ---

    init() {
        this.segments.forEach(seg => {
            const img = new Image();
            img.src = seg.imgSrc;
            img.onload = () => {
                this.loadedImages++;
                if (this.loadedImages === this.segments.length) this.draw();
            };
            seg.imgObj = img;
        });
    }

    draw() {
        const arc = (Math.PI * 2) / this.segments.length;
        this.ctx.clearRect(0, 0, 450, 450);
        this.ctx.save();
        this.ctx.translate(225, 225);
        this.ctx.rotate(this.angle);

        this.segments.forEach((seg, i) => {
            const segAngle = i * arc;
            
            // Tranche de la roue
            this.ctx.beginPath();
            this.ctx.fillStyle = seg.color;
            this.ctx.moveTo(0, 0);
            this.ctx.arc(0, 0, 210, segAngle, segAngle + arc);
            this.ctx.fill();
            this.ctx.strokeStyle = "#2D2D2D";
            this.ctx.lineWidth = 5;
            this.ctx.stroke();
            
            // Icônes agrandies (80x80)
            this.ctx.save();
            this.ctx.rotate(segAngle + arc / 2);
            if (seg.imgObj) {
                this.ctx.translate(140, 0);
                this.ctx.rotate(Math.PI / 2);
                this.ctx.drawImage(seg.imgObj, -40, -40, 80, 80);
            }
            this.ctx.restore();
        });
        this.ctx.restore();

        // Centre de la roue (Moyeu)
        this.ctx.beginPath();
        this.ctx.arc(225, 225, 45, 0, Math.PI * 2);
        this.ctx.fillStyle = "white";
        this.ctx.fill();
        this.ctx.strokeStyle = "#2D2D2D";
        this.ctx.lineWidth = 5;
        this.ctx.stroke();
    }

    // --- ACTION ET ANIMATION ---

    spin() {
        if (this.isSpinning || this.count >= this.maxLancers) return;
        
        this.isSpinning = true;
        localStorage.setItem('is_spinning', 'true'); // Verrouillage anti-triche

        const duration = 5000;
        const extraSpins = (Math.random() * 5 + 10) * Math.PI * 2;
        const start = performance.now();

        const animate = (now) => {
            let progress = Math.min((now - start) / duration, 1);
            let ease = 1 - Math.pow(1 - progress, 4);
            this.angle = extraSpins * ease;
            this.draw();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isSpinning = false;
                localStorage.setItem('is_spinning', 'false'); // Déverrouillage
                this.angle %= (Math.PI * 2);
                
                // Enregistrement du lancer
                localStorage.setItem('kawai_count', (this.count + 1).toString());
                this.updateUI();
                this.getResult();
            }
        };
        requestAnimationFrame(animate);
    }

    getResult() {
        const arc = (Math.PI * 2) / this.segments.length;
        let stopAngle = (Math.PI * 1.5 - this.angle) % (Math.PI * 2);
        if (stopAngle < 0) stopAngle += Math.PI * 2;
        const index = Math.floor(stopAngle / arc);
        const gagne = this.segments[index].text;
        
        const hist = document.getElementById('history');
        const icon = gagne.includes('WAX') ? '💰' : (gagne === 'Retry' ? '☁️' : '🍄');
        hist.innerHTML = `<div class="win-card">${icon} ${gagne}</div>` + hist.innerHTML;
        
        // Réactivation du bouton si lancers restants
        if (this.count < this.maxLancers) {
            const btn = document.getElementById('btn-lancer');
            btn.disabled = false;
            btn.innerText = "2. PAYER & LANCER ✨";
        }
    }
}

// --- INITIALISATION ET ÉVÉNEMENTS ---

const segments = [
    {color: '#D6BBFF', text: 'Retry', imgSrc: 'retry-cloud.png'},
    {color: '#99FFCC', text: 'Champignon', imgSrc: 'nft-champignon.png'},
    {color: '#D6BBFF', text: 'Retry', imgSrc: 'retry-cloud.png'},
    {color: '#FFEB99', text: 'Origin', imgSrc: 'nft-diamant.png'},
    {color: '#D6BBFF', text: 'Retry', imgSrc: 'retry-cloud.png'},
    {color: '#FFB3E6', text: 'Champignon', imgSrc: 'nft-champignon.png'},
    {color: '#D6BBFF', text: 'Retry', imgSrc: 'retry-cloud.png'},
    {color: '#FFD700', text: '1 WAX', imgSrc: 'wax-token.png'},
    {color: '#D6BBFF', text: 'Retry', imgSrc: 'retry-cloud.png'},
    {color: '#99FFCC', text: 'Champignon', imgSrc: 'nft-champignon.png'},
    {color: '#D6BBFF', text: 'Retry', imgSrc: 'retry-cloud.png'},
    {color: '#FFEB99', text: 'Origin', imgSrc: 'nft-diamant.png'},
    {color: '#D6BBFF', text: 'Retry', imgSrc: 'retry-cloud.png'},
    {color: '#FFB3E6', text: 'Champignon', imgSrc: 'nft-champignon.png'},
    {color: '#D6BBFF', text: 'Retry', imgSrc: 'retry-cloud.png'},
    {color: '#FFD700', text: '0.5 WAX', imgSrc: 'wax-token.png'}
];

const roue = new KawaiWheel('canvas', segments);

// --- GESTION DES CLICS ---

// Sécurité Anti-Multi-Onglets
if (!sessionStorage.getItem('kawai_session_active')) {
    sessionStorage.setItem('kawai_session_active', 'true');
} else {
    // Si l'utilisateur actualise, on tolère, sinon on pourrait bloquer ici.
    console.log("Session de jeu active.");
}

window.onbeforeunload = () => {
    sessionStorage.removeItem('kawai_session_active');
    localStorage.setItem('is_spinning', 'false'); // Sécurité reset
};

// Connexion WAX (Simulation)
document.getElementById('btn-connect').onclick = () => {
    document.getElementById('btn-connect').innerText = "WAX CONNECTÉ ✅";
    document.getElementById('btn-connect').style.background = "#D6BBFF";
};

// Bouton Lancer avec Ad-Gate
document.getElementById('btn-lancer').onclick = async () => {
    if (localStorage.getItem('is_spinning') === 'true') return;

    const btn = document.getElementById('btn-lancer');
    btn.disabled = true;
    btn.innerText = "CHARGEMENT DE LA PUB... 📺";

    // --- ZONE RÉGIE PUBLICITAIRE ---
    // Simule l'attente d'une publicité vidéo récompensée
    await new Promise(resolve => {
        setTimeout(() => {
            console.log("Publicité terminée et validée.");
            resolve(true);
        }, 4000); 
    });
    // --- FIN ZONE RÉGIE ---

    btn.innerText = "PUB VALIDÉE ! ÇA TOURNE... 🎡";
    roue.spin();
};