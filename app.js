let player = {};

let currentBrand = null;
let currentOffer = {};

let negotiationEnded = false;

let negotiationState = {
tension: 0,
rounds: 0,
counterOffers: 0,
ultimatum: false
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

const brands = [

{
    name: "NIKE",
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

document
    .querySelectorAll(".screen")
    .forEach(screen => {
        screen.classList.remove("active");
    });
document
    .getElementById(id)
    .classList.add("active");
window.scrollTo(0, 0);

}

function analyzePlayer() {

player = {
    name: document
        .getElementById("playerName")
        .value
        .trim(),
    age: Number(
        document
            .getElementById("playerAge")
            .value
    ),
    position: document
        .getElementById("playerPosition")
        .value,
    overall: Number(
        document
            .getElementById("playerOverall")
            .value
    ),
    club: document
        .getElementById("playerClub")
        .value
        .trim(),
    league: document
        .getElementById("playerLeague")
        .value,
    clubReputation: Number(
        document
            .getElementById("clubReputation")
            .value
    ),
    value: Number(
        document
            .getElementById("playerValue")
            .value
    ) || 0,
    goals: Number(
        document
            .getElementById("playerGoals")
            .value
    ) || 0,
    assists: Number(
        document
            .getElementById("playerAssists")
            .value
    ) || 0
};
if (
    !player.name ||
    !player.age ||
    !player.club ||
    !player.overall
) {
    alert(
        "Preencha os principais dados do jogador."
    );
    return;
}
player.leagueReputation =
    leagueReputation[player.league];
player.commercialScore =
    calculateCommercialScore();
document
    .getElementById("commercialScore")
    .innerText =
    player.commercialScore;
document
    .getElementById("playerSummary")
    .innerText =
    `${player.name} • ${player.club} • ${player.position} • OVR ${player.overall}`;
renderBrands();
showScreen("brandsScreen");

}

function calculateCommercialScore() {

let score = 0;
if (player.overall < 65)
    score += 5;
else if (player.overall < 70)
    score += 12;
else if (player.overall < 75)
    score += 22;
else if (player.overall < 80)
    score += 36;
else if (player.overall < 85)
    score += 52;
else if (player.overall < 90)
    score += 68;
else
    score += 80;
score += player.clubReputation * 0.10;
score += player.leagueReputation * 0.08;
score += Math.min(
    player.goals * 0.35,
    12
);
score += Math.min(
    player.assists * 0.25,
    8
);
score += Math.min(
    player.value * 0.06,
    8
);
if (
    player.age <= 21 &&
    player.overall >= 76
) {
    score += 5;
}
if (player.overall < 70) {
    score -= 15;
}
return Math.min(
    Math.max(
        Math.round(score),
        5
    ),
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
return Math.min(
    Math.max(
        Math.round(interest),
        1
    ),
    99
);

}

function calculateInitialOffer(brand) {

let annualValue = 0;
annualValue +=
    player.overall * 1800;
annualValue +=
    player.commercialScore * 2200;
annualValue +=
    player.value * 700;
annualValue *=
    brand.multiplier;
annualValue *=
    0.60 +
    player.clubReputation / 250;
annualValue *=
    0.70 +
    player.leagueReputation / 330;
if (player.overall < 70) {
    annualValue *= 0.45;
} else if (player.overall < 75) {
    annualValue *= 0.65;
}
const weeklyValue =
    annualValue / 52;
return Math.max(
    Math.round(
        weeklyValue / 250
    ) * 250,
    500
);

}

function renderBrands() {

const container =
    document.getElementById(
        "brandsContainer"
    );
container.innerHTML = "";
brands.forEach((brand, index) => {
    const interest =
        calculateBrandInterest(brand);
    let interestText =
        "SEM INTERESSE";
    let interestClass =
        "low";
    if (interest >= 85) {
        interestText =
            "PRIORIDADE MÁXIMA 🔥";
        interestClass =
            "high";
    } else if (interest >= 70) {
        interestText =
            "MUITO ALTO";
        interestClass =
            "high";
    } else if (interest >= 55) {
        interestText =
            "ALTO";
        interestClass =
            "high";
    } else if (interest >= 40) {
        interestText =
            "MÉDIO";
        interestClass =
            "medium";
    } else if (interest >= 25) {
        interestText =
            "BAIXO";
    }
    const offer =
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

function startNegotiation(index) {

currentBrand = brands[index];
negotiationEnded = false;
negotiationState = {
    tension: 5,
    rounds: 0,
    counterOffers: 0,
    ultimatum: false
};
const value =
    calculateInitialOffer(currentBrand);
currentOffer = {
    value: value,
    duration:
        currentBrand.tier >= 4
            ? 3
            : 2,
    bonus:
        Math.round(
            value * 8 / 500
        ) * 500
};
document
    .getElementById("brandName")
    .innerText =
    currentBrand.name;
document
    .getElementById("miniPlayerName")
    .innerText =
    player.name;
document
    .getElementById("miniPlayerClub")
    .innerText =
    player.club;
document
    .getElementById("representativeName")
    .innerText =
    currentBrand.representative;
document
    .getElementById("representativeInitial")
    .innerText =
    currentBrand.name.charAt(0);
document
    .getElementById("chatMessages")
    .innerHTML = "";
updateOfferUI();
updateNegotiationUI();
addAIMessage(

`Olá, ${player.name}.

A ${currentBrand.name} analisou seu desempenho no ${player.club}.

Estamos preparados para oferecer € ${formatMoney(currentOffer.value)} por semana.

O vínculo proposto é de ${currentOffer.duration} temporadas, além de € ${formatMoney(currentOffer.bonus)} em bônus de desempenho.

Estamos abertos a discutir os termos.`
);

showScreen("negotiationScreen");

}

function updateOfferUI() {

document
    .getElementById("offerValue")
    .innerText =
    "€ " +
    formatMoney(currentOffer.value);
document
    .getElementById("offerDuration")
    .innerText =
    currentOffer.duration +
    (
        currentOffer.duration === 1
            ? " TEMPORADA"
            : " TEMPORADAS"
    );
document
    .getElementById("offerBonus")
    .innerText =
    "€ " +
    formatMoney(currentOffer.bonus);

}

function updateNegotiationUI() {

const tension =
    Math.min(
        negotiationState.tension,
        100
    );
const progress =
    document.getElementById(
        "tensionProgress"
    );
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
    progress.classList.add(
        "critical"
    );
} else if (tension >= 50) {
    text = "ALTA";
    description =
        "A diretoria está perdendo a paciência.";
    progress.classList.add(
        "high"
    );
} else if (tension >= 25) {
    text = "MODERADA";
    description =
        "As exigências estão aumentando a tensão.";
    progress.classList.add(
        "medium"
    );
}
document
    .getElementById("tensionText")
    .innerText =
    text;
document
    .getElementById(
        "tensionDescription"
    )
    .innerText =
    description;
document
    .getElementById("counterOffers")
    .innerText =
    negotiationState.counterOffers +
    " / " +
    currentBrand.maxCounterOffers;

}

function increaseTension(amount) {

negotiationState.tension +=
    amount *
    currentBrand.tensionMultiplier;
negotiationState.tension =
    Math.round(
        negotiationState.tension
    );
updateNegotiationUI();
if (
    negotiationState.tension >= 100
) {
    brandWalkAway();
    return true;
}
if (
    negotiationState.tension >= 78 &&
    !negotiationState.ultimatum
) {
    negotiationState.ultimatum =
        true;
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
        Math.round(
            maximumOffer / 250
        ) * 250;
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
const acceptedValue =
    Math.round(
        requestedValue / 250
    ) * 250;
currentOffer.value =
    acceptedValue;
increaseTension(8);
updateOfferUI();
addAIMessage(

`Podemos aceitar € ${formatMoney(acceptedValue)} por semana.

A proposta foi atualizada.`
);

}

function negotiateDuration(text) {

if (registerCounterOffer()) {
    return;
}
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
} else if (
    lower.includes("diminuir") ||
    lower.includes("reduzir") ||
    lower.includes("menor") ||
    lower.includes("mais curto")
) {
    requestedDuration =
        currentOffer.duration - 1;
} else if (
    lower.includes("aumentar") ||
    lower.includes("maior") ||
    lower.includes("mais longo")
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
    addAIMessage(
        "Precisamos de uma duração válida entre 1 e 5 temporadas."
    );
    return;
}
const oldDuration =
    currentOffer.duration;
if (
    requestedDuration === oldDuration
) {
    addAIMessage(
        `A proposta atual já possui ${oldDuration} temporada(s).`
    );
    return;
}
if (
    requestedDuration < oldDuration
) {
    const reduction =
        oldDuration -
        requestedDuration;
    increaseTension(
        8 * reduction
    );
    currentOffer.duration =
        requestedDuration;
    currentOffer.value =
        Math.round(
            currentOffer.value *
            0.94 /
            250
        ) * 250;
    updateOfferUI();
    addAIMessage(

`Aceitamos reduzir o vínculo para ${requestedDuration} temporada(s).

Por se tratar de um compromisso comercial menor, o valor passa para € ${formatMoney(currentOffer.value)} por semana.`
);

    return;
}
currentOffer.duration =
    requestedDuration;
currentOffer.value =
    Math.round(
        currentOffer.value *
        1.04 /
        250
    ) * 250;
increaseTension(3);
updateOfferUI();
addAIMessage(

`Um vínculo de ${requestedDuration} temporadas oferece maior estabilidade comercial.

Podemos aceitar e elevar o pagamento para € ${formatMoney(currentOffer.value)} por semana.`
);

}

function negotiateBonus(text) {

if (registerCounterOffer()) {
    return;
}
const requested =
    extractMoneyValue(text);
const maximumBonus =
    calculateInitialOffer(
        currentBrand
    ) * 20;
if (
    requested &&
    requested > maximumBonus
) {
    increaseTension(20);
    addAIMessage(

`O bônus solicitado supera nosso limite.

O máximo autorizado é € ${formatMoney(maximumBonus)}.`
);

    return;
}
if (requested) {
    currentOffer.bonus =
        requested;
    increaseTension(7);
    updateOfferUI();
    addAIMessage(
        `Podemos aceitar € ${formatMoney(requested)} em bônus por metas.`
    );
    return;
}
currentOffer.bonus =
    Math.round(
        currentOffer.bonus *
        1.20 /
        500
    ) * 500;
increaseTension(6);
updateOfferUI();
addAIMessage(
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
            Math.round(
                player.overall / 4
            )
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
    goals.push(
        "Manter overall igual ou superior a 82"
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

if (negotiationEnded) {
    return;
}
negotiationEnded = true;
addUserMessage(
    "Aceito os termos atuais."
);
const goals =
    generateSponsorGoals();
setTimeout(() => {
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
.map(goal => “• “ + goal)
.join(”\n”)}

O não cumprimento das metas poderá reduzir bônus ou afetar futuras renovações.

Bem-vindo à ${currentBrand.name}.`
);

    addSystemMessage(
        "CONTRATO DE PATROCÍNIO ASSINADO ✓"
    );
}, 600);

}

function brandWalkAway() {

if (negotiationEnded) {
    return;
}
negotiationEnded = true;
negotiationState.tension = 100;
updateNegotiationUI();
addAIMessage(

`As posições ficaram muito distantes.

A ${currentBrand.name} não acredita que seja possível chegar a um acordo neste momento.

Estamos oficialmente encerrando as negociações.`
);

addSystemMessage(
    "A MARCA ABANDONOU A NEGOCIAÇÃO"
);

}

function generateAIResponse(text) {

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
    lower.includes("ano") ||
    lower.includes("duração") ||
    lower.includes("duracao") ||
    lower.includes("contrato menor") ||
    lower.includes("contrato maior") ||
    lower.includes("reduzir") ||
    lower.includes("diminuir")
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
const requestedValue =
    extractMoneyValue(text);
if (requestedValue) {
    negotiateMoney(
        requestedValue
    );
    return;
}
increaseTension(4);
addAIMessage(

`Precisamos discutir termos objetivos do contrato.

Podemos negociar valor semanal, duração ou bônus.`
);

}

function extractMoneyValue(text) {

const normalized =
    text
        .replace(/\./g, "")
        .replace(/,/g, "");
const numbers =
    normalized.match(/\d+/g);
if (!numbers) {
    return null;
}
return Number(
    numbers.join("")
);

}

function quickAction(action) {

if (negotiationEnded) {
    return;
}
const input =
    document.getElementById(
        "messageInput"
    );
if (action === "accept") {
    acceptOffer();
    return;
}
if (action === "money") {
    input.value =
        `Quero € ${formatMoney(
            Math.round(
                currentOffer.value * 1.20
            )
        )} por semana.`;
}
if (action === "duration") {
    input.value =
        `Quero ${Math.max(
            currentOffer.duration - 1,
            1
        )} temporada(s).`;
}
if (action === "bonus") {
    input.value =
        `Quero aumentar o bônus para € ${formatMoney(
            Math.round(
                currentOffer.bonus * 1.4
            )
        )}.`;
}
if (action === "reject") {
    negotiationEnded = true;
    addUserMessage(
        "Não tenho interesse na proposta."
    );
    addAIMessage(
        "Entendemos. A negociação está encerrada."
    );
    addSystemMessage(
        "NEGOCIAÇÃO ENCERRADA"
    );
    return;
}
input.focus();

}

function sendMessage() {

if (negotiationEnded) {
    return;
}
const input =
    document.getElementById(
        "messageInput"
    );
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
    document.getElementById(
        "chatMessages"
    );
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

function handleEnter(event) {

if (event.key === "Enter") {
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
