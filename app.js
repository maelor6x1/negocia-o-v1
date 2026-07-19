let player = {};

let currentBrand = null;
let currentOffer = {};

let negotiationEnded = false;
let typingQueue = Promise.resolve();

let negotiationState = {
    tension: 0,
    rounds: 0,
    counterOffers: 0,
    ultimatum: false
};

// ---------- CONTA E CARREIRA ----------

const API_BASE = "";

let currentUser = null;

let careerData = {
    player: null,
    activeContract: null,
    history: []
};

// Preenchido quando o jogador está renegociando (renovação) com a
// mesma marca após o fim de uma temporada.
let pendingRenewal = null;

// ---------- CONFIANÇA (PRESTÍGIO) POR MARCA ----------

// { NIKE: 62, ADIDAS: 50, ... }. 50 = neutro, é o padrão pra marca
// nunca negociada antes nesta carreira.
let trustMap = {};

function getTrust(brandName) {
    return trustMap[brandName] != null
        ? trustMap[brandName]
        : 50;
}

function trustLabel(score) {
    if (score >= 85) {
        return "Excelente";
    }

    if (score >= 65) {
        return "Boa";
    }

    if (score >= 40) {
        return "Neutra";
    }

    if (score >= 20) {
        return "Ruim";
    }

    return "Péssima";
}

function trustStars(score) {
    const filled = Math.max(
        0,
        Math.min(5, Math.round(score / 20))
    );

    return "★".repeat(filled) + "☆".repeat(5 - filled);
}

function adjustTrustLocal(brandName, delta) {
    const next = Math.min(
        100,
        Math.max(0, Math.round(getTrust(brandName) + delta))
    );

    trustMap[brandName] = next;

    apiRequest("/api/career/trust", {
        method: "POST",
        body: JSON.stringify({ brand: brandName, delta })
    }).catch((error) => console.error(error));

    return next;
}

// ---------- NEGOCIAÇÃO RIVAL (CONCORRÊNCIA ENTRE MARCAS) ----------

// Marcas que já tentaram (ou foram ignoradas) na negociação atual, pra
// não repetir a mesma marca duas vezes na mesma conversa.
let triedRivalBrands = new Set();

// Preenchido quando existe um pop-up de marca rival pendente na tela.
let pendingRivalOffer = null;

// Marcas com quem a negociação acabou de fracassar (a marca desistiu
// pela tensão, ou o jogador recusou/rescindiu). Ficam bloqueadas pra
// nova negociação até o jogador analisar o mercado de novo.
let failedBrands = new Set();

const ICON_CDN =
    "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons";

// A Clearbit Logo API (logo.clearbit.com) foi desligada permanentemente em
// 08/12/2025 após a aquisição pela HubSpot. Mizuno, Skechers e Umbro agora
// usam o Wikimedia Commons via Special:FilePath, que redireciona direto
// para o arquivo sem precisar de chave de API.
const COMMONS_FILEPATH =
    "https://commons.wikimedia.org/wiki/Special:FilePath";

const BRAND_LOGOS = {
    NIKE: `${ICON_CDN}/nike.svg`,
    ADIDAS: `${ICON_CDN}/adidas.svg`,
    PUMA: `${ICON_CDN}/puma.svg`,
    "NEW BALANCE": `${ICON_CDN}/newbalance.svg`,
    "UNDER ARMOUR": `${ICON_CDN}/underarmour.svg`,

    MIZUNO: `${COMMONS_FILEPATH}/MIZUNO%20logo.svg`,
    SKECHERS: `${COMMONS_FILEPATH}/Skechers.svg`,
    UMBRO: `${COMMONS_FILEPATH}/Umbro%202024%20logo.svg`
};

const leagueReputation = {
    premier: 100,
    laliga: 95,
    bundesliga: 90,
    seriea: 90,
    ligue1: 82,
    brasil: 75,
    portugal: 72,
    eredivisie: 68,
    mls: 62,
    saudi: 65,
    other: 45
};

// goalDifficulty: multiplica os alvos de metas geradas (1 = padrão).
// preferredDuration: duração típica de contrato dessa marca (temporadas).
// poachChance: peso relativo de chance de iniciar uma interrupção rival
// durante a negociação de OUTRA marca (0 = nunca puxa o jogador).
// poachLine(rivalName): fala usada na mensagem de interrupção.
// openingFlavor: frase que reflete a personalidade, usada na abertura.
const brands = [
    {
        name: "NIKE",
        logo: BRAND_LOGOS.NIKE,
        representative: "Alex Morgan",
        tier: 5,
        multiplier: 1.30,
        baseInterest: -12,
        minOverall: 81,
        maxCounterOffers: 3,
        tensionMultiplier: 1.55,
        negotiationFlexibility: 0.14,
        goalDifficulty: 1.3,
        preferredDuration: null,
        poachChance: 0.04,
        poachLine: (rival) =>
            `Não costumamos entrar em disputas, mas sua avaliação comercial chamou nossa atenção enquanto você conversava com a ${rival}.`,
        openingFlavor:
            "Somos diretos: esta é a nossa avaliação comercial para você, sem meio-termo."
    },

    {
        name: "ADIDAS",
        logo: BRAND_LOGOS.ADIDAS,
        representative: "Thomas Weber",
        tier: 5,
        multiplier: 1.25,
        baseInterest: -10,
        minOverall: 80,
        maxCounterOffers: 4,
        tensionMultiplier: 1.20,
        negotiationFlexibility: 0.20,
        goalDifficulty: 1.15,
        preferredDuration: null,
        renewalBonusMultiplier: 1.22,
        poachChance: 0.35,
        poachLine: (rival) =>
            `Soube que você está negociando com a ${rival}. Gostaríamos de apresentar uma proposta superior.`,
        openingFlavor:
            "Acompanhamos sua trajetória de perto e acreditamos em contratos de longo prazo com quem conquista títulos."
    },

    {
        name: "PUMA",
        logo: BRAND_LOGOS.PUMA,
        representative: "Lena Fischer",
        tier: 4,
        multiplier: 1.12,
        baseInterest: -2,
        minOverall: 75,
        maxCounterOffers: 4,
        tensionMultiplier: 1.00,
        negotiationFlexibility: 0.30,
        goalDifficulty: 0.9,
        preferredDuration: null,
        poachChance: 0.18,
        poachLine: (rival) =>
            `Não entraremos em um leilão. Nossa proposta é final, mas achamos justo você conhecê-la antes de fechar com a ${rival}.`,
        openingFlavor:
            "Apostamos em jogadores em ascensão — vemos bastante espaço de crescimento no seu perfil."
    },

    {
        name: "NEW BALANCE",
        logo: BRAND_LOGOS["NEW BALANCE"],
        representative: "James Miller",
        tier: 3,
        multiplier: 1.05,
        baseInterest: 5,
        minOverall: 72,
        maxCounterOffers: 5,
        tensionMultiplier: 0.75,
        negotiationFlexibility: 0.40,
        goalDifficulty: 0.85,
        preferredDuration: null,
        poachChance: 0.25,
        poachLine: (rival) =>
            `Adoraríamos conversar com você também — antes de fechar com a ${rival}, que tal ouvir nossa proposta?`,
        openingFlavor:
            "Gostamos de construir contratos equilibrados, com espaço pra conversar sobre qualquer termo."
    },

    {
        name: "MIZUNO",
        logo: BRAND_LOGOS.MIZUNO,
        representative: "Hiroshi Tanaka",
        tier: 3,
        multiplier: 0.95,
        baseInterest: 5,
        minOverall: 70,
        maxCounterOffers: 5,
        tensionMultiplier: 0.70,
        negotiationFlexibility: 0.32,
        goalDifficulty: 1.0,
        preferredDuration: 4,
        poachChance: 0.06,
        poachLine: (rival) =>
            `Percebemos seu nome circulando em outras negociações, inclusive com a ${rival}. Preferimos ser transparentes desde já com nossa proposta.`,
        openingFlavor:
            "Valorizamos disciplina e regularidade — pensamos em vínculos mais longos com nossos atletas."
    },

    {
        name: "UNDER ARMOUR",
        logo: BRAND_LOGOS["UNDER ARMOUR"],
        representative: "Michael Reed",
        tier: 2,
        multiplier: 0.90,
        baseInterest: 9,
        minOverall: 68,
        maxCounterOffers: 6,
        tensionMultiplier: 0.65,
        negotiationFlexibility: 0.40,
        goalDifficulty: 1.05,
        preferredDuration: null,
        poachChance: 0.20,
        poachLine: (rival) =>
            `Seus números atléticos chamaram nossa atenção enquanto você negociava com a ${rival}. Podemos conversar?`,
        openingFlavor:
            "Damos muito valor ao desempenho físico e competitivo — seus números batem com o que buscamos."
    },

    {
        name: "SKECHERS",
        logo: BRAND_LOGOS.SKECHERS,
        representative: "Daniel Brooks",
        tier: 2,
        multiplier: 0.88,
        baseInterest: 12,
        minOverall: 67,
        maxCounterOffers: 6,
        tensionMultiplier: 0.60,
        negotiationFlexibility: 0.48,
        goalDifficulty: 0.7,
        preferredDuration: 1,
        poachChance: 0.22,
        poachLine: (rival) =>
            `Vimos que você tá em conversa com a ${rival}. A gente prefere contratos mais curtos e diretos — topa ouvir?`,
        openingFlavor:
            "Preferimos contratos curtos e objetivos, sem muita burocracia nem metas complicadas."
    },

    {
        name: "UMBRO",
        logo: BRAND_LOGOS.UMBRO,
        representative: "Oliver Bennett",
        tier: 1,
        multiplier: 0.72,
        baseInterest: 15,
        minOverall: 64,
        maxCounterOffers: 8,
        tensionMultiplier: 0.55,
        negotiationFlexibility: 0.55,
        goalDifficulty: 0.75,
        preferredDuration: null,
        poachChance: 0.15,
        poachLine: (rival) =>
            `Sabemos que não somos a marca mais badalada perto da ${rival}, mas cuidamos muito bem dos nossos atletas. Vale a conversa?`,
        openingFlavor:
            "Não somos a marca mais badalada do mercado, mas somos flexíveis e cuidamos bem de quem veste nossa marca."
    }
];

async function apiRequest(path, options = {}) {
    const response = await fetch(API_BASE + path, {
        credentials: "include",

        headers: {
            "Content-Type": "application/json"
        },

        ...options
    });

    let data = null;

    try {
        data = await response.json();
    } catch (error) {
        data = null;
    }

    if (!response.ok) {
        throw new Error(
            (data && data.error) ||
            "Erro inesperado ao falar com o servidor."
        );
    }

    return data;
}

async function initApp() {
    try {
        const session =
            await apiRequest("/api/session");

        if (session.authenticated) {
            currentUser = session.username;

            await enterAuthenticatedApp();

        } else {
            showScreen("authScreen");
        }

    } catch (error) {
        console.error(
            "Falha ao verificar sessão:",
            error
        );

        showScreen("authScreen");
    }
}

function switchAuthTab(tab) {
    document.getElementById("loginTab")
        .classList.toggle("active", tab === "login");

    document.getElementById("registerTab")
        .classList.toggle("active", tab === "register");

    document.getElementById("loginForm")
        .classList.toggle("hidden", tab !== "login");

    document.getElementById("registerForm")
        .classList.toggle("hidden", tab !== "register");

    document.getElementById("authError").textContent = "";
}

async function handleLogin(event) {
    event.preventDefault();

    const username =
        document.getElementById("loginUsername")
            .value.trim();

    const password =
        document.getElementById("loginPassword").value;

    try {
        const data = await apiRequest("/api/login", {
            method: "POST",
            body: JSON.stringify({ username, password })
        });

        currentUser = data.username;

        document.getElementById("authError").textContent = "";

        await enterAuthenticatedApp();

    } catch (error) {
        document.getElementById("authError").textContent =
            error.message;
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const username =
        document.getElementById("registerUsername")
            .value.trim();

    const password =
        document.getElementById("registerPassword").value;

    try {
        const data = await apiRequest("/api/register", {
            method: "POST",
            body: JSON.stringify({ username, password })
        });

        currentUser = data.username;

        document.getElementById("authError").textContent = "";

        await enterAuthenticatedApp();

    } catch (error) {
        document.getElementById("authError").textContent =
            error.message;
    }
}

// Limpa todo estado de negociação/sessão em memória — usado no logout
// e ao trocar/criar uma carreira, pra não vazar contexto de uma
// carreira pra outra.
function resetSessionState() {
    pendingRenewal = null;
    pendingRivalOffer = null;
    failedBrands = new Set();
    triedRivalBrands = new Set();
    currentBrand = null;
    currentOffer = {};
    negotiationEnded = false;
}

async function handleLogout() {
    try {
        await apiRequest("/api/logout", {
            method: "POST"
        });

    } catch (error) {
        console.error(error);
    }

    currentUser = null;

    careerData = {
        player: null,
        activeContract: null,
        history: []
    };

    trustMap = {};
    player = {};

    resetSessionState();

    document.getElementById("headerActions")
        .classList.remove("visible");

    showScreen("authScreen");
}

function applyCareerData(data) {
    careerData = data;
    trustMap = data.trust || {};
    player = data.player || {};
}

async function enterAuthenticatedApp() {
    document.getElementById("headerActions")
        .classList.add("visible");

    document.getElementById("headerUsername").textContent =
        currentUser;

    applyCareerData(await apiRequest("/api/career"));

    if (careerData.activeContract) {
        renderCareerScreen();
        showScreen("careerScreen");
        return;
    }

    if (player && player.name) {
        prefillPlayerForm(player);
    }

    showScreen("playerScreen");
}

function prefillPlayerForm(p) {
    if (p.name) {
        document.getElementById("playerName").value = p.name;
    }

    if (p.age) {
        document.getElementById("playerAge").value = p.age;
    }

    if (p.position) {
        document.getElementById("playerPosition").value = p.position;
    }

    if (p.overall) {
        document.getElementById("playerOverall").value = p.overall;
    }

    if (p.club) {
        document.getElementById("playerClub").value = p.club;
    }

    if (p.league) {
        document.getElementById("playerLeague").value = p.league;
    }

    if (p.clubReputation) {
        document.getElementById("clubReputation").value =
            p.clubReputation;
    }

    if (p.value) {
        document.getElementById("playerValue").value = p.value;
    }

    if (p.goals != null) {
        document.getElementById("playerGoals").value = p.goals;
    }

    if (p.assists != null) {
        document.getElementById("playerAssists").value = p.assists;
    }
}

async function savePlayerToCareer() {
    try {
        await apiRequest("/api/career", {
            method: "PUT",
            body: JSON.stringify({ player })
        });

    } catch (error) {
        console.error(
            "Não foi possível salvar a carreira:",
            error
        );
    }
}

function goToNewMarketAnalysis() {
    prefillPlayerForm(player);
    showScreen("playerScreen");
}

async function saveAcceptedContract(brandName, offer, goals) {
    try {
        const result = await apiRequest(
            "/api/career/contract",
            {
                method: "POST",

                body: JSON.stringify({
                    brand: brandName,
                    weeklyValue: offer.value,
                    duration: offer.duration,
                    bonus: offer.bonus,
                    goals
                })
            }
        );

        careerData.activeContract = {
            id: result.id,
            brand: brandName,
            weeklyValue: offer.value,
            duration: offer.duration,
            bonus: offer.bonus,
            goals,
            seasonsCompleted: 0
        };

        return true;

    } catch (error) {
        console.error(
            "Não foi possível salvar o contrato:",
            error
        );

        return false;
    }
}

async function closeContract(contractId, status) {
    try {
        await apiRequest(
            `/api/career/contract/${contractId}/close`,
            {
                method: "POST",
                body: JSON.stringify({ status })
            }
        );

    } catch (error) {
        console.error(error);
    }
}

async function finalizeAcceptedContract(goals, brand, offer) {
    // Aceita a marca/oferta como parâmetro (travadas no momento do
    // aceite) mas cai pras variáveis globais se não vierem, pra manter
    // compatibilidade com qualquer chamada antiga.
    const dealBrand = brand || currentBrand;
    const dealOffer = offer || currentOffer;

    if (pendingRenewal) {
        // Renovou contrato com a mesma marca — reforça a confiança.
        adjustTrustLocal(dealBrand.name, 10);

        await closeContract(
            pendingRenewal.contractId,
            "renewed"
        );

        pendingRenewal = null;

    } else {
        // Início de um novo vínculo — pequeno ganho inicial de confiança.
        adjustTrustLocal(dealBrand.name, 3);
    }

    return await saveAcceptedContract(
        dealBrand.name,
        dealOffer,
        goals
    );
}

async function closePendingRenewalAsEnded() {
    if (!pendingRenewal) {
        return;
    }

    await closeContract(
        pendingRenewal.contractId,
        "ended"
    );

    careerData.activeContract = null;
    pendingRenewal = null;
}

// Chamado quando uma renovação em andamento não se concretiza (o jogador
// recusa ou a marca desiste pela tensão) — diferente de "não bater metas",
// que já é penalizado separadamente em analyzeRenewal().
function penalizeRefusedRenewal() {
    if (pendingRenewal && currentBrand) {
        adjustTrustLocal(currentBrand.name, -10);
    }
}

function renderCareerScreen() {
    const summary =
        document.getElementById("careerSummary");

    const activeCard =
        document.getElementById("activeContractCard");

    const historyContainer =
        document.getElementById("contractHistory");

    summary.textContent =
        player && player.name
            ? `${player.name} • ${player.club} • ${player.position} • OVR ${player.overall}`
            : "";

    const contract = careerData.activeContract;

    if (!contract) {
        activeCard.innerHTML = `
            <h3>NENHUM CONTRATO ATIVO</h3>

            <p class="careerEmptyText">
                Você não tem um patrocínio ativo no momento.
                Analise o mercado para encontrar uma nova marca.
            </p>
        `;

    } else {
        const trust = getTrust(contract.brand);

        const seasonsCompleted =
            contract.seasonsCompleted || 0;

        const remainingSeasons =
            Math.max(0, contract.duration - seasonsCompleted);

        activeCard.innerHTML = `
            <h3>CONTRATO ATIVO — ${contract.brand}</h3>

            <div class="trustBadge careerTrustBadge" title="Confiança: ${trust}/100">
                <span class="trustStars">${trustStars(trust)}</span>
                <span class="trustLabel">${trustLabel(trust)} (${trust}/100)</span>
            </div>

            <div class="dealInfo careerDealInfo">
                <div>
                    <span>VALOR SEMANAL</span>
                    <strong>€ ${formatMoney(contract.weeklyValue)}</strong>
                </div>

                <div>
                    <span>TEMPORADAS RESTANTES</span>
                    <strong>${remainingSeasons} de ${contract.duration}</strong>
                </div>

                <div>
                    <span>BÔNUS</span>
                    <strong>€ ${formatMoney(contract.bonus)}</strong>
                </div>
            </div>

            <h3 class="careerGoalsTitle">METAS DO PATROCÍNIO</h3>

            <ul class="goalsList">
                ${contract.goals
                    .map((goal) => `<li>${goal}</li>`)
                    .join("")}
            </ul>

            <button
                class="mainButton"
                type="button"
                onclick="startRenewalFlow()"
            >
                REGISTRAR FIM DE TEMPORADA
            </button>

            <button
                class="secondaryButton dangerButton"
                type="button"
                onclick="terminateContract()"
            >
                RESCINDIR CONTRATO (COM MULTA)
            </button>
        `;
    }

    historyContainer.innerHTML = "";

    if (careerData.history.length === 0) {
        const empty = document.createElement("p");
        empty.className = "careerEmptyText";
        empty.textContent =
            "Nenhum contrato encerrado ainda.";

        historyContainer.appendChild(empty);

    } else {
        careerData.history.forEach((item) => {
            const card = document.createElement("div");

            card.className = "brandCard";

            const statusLabel =
                item.status === "renewed"
                    ? "RENOVADO"
                    : "ENCERRADO";

            const statusClass =
                item.status === "renewed"
                    ? "high"
                    : "low";

            card.innerHTML = `
                <div class="brandTop">
                    <div class="brandLogo">${item.brand}</div>

                    <div class="interest ${statusClass}">
                        ${statusLabel}
                    </div>
                </div>

                <div class="brandDetails careerHistoryDetails">
                    <div>
                        <span>VALOR SEMANAL</span>
                        <strong>€ ${formatMoney(item.weeklyValue)}</strong>
                    </div>

                    <div>
                        <span>DURAÇÃO</span>
                        <strong>${item.duration} temporada(s)</strong>
                    </div>
                </div>
            `;

            historyContainer.appendChild(card);
        });
    }
}

// ---------- MÚLTIPLAS CARREIRAS (SLOTS) ----------

async function renderCareerListScreen() {
    const container =
        document.getElementById("careerListContainer");

    container.innerHTML = `<p class="careerEmptyText">Carregando...</p>`;

    let careers = [];

    try {
        const result = await apiRequest("/api/careers");
        careers = result.careers || [];

    } catch (error) {
        console.error(error);
        container.innerHTML =
            `<p class="careerEmptyText">Não foi possível carregar suas carreiras.</p>`;
        return;
    }

    container.innerHTML = "";

    careers.forEach((career) => {
        const card = document.createElement("div");

        card.className =
            "brandCard careerSlotCard" +
            (career.isActive ? " careerSlotActive" : "");

        const hasPlayer =
            career.player && career.player.name;

        const summary = hasPlayer
            ? `${career.player.name} • ${career.player.club || "Sem clube"} • OVR ${career.player.overall || "?"}`
            : "Carreira vazia — nenhum jogador criado ainda";

        card.innerHTML = `
            <div class="brandTop">
                <div class="brandLogo">
                    ${hasPlayer ? career.player.name : "NOVA CARREIRA"}
                </div>

                ${
                    career.isActive
                        ? '<div class="interest high">ATIVA</div>'
                        : ""
                }
            </div>

            <p class="careerSlotSummary">${summary}</p>

            ${
                career.activeBrand
                    ? `<p class="careerSlotBrand">Patrocínio atual: <strong>${career.activeBrand}</strong></p>`
                    : ""
            }

            <div class="careerSlotActions">
                <button
                    type="button"
                    class="secondaryButton careerSlotSelect"
                    ${career.isActive ? "disabled" : ""}
                >
                    ${career.isActive ? "CARREIRA ATUAL" : "SELECIONAR"}
                </button>

                <button
                    type="button"
                    class="secondaryButton dangerButton careerSlotDelete"
                    aria-label="Excluir carreira"
                >
                    EXCLUIR
                </button>
            </div>
        `;

        const selectButton =
            card.querySelector(".careerSlotSelect");

        if (!career.isActive) {
            selectButton.addEventListener("click", () =>
                selectCareerSlot(career.id)
            );
        }

        card.querySelector(".careerSlotDelete")
            .addEventListener("click", () =>
                deleteCareerSlot(career.id, hasPlayer ? career.player.name : null)
            );

        container.appendChild(card);
    });

    if (careers.length === 0) {
        container.innerHTML =
            `<p class="careerEmptyText">Nenhuma carreira encontrada.</p>`;
    }
}

async function createNewCareer() {
    try {
        await apiRequest("/api/careers", { method: "POST" });

    } catch (error) {
        console.error(error);
        alert("Não foi possível criar uma nova carreira agora.");
        return;
    }

    resetSessionState();

    applyCareerData(await apiRequest("/api/career"));

    document.getElementById("playerName").value = "";
    document.getElementById("playerAge").value = "";
    document.getElementById("playerClub").value = "";
    document.getElementById("playerOverall").value = "";
    document.getElementById("playerValue").value = "";
    document.getElementById("playerGoals").value = "";
    document.getElementById("playerAssists").value = "";
    document.getElementById("playerPosition").selectedIndex = 0;
    document.getElementById("playerLeague").selectedIndex = 0;
    document.getElementById("clubReputation").selectedIndex = 0;

    showScreen("playerScreen");
}

async function selectCareerSlot(careerId) {
    try {
        await apiRequest(`/api/careers/${careerId}/select`, {
            method: "POST"
        });

    } catch (error) {
        console.error(error);
        alert("Não foi possível trocar de carreira agora.");
        return;
    }

    resetSessionState();

    applyCareerData(await apiRequest("/api/career"));

    if (careerData.activeContract) {
        renderCareerScreen();
        showScreen("careerScreen");
        return;
    }

    if (player && player.name) {
        prefillPlayerForm(player);
        showScreen("playerScreen");
        return;
    }

    document.getElementById("playerName").value = "";
    document.getElementById("playerAge").value = "";
    document.getElementById("playerClub").value = "";
    document.getElementById("playerOverall").value = "";
    document.getElementById("playerValue").value = "";
    document.getElementById("playerGoals").value = "";
    document.getElementById("playerAssists").value = "";
    document.getElementById("playerPosition").selectedIndex = 0;
    document.getElementById("playerLeague").selectedIndex = 0;
    document.getElementById("clubReputation").selectedIndex = 0;

    showScreen("playerScreen");
}

async function deleteCareerSlot(careerId, playerName) {
    const label = playerName || "essa carreira vazia";

    const confirmed = confirm(
        `Tem certeza que quer excluir ${label}? Isso apaga o jogador, os contratos e o histórico dessa carreira pra sempre.`
    );

    if (!confirmed) {
        return;
    }

    try {
        await apiRequest(`/api/careers/${careerId}`, {
            method: "DELETE"
        });

    } catch (error) {
        console.error(error);
        alert("Não foi possível excluir essa carreira agora.");
        return;
    }

    renderCareerListScreen();
}

function startRenewalFlow() {
    const contract = careerData.activeContract;

    if (!contract) {
        return;
    }

    const seasonsCompleted =
        contract.seasonsCompleted || 0;

    const isFinalSeason =
        seasonsCompleted + 1 >= contract.duration;

    document.getElementById("renewalBrandName").textContent =
        contract.brand;

    const goalsCard =
        document.getElementById("renewalGoalsCard");

    const seekButton =
        document.getElementById("renewalSeekButton");

    const primaryButton =
        document.getElementById("renewalPrimaryButton");

    const intro =
        document.getElementById("renewalIntro");

    if (isFinalSeason) {
        goalsCard.classList.remove("hidden");
        seekButton.classList.remove("hidden");

        primaryButton.textContent = "ANALISAR RENOVAÇÃO";

        intro.innerHTML = `
            Seu contrato com <strong>${contract.brand}</strong>
            está chegando ao fim. Revise as metas e informe os novos
            números da temporada para negociar a renovação — ou procure
            outras marcas se preferir mudar.
        `;

    } else {
        goalsCard.classList.add("hidden");
        seekButton.classList.add("hidden");

        primaryButton.textContent = "REGISTRAR TEMPORADA";

        const remaining =
            contract.duration - (seasonsCompleted + 1);

        intro.innerHTML = `
            Seu contrato com <strong>${contract.brand}</strong>
            ainda tem ${remaining} temporada(s) pela frente depois desta.
            Informe os novos números da temporada pra continuar a carreira.
        `;
    }

    const goalsList =
        document.getElementById("renewalGoalsList");

    goalsList.innerHTML = contract.goals
        .map(
            (goal, index) => `
                <label class="goalCheck">
                    <input type="checkbox" id="goalCheck${index}">
                    <span>${goal}</span>
                </label>
            `
        )
        .join("");

    document.getElementById("renewalOverall").value =
        player.overall || "";

    document.getElementById("renewalValue").value =
        player.value || "";

    document.getElementById("renewalGoalsScored").value = "";
    document.getElementById("renewalAssists").value = "";

    document.getElementById("renewalClub").value =
        player.club || "";

    document.getElementById("renewalClubReputation").value =
        player.clubReputation || "70";

    document.getElementById("renewalWonTitle").checked = false;

    showScreen("renewalScreen");
}

async function terminateContract() {
    const contract = careerData.activeContract;

    if (!contract) {
        return;
    }

    const fee = Math.round(
        contract.weeklyValue * 4 +
        contract.bonus * 0.5
    );

    const confirmed = confirm(
        `Rescindir o contrato com a ${contract.brand} custa uma multa estimada de € ${formatMoney(fee)} e reduz sua confiança com a marca. Tem certeza que quer romper o vínculo?`
    );

    if (!confirmed) {
        return;
    }

    // Rompimento de contrato pesa bastante na confiança com a marca.
    adjustTrustLocal(contract.brand, -20);

    await closeContract(contract.id, "ended");

    careerData.activeContract = null;

    alert(
        `Contrato com a ${contract.brand} encerrado. A multa de € ${formatMoney(fee)} foi paga e o mercado está liberado novamente.`
    );

    renderBrands();
    renderCareerScreen();
    showScreen("brandsScreen");
}

// Lê o formulário de fim de temporada, atualiza o jogador e calcula o
// aproveitamento de metas — compartilhado pelos dois botões da tela
// (renovar ou procurar novas marcas), já que ambos avaliam a mesma
// temporada final antes de decidir o que fazer com o resultado.
async function collectSeasonReviewData(contract) {
    const goalChecks = contract.goals.map((goal, index) =>
        document.getElementById(`goalCheck${index}`).checked
    );

    const achievedCount =
        goalChecks.filter(Boolean).length;

    const totalGoals =
        contract.goals.length || 1;

    const ratio =
        achievedCount / totalGoals;

    const wonTitle =
        document.getElementById("renewalWonTitle").checked;

    applySeasonStatsFromForm();

    await savePlayerToCareer();

    return { ratio, achievedCount, totalGoals, wonTitle };
}

function applySeasonStatsFromForm() {
    player.age =
        (player.age || 18) + 1;

    player.overall =
        Number(
            document.getElementById("renewalOverall").value
        ) || player.overall;

    player.value =
        Number(
            document.getElementById("renewalValue").value
        ) || player.value;

    player.goals =
        Number(
            document.getElementById("renewalGoalsScored").value
        ) || 0;

    player.assists =
        Number(
            document.getElementById("renewalAssists").value
        ) || 0;

    player.club =
        document.getElementById("renewalClub").value.trim() ||
        player.club;

    player.clubReputation =
        Number(
            document.getElementById("renewalClubReputation").value
        );

    player.commercialScore =
        calculateCommercialScore();
}

async function advanceContractSeason(contractId) {
    try {
        const result = await apiRequest("/api/career", {
            method: "PUT",

            body: JSON.stringify({
                player,
                advanceSeasonContractId: contractId
            })
        });

        return result.seasonsCompleted;

    } catch (error) {
        console.error(error);
        return null;
    }
}

// Temporada registrada, mas o contrato ainda tem tempo — só atualiza
// os números do jogador e mantém o vínculo atual intacto.
async function registerMidContractSeason(contract) {
    applySeasonStatsFromForm();

    const updatedSeasons =
        await advanceContractSeason(contract.id);

    if (updatedSeasons != null) {
        careerData.activeContract.seasonsCompleted =
            updatedSeasons;
    }

    const remaining = Math.max(
        0,
        contract.duration -
            (updatedSeasons != null
                ? updatedSeasons
                : (contract.seasonsCompleted || 0) + 1)
    );

    alert(
        `Temporada registrada! Restam ${remaining} temporada(s) no contrato com a ${contract.brand}.`
    );

    renderCareerScreen();
    showScreen("careerScreen");
}

async function analyzeRenewal() {
    const contract = careerData.activeContract;

    if (!contract) {
        return;
    }

    const seasonsCompleted =
        contract.seasonsCompleted || 0;

    const isFinalSeason =
        seasonsCompleted + 1 >= contract.duration;

    if (!isFinalSeason) {
        await registerMidContractSeason(contract);
        return;
    }

    const { ratio, achievedCount, totalGoals, wonTitle } =
        await collectSeasonReviewData(contract);

    const brand =
        brands.find((b) => b.name === contract.brand);

    if (ratio < 0.4 || !brand) {
        pendingRenewal = {
            contractId: contract.id,
            ratio,
            achievedCount,
            totalGoals
        };

        // Descumpriu a maior parte das metas — pesa bastante na confiança.
        adjustTrustLocal(contract.brand, -18);

        await closePendingRenewalAsEnded();

        alert(
            `A ${contract.brand} avaliou que apenas ${achievedCount} de ${totalGoals} metas foram cumpridas e decidiu não renovar o patrocínio. Você está livre para negociar com outras marcas.`
        );

        renderBrands();

        document.getElementById("commercialScore").innerText =
            player.commercialScore;

        document.getElementById("playerSummary").innerText =
            `${player.name} • ${player.club} • ${player.position} • OVR ${player.overall}`;

        showScreen("brandsScreen");

        return;
    }

    // Temporada dentro ou acima do esperado já melhora a relação, mesmo
    // antes de saber se a renovação vai se concretizar.
    const performanceTrustDelta =
        ratio >= 0.9
            ? 14
            : ratio >= 0.75
                ? 10
                : 4;

    adjustTrustLocal(
        contract.brand,
        performanceTrustDelta + (wonTitle ? 8 : 0)
    );

    pendingRenewal = {
        contractId: contract.id,
        ratio,
        achievedCount,
        totalGoals
    };

    startRenewalNegotiation(brand, ratio);
}

// Botão "PROCURAR NOVOS PATROCINADORES" — só aparece na temporada final
// do contrato. Encerra o vínculo atual (sem tentar renovação) e manda
// o jogador de volta pro mercado aberto.
async function seekNewSponsors() {
    const contract = careerData.activeContract;

    if (!contract) {
        return;
    }

    const seasonsCompleted =
        contract.seasonsCompleted || 0;

    const isFinalSeason =
        seasonsCompleted + 1 >= contract.duration;

    if (!isFinalSeason) {
        await registerMidContractSeason(contract);
        return;
    }

    const { ratio, achievedCount, totalGoals } =
        await collectSeasonReviewData(contract);

    let trustDelta;

    if (ratio < 0.4) {
        // Desempenho ruim — mesmo impacto de quando a marca recusa
        // renovar, já que o resultado seria o mesmo de qualquer forma.
        trustDelta = -18;

    } else {
        const performanceTrustDelta =
            ratio >= 0.9
                ? 14
                : ratio >= 0.75
                    ? 10
                    : 4;

        // Boa relação, mas o jogador optou por sair mesmo assim —
        // pequena penalidade por recusar uma renovação que era viável.
        trustDelta = performanceTrustDelta - 8;
    }

    adjustTrustLocal(contract.brand, trustDelta);

    await closeContract(contract.id, "ended");

    careerData.activeContract = null;

    alert(
        `Você encerrou o vínculo com a ${contract.brand} ao fim do contrato (${achievedCount}/${totalGoals} metas cumpridas) e está livre para negociar com outras marcas.`
    );

    renderBrands();

    document.getElementById("commercialScore").innerText =
        player.commercialScore;

    document.getElementById("playerSummary").innerText =
        `${player.name} • ${player.club} • ${player.position} • OVR ${player.overall}`;

    showScreen("brandsScreen");
}

function startRenewalNegotiation(brand, ratio) {
    currentBrand = brand;

    negotiationEnded = false;
    typingQueue = Promise.resolve();


    negotiationState = {
        tension: 0,
        rounds: 0,
        counterOffers: 0,
        ultimatum: false
    };

    const baseValue =
        calculateInitialOffer(brand);

    const performanceMultiplier =
        ratio >= 0.75
            ? 1.15
            : 1;

    const value =
        Math.max(
            500,
            Math.round(
                baseValue * performanceMultiplier / 250
            ) * 250
        );

    currentOffer = {
        value,

        duration:
            brand.tier >= 4
                ? 3
                : 2,

        bonus:
            Math.max(
                1000,
                Math.round(value * 8 / 500) * 500
            )
    };

    document.getElementById("brandName").innerText =
        currentBrand.name;

    document.getElementById("miniPlayerName").innerText =
        player.name;

    document.getElementById("miniPlayerClub").innerText =
        player.club;

    document.getElementById("representativeName").innerText =
        currentBrand.representative;

    const logoContainer =
        document.getElementById("representativeInitial");

    logoContainer.innerHTML = "";

    logoContainer.appendChild(
        createBrandLogoElement(
            currentBrand,
            "representativeBrandImage"
        )
    );

    document.getElementById("chatMessages").innerHTML = "";

    showNegotiationControls();

    updateOfferUI();
    updateNegotiationUI();

    const performanceNote =
        ratio >= 0.75
            ? "Seu desempenho superou as metas da temporada passada, então já incluímos um ajuste positivo nesta proposta."
            : "Você cumpriu parte razoável das metas anteriores, então seguimos com uma proposta de renovação padrão.";

    addAIMessage(
`Olá novamente, ${player.name}.

Avaliamos os resultados da última temporada com a ${currentBrand.name}: ${pendingRenewal.achievedCount} de ${pendingRenewal.totalGoals} metas cumpridas.

${performanceNote}

Nossa proposta de renovação é de € ${formatMoney(currentOffer.value)} por semana, vínculo de ${currentOffer.duration} temporadas e € ${formatMoney(currentOffer.bonus)} em bônus.

Estamos abertos a negociar valor, duração e bônus.`
    );

    showScreen("negotiationScreen");
}

function showScreen(id) {
    document.querySelectorAll(".screen").forEach((screen) => {
        screen.classList.remove("active");
    });

    const target = document.getElementById(id);

    if (!target) {
        console.error("Tela não encontrada:", id);
        return;
    }

    target.classList.add("active");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function analyzePlayer() {
    // Nova análise de mercado = novo ciclo de tentativas, então marcas
    // que recusaram antes voltam a ficar disponíveis.
    failedBrands = new Set();

    player = {
        name: document.getElementById("playerName").value.trim(),
        age: Number(document.getElementById("playerAge").value),
        position: document.getElementById("playerPosition").value,
        overall: Number(document.getElementById("playerOverall").value),
        club: document.getElementById("playerClub").value.trim(),
        league: document.getElementById("playerLeague").value,

        clubReputation: Number(
            document.getElementById("clubReputation").value
        ),

        value: Number(
            document.getElementById("playerValue").value
        ) || 0,

        goals: Number(
            document.getElementById("playerGoals").value
        ) || 0,

        assists: Number(
            document.getElementById("playerAssists").value
        ) || 0
    };

    if (
        !player.name ||
        !player.age ||
        !player.club ||
        !player.overall
    ) {
        alert("Preencha nome, idade, clube e overall do jogador.");
        return;
    }

    if (player.age < 16 || player.age > 50) {
        alert("Digite uma idade válida.");
        return;
    }

    if (player.overall < 40 || player.overall > 99) {
        alert("O overall deve estar entre 40 e 99.");
        return;
    }

    player.leagueReputation =
        leagueReputation[player.league] || 45;

    player.commercialScore =
        calculateCommercialScore();

    document.getElementById("commercialScore").innerText =
        player.commercialScore;

    document.getElementById("playerSummary").innerText =
        `${player.name} • ${player.club} • ${player.position} • OVR ${player.overall}`;

    renderBrands();

    savePlayerToCareer();

    showScreen("brandsScreen");
}

function calculateCommercialScore() {
    let score = 0;

    if (player.overall < 65) {
        score += 5;
    } else if (player.overall < 70) {
        score += 12;
    } else if (player.overall < 75) {
        score += 22;
    } else if (player.overall < 80) {
        score += 36;
    } else if (player.overall < 85) {
        score += 52;
    } else if (player.overall < 90) {
        score += 68;
    } else {
        score += 80;
    }

    score += player.clubReputation * 0.10;
    score += player.leagueReputation * 0.08;
    score += Math.min(player.goals * 0.35, 12);
    score += Math.min(player.assists * 0.25, 8);
    score += Math.min(player.value * 0.06, 8);

    if (
        player.age <= 21 &&
        player.overall >= 76
    ) {
        score += 5;
    }

    if (
        player.age <= 19 &&
        player.overall >= 80
    ) {
        score += 4;
    }

    if (player.overall < 70) {
        score -= 15;
    }

    if (
        player.clubReputation <= 35 &&
        player.overall < 75
    ) {
        score -= 8;
    }

    return Math.min(
        Math.max(Math.round(score), 5),
        100
    );
}

function calculateBrandInterest(brand) {
    let interest =
        player.commercialScore +
        brand.baseInterest;

    const overallDifference =
        player.overall -
        brand.minOverall;

    if (overallDifference < 0) {
        interest += overallDifference * 7;
    } else {
        interest += Math.min(
            overallDifference * 1.5,
            10
        );
    }

    if (
        brand.tier === 5 &&
        player.clubReputation < 70
    ) {
        interest -= 20;
    }

    if (
        brand.tier >= 4 &&
        player.leagueReputation < 65
    ) {
        interest -= 12;
    }

    if (
        brand.tier === 5 &&
        player.overall < brand.minOverall
    ) {
        interest -= 10;
    }

    if (
        player.age <= 21 &&
        player.overall >= brand.minOverall - 2
    ) {
        interest += 5;
    }

    // Confiança acumulada com a marca (prestígio) empurra o interesse
    // pra cima ou pra baixo — histórico bom facilita futuras conversas.
    interest += (getTrust(brand.name) - 50) * 0.2;

    return Math.min(
        Math.max(Math.round(interest), 1),
        99
    );
}

function calculateInitialOffer(brand) {
    let annualValue = 0;

    annualValue += player.overall * 1800;
    annualValue += player.commercialScore * 2200;
    annualValue += player.value * 700;

    annualValue *= brand.multiplier;

    annualValue *=
        0.60 +
        player.clubReputation / 250;

    annualValue *=
        0.70 +
        player.leagueReputation / 330;

    if (player.overall < 65) {
        annualValue *= 0.30;
    } else if (player.overall < 70) {
        annualValue *= 0.45;
    } else if (player.overall < 75) {
        annualValue *= 0.65;
    }

    // Marcas com quem o jogador tem boa relação pagam um pouco mais;
    // relação ruim reduz a proposta inicial.
    annualValue *=
        0.9 +
        getTrust(brand.name) / 500;

    const weeklyValue =
        annualValue / 52;

    return Math.max(
        Math.round(weeklyValue / 250) * 250,
        500
    );
}

function createTextLogo(brand, className) {
    const badge =
        document.createElement("div");

    badge.className =
        className + " textLogo";

    badge.textContent =
        brand.name
            .split(" ")
            .map((word) => word[0])
            .join("")
            .slice(0, 3);

    return badge;
}

function createBrandLogoElement(brand, className) {
    if (!brand.logo) {
        return createTextLogo(brand, className);
    }

    const image = document.createElement("img");

    image.src = brand.logo;
    image.alt = brand.name;
    image.className = className;

    image.onerror = function () {
        this.replaceWith(
            createTextLogo(brand, className)
        );
    };

    return image;
}

function renderBrands() {
    const container =
        document.getElementById("brandsContainer");

    container.innerHTML = "";

    const exclusiveBrand =
        careerData.activeContract
            ? careerData.activeContract.brand
            : null;

    brands.forEach((brand, index) => {
        const trust = getTrust(brand.name);

        const trustBadge = `
            <div class="trustBadge" title="Confiança: ${trust}/100">
                <span class="trustStars">${trustStars(trust)}</span>
                <span class="trustLabel">${trustLabel(trust)}</span>
            </div>
        `;

        // Exclusividade de contrato: enquanto existir um patrocínio
        // ativo, as demais marcas ficam indisponíveis pra negociar.
        if (exclusiveBrand && brand.name !== exclusiveBrand) {
            const card = document.createElement("div");

            card.className = "brandCard brandCardLocked";

            card.innerHTML = `
                <div class="brandTop">
                    <div class="brandIdentity">
                        <div class="brandCardLogo"></div>

                        <div class="brandLogo">
                            ${brand.name}
                        </div>
                    </div>

                    ${trustBadge}
                </div>

                <div class="lockedNotice">
                    <strong>INDISPONÍVEL</strong>
                    <span>Você possui contrato vigente com a ${exclusiveBrand}.</span>
                </div>
            `;

            const logoContainer =
                card.querySelector(".brandCardLogo");

            logoContainer.appendChild(
                createBrandLogoElement(brand, "brandCardImage")
            );

            container.appendChild(card);
            return;
        }

        // Negociação com essa marca fracassou recentemente — fica
        // bloqueada até uma nova análise de mercado.
        if (failedBrands.has(brand.name)) {
            const card = document.createElement("div");

            card.className = "brandCard brandCardLocked";

            card.innerHTML = `
                <div class="brandTop">
                    <div class="brandIdentity">
                        <div class="brandCardLogo"></div>

                        <div class="brandLogo">
                            ${brand.name}
                        </div>
                    </div>

                    ${trustBadge}
                </div>

                <div class="lockedNotice">
                    <strong>TENTATIVA RECENTE FALHOU</strong>
                    <span>A negociação anterior não terminou bem. Analise o mercado novamente para tentar de novo.</span>
                </div>
            `;

            const logoContainer =
                card.querySelector(".brandCardLogo");

            logoContainer.appendChild(
                createBrandLogoElement(brand, "brandCardImage")
            );

            container.appendChild(card);
            return;
        }

        const interest =
            calculateBrandInterest(brand);

        let interestText = "SEM INTERESSE";
        let interestClass = "low";

        if (interest >= 85) {
            interestText = "PRIORIDADE MÁXIMA 🔥";
            interestClass = "high";

        } else if (interest >= 70) {
            interestText = "MUITO ALTO";
            interestClass = "high";

        } else if (interest >= 55) {
            interestText = "ALTO";
            interestClass = "high";

        } else if (interest >= 40) {
            interestText = "MÉDIO";
            interestClass = "medium";

        } else if (interest >= 25) {
            interestText = "BAIXO";
        }

        const offer =
            calculateInitialOffer(brand);

        const canNegotiate =
            interest >= 25;

        const card =
            document.createElement("div");

        card.className = "brandCard";

        card.innerHTML = `
            <div class="brandTop">
                <div class="brandIdentity">
                    <div class="brandCardLogo"></div>

                    <div class="brandLogo">
                        ${brand.name}
                    </div>
                </div>

                <div class="interest ${interestClass}">
                    ${interestText} • ${interest}%
                </div>
            </div>

            ${trustBadge}

            <div class="interestBar">
                <div
                    class="interestProgress"
                    style="width:${interest}%"
                ></div>
            </div>

            <div class="brandDetails">
                <div>
                    <span>VALOR SEMANAL ESTIMADO</span>

                    <strong>
                        ${
                            canNegotiate
                                ? "€ " + formatMoney(offer)
                                : "SEM PROPOSTA"
                        }
                    </strong>
                </div>

                <button
                    class="negotiateButton"
                    type="button"
                    ${!canNegotiate ? "disabled" : ""}
                    aria-label="Negociar contrato com ${brand.name}"
                >
                    ${
                        canNegotiate
                            ? "NEGOCIAR CONTRATO"
                            : "SEM INTERESSE"
                    }
                </button>
            </div>
        `;

        const logoContainer =
            card.querySelector(".brandCardLogo");

        logoContainer.appendChild(
            createBrandLogoElement(
                brand,
                "brandCardImage"
            )
        );

        const button =
            card.querySelector(".negotiateButton");

        if (canNegotiate) {
            button.addEventListener(
                "click",
                () => startNegotiation(index)
            );
        }

        container.appendChild(card);
    });
}

function startNegotiation(index) {
    if (
        careerData.activeContract &&
        careerData.activeContract.brand !== brands[index].name
    ) {
        alert(
            "Você já tem um contrato de patrocínio ativo. Rescinda ou espere o fim da temporada pra negociar com outra marca."
        );

        return;
    }

    if (failedBrands.has(brands[index].name)) {
        alert(
            `A ${brands[index].name} não quer retomar a conversa agora — a última negociação não terminou bem. Analise o mercado novamente mais tarde para tentar de novo.`
        );

        return;
    }

    currentBrand = brands[index];

    negotiationEnded = false;
    typingQueue = Promise.resolve();
    triedRivalBrands = new Set([currentBrand.name]);
    pendingRivalOffer = null;

    const trust = getTrust(currentBrand.name);

    // Confiança alta começa a conversa mais calma; confiança baixa já
    // começa com um pouco mais de tensão no ar.
    const startingTension =
        Math.max(0, Math.round(5 - (trust - 50) / 10));

    negotiationState = {
        tension: startingTension,
        rounds: 0,
        counterOffers: 0,
        ultimatum: false
    };

    const value =
        calculateInitialOffer(currentBrand);

    currentOffer = {
        value: value,

        duration:
            currentBrand.preferredDuration ||
            (currentBrand.tier >= 4 ? 3 : 2),

        bonus:
            Math.max(
                1000,
                Math.round(value * 8 / 500) * 500
            )
    };

    document.getElementById("brandName").innerText =
        currentBrand.name;

    document.getElementById("miniPlayerName").innerText =
        player.name;

    document.getElementById("miniPlayerClub").innerText =
        player.club;

    document.getElementById("representativeName").innerText =
        currentBrand.representative;

    const logoContainer =
        document.getElementById("representativeInitial");

    logoContainer.innerHTML = "";

    logoContainer.appendChild(
        createBrandLogoElement(
            currentBrand,
            "representativeBrandImage"
        )
    );

    document.getElementById("chatMessages").innerHTML = "";

    showNegotiationControls();

    updateOfferUI();
    updateNegotiationUI();

    addAIMessage(
`Olá, ${player.name}.

A ${currentBrand.name} analisou seu desempenho no ${player.club}.

${currentBrand.openingFlavor || ""}

Nossa proposta inicial é de € ${formatMoney(currentOffer.value)} por semana.

O vínculo proposto é de ${currentOffer.duration} temporadas, além de € ${formatMoney(currentOffer.bonus)} em bônus de desempenho.

Estamos abertos a discutir valor semanal, duração e bônus.`
    );

    showScreen("negotiationScreen");
}

function updateOfferUI() {
    document.getElementById("offerValue").innerText =
        "€ " + formatMoney(currentOffer.value);

    document.getElementById("offerDuration").innerText =
        currentOffer.duration +
        (
            currentOffer.duration === 1
                ? " TEMPORADA"
                : " TEMPORADAS"
        );

    document.getElementById("offerBonus").innerText =
        "€ " + formatMoney(currentOffer.bonus);
}

function updateNegotiationUI() {
    if (!currentBrand) {
        return;
    }

    const tension =
        Math.min(
            Math.max(negotiationState.tension, 0),
            100
        );

    const progress =
        document.getElementById("tensionProgress");

    progress.style.width =
        tension + "%";

    progress.className =
        "tensionProgress";

    let text = "CALMA";

    let description =
        "A marca está aberta à negociação.";

    if (tension >= 75) {
        text = "CRÍTICA";

        description =
            "A marca está próxima de abandonar a negociação.";

        progress.classList.add("critical");

    } else if (tension >= 50) {
        text = "ALTA";

        description =
            "A diretoria está perdendo a paciência.";

        progress.classList.add("high");

    } else if (tension >= 25) {
        text = "MODERADA";

        description =
            "As exigências estão aumentando a tensão.";

        progress.classList.add("medium");
    }

    document.getElementById("tensionText").innerText =
        text;

    document.getElementById("tensionDescription").innerText =
        description;

    document.getElementById("counterOffers").innerText =
        negotiationState.counterOffers +
        " / " +
        currentBrand.maxCounterOffers;
}

function increaseTension(amount) {
    if (negotiationEnded) {
        return true;
    }

    negotiationState.tension +=
        amount *
        currentBrand.tensionMultiplier;

    negotiationState.tension =
        Math.min(
            Math.round(negotiationState.tension),
            100
        );

    updateNegotiationUI();

    if (negotiationState.tension >= 100) {
        brandWalkAway();
        return true;
    }

    if (
        negotiationState.tension >= 78 &&
        !negotiationState.ultimatum
    ) {
        negotiationState.ultimatum = true;

        addAIMessage(
`Precisamos ser claros.

A negociação chegou a um ponto crítico.

A proposta atual está muito próxima do nosso limite.

Esperamos uma decisão ou uma contraproposta realista.`
        );

        addSystemMessage(
            "ULTIMATO DA MARCA"
        );
    }

    return false;
}

function registerCounterOffer() {
    negotiationState.counterOffers++;

    updateNegotiationUI();

    if (
        negotiationState.counterOffers >
        currentBrand.maxCounterOffers
    ) {
        brandWalkAway();
        return true;
    }

    return false;
}

function negotiateMoney(requestedValue) {
    if (registerCounterOffer()) {
        return;
    }

    const initialOffer =
        calculateInitialOffer(currentBrand);

    const trustBonus =
        (getTrust(currentBrand.name) - 50) / 400;

    const maximumOffer =
        initialOffer *
        (
            1 +
            currentBrand.negotiationFlexibility +
            trustBonus
        );

    const difference =
        requestedValue /
        currentOffer.value;

    if (difference >= 1.75) {
        if (increaseTension(40)) {
            return;
        }

        addAIMessage(
`Essa exigência está completamente fora da avaliação comercial da ${currentBrand.name}.

Não consideraremos € ${formatMoney(requestedValue)} por semana.

Esperamos uma proposta significativamente mais realista.`
        );

        return;
    }

    if (requestedValue > maximumOffer) {
        if (increaseTension(22)) {
            return;
        }

        const counter =
            Math.round(maximumOffer / 250) * 250;

        currentOffer.value =
            counter;

        updateOfferUI();

        addAIMessage(
`Não podemos atingir o valor solicitado.

Nossa diretoria autorizou € ${formatMoney(counter)} por semana.

Estamos próximos do limite financeiro desta negociação.`
        );

        return;
    }

    if (requestedValue <= currentOffer.value) {
        increaseTension(2);

        currentOffer.value =
            Math.max(
                500,
                Math.round(requestedValue / 250) * 250
            );

        updateOfferUI();

        addAIMessage(
`O valor de € ${formatMoney(currentOffer.value)} por semana é aceitável para a ${currentBrand.name}.

Atualizamos os termos.`
        );

        return;
    }

    const acceptedValue =
        Math.round(requestedValue / 250) * 250;

    currentOffer.value =
        acceptedValue;

    if (increaseTension(8)) {
        return;
    }

    updateOfferUI();

    addAIMessage(
`Podemos aceitar € ${formatMoney(acceptedValue)} por semana.

A proposta foi atualizada.`
    );
}

// Remove acentos e caixa alta/baixa antes de comparar frases do jogador.
// Sem isso, "não quero bônus" batia mas "não quero bonus" (acentuação
// mista, muito comum ao digitar rápido) não era reconhecido.
function normalizeText(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function negotiateDuration(text) {
    const lower =
        normalizeText(text);

    const match =
        lower.match(
            /(\d+)\s*(temporada|temporadas|ano|anos)/
        );

    let requestedDuration = null;

    if (match) {
        requestedDuration =
            Number(match[1]);

    } else if (
        lower.includes("diminuir") ||
        lower.includes("reduzir") ||
        lower.includes("menor") ||
        lower.includes("mais curto") ||
        lower.includes("menos tempo")
    ) {
        requestedDuration =
            currentOffer.duration - 1;

    } else if (
        lower.includes("aumentar") ||
        lower.includes("maior") ||
        lower.includes("mais longo") ||
        lower.includes("mais tempo")
    ) {
        requestedDuration =
            currentOffer.duration + 1;
    }

    // Pedido inválido: não consome uma contraproposta, só aumenta a
    // tensão levemente por falta de clareza.
    if (
        !requestedDuration ||
        requestedDuration < 1 ||
        requestedDuration > 5
    ) {
        increaseTension(8);

        addAIMessage(
            "Precisamos de uma duração válida entre 1 e 5 temporadas."
        );

        return;
    }

    if (registerCounterOffer()) {
        return;
    }

    const oldDuration =
        currentOffer.duration;

    if (requestedDuration === oldDuration) {
        addAIMessage(
            `A proposta atual já possui ${oldDuration} temporada(s).`
        );

        return;
    }

    if (requestedDuration < oldDuration) {
        const reduction =
            oldDuration -
            requestedDuration;

        if (
            increaseTension(8 * reduction)
        ) {
            return;
        }

        currentOffer.duration =
            requestedDuration;

        currentOffer.value =
            Math.max(
                500,
                Math.round(
                    currentOffer.value *
                    0.94 /
                    250
                ) * 250
            );

        updateOfferUI();

        addAIMessage(
`Aceitamos reduzir o vínculo para ${requestedDuration} temporada(s).

Por se tratar de um compromisso comercial menor, o valor passa para € ${formatMoney(currentOffer.value)} por semana.`
        );

        return;
    }

    const increase =
        requestedDuration -
        oldDuration;

    currentOffer.duration =
        requestedDuration;

    currentOffer.value =
        Math.round(
            currentOffer.value *
            (
                1 +
                0.04 * increase
            ) /
            250
        ) * 250;

    if (increaseTension(3)) {
        return;
    }

    updateOfferUI();

    addAIMessage(
`Um vínculo de ${requestedDuration} temporadas oferece maior estabilidade comercial.

Podemos aceitar e atualizar o pagamento para € ${formatMoney(currentOffer.value)} por semana.`
    );
}

function negotiateBonus(text) {
    if (registerCounterOffer()) {
        return;
    }

    const lower =
        normalizeText(text);

    const removeBonus =
        lower.includes("sem bonus") ||
        lower.includes("nao quero bonus") ||
        lower.includes("nao quero o bonus") ||
        lower.includes("tirar o bonus") ||
        lower.includes("remover o bonus") ||
        lower.includes("zerar o bonus") ||
        lower.includes("bonus zero") ||
        lower.includes("sem o bonus");

    if (removeBonus) {
        if (currentOffer.bonus <= 0) {
            addAIMessage(
                "O contrato atual já não possui bônus de desempenho."
            );

            return;
        }

        const salaryIncrease =
            Math.round(
                (
                    currentOffer.bonus /
                    52 *
                    0.55
                ) /
                250
            ) * 250;

        currentOffer.value +=
            Math.max(salaryIncrease, 250);

        currentOffer.bonus = 0;

        if (increaseTension(7)) {
            return;
        }

        updateOfferUI();

        addAIMessage(
`Podemos retirar completamente o bônus de desempenho.

Em compensação, parte desse valor será incorporada ao pagamento fixo.

O novo salário será de € ${formatMoney(currentOffer.value)} por semana, sem bônus por desempenho.`
        );

        return;
    }

    const requested =
        extractMoneyValue(text);

    const maximumBonus =
        calculateInitialOffer(currentBrand) * 20;

    if (
        requested &&
        requested > maximumBonus
    ) {
        if (increaseTension(20)) {
            return;
        }

        addAIMessage(
`O bônus solicitado supera nosso limite.

O máximo autorizado é € ${formatMoney(maximumBonus)}.`
        );

        return;
    }

    if (requested) {
        currentOffer.bonus =
            Math.round(requested / 500) * 500;

        if (increaseTension(7)) {
            return;
        }

        updateOfferUI();

        addAIMessage(
            `Podemos aceitar € ${formatMoney(currentOffer.bonus)} em bônus por metas.`
        );

        return;
    }

    currentOffer.bonus =
        Math.round(
            currentOffer.bonus *
            1.20 /
            500
        ) * 500;

    if (increaseTension(6)) {
        return;
    }

    updateOfferUI();

    addAIMessage(
        `Podemos aumentar o bônus para € ${formatMoney(currentOffer.bonus)}.`
    );
}

function generateSponsorGoals() {
    const goals = [];

    // Cada posição tem uma expectativa realista de gols bem diferente —
    // um atacante e um meia com o mesmo overall não deveriam ter a
    // mesma meta.
    const POSITION_GOAL_FACTOR = {
        ATA: 1.0,
        PE: 0.72,
        PD: 0.72,
        MEI: 0.45
    };

    const attackingPlayer =
        Object.prototype.hasOwnProperty.call(
            POSITION_GOAL_FACTOR,
            player.position
        );

    const difficulty =
        currentBrand.goalDifficulty || 1;

    // Clube pequeno = menos chances de gol e menos qualidade de serviço,
    // então a expectativa cai; clube de elite puxa a meta pra cima.
    // clubReputation vai de 35 (pequeno) a 100 (elite mundial).
    const clubFactor =
        0.55 + (player.clubReputation / 100) * 0.55;

    if (attackingPlayer) {
        const positionFactor =
            POSITION_GOAL_FACTOR[player.position];

        let goalTarget =
            Math.max(
                3,
                Math.round(
                    (player.overall / 5) *
                    difficulty *
                    positionFactor *
                    clubFactor
                )
            );

        if (currentBrand.tier === 5) {
            goalTarget += Math.max(1, Math.round(3 * positionFactor));
        }

        goals.push(
            `Marcar pelo menos ${goalTarget} gols em uma temporada`
        );

    } else {
        const matchesTarget =
            Math.max(
                10,
                Math.round(24 * difficulty * clubFactor)
            );

        goals.push(
            `Participar de pelo menos ${matchesTarget} partidas na temporada`
        );
    }

    if (currentBrand.tier >= 4) {
        goals.push(
            "Classificar o clube para uma competição continental"
        );
    }

    if (currentBrand.tier === 5) {
        const requiredOverall =
            Math.max(
                82,
                player.overall
            );

        goals.push(
            `Manter overall igual ou superior a ${requiredOverall}`
        );
    }

    if (
        player.position === "MEI" ||
        player.position === "MC"
    ) {
        const assistsTarget =
            Math.max(
                3,
                Math.round(9 * difficulty * clubFactor)
            );

        goals.push(
            `Registrar pelo menos ${assistsTarget} assistências na temporada`
        );
    }

    goals.push(
        `Utilizar exclusivamente chuteiras ${currentBrand.name} durante partidas oficiais`
    );


    return goals;
}

async function acceptOffer() {
    if (negotiationEnded) {
        return;
    }

    negotiationEnded = true;
    pendingRivalOffer = null;

    // Guarda localmente antes de qualquer coisa assíncrona rolar, pra
    // não depender de currentBrand/currentOffer ainda estarem os
    // mesmos quando o salvamento de fato executar.
    const acceptedBrand = currentBrand;
    const acceptedOffer = { ...currentOffer };

    hideNegotiationControls();

    addUserMessage(
        "Aceito os termos atuais."
    );

    const goals =
        generateSponsorGoals();

    addAIMessage(
`Temos um acordo, ${player.name}.

VALOR SEMANAL
€ ${formatMoney(currentOffer.value)}

DURAÇÃO
${currentOffer.duration} temporada(s)

BÔNUS
€ ${formatMoney(currentOffer.bonus)}

METAS DE PATROCÍNIO

${goals
    .map((goal) => "• " + goal)
    .join("\n")}

O não cumprimento das metas poderá reduzir bônus ou afetar futuras renovações.

Bem-vindo à ${currentBrand.name}.`
    );

    addDealClosedMessage(currentBrand.name);

    const saved = await finalizeAcceptedContract(
        goals,
        acceptedBrand,
        acceptedOffer
    );

    if (!saved) {
        alert(
            "Atenção: o contrato foi fechado na conversa, mas não foi possível confirmar o salvamento no servidor. Verifique sua conexão e confira a tela \"Minha Carreira\" — se ele não aparecer lá, tente novamente."
        );
    }
}

function brandWalkAway() {
    if (negotiationEnded) {
        return;
    }

    negotiationEnded = true;
    pendingRivalOffer = null;

    negotiationState.tension = 100;

    updateNegotiationUI();

    hideNegotiationControls();

    addAIMessage(
`As posições ficaram muito distantes.

A ${currentBrand.name} não acredita que seja possível chegar a um acordo neste momento.

Estamos oficialmente encerrando as negociações.`
    );

    addSystemMessage(
        "NEGOCIAÇÃO FALHOU — A MARCA ABANDONOU AS CONVERSAS"
    );

    if (pendingRenewal) {
        penalizeRefusedRenewal();
        closePendingRenewalAsEnded();

    } else {
        failedBrands.add(currentBrand.name);
    }
}

function generateAIResponse(text) {
    const lower =
        normalizeText(text);

    if (
        lower.includes("aceito") ||
        lower.includes("fechado") ||
        lower.includes("concordo") ||
        lower.includes("temos um acordo")
    ) {
        acceptOffer();
        return;
    }

    if (
        lower.includes("temporada") ||
        lower.includes("ano") ||
        lower.includes("duracao") ||
        lower.includes("contrato menor") ||
        lower.includes("contrato maior") ||
        lower.includes("reduzir") ||
        lower.includes("diminuir") ||
        lower.includes("mais curto") ||
        lower.includes("mais longo")
    ) {
        negotiateDuration(text);
        return;
    }

    if (lower.includes("bonus")) {
        negotiateBonus(text);
        return;
    }

    const requestedValue =
        extractMoneyValue(text);

    if (requestedValue) {
        negotiateMoney(requestedValue);
        return;
    }

    if (increaseTension(4)) {
        return;
    }

    addAIMessage(
`Precisamos discutir termos objetivos do contrato.

Podemos negociar valor semanal, duração ou bônus.`
    );
}

function extractMoneyValue(text) {
    const lower =
        normalizeText(text);

    const millionMatch =
        lower.match(
            /(\d+(?:[.,]\d+)?)\s*(milhao|milhoes|mi)\b/
        );

    if (millionMatch) {
        const value =
            Number(
                millionMatch[1].replace(",", ".")
            );

        return Math.round(
            value * 1000000
        );
    }

    const thousandMatch =
        lower.match(
            /(\d+(?:[.,]\d+)?)\s*(mil|k)\b/
        );

    if (thousandMatch) {
        const value =
            Number(
                thousandMatch[1].replace(",", ".")
            );

        return Math.round(
            value * 1000
        );
    }

    const currencyMatch =
        text.match(
            /(?:€|eur)\s*([\d.,]+)/i
        );

    if (currencyMatch) {
        return parseCurrencyNumber(
            currencyMatch[1]
        );
    }

    const numberMatch =
        text.match(
            /\b\d[\d.,]*\b/
        );

    if (!numberMatch) {
        return null;
    }

    return parseCurrencyNumber(
        numberMatch[0]
    );
}

function parseCurrencyNumber(value) {
    let normalized =
        String(value).trim();

    if (
        normalized.includes(".") &&
        normalized.includes(",")
    ) {
        normalized =
            normalized
                .replace(/\./g, "")
                .replace(",", ".");

    } else if (normalized.includes(".")) {
        const parts =
            normalized.split(".");

        if (
            parts.length > 1 &&
            parts[parts.length - 1].length === 3
        ) {
            normalized =
                normalized.replace(/\./g, "");
        }

    } else if (normalized.includes(",")) {
        const parts =
            normalized.split(",");

        if (
            parts.length > 1 &&
            parts[parts.length - 1].length === 3
        ) {
            normalized =
                normalized.replace(/,/g, "");

        } else {
            normalized =
                normalized.replace(",", ".");
        }
    }

    const number =
        Number(normalized);

    if (
        !Number.isFinite(number) ||
        number <= 0
    ) {
        return null;
    }

    return Math.round(number);
}

function quickAction(action) {
    if (negotiationEnded) {
        return;
    }

    const input =
        document.getElementById("messageInput");

    if (action === "accept") {
        acceptOffer();
        return;
    }

    if (action === "money") {
        const requestedValue =
            Math.round(
                currentOffer.value *
                1.20 /
                250
            ) * 250;

        input.value =
            `Quero € ${formatMoney(requestedValue)} por semana.`;
    }

    if (action === "duration") {
        input.value =
            `Quero reduzir o contrato para ${Math.max(
                currentOffer.duration - 1,
                1
            )} temporada(s).`;
    }

    if (action === "bonus") {
        const requestedBonus =
            Math.round(
                Math.max(
                    currentOffer.bonus,
                    1000
                ) *
                1.40 /
                500
            ) * 500;

        input.value =
            `Quero aumentar o bônus para € ${formatMoney(requestedBonus)}.`;
    }

    if (action === "reject") {
        negotiationEnded = true;
        pendingRivalOffer = null;

        hideNegotiationControls();

        addUserMessage(
            "Não tenho interesse na proposta."
        );

        addAIMessage(
            "Entendemos. A negociação está encerrada."
        );

        addSystemMessage(
            "NEGOCIAÇÃO ENCERRADA"
        );

        if (pendingRenewal) {
            penalizeRefusedRenewal();
            closePendingRenewalAsEnded();

        } else {
            failedBrands.add(currentBrand.name);
        }

        return;
    }

    input.focus();
}

function sendMessage() {
    if (negotiationEnded) {
        return;
    }

    const input =
        document.getElementById("messageInput");

    const text =
        input.value.trim();

    if (!text) {
        return;
    }

    addUserMessage(text);

    input.value = "";

    negotiationState.rounds++;

    setTimeout(() => {
        generateAIResponse(text);
        maybeTriggerRivalInterruption();
    }, 350);
}

// ---------- CONCORRÊNCIA ENTRE MARCAS (POP-UP DE MARCA RIVAL) ----------

function maybeTriggerRivalInterruption() {
    if (
        negotiationEnded ||
        pendingRivalOffer ||
        pendingRenewal ||
        !currentBrand ||
        negotiationState.rounds < 2 ||
        careerData.activeContract
    ) {
        return;
    }

    const candidates = brands.filter((brand) => {
        if (brand.name === currentBrand.name) {
            return false;
        }

        if (triedRivalBrands.has(brand.name)) {
            return false;
        }

        if (!brand.poachChance) {
            return false;
        }

        return calculateBrandInterest(brand) >= 55;
    });

    if (candidates.length === 0) {
        return;
    }

    // Quanto mais a conversa avança, maior a chance de uma marca rival
    // notar e tentar entrar na disputa.
    const roundFactor =
        Math.min(negotiationState.rounds * 0.05, 0.35);

    const triggered = candidates.find(
        (brand) => Math.random() < brand.poachChance + roundFactor
    );

    if (!triggered) {
        return;
    }

    showRivalInterruption(triggered);
}

function showRivalInterruption(brand) {
    const rivalOfferValue =
        Math.round(
            (
                calculateInitialOffer(brand) *
                (1.08 + Math.random() * 0.12)
            ) / 250
        ) * 250;

    pendingRivalOffer = {
        brand,
        offerValue: rivalOfferValue
    };

    typingQueue = typingQueue.then(
        () =>
            new Promise((resolve) => {
                try {
                    const chat =
                        document.getElementById("chatMessages");

                    if (!chat) {
                        console.error(
                            "Card rival: #chatMessages não encontrado no DOM."
                        );

                        resolve();
                        return;
                    }

                    const rivalMessage =
                        document.createElement("div");

                    rivalMessage.className = "message rival";

                    // Usa a MESMA família de animação (opacity/transform
                    // via @keyframes) que já funciona pras outras
                    // mensagens do chat — sem lógica de altura customizada.
                    rivalMessage.innerHTML = `
                        <div class="rivalInner">
                            <div class="rivalTopRow">
                                <span class="rivalBadge">CONCORRÊNCIA</span>

                                <button
                                    type="button"
                                    class="rivalCloseX"
                                    onclick="dismissRivalOffer(this)"
                                    aria-label="Ignorar"
                                >
                                    ✕
                                </button>
                            </div>

                            <div class="rivalBrandRow">
                                <div class="rivalBrandLogo"></div>

                                <div>
                                    <div class="rivalBrandName">${brand.name}</div>
                                    <div class="rivalBrandSub">Quer negociar com você</div>
                                </div>
                            </div>

                            <p class="rivalText">
                                ${brand.poachLine(currentBrand.name)}
                            </p>

                            <div class="rivalOfferBox">
                                <span>PROPOSTA SEMANAL</span>
                                <strong>€ ${formatMoney(rivalOfferValue)}</strong>
                            </div>

                            <div class="rivalActions">
                                <button
                                    type="button"
                                    class="rivalAccept"
                                    onclick="acceptRivalOffer(this)"
                                >
                                    VER PROPOSTA
                                </button>

                                <button
                                    type="button"
                                    class="rivalDismiss"
                                    onclick="dismissRivalOffer(this)"
                                >
                                    IGNORAR
                                </button>
                            </div>
                        </div>
                    `;

                    chat.appendChild(rivalMessage);

                    const logoContainer =
                        rivalMessage.querySelector(".rivalBrandLogo");

                    if (logoContainer) {
                        logoContainer.appendChild(
                            createBrandLogoElement(
                                brand,
                                "rivalBrandLogoImage"
                            )
                        );
                    }

                    chat.scrollTop = chat.scrollHeight;

                } catch (error) {
                    console.error(
                        "Card rival: erro ao criar o card.",
                        error
                    );
                }

                resolve();
            })
    );
}

function disableRivalButtons() {
    document
        .querySelectorAll(".rivalActions button, .rivalCloseX")
        .forEach((button) => {
            button.disabled = true;
        });
}

function dismissRivalOffer(button) {
    if (!pendingRivalOffer) {
        return;
    }

    const rivalMessageEl =
        button && button.closest(".message.rival");

    triedRivalBrands.add(pendingRivalOffer.brand.name);
    pendingRivalOffer = null;

    disableRivalButtons();

    if (rivalMessageEl) {
        rivalMessageEl.classList.add("rivalClosing");

        setTimeout(() => {
            rivalMessageEl.remove();
        }, 320);
    }
}

function acceptRivalOffer(button) {
    if (!pendingRivalOffer) {
        return;
    }

    const rivalMessageEl =
        button && button.closest(".message.rival");

    disableRivalButtons();

    if (rivalMessageEl) {
        // Flash verde de confirmação, seguido do fade de saída.
        rivalMessageEl.classList.add("rivalAccepted");

        setTimeout(() => {
            rivalMessageEl.classList.add("rivalClosing");
        }, 280);
    }

    const rivalBrand = pendingRivalOffer.brand;
    const rivalValue = pendingRivalOffer.offerValue;

    triedRivalBrands.add(currentBrand.name);
    triedRivalBrands.add(rivalBrand.name);

    pendingRivalOffer = null;

    // Espera o card recolher antes de trocar de marca, pra dar tempo
    // da animação aparecer.
    setTimeout(() => {
        currentBrand = rivalBrand;
        negotiationEnded = false;
        typingQueue = Promise.resolve();

        const trust = getTrust(rivalBrand.name);

        const startingTension =
            Math.max(0, Math.round(5 - (trust - 50) / 10));

        negotiationState = {
            tension: startingTension,
            rounds: 0,
            counterOffers: 0,
            ultimatum: false
        };

        currentOffer = {
            value: rivalValue,

            duration:
                rivalBrand.preferredDuration ||
                (rivalBrand.tier >= 4 ? 3 : 2),

            bonus:
                Math.max(
                    1000,
                    Math.round(rivalValue * 8 / 500) * 500
                )
        };

        document.getElementById("brandName").innerText =
            currentBrand.name;

        document.getElementById("representativeName").innerText =
            currentBrand.representative;

        const logoContainer =
            document.getElementById("representativeInitial");

        logoContainer.innerHTML = "";

        logoContainer.appendChild(
            createBrandLogoElement(
                currentBrand,
                "representativeBrandImage"
            )
        );

        document.getElementById("chatMessages").innerHTML = "";

        updateOfferUI();
        updateNegotiationUI();
        showNegotiationControls();

        addAIMessage(
`Boa noite, ${player.name}. Aqui é a ${currentBrand.name}.

${currentBrand.openingFlavor || ""}

Preparamos uma proposta competitiva: € ${formatMoney(currentOffer.value)} por semana, vínculo de ${currentOffer.duration} temporadas e € ${formatMoney(currentOffer.bonus)} em bônus.

Estamos abertos a negociar valor, duração e bônus.`
        );
    }, 600);
}

function addAIMessage(text) {
    typingQueue = typingQueue.then(
        () => showTypingAndMessage(text)
    );

    return typingQueue;
}

function showTypingAndMessage(text) {
    return new Promise((resolve) => {
        const chat =
            document.getElementById("chatMessages");

        if (!chat) {
            resolve();
            return;
        }

        // Estrutura alinhada com as classes definidas em style.css
        // (.message.typing, .typingText, .typingDots span).
        const typing =
            document.createElement("div");

        typing.className =
            "message ai typing";

        const representativeName =
            currentBrand
                ? currentBrand.representative
                : "Representante";

        typing.innerHTML = `
            <span class="typingText">
                ${representativeName} está digitando...
            </span>

            <div class="typingDots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;

        chat.appendChild(typing);

        chat.scrollTop =
            chat.scrollHeight;

        const typingTime =
            Math.min(
                Math.max(
                    850 + text.length * 8,
                    1100
                ),
                3200
            );

        setTimeout(() => {
            typing.remove();

            addMessage(text, "ai");

            resolve();
        }, typingTime);
    });
}

function addUserMessage(text) {
    addMessage(text, "user");
}

function addSystemMessage(text) {
    typingQueue = typingQueue.then(() => {
        addMessage(text, "system");
    });
}

// Selo de "contrato fechado" com aperto de mãos, mostrado quando o
// jogador aceita uma proposta. Usa só opacity/transform via @keyframes
// — a mesma família de animação que já funciona pras outras mensagens.
function addDealClosedMessage(brandName) {
    typingQueue = typingQueue.then(
        () =>
            new Promise((resolve) => {
                try {
                    const chat =
                        document.getElementById("chatMessages");

                    if (!chat) {
                        resolve();
                        return;
                    }

                    const badge =
                        document.createElement("div");

                    badge.className = "message dealClosed";

                    badge.innerHTML = `
                        <div class="contractPaper">
                            <div class="contractHeader">
                                <span class="contractTitle">
                                    CONTRATO DE PATROCÍNIO
                                </span>

                                <span class="contractBrand">
                                    ${brandName}
                                </span>
                            </div>

                            <div class="contractLine" style="width:92%"></div>
                            <div class="contractLine" style="width:78%"></div>
                            <div class="contractLine" style="width:85%"></div>
                            <div class="contractLine contractLineLast" style="width:55%"></div>

                            <div class="contractSignRow">
                                <div class="contractSignature"></div>
                                <div class="contractSignature"></div>
                            </div>

                            <div class="contractStamp">
                                CONTRATO<br>FECHADO
                            </div>

                            <div class="handshakeIcon">🤝</div>
                        </div>
                    `;

                    chat.appendChild(badge);

                    chat.scrollTop = chat.scrollHeight;

                } catch (error) {
                    console.error(
                        "Erro ao mostrar selo de contrato fechado:",
                        error
                    );
                }

                resolve();
            })
    );
}

function addMessage(text, type) {
    const chat =
        document.getElementById("chatMessages");

    if (!chat) {
        return;
    }

    const message =
        document.createElement("div");

    message.className =
        "message " + type;

    message.innerText =
        text;

    chat.appendChild(message);

    chat.scrollTop =
        chat.scrollHeight;
}

function hideNegotiationControls() {
    const quickActions =
        document.querySelector(".quickActions");

    const messageBox =
        document.querySelector(".messageBox");

    if (quickActions) {
        quickActions.classList.add(
            "controlsHidden"
        );
    }

    if (messageBox) {
        messageBox.classList.add(
            "controlsHidden"
        );
    }
}

function showNegotiationControls() {
    const quickActions =
        document.querySelector(".quickActions");

    const messageBox =
        document.querySelector(".messageBox");

    if (quickActions) {
        quickActions.classList.remove(
            "controlsHidden"
        );
    }

    if (messageBox) {
        messageBox.classList.remove(
            "controlsHidden"
        );
    }
}

function handleEnter(event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
}

function formatMoney(value) {
    return Math.round(value)
        .toLocaleString("pt-BR");
}

function backToPlayer() {
    showScreen("playerScreen");
}

function backToBrands() {
    showScreen("brandsScreen");
}

initApp();
