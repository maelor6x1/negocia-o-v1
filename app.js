let player = {};

let currentBrand = null;

let currentOffer = {};

let negotiationEnded = false;


const brands = [

{

name:"NIKE",

representative:"Alex Morgan",

personality:"aggressive",

baseInterest:10,

multiplier:1.15

},

{

name:"ADIDAS",

representative:"Thomas Weber",

personality:"long",

baseInterest:8,

multiplier:1.05

},

{

name:"PUMA",

representative:"Lena Fischer",

personality:"young",

baseInterest:12,

multiplier:0.90

},

{

name:"NEW BALANCE",

representative:"James Miller",

personality:"money",

baseInterest:5,

multiplier:1.20

}

];


function showScreen(id){

document.querySelectorAll(".screen").forEach(screen => {

screen.classList.remove("active");

});

document.getElementById(id).classList.add("active");

window.scrollTo(0,0);

}


function analyzePlayer(){

player = {

name:document.getElementById("playerName").value,

age:Number(document.getElementById("playerAge").value),

club:document.getElementById("playerClub").value,

position:document.getElementById("playerPosition").value,

overall:Number(document.getElementById("playerOverall").value),

value:Number(document.getElementById("playerValue").value),

goals:Number(document.getElementById("playerGoals").value),

assists:Number(document.getElementById("playerAssists").value)

};


if(

!player.name ||

!player.age ||

!player.club ||

!player.overall

){

alert("Preencha os principais dados do jogador.");

return;

}


player.commercialScore = calculateCommercialScore();


document.getElementById("commercialScore").innerText = player.commercialScore;


document.getElementById("playerSummary").innerText =

`${player.name} • ${player.club} • ${player.position} • OVR ${player.overall}`;


renderBrands();

showScreen("brandsScreen");

}


function calculateCommercialScore(){

let score = 0;


score += (player.overall - 50) * 1.3;

score += player.goals * 0.6;

score += player.assists * 0.4;

score += player.value * 0.15;


if(player.age <= 21){

score += 10;

}

else if(player.age <= 25){

score += 7;

}


if(player.goals >= 30){

score += 8;

}


if(player.overall >= 90){

score += 12;

}


return Math.min(Math.round(score),100);

}


function calculateBrandInterest(brand){

let interest = player.commercialScore + brand.baseInterest;


if(

brand.personality === "young" &&

player.age <= 21

){

interest += 10;

}


if(

brand.personality === "aggressive" &&

player.goals >= 20

){

interest += 8;

}


if(

brand.personality === "long" &&

player.overall >= 80

){

interest += 5;

}


if(

brand.personality === "money" &&

player.commercialScore < 80

){

interest += 10;

}


return Math.min(Math.round(interest),99);

}


function renderBrands(){

const container = document.getElementById("brandsContainer");

container.innerHTML = "";


brands.forEach((brand,index) => {

const interest = calculateBrandInterest(brand);


let interestText = "BAIXO";

let interestClass = "low";


if(interest >= 80){

interestText = "MUITO ALTO 🔥";

interestClass = "high";

}

else if(interest >= 60){

interestText = "ALTO";

interestClass = "high";

}

else if(interest >= 40){

interestText = "MÉDIO";

interestClass = "medium";

}


const estimatedOffer = calculateInitialOffer(brand);


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

<span>PROPOSTA ESTIMADA</span>

<strong>

€ ${formatMoney(estimatedOffer)}

</strong>

</div>


<button

class="negotiateButton"

onclick="startNegotiation(${index})"

>

NEGOCIAR CONTRATO

</button>

</div>

</div>

`;

});

}


function calculateInitialOffer(brand){

let value = player.commercialScore * 5000;

value += player.value * 1500;

value *= brand.multiplier;


return Math.round(value / 10000) * 10000;

}


function startNegotiation(index){

currentBrand = brands[index];

negotiationEnded = false;


const value = calculateInitialOffer(currentBrand);


currentOffer = {

value:value,

duration:

currentBrand.personality === "long" ? 3 : 2,

bonus:Math.round(value * 0.2)

};


document.getElementById("brandName").innerText = currentBrand.name;

document.getElementById("miniPlayerName").innerText = player.name;

document.getElementById("miniPlayerClub").innerText = player.club;


document.getElementById("representativeName").innerText = currentBrand.representative;

document.getElementById("representativeInitial").innerText = currentBrand.name.charAt(0);


updateOfferUI();


const chat = document.getElementById("chatMessages");

chat.innerHTML = "";


addAIMessage(

`Olá, ${player.name}. Temos acompanhado sua temporada no ${player.club}.

Seu desempenho chamou a atenção da nossa equipe de marketing.

Gostaríamos de oferecer um contrato de ${currentOffer.duration} temporadas no valor de € ${formatMoney(currentOffer.value)} por temporada.

Também incluímos um bônus de € ${formatMoney(currentOffer.bonus)} por metas de desempenho.

Estamos interessados em ouvir sua posição.`

);


showScreen("negotiationScreen");

}


function updateOfferUI(){

document.getElementById("offerValue").innerText =

"€ " + formatMoney(currentOffer.value);


document.getElementById("offerDuration").innerText =

currentOffer.duration + " TEMPORADAS";


document.getElementById("offerBonus").innerText =

"€ " + formatMoney(currentOffer.bonus);

}


function addAIMessage(text){

const chat = document.getElementById("chatMessages");

const message = document.createElement("div");

message.className = "message ai";

message.innerText = text;

chat.appendChild(message);

chat.scrollTop = chat.scrollHeight;

}


function addUserMessage(text){

const chat = document.getElementById("chatMessages");

const message = document.createElement("div");

message.className = "message user";

message.innerText = text;

chat.appendChild(message);

chat.scrollTop = chat.scrollHeight;

}


function addSystemMessage(text){

const chat = document.getElementById("chatMessages");

const message = document.createElement("div");

message.className = "message system";

message.innerText = text;

chat.appendChild(message);

chat.scrollTop = chat.scrollHeight;

}


function quickAction(action){

if(negotiationEnded){

return;

}


if(action === "accept"){

addUserMessage("Aceitamos a proposta.");

setTimeout(() => {

addAIMessage(

`Excelente, ${player.name}. É um prazer receber você na família ${currentBrand.name}. Nossa equipe enviará os documentos finais.`

);

addSystemMessage("CONTRATO ACEITO ✓");

negotiationEnded = true;

},700);

}


if(action === "money"){

document.getElementById("messageInput").value =

`Quero € ${formatMoney(Math.round(currentOffer.value * 1.4))} por temporada.`;

}


if(action === "duration"){

document.getElementById("messageInput").value =

"Gostaria de negociar a duração do contrato.";

}


if(action === "bonus"){

document.getElementById("messageInput").value =

"Quero um bônus maior por metas de desempenho.";

}


if(action === "reject"){

addUserMessage("Não tenho interesse na proposta.");

setTimeout(() => {

addAIMessage(

"Entendemos sua decisão. Agradecemos pelo seu tempo e desejamos sucesso na sequência da temporada."

);

addSystemMessage("NEGOCIAÇÃO ENCERRADA");

negotiationEnded = true;

},700);

}

}


function sendMessage(){

if(negotiationEnded){

return;

}


const input = document.getElementById("messageInput");

const text = input.value.trim();


if(!text){

return;

}


addUserMessage(text);

input.value = "";


setTimeout(() => {

generateAIResponse(text);

},800);

}


function generateAIResponse(text){

const lower = text.toLowerCase();


const numbers = text.match(/\d+/g);


if(

lower.includes("quero") &&

numbers

){

let requestedValue = Number(numbers.join(""));


if(requestedValue > 10000){

negotiateMoney(requestedValue);

return;

}

}


if(

lower.includes("duração") ||

lower.includes("temporada") ||

lower.includes("anos")

){

negotiateDuration();

return;

}


if(

lower.includes("bônus") ||

lower.includes("bonus")

){

negotiateBonus();

return;

}


if(

lower.includes("aceito") ||

lower.includes("fechado")

){

quickAction("accept");

return;

}


addAIMessage(

`Entendo sua posição, ${player.name}. Neste momento precisamos discutir os termos financeiros, a duração do contrato ou os bônus de desempenho. Qual ponto você gostaria de alterar?`

);

}


function negotiateMoney(requestedValue){

const maxOffer =

calculateInitialOffer(currentBrand) *

(

1.25 +

player.commercialScore / 250

);


if(requestedValue <= maxOffer){

currentOffer.value = requestedValue;

updateOfferUI();


addAIMessage(

`Analisamos sua contraproposta.

Podemos aceitar € ${formatMoney(requestedValue)} por temporada.

Acreditamos que esse valor representa sua importância comercial para a ${currentBrand.name}.`

);

}

else{

const counterOffer = Math.round(maxOffer / 10000) * 10000;

currentOffer.value = counterOffer;

updateOfferUI();


addAIMessage(

`€ ${formatMoney(requestedValue)} está acima do investimento aprovado pela nossa diretoria.

Podemos chegar a € ${formatMoney(counterOffer)} por temporada.

Esse é um esforço significativo da ${currentBrand.name} para concluir o acordo.`

);

}

}


function negotiateDuration(){

if(currentOffer.duration < 4){

currentOffer.duration++;

updateOfferUI();


addAIMessage(

`Podemos ajustar o contrato para ${currentOffer.duration} temporadas.

Em troca, esperamos que você mantenha exclusividade com chuteiras ${currentBrand.name} durante todo o período.`

);

}

else{

addAIMessage(

"Não estamos preparados para oferecer um vínculo superior a 4 temporadas neste momento."

);

}

}


function negotiateBonus(){

const increase = Math.round(

currentOffer.value * 0.15

);


currentOffer.bonus += increase;

updateOfferUI();


addAIMessage(

`Podemos melhorar o bônus para € ${formatMoney(currentOffer.bonus)}.

O pagamento será ativado caso você alcance as metas de desempenho definidas no contrato.`

);

}


function handleEnter(event){

if(event.key === "Enter"){

sendMessage();

}

}


function formatMoney(value){

return value.toLocaleString("pt-BR");

}


function backToPlayer(){

showScreen("playerScreen");

}


function backToBrands(){

showScreen("brandsScreen");

}
