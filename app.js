let player = {};

let currentBrand = null;
let currentOffer = {};

let negotiationEnded = false;
let aiIsTyping = false;

let negotiationState = {
    tension: 0,
    rounds: 0,
    counterOffers: 0,
    ultimatum: false
};

const ICON_CDN =
    "https://cdn.jsdelivr.net/npm/simple-icons@latest/icons";

const WIKIMEDIA_FILE =
    "https://commons.wikimedia.org/wiki/Special:FilePath/";

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

const brands = [
    {
        name: "NIKE",
        logo: `${ICON_CDN}/nike.svg`,
        fallbackLogo: "",
        representative: "Alex Morgan",
        tier: 5,
        multiplier: 1.30,
        baseInterest: -12,
        minOverall: 81,
        maxCounterOffers: 3,
        tensionMultiplier: 1.45,
        negotiationFlexibility: 0.16
    },

    {
        name: "ADIDAS",
        logo: `${ICON_CDN}/adidas.svg`,
        fallbackLogo: "",
        representative: "Thomas Weber",
        tier: 5,
        multiplier: 1.25,
        baseInterest: -10,
        minOverall: 80,
        maxCounterOffers: 3,
        tensionMultiplier: 1.35,
        negotiationFlexibility: 0.18
    },

    {
        name: "PUMA",
        logo: `${ICON_CDN}/puma.svg`,
        fallbackLogo: "",
        representative: "Lena Fischer",
        tier: 4,
        multiplier: 1.12,
        baseInterest: -2,
        minOverall: 75,
        maxCounterOffers: 4,
        tensionMultiplier: 1.05,
        negotiationFlexibility: 0.28
    },

    {
        name: "NEW BALANCE",
        logo: `${ICON_CDN}/newbalance.svg`,
        fallbackLogo: "",
        representative: "James Miller",
        tier: 3,
        multiplier: 1.05,
        baseInterest: 5,
        minOverall: 72,
        maxCounterOffers: 5,
        tensionMultiplier: 0.90,
        negotiationFlexibility: 0.35
    },

    {
        name: "MIZUNO",
        logo: `${WIKIMEDIA_FILE}Mizuno logo.svg`,
        fallbackLogo: `${ICON_CDN}/mizuno.svg`,
        representative: "Hiroshi Tanaka",
        tier: 3,
        multiplier: 0.95,
        baseInterest: 5,
        minOverall: 70,
        maxCounterOffers: 5,
        tensionMultiplier: 0.85,
        negotiationFlexibility: 0.32
    },

    {
        name: "UNDER ARMOUR",
        logo: `${ICON_CDN}/underarmour.svg`,
        fallbackLogo: "",
        representative: "Michael Reed",
        tier: 2,
        multiplier: 0.90,
        baseInterest: 9,
        minOverall: 68,
        maxCounterOffers: 6,
        tensionMultiplier: 0.80,
        negotiationFlexibility: 0.40
    },

    {
        name: "SKECHERS",
        logo: `${WIKIMEDIA_FILE}Skechers logo.svg`,
        fallbackLogo: `${ICON_CDN}/skechers.svg`,
        representative: "Daniel Brooks",
        tier: 2,
        multiplier: 0.88,
        baseInterest: 12,
        minOverall: 67,
        maxCounterOffers: 6,
        tensionMultiplier: 0.75,
        negotiationFlexibility: 0.42
    },

    {
        name: "UMBRO",
        logo: `${WIKIMEDIA_FILE}Umbro logo.svg`,
        fallbackLogo: `${ICON_CDN}/umbro.svg`,
        representative: "Oliver Bennett",
        tier: 1,
        multiplier: 0.72,
        baseInterest: 15,
        minOverall: 64,
        maxCounterOffers: 7,
        tensionMultiplier: 0.65,
        negotiationFlexibility: 0.45
    }
];

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });

    const target = document.getElementById(id);

    if (!target) return;

    target.classList.add("active");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function createBrandImage(brand, className = "") {
    const fallback = brand.fallbackLogo || "";

    return `
        <img
            src="${brand.logo}"
            alt="${brand.name}"
            class="${className}"
            loading="lazy"
            data-fallback="${fallback}"
            onerror="handleLogoError(this)"
        >
    `;
}

function handleLogoError(image) {
    const fallback = image.dataset.fallback;

    if (
        fallback &&
        image.src !== fallback &&
        image.dataset.fallbackUsed !== "true"
    ) {
        image.dataset.fallbackUsed = "true";
        image.src = fallback;
        return;
    }

    image.style.display = "none";

    const parent = image.parentElement;

    if (parent) {
        parent.classList.add("logoFallback");
        parent.dataset.logoText =
            image.alt.substring(0, 2).toUpperCase();
    }
}

function analyzePlayer() {
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
    showScreen("brandsScreen");
}

function calculateCommercialScore() {
    let score = 0;

    if (player.overall < 65) score += 5;
    else if (player.overall < 70) score += 12;
    else if (player.overall < 75) score += 22;
    else if (player.overall < 80) score += 36;
    else if (player.overall < 85) score += 52;
    else if (player.overall < 90) score += 68;
    else score += 80;

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

    const weeklyValue =
        annualValue / 52;

    return Math.max(
        Math.round(weeklyValue / 250) * 250,
        500
    );
}

function renderBrands() {
    const container =
        document.getElementById("brandsContainer");

    container.innerHTML = "";

    brands.forEach((brand, index) => {
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
                    <div class="brandCardLogo">
                        ${createBrandImage(
                            brand,
                            "brandLogoImage"
                        )}
                    </div>

                    <div class="brandLogo">
                        ${brand.name}
                    </div>
                </div>

                <div class="interest ${interestClass}">
                    ${interestText} • ${interest}%
                </div>
            </div>

            <div class="interestBar">
                <div
                    class="interestProgress ${interestClass}"
                    style="--interest-width:${interest}%"
                ></div>
            </div>

            <div class="brandDetails">
                <div>
                    <span>
                        VALOR SEMANAL ESTIMADO
                    </span>

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
                >
                    ${
                        canNegotiate
                            ? "NEGOCIAR CONTRATO"
                            : "SEM INTERESSE"
                    }
                </button>
            </div>
        `;

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

    requestAnimationFrame(() => {
        document
            .querySelectorAll(".interestProgress")
            .forEach(progress => {
                progress.classList.add("animateInterest");
            });
    });
}

function startNegotiation(index) {
    currentBrand = brands[index];

    negotiationEnded = false;
    aiIsTyping = false;

    negotiationState = {
        tension: 5,
        rounds: 0,
        counterOffers: 0,
        ultimatum: false
    };

    const value =
        calculateInitialOffer(currentBrand);

    currentOffer = {
        value,
        duration:
            currentBrand.tier >= 4 ? 3 : 2,
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

    logoContainer.classList.remove("logoFallback");
    logoContainer.innerHTML =
        createBrandImage(
            currentBrand,
            "representativeBrandImage"
        );

    document.getElementById("chatMessages").innerHTML = "";

    setNegotiationControls(true);

    updateOfferUI();
    updateNegotiationUI();

    showScreen("negotiationScreen");

    queueAIMessage(
`Olá, ${player.name}.

A ${currentBrand.name} analisou seu desempenho no ${player.club}.

Nossa proposta inicial é de € ${formatMoney(currentOffer.value)} por semana.

O vínculo proposto é de ${currentOffer.duration} temporadas, além de € ${formatMoney(currentOffer.bonus)} em bônus de desempenho.

Estamos abertos a discutir valor semanal, duração e bônus.`,
        1000
    );
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
    if (!currentBrand) return;

    const tension =
        Math.min(
            Math.max(negotiationState.tension, 0),
            100
        );

    const progress =
        document.getElementById("tensionProgress");

    const panel =
        document.querySelector(".tensionPanel");

    progress.style.width =
        tension + "%";

    progress.className =
        "tensionProgress";

    panel?.classList.remove(
        "medium",
        "high",
        "critical"
    );

    let text = "CALMA";

    let description =
        "A marca está aberta à negociação.";

    if (tension >= 75) {
        text = "CRÍTICA";

        description =
            "A marca está próxima de abandonar a negociação.";

        progress.classList.add("critical");
        panel?.classList.add("critical");

    } else if (tension >= 50) {
        text = "ALTA";

        description =
            "A diretoria está perdendo a paciência.";

        progress.classList.add("high");
        panel?.classList.add("high");

    } else if (tension >= 25) {
        text = "MODERADA";

        description =
            "As exigências estão aumentando a tensão.";

        progress.classList.add("medium");
        panel?.classList.add("medium");
    }

    document.getElementById("tensionText").innerText =
        text;

    document.getElementById(
        "tensionDescription"
    ).innerText =
        description;

    document.getElementById("counterOffers").innerText =
        negotiationState.counterOffers +
        " / " +
        currentBrand.maxCounterOffers;
}

function increaseTension(amount) {
    if (negotiationEnded) return true;

    negotiationState.tension +=
        amount *
        currentBrand.tensionMultiplier;

    negotiationState.tension =
        Math.min(
            Math.round(negotiationState.tension),
            100
        );

    updateNegotiationUI();

    if (negotiationState.tension >= 92) {
        brandWalkAway();
        return true;
    }

    if (
        negotiationState.tension >= 72 &&
        !negotiationState.ultimatum
    ) {
        negotiationState.ultimatum = true;

        queueAIMessage(
`Precisamos ser claros.

A negociação chegou a um ponto crítico.

A proposta atual está muito próxima do nosso limite.

Esperamos uma decisão ou uma contraproposta realista.`,
            900,
            () => {
                addSystemMessage(
                    "ULTIMATO DA MARCA"
                );
            }
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
    if (registerCounterOffer()) return;

    const initialOffer =
        calculateInitialOffer(currentBrand);

    const maximumOffer =
        initialOffer *
        (
            1 +
            currentBrand.negotiationFlexibility
        );

    const difference =
        requestedValue /
        currentOffer.value;

    if (difference >= 1.75) {
        if (increaseTension(40)) return;

        queueAIMessage(
`Essa exigência está completamente fora da avaliação comercial da ${currentBrand.name}.

Não consideraremos € ${formatMoney(requestedValue)} por semana.

Esperamos uma proposta significativamente mais realista.`
        );

        return;
    }

    if (requestedValue > maximumOffer) {
        if (increaseTension(22)) return;

        const counter =
            Math.round(maximumOffer / 250) * 250;

        currentOffer.value = counter;

        updateOfferUI();

        queueAIMessage(
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

        queueAIMessage(
`O valor de € ${formatMoney(currentOffer.value)} por semana é aceitável para a ${currentBrand.name}.

Atualizamos os termos.`
        );

        return;
    }

    currentOffer.value =
        Math.round(requestedValue / 250) * 250;

    if (increaseTension(8)) return;

    updateOfferUI();

    queueAIMessage(
`Podemos aceitar € ${formatMoney(currentOffer.value)} por semana.

A proposta foi atualizada.`
    );
}

function negotiateDuration(text) {
    if (registerCounterOffer()) return;

    const lower = text.toLowerCase();

    const match =
        lower.match(
            /(\d+)\s*(temporada|temporadas|ano|anos)/
        );

    let requestedDuration = null;

    if (match) {
        requestedDuration = Number(match[1]);

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

    if (
        !requestedDuration ||
        requestedDuration < 1 ||
        requestedDuration > 5
    ) {
        increaseTension(8);

        queueAIMessage(
            "Precisamos de uma duração válida entre 1 e 5 temporadas."
        );

        return;
    }

    const oldDuration =
        currentOffer.duration;

    if (requestedDuration === oldDuration) {
        queueAIMessage(
            `A proposta atual já possui ${oldDuration} temporada(s).`
        );

        return;
    }

    if (requestedDuration < oldDuration) {
        const reduction =
            oldDuration - requestedDuration;

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

        queueAIMessage(
`Aceitamos reduzir o vínculo para ${requestedDuration} temporada(s).

Por se tratar de um compromisso comercial menor, o valor passa para € ${formatMoney(currentOffer.value)} por semana.`
        );

        return;
    }

    const increase =
        requestedDuration - oldDuration;

    currentOffer.duration =
        requestedDuration;

    currentOffer.value =
        Math.round(
            currentOffer.value *
            (1 + 0.04 * increase) /
            250
        ) * 250;

    if (increaseTension(3)) return;

    updateOfferUI();

    queueAIMessage(
`Um vínculo de ${requestedDuration} temporadas oferece maior estabilidade comercial.

Podemos aceitar e atualizar o pagamento para € ${formatMoney(currentOffer.value)} por semana.`
    );
}

function wantsNoBonus(text) {
    const lower = text.toLowerCase();

    return (
        lower.includes("sem bônus") ||
        lower.includes("sem bonus") ||
        lower.includes("não quero bônus") ||
        lower.includes("nao quero bonus") ||
        lower.includes("tirar o bônus") ||
        lower.includes("tirar o bonus") ||
        lower.includes("remover o bônus") ||
        lower.includes("remover o bonus") ||
        lower.includes("zerar o bônus") ||
        lower.includes("zerar o bonus") ||
        lower.includes("bônus zero") ||
        lower.includes("bonus zero")
    );
}

function negotiateBonus(text) {
    if (registerCounterOffer()) return;

    if (wantsNoBonus(text)) {
        if (currentOffer.bonus <= 0) {
            queueAIMessage(
                "A proposta atual já não possui bônus de desempenho."
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

        if (increaseTension(5)) return;

        updateOfferUI();

        queueAIMessage(
`Podemos remover completamente o bônus de desempenho.

Em compensação, parte desse valor será incorporada ao pagamento semanal.

A nova proposta é de € ${formatMoney(currentOffer.value)} por semana, sem bônus de desempenho.`
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
        if (increaseTension(20)) return;

        queueAIMessage(
`O bônus solicitado supera nosso limite.

O máximo autorizado é € ${formatMoney(maximumBonus)}.`
        );

        return;
    }

    if (requested) {
        currentOffer.bonus =
            Math.round(requested / 500) * 500;

        if (increaseTension(7)) return;

        updateOfferUI();

        queueAIMessage(
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

    if (increaseTension(6)) return;

    updateOfferUI();

    queueAIMessage(
        `Podemos aumentar o bônus para € ${formatMoney(currentOffer.bonus)}.`
    );
}

function generateSponsorGoals() {
    const goals = [];

    const attackingPlayer = [
        "ATA",
        "PE",
        "PD",
        "MEI"
    ].includes(player.position);

    if (attackingPlayer) {
        let goalTarget =
            Math.max(
                10,
                Math.round(player.overall / 4)
            );

        if (currentBrand.tier === 5) {
            goalTarget += 5;
        }

        goals.push(
            `Marcar pelo menos ${goalTarget} gols em uma temporada`
        );
    } else {
        goals.push(
            "Participar de pelo menos 25 partidas na temporada"
        );
    }

    if (currentBrand.tier >= 4) {
        goals.push(
            "Classificar o clube para uma competição continental"
        );
    }

    if (currentBrand.tier === 5) {
        const requiredOverall =
            Math.max(82, player.overall);

        goals.push(
            `Manter overall igual ou superior a ${requiredOverall}`
        );
    }

    if (
        player.position === "MEI" ||
        player.position === "MC"
    ) {
        goals.push(
            "Registrar pelo menos 10 assistências na temporada"
        );
    }

    goals.push(
        `Utilizar exclusivamente chuteiras ${currentBrand.name} durante partidas oficiais`
    );

    return goals;
}

function acceptOffer() {
    if (negotiationEnded || aiIsTyping) return;

    negotiationEnded = true;

    setNegotiationControls(false);

    addUserMessage(
        "Aceito os termos atuais."
    );

    const goals =
        generateSponsorGoals();

    queueAIMessage(
`Temos um acordo, ${player.name}.

VALOR SEMANAL
€ ${formatMoney(currentOffer.value)}

DURAÇÃO
${currentOffer.duration} temporada(s)

BÔNUS
€ ${formatMoney(currentOffer.bonus)}

METAS DE PATROCÍNIO

${goals
    .map(goal => "• " + goal)
    .join("\n")}

O não cumprimento das metas poderá reduzir bônus ou afetar futuras renovações.

Bem-vindo à ${currentBrand.name}.`,
        1100,
        () => {
            addSystemMessage(
                "CONTRATO DE PATROCÍNIO ASSINADO ✓"
            );
        }
    );
}

function brandWalkAway() {
    if (negotiationEnded) return;

    negotiationEnded = true;
    negotiationState.tension = 100;

    updateNegotiationUI();
    setNegotiationControls(false);

    queueAIMessage(
`As posições ficaram muito distantes.

A ${currentBrand.name} não acredita que seja possível chegar a um acordo neste momento.

Estamos oficialmente encerrando as negociações.`,
        1000,
        () => {
            addSystemMessage(
                "NEGOCIAÇÃO FALHOU — A MARCA ABANDONOU AS CONVERSAS"
            );
        }
    );
}

function setNegotiationControls(visible) {
    const quickActions =
        document.querySelector(".quickActions");

    const messageBox =
        document.querySelector(".messageBox");

    if (quickActions) {
        quickActions.classList.toggle(
            "controlsHidden",
            !visible
        );
    }

    if (messageBox) {
        messageBox.classList.toggle(
            "controlsHidden",
            !visible
        );
    }
}

function generateAIResponse(text) {
    const lower = text.toLowerCase();

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
        wantsNoBonus(text) ||
        lower.includes("bônus") ||
        lower.includes("bonus")
    ) {
        negotiateBonus(text);
        return;
    }

    if (
        lower.includes("temporada") ||
        lower.includes("temporadas") ||
        lower.includes("ano") ||
        lower.includes("anos") ||
        lower.includes("duração") ||
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

    const requestedValue =
        extractMoneyValue(text);

    if (requestedValue) {
        negotiateMoney(requestedValue);
        return;
    }

    if (increaseTension(4)) return;

    queueAIMessage(
`Precisamos discutir termos objetivos do contrato.

Podemos negociar valor semanal, duração ou bônus.`
    );
}

function extractMoneyValue(text) {
    const lower = text.toLowerCase();

    const millionMatch =
        lower.match(
            /(\d+(?:[.,]\d+)?)\s*(milhão|milhoes|milhões|mi)\b/
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
        text.match(/\b\d[\d.,]*\b/);

    if (!numberMatch) return null;

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
    if (
        negotiationEnded ||
        aiIsTyping
    ) {
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
                currentOffer.bonus *
                1.40 /
                500
            ) * 500;

        input.value =
            `Quero aumentar o bônus para € ${formatMoney(requestedBonus)}.`;
    }

    if (action === "reject") {
        negotiationEnded = true;

        setNegotiationControls(false);

        addUserMessage(
            "Não tenho interesse na proposta."
        );

        queueAIMessage(
            "Entendemos. A negociação está encerrada.",
            700,
            () => {
                addSystemMessage(
                    "NEGOCIAÇÃO ENCERRADA"
                );
            }
        );

        return;
    }

    input.focus();
}

function sendMessage() {
    if (
        negotiationEnded ||
        aiIsTyping
    ) {
        return;
    }

    const input =
        document.getElementById("messageInput");

    const text =
        input.value.trim();

    if (!text) return;

    addUserMessage(text);

    input.value = "";

    negotiationState.rounds++;

    setTimeout(() => {
        generateAIResponse(text);
    }, 300);
}

function queueAIMessage(
    text,
    minimumDelay = 700,
    callback = null
) {
    if (aiIsTyping) {
        setTimeout(() => {
            queueAIMessage(
                text,
                minimumDelay,
                callback
            );
        }, 250);

        return;
    }

    aiIsTyping = true;

    const typing =
        showTypingIndicator();

    const readingDelay =
        Math.min(
            2400,
            Math.max(
                minimumDelay,
                text.length * 9
            )
        );

    setTimeout(() => {
        typing?.remove();

        addAIMessage(text);

        aiIsTyping = false;

        if (callback) {
            callback();
        }

    }, readingDelay);
}

function showTypingIndicator() {
    const chat =
        document.getElementById("chatMessages");

    if (!chat) return null;

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "typingRow";

    wrapper.innerHTML = `
        <div class="typingBubble">
            <span class="typingName">
                ${currentBrand?.representative || "Representante"}
            </span>

            <div class="typingDots">
                <i></i>
                <i></i>
                <i></i>
            </div>
        </div>
    `;

    chat.appendChild(wrapper);

    chat.scrollTop =
        chat.scrollHeight;

    return wrapper;
}

function addAIMessage(text) {
    addMessage(text, "ai");
}

function addUserMessage(text) {
    addMessage(text, "user");
}

function addSystemMessage(text) {
    addMessage(text, "system");
}

function addMessage(text, type) {
    const chat =
        document.getElementById("chatMessages");

    if (!chat) return;

    const message =
        document.createElement("div");

    message.className =
        "message " + type;

    message.innerText = text;

    chat.appendChild(message);

    requestAnimationFrame(() => {
        message.classList.add("messageVisible");
    });

    chat.scrollTop =
        chat.scrollHeight;
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
