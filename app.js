let player = {};

let currentBrand = null;
let currentOffer = {};

let negotiationEnded = false;

let negotiationState = {
    patience: 100,
    rounds: 0,
    moneyRequests: 0,
    bonusRequests: 0,
    durationRequests: 0
};


const brands = [
    {
        name: "NIKE",
        representative: "Alex Morgan",
        tier: 5,
        personality: "elite",
        baseInterest: -12,
        multiplier: 1.30,
        patience: 60,
        minOverall: 80
    },

    {
        name: "ADIDAS",
        representative: "Thomas Weber",
        tier: 5,
        personality: "long",
        baseInterest: -10,
        multiplier: 1.25,
        patience: 70,
        minOverall: 79
    },

    {
        name: "PUMA",
        representative: "Lena Fischer",
        tier: 4,
        personality: "young",
        baseInterest: -3,
        multiplier: 1.10,
        patience: 78,
        minOverall: 75
    },

    {
        name: "NEW BALANCE",
        representative: "James Miller",
        tier: 3,
        personality: "growth",
        baseInterest: 3,
        multiplier: 1.05,
        patience: 85,
        minOverall: 72
    },

    {
        name: "MIZUNO",
        representative: "Hiroshi Tanaka",
        tier: 3,
        personality: "technical",
        baseInterest: 2,
        multiplier: 0.95,
        patience: 90,
        minOverall: 70
    },

    {
        name: "UNDER ARMOUR",
        representative: "Michael Reed",
        tier: 2,
        personality: "opportunity",
        baseInterest: 7,
        multiplier: 0.90,
        patience: 88,
        minOverall: 68
    },

    {
        name: "SKECHERS",
        representative: "Daniel Brooks",
        tier: 2,
        personality: "aggressiveGrowth",
        baseInterest: 10,
        multiplier: 1,
        patience: 80,
        minOverall: 68
    },

    {
        name: "UMBRO",
        representative: "Oliver Bennett",
        tier: 1,
        personality: "traditional",
        baseInterest: 13,
        multiplier: 0.75,
        patience: 95,
        minOverall: 65
    }
];


const eliteClubs = [
    "real madrid",
    "barcelona",
    "manchester city",
    "man city",
    "liverpool",
    "arsenal",
    "bayern",
    "bayern munich",
    "psg",
    "paris saint germain",
    "inter",
    "inter milan",
    "juventus",
    "chelsea",
    "manchester united",
    "man united",
    "atletico madrid"
];


const bigClubs = [
    "tottenham",
    "napoli",
    "milan",
    "ac milan",
    "roma",
    "dortmund",
    "borussia dortmund",
    "leverkusen",
    "newcastle",
    "aston villa",
    "benfica",
    "porto",
    "sporting",
    "ajax",
    "marseille",
    "monaco",
    "lyon"
];


function showScreen(id) {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });

    document.getElementById(id).classList.add("active");

    window.scrollTo(0, 0);
}


function analyzePlayer() {
    player = {
        name: document.getElementById("playerName").value.trim(),

        age: Number(
            document.getElementById("playerAge").value
        ),

        club: document.getElementById("playerClub").value.trim(),

        position: document.getElementById("playerPosition").value,

        overall: Number(
            document.getElementById("playerOverall").value
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
        alert("Preencha os principais dados do jogador.");
        return;
    }


    if (
        player.overall < 50 ||
        player.overall > 99
    ) {
        alert("O overall deve estar entre 50 e 99.");
        return;
    }


    player.clubReputation = calculateClubReputation();

    player.commercialScore = calculateCommercialScore();


    document.getElementById("commercialScore").innerText =
        player.commercialScore;


    document.getElementById("playerSummary").innerText =
        `${player.name} • ${player.club} • ${player.position} • OVR ${player.overall}`;


    renderBrands();

    showScreen("brandsScreen");
}


function calculateClubReputation() {
    const club = player.club.toLowerCase();


    if (
        eliteClubs.some(name =>
            club.includes(name)
        )
    ) {
        return 100;
    }


    if (
        bigClubs.some(name =>
            club.includes(name)
        )
    ) {
        return 75;
    }


    return 40;
}


function calculateCommercialScore() {
    let score = 0;


    if (player.overall < 65) {
        score += 5;
    }

    else if (player.overall < 70) {
        score += 12;
    }

    else if (player.overall < 75) {
        score += 22;
    }

    else if (player.overall < 80) {
        score += 35;
    }

    else if (player.overall < 85) {
        score += 50;
    }

    else if (player.overall < 90) {
        score += 65;
    }

    else {
        score += 78;
    }


    score += player.clubReputation * 0.10;

    score += Math.min(player.goals * 0.35, 12);

    score += Math.min(player.assists * 0.25, 8);

    score += Math.min(player.value * 0.08, 8);


    if (
        player.age <= 21 &&
        player.overall >= 75
    ) {
        score += 5;
    }


    if (player.overall < 70) {
        score -= 12;
    }


    if (
        player.clubReputation === 40 &&
        player.overall < 78
    ) {
        score -= 8;
    }


    if (
        player.overall < 75 &&
        player.goals < 10 &&
        player.assists < 10
    ) {
        score -= 5;
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
        interest += overallDifference * 6;
    }

    else {
        interest += Math.min(
            overallDifference * 2,
            12
        );
    }


    if (
        brand.tier === 5 &&
        player.clubReputation === 40
    ) {
        interest -= 20;
    }


    if (
        brand.tier === 4 &&
        player.clubReputation === 40
    ) {
        interest -= 10;
    }


    if (
        brand.personality === "young" &&
        player.age <= 21 &&
        player.overall >= 75
    ) {
        interest += 15;
    }


    if (
        brand.personality === "elite" &&
        player.overall >= 88
    ) {
        interest += 15;
    }


    if (
        brand.personality === "technical" &&
        (
            player.position === "MEI" ||
            player.position === "MC"
        )
    ) {
        interest += 8;
    }


    if (
        brand.personality === "growth" &&
        player.overall >= 73 &&
        player.overall <= 82
    ) {
        interest += 12;
    }


    if (
        brand.personality === "opportunity" &&
        player.clubReputation === 40
    ) {
        interest += 8;
    }


    if (
        brand.personality === "aggressiveGrowth" &&
        player.age <= 25
    ) {
        interest += 10;
    }


    return Math.min(
        Math.max(Math.round(interest), 1),
        99
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
        }

        else if (interest >= 70) {
            interestText = "MUITO ALTO";
            interestClass = "high";
        }

        else if (interest >= 55) {
            interestText = "ALTO";
            interestClass = "high";
        }

        else if (interest >= 40) {
            interestText = "MÉDIO";
            interestClass = "medium";
        }

        else if (interest >= 25) {
            interestText = "BAIXO";
            interestClass = "low";
        }


        const estimatedOffer =
            calculateInitialOffer(brand);


        const canNegotiate =
            interest >= 25;


        container.innerHTML += `
            <div class="brandCard">

                <div class="brandTop">

                    <div class="brandLogo">
                        ${brand.name}
                    </div>

                    <div class="interest ${interestClass}">
                        ${interestText} • ${interest}%
                    </div>

                </div>

                <div class="interestBar">

                    <div
                        class="interestProgress"
                        style="width:${interest}%"
                    ></div>

                </div>

                <div class="brandDetails">

                    <div>

                        <span>
                            PROPOSTA ESTIMADA
                        </span>

                        <strong>
                            ${
                                canNegotiate
                                    ? "€ " + formatMoney(estimatedOffer)
                                    : "SEM PROPOSTA"
                            }
                        </strong>

                    </div>

                    <button
                        class="negotiateButton"
                        onclick="startNegotiation(${index})"
                        ${!canNegotiate ? "disabled" : ""}
                    >
                        ${
                            canNegotiate
                                ? "NEGOCIAR CONTRATO"
                                : "SEM INTERESSE"
                        }
                    </button>

                </div>

            </div>
        `;
    });
}


function calculateInitialOffer(brand) {
    let value = 0;


    value += player.overall * 2200;

    value += player.commercialScore * 2800;

    value += player.value * 1000;

    value *= brand.multiplier;


    if (player.clubReputation === 40) {
        value *= 0.65;
    }


    if (player.overall < 70) {
        value *= 0.45;
    }

    else if (player.overall < 75) {
        value *= 0.65;
    }

    else if (player.overall < 80) {
        value *= 0.80;
    }


    return Math.max(
        Math.round(value / 5000) * 5000,
        10000
    );
}


function startNegotiation(index) {
    currentBrand = brands[index];


    const interest =
        calculateBrandInterest(currentBrand);


    if (interest < 25) {
        return;
    }


    negotiationEnded = false;


    negotiationState = {
        patience: currentBrand.patience,
        rounds: 0,
        moneyRequests: 0,
        bonusRequests: 0,
        durationRequests: 0
    };


    const value =
        calculateInitialOffer(currentBrand);


    currentOffer = {
        value: value,

        duration:
            currentBrand.personality === "long"
                ? 3
                : 2,

        bonus:
            Math.round(value * 0.15)
    };


    document.getElementById("brandName").innerText =
        currentBrand.name;


    document.getElementById("miniPlayerName").innerText =
        player.name;


    document.getElementById("miniPlayerClub").innerText =
        player.club;


    document.getElementById("representativeName").innerText =
        currentBrand.representative;


    document.getElementById("representativeInitial").innerText =
        currentBrand.name.charAt(0);


    updateOfferUI();


    document.getElementById("chatMessages").innerHTML = "";


    addAIMessage(
`Olá, ${player.name}.

Nossa equipe analisou seu desempenho no ${player.club}.

Seu valor comercial foi avaliado internamente e decidimos abrir uma negociação.

Nossa proposta é de € ${formatMoney(currentOffer.value)} por temporada durante ${currentOffer.duration} temporadas.

O contrato inclui € ${formatMoney(currentOffer.bonus)} em bônus por desempenho.

Estamos dispostos a ouvir sua contraproposta.`
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


function addAIMessage(text) {
    const chat =
        document.getElementById("chatMessages");


    const message =
        document.createElement("div");


    message.className = "message ai";

    message.innerText = text;


    chat.appendChild(message);


    chat.scrollTop =
        chat.scrollHeight;
}


function addUserMessage(text) {
    const chat =
        document.getElementById("chatMessages");


    const message =
        document.createElement("div");


    message.className = "message user";

    message.innerText = text;


    chat.appendChild(message);


    chat.scrollTop =
        chat.scrollHeight;
}


function addSystemMessage(text) {
    const chat =
        document.getElementById("chatMessages");


    const message =
        document.createElement("div");


    message.className = "message system";

    message.innerText = text;


    chat.appendChild(message);


    chat.scrollTop =
        chat.scrollHeight;
}


function reducePatience(amount) {
    negotiationState.patience -= amount;


    if (negotiationState.patience <= 0) {
        endNegotiationByBrand();

        return true;
    }


    return false;
}


function registerRound() {
    negotiationState.rounds++;


    if (negotiationState.rounds >= 8) {
        negotiationState.patience -= 5;
    }


    if (
        negotiationState.rounds >= 12 &&
        !negotiationEnded
    ) {
        endNegotiationByBrand();

        return true;
    }


    if (negotiationState.patience <= 0) {
        endNegotiationByBrand();

        return true;
    }


    return false;
}


function endNegotiationByBrand() {
    if (negotiationEnded) {
        return;
    }


    negotiationEnded = true;


    addAIMessage(
`Acreditamos que nossas posições estão muito distantes.

Neste momento, a ${currentBrand.name} decidiu encerrar as negociações.

Agradecemos pelo seu tempo.`
    );


    addSystemMessage(
        "A MARCA ABANDONOU A NEGOCIAÇÃO"
    );
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
        input.value =
            `Quero € ${formatMoney(
                Math.round(
                    currentOffer.value * 1.25
                )
            )} por temporada.`;


        input.focus();

        return;
    }


    if (action === "duration") {
        input.value =
            `Quero ${Math.max(
                currentOffer.duration - 1,
                1
            )} temporada(s).`;


        input.focus();

        return;
    }


    if (action === "bonus") {
        input.value =
            `Quero aumentar o bônus para € ${formatMoney(
                Math.round(
                    currentOffer.bonus * 1.5
                )
            )}.`;


        input.focus();

        return;
    }


    if (action === "reject") {
        addUserMessage(
            "Não tenho interesse na proposta."
        );


        negotiationEnded = true;


        setTimeout(() => {
            addAIMessage(
                "Entendemos sua decisão. A negociação está encerrada."
            );


            addSystemMessage(
                "NEGOCIAÇÃO ENCERRADA"
            );

        }, 600);
    }
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


    setTimeout(() => {
        generateAIResponse(text);

    }, 650);
}


function generateAIResponse(text) {
    if (registerRound()) {
        return;
    }


    const lower =
        text.toLowerCase();


    if (
        lower.includes("aceito") ||
        lower.includes("fechado") ||
        lower.includes("concordo")
    ) {
        acceptOffer();

        return;
    }


    if (
        lower.includes("temporada") ||
        lower.includes("temporadas") ||
        lower.includes("duração") ||
        lower.includes("duracao") ||
        lower.includes("ano") ||
        lower.includes("anos") ||
        lower.includes("mais curto") ||
        lower.includes("mais longo") ||
        lower.includes("diminuir contrato") ||
        lower.includes("aumentar contrato")
    ) {
        negotiateDuration(text);

        return;
    }


    if (
        lower.includes("bônus") ||
        lower.includes("bonus")
    ) {
        negotiateBonus(text);

        return;
    }


    if (
        lower.includes("€") ||
        lower.includes("valor") ||
        lower.includes("dinheiro") ||
        lower.includes("pagamento")
    ) {
        const requestedValue =
            extractMoneyValue(text);


        if (requestedValue) {
            negotiateMoney(requestedValue);

            return;
        }
    }


    if (reducePatience(3)) {
        return;
    }


    addAIMessage(
`Precisamos manter a conversa nos termos do contrato.

Podemos discutir valor por temporada, duração ou bônus.`
    );
}


function extractMoneyValue(text) {
    const cleanText =
        text
            .replace(/\./g, "")
            .replace(/,/g, "");


    const numbers =
        cleanText.match(/\d+/g);


    if (!numbers) {
        return null;
    }


    return Number(
        numbers.join("")
    );
}


function negotiateMoney(requestedValue) {
    negotiationState.moneyRequests++;


    const initialOffer =
        calculateInitialOffer(currentBrand);


    const interest =
        calculateBrandInterest(currentBrand);


    const maxMultiplier =
        1.10 +
        interest / 250;


    const absoluteLimit =
        initialOffer *
        maxMultiplier;


    if (
        requestedValue >
        currentOffer.value * 2
    ) {
        if (reducePatience(35)) {
            return;
        }


        addAIMessage(
`Esse valor está muito distante da realidade desta negociação.

Não podemos considerar € ${formatMoney(requestedValue)} por temporada.

Se as próximas exigências permanecerem nesse nível, encerraremos as conversas.`
        );


        return;
    }


    if (
        requestedValue >
        absoluteLimit
    ) {
        if (reducePatience(18)) {
            return;
        }


        const counterOffer =
            Math.round(
                absoluteLimit / 5000
            ) * 5000;


        currentOffer.value =
            counterOffer;


        updateOfferUI();


        addAIMessage(
`Sua exigência supera nosso limite financeiro.

Podemos chegar a € ${formatMoney(counterOffer)} por temporada.

Esse é praticamente o teto aprovado pela diretoria.`
        );


        return;
    }


    if (
        negotiationState.moneyRequests >= 4
    ) {
        if (reducePatience(20)) {
            return;
        }


        addAIMessage(
`Já revisamos o valor financeiro diversas vezes.

Não pretendemos continuar alterando esse termo indefinidamente.

A proposta atual é € ${formatMoney(currentOffer.value)} por temporada.`
        );


        return;
    }


    currentOffer.value =
        requestedValue;


    updateOfferUI();


    if (reducePatience(6)) {
        return;
    }


    addAIMessage(
`Após uma revisão interna, podemos aceitar € ${formatMoney(requestedValue)} por temporada.

A proposta foi atualizada.`
    );
}


function negotiateBonus(text) {
    negotiationState.bonusRequests++;


    const requestedBonus =
        extractMoneyValue(text);


    const maxBonus =
        calculateInitialOffer(currentBrand) *
        0.60;


    if (
        negotiationState.bonusRequests >= 4
    ) {
        if (reducePatience(25)) {
            return;
        }


        addAIMessage(
`Já revisamos os bônus diversas vezes.

Não faremos novas alterações nesse termo.

O bônus permanece em € ${formatMoney(currentOffer.bonus)}.`
        );


        return;
    }


    if (requestedBonus) {
        if (
            requestedBonus > maxBonus
        ) {
            if (reducePatience(18)) {
                return;
            }


            const counterBonus =
                Math.round(
                    maxBonus / 5000
                ) * 5000;


            currentOffer.bonus =
                counterBonus;


            updateOfferUI();


            addAIMessage(
`Esse bônus está acima do limite autorizado.

Podemos oferecer até € ${formatMoney(counterBonus)} em metas de desempenho.`
            );


            return;
        }


        currentOffer.bonus =
            requestedBonus;


        updateOfferUI();


        if (reducePatience(5)) {
            return;
        }


        addAIMessage(
`Podemos aceitar um bônus de € ${formatMoney(requestedBonus)} condicionado às metas de desempenho.`
        );


        return;
    }


    const increase =
        Math.round(
            currentOffer.bonus *
            0.20 /
            5000
        ) * 5000;


    const newBonus =
        currentOffer.bonus +
        Math.max(increase, 5000);


    if (
        newBonus > maxBonus
    ) {
        if (reducePatience(10)) {
            return;
        }


        addAIMessage(
`Não temos margem para aumentar o bônus além dos € ${formatMoney(currentOffer.bonus)} já oferecidos.`
        );


        return;
    }


    currentOffer.bonus =
        newBonus;


    updateOfferUI();


    if (reducePatience(5)) {
        return;
    }


    addAIMessage(
`Podemos melhorar o bônus para € ${formatMoney(currentOffer.bonus)}.

Não significa que aceitaremos novos aumentos posteriormente.`
    );
}


function negotiateDuration(text) {
    negotiationState.durationRequests++;


    const lower =
        text.toLowerCase();


    const match =
        lower.match(
            /(\d+)\s*(temporada|temporadas|ano|anos)/
        );


    let requestedDuration = null;


    if (match) {
        requestedDuration =
            Number(match[1]);
    }

    else if (
        lower.includes("diminuir") ||
        lower.includes("diminua") ||
        lower.includes("reduzir") ||
        lower.includes("reduza") ||
        lower.includes("mais curto") ||
        lower.includes("menos tempo")
    ) {
        requestedDuration =
            currentOffer.duration - 1;
    }

    else if (
        lower.includes("aumentar") ||
        lower.includes("aumente") ||
        lower.includes("mais longo") ||
        lower.includes("mais tempo")
    ) {
        requestedDuration =
            currentOffer.duration + 1;
    }


    if (!requestedDuration) {
        addAIMessage(
            `Informe a duração desejada. Por exemplo: "Quero 2 temporadas".`
        );

        return;
    }


    if (
        requestedDuration < 1 ||
        requestedDuration > 5
    ) {
        if (reducePatience(12)) {
            return;
        }


        addAIMessage(
            "Trabalhamos apenas com contratos entre 1 e 5 temporadas."
        );


        return;
    }


    if (
        negotiationState.durationRequests >= 4
    ) {
        if (reducePatience(20)) {
            return;
        }


        addAIMessage(
`Já discutimos a duração diversas vezes.

Precisamos avançar com os termos atuais ou concluir a negociação.`
        );


        return;
    }


    if (
        requestedDuration ===
        currentOffer.duration
    ) {
        addAIMessage(
            `A proposta já possui ${currentOffer.duration} temporada(s).`
        );


        return;
    }


    const oldDuration =
        currentOffer.duration;


    currentOffer.duration =
        requestedDuration;


    if (
        requestedDuration <
        oldDuration
    ) {
        currentOffer.value =
            Math.round(
                currentOffer.value *
                0.94 /
                5000
            ) * 5000;


        if (reducePatience(7)) {
            return;
        }


        updateOfferUI();


        addAIMessage(
`Aceitamos reduzir o vínculo para ${requestedDuration} temporada(s).

Como teremos menos segurança comercial, o valor foi ajustado para € ${formatMoney(currentOffer.value)} por temporada.`
        );


        return;
    }


    currentOffer.value =
        Math.round(
            currentOffer.value *
            1.04 /
            5000
        ) * 5000;


    if (reducePatience(4)) {
        return;
    }


    updateOfferUI();


    addAIMessage(
`Um contrato de ${requestedDuration} temporadas é interessante.

Podemos aceitar e ajustar o valor para € ${formatMoney(currentOffer.value)} por temporada.

A exclusividade com a ${currentBrand.name} será obrigatória durante todo o vínculo.`
    );
}


function acceptOffer() {
    if (negotiationEnded) {
        return;
    }


    negotiationEnded = true;


    addUserMessage(
        "Aceito os termos atuais."
    );


    setTimeout(() => {
        addAIMessage(
`Temos um acordo, ${player.name}.

€ ${formatMoney(currentOffer.value)} por temporada.

${currentOffer.duration} temporada(s) de contrato.

€ ${formatMoney(currentOffer.bonus)} em bônus por desempenho.

Bem-vindo à ${currentBrand.name}.`
        );


        addSystemMessage(
            "CONTRATO ASSINADO ✓"
        );

    }, 600);
}


function handleEnter(event) {
    if (event.key === "Enter") {
        sendMessage();
    }
}


function formatMoney(value) {
    return Math.round(value).toLocaleString(
        "pt-BR"
    );
}


function backToPlayer() {
    showScreen("playerScreen");
}


function backToBrands() {
    showScreen("brandsScreen");
}
