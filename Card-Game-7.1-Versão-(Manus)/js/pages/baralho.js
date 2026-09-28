import { getAll, STORES } from "../core/database.js";
import { getCardImage, escapeHtml } from "../core/utils.js";
import { openCardSheet } from "../cards/card-sheet.js";
import { initializeStarterInventory } from "../player/inventory.js";
import { isPlayerDeckEligible, saveStoryDeck, clearStoryDeck, STORY_DECK_SIZE } from "../campaign/campaign.js";
import { addToDeck, removeFromDeck, clearDeck, MAX_DECK_SIZE, initializeStarterDeck } from "../player/deck.js";

const inventoryCount=document.getElementById("inventoryCount"),deckCount=document.getElementById("deckCount"),deckStatus=document.getElementById("deckStatus"),inventoryGrid=document.getElementById("inventoryGrid"),deckGrid=document.getElementById("deckGrid"),inventoryDropZone=document.getElementById("inventoryDropZone"),deckDropZone=document.getElementById("deckDropZone"),clearDeckButton=document.getElementById("clearDeckButton"),selectDeckButton=document.getElementById("selectDeckButton"),deckSelectionOverlay=document.getElementById("deckSelectionOverlay"),deckSelectionGrid=document.getElementById("deckSelectionGrid"),deckSelectionCount=document.getElementById("deckSelectionCount"),deckSelectionAvailable=document.getElementById("deckSelectionAvailable"),deckSelectionStatus=document.getElementById("deckSelectionStatus"),confirmDeckSelection=document.getElementById("confirmDeckSelection"),cancelDeckSelection=document.getElementById("cancelDeckSelection");
let cards=[],inventory=[],deck=[],selectionCards=[],selection=new Set();

function cardById(id){return cards.find(card=>String(card.originalId)===String(id))}
function deckUsage(id){return deck.filter(item=>String(item.originalId)===String(id)).length}
function setStatus(message,error=false){deckStatus.textContent=message;deckStatus.classList.toggle("is-error",error)}
function renderSummary(){inventoryCount.textContent=inventory.reduce((t,i)=>t+Number(i.quantity||0),0);deckCount.textContent=deck.length+" / "+MAX_DECK_SIZE}
function infoButton(id){return '<button class="card-info-button" type="button" data-info-card-id="'+escapeHtml(id)+'" title="Ver ficha" aria-label="Ver ficha">ⓘ</button>'}

function renderInventory(){
 const owned=inventory.filter(i=>Number(i.quantity||0)>0).map(i=>({...i,card:cardById(i.originalId)})).filter(i=>i.card).sort((a,b)=>String(a.card.name||"").localeCompare(String(b.card.name||""),"pt-BR"));
 if(!owned.length){inventoryGrid.innerHTML='<div class="empty-inventory">Nenhuma carta no inventário ainda.</div>';return}
 const copies=[];
 for(const item of owned){
  const total=Math.max(0,Number(item.quantity)||0),used=deckUsage(item.originalId),image=getCardImage(item.card);
  for(let copyIndex=0;copyIndex<total;copyIndex++){
   const isUsed=copyIndex<used;
   copies.push('<article class="inventory-card '+(isUsed?"is-used":"")+'" draggable="true" data-card-id="'+escapeHtml(item.originalId)+'" title="'+(isUsed?"Cópia atualmente no deck":"Clique ou arraste para o deck")+'">'+
    (image?'<img src="'+escapeHtml(image)+'" alt="'+escapeHtml(item.card.name||"Carta")+'">':'<span class="inventory-card-placeholder">?</span>')+
    (isUsed?'<span class="inventory-used-mark">NO DECK</span>':'')+infoButton(item.originalId)+
    '<span class="inventory-card-copy"><span class="inventory-card-name">'+escapeHtml(item.card.name||"Sem nome")+'</span><span class="inventory-card-copy-count">Cópia '+(copyIndex+1)+' de '+total+'</span></span></article>');
  }
 }
 inventoryGrid.innerHTML=copies.join("");
}

function renderDeck(){
 const bySlot=new Map(deck.map(i=>[Number(i.slot),i])),slots=[];
 for(let slot=1;slot<=MAX_DECK_SIZE;slot++){
  const item=bySlot.get(slot);
  if(!item){slots.push('<div class="deck-slot empty"><span>'+slot+'</span></div>');continue}
  const card=cardById(item.originalId),image=card?getCardImage(card):"";
  slots.push('<article class="deck-slot" draggable="true" data-slot="'+slot+'" title="Clique para remover · arraste para o inventário">'+
   (image?'<img src="'+escapeHtml(image)+'" alt="'+escapeHtml(card?.name||"Carta")+'">':'<span class="deck-placeholder">?</span>')+
   '<span class="deck-slot-number">'+slot+'</span>'+infoButton(item.originalId)+'</article>');
 }
 deckGrid.innerHTML=slots.join("");
}

async function reload(){cards=await getAll(STORES.COLLECTION);await initializeStarterInventory();await initializeStarterDeck();inventory=await getAll(STORES.INVENTORY);deck=await getAll(STORES.DECK);renderSummary();renderInventory();renderDeck()}
async function addCardById(id){const card=cardById(id);if(!card)return;try{await addToDeck(card);await reload();setStatus(deck.length===MAX_DECK_SIZE?"Deck completo: 25 cartas.":"Carta adicionada ao deck.")}catch(e){setStatus(e.message||"Não foi possível adicionar a carta.",true)}}
async function removeCardBySlot(slot){try{await removeFromDeck(Number(slot));await reload();setStatus("Carta devolvida ao inventário.")}catch(e){setStatus(e.message||"Não foi possível remover a carta.",true)}}
function openInfo(id){const card=cardById(id);if(card)openCardSheet(card)}

inventoryGrid.addEventListener("click",async e=>{const info=e.target.closest(".card-info-button");if(info){e.stopPropagation();openInfo(info.dataset.infoCardId);return}const card=e.target.closest(".inventory-card");if(card)await addCardById(card.dataset.cardId)});
deckGrid.addEventListener("click",async e=>{const info=e.target.closest(".card-info-button");if(info){e.stopPropagation();openInfo(info.dataset.infoCardId);return}const slot=e.target.closest(".deck-slot:not(.empty)");if(slot)await removeCardBySlot(slot.dataset.slot)});

function setDragState(zone,active){zone.classList.toggle("is-drag-over",active)}
function clearDragStates(){setDragState(inventoryDropZone,false);setDragState(deckDropZone,false)}

inventoryGrid.addEventListener("dragstart",e=>{const card=e.target.closest(".inventory-card");if(!card)return;e.dataTransfer.effectAllowed="copy";e.dataTransfer.setData("text/plain",JSON.stringify({source:"inventory",originalId:String(card.dataset.cardId)}));card.classList.add("is-dragging")});
inventoryGrid.addEventListener("dragend",e=>{e.target.closest(".inventory-card")?.classList.remove("is-dragging");clearDragStates()});
deckGrid.addEventListener("dragstart",e=>{const card=e.target.closest(".deck-slot:not(.empty)");if(!card)return;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",JSON.stringify({source:"deck",slot:Number(card.dataset.slot)}));card.classList.add("is-dragging")});
deckGrid.addEventListener("dragend",e=>{e.target.closest(".deck-slot")?.classList.remove("is-dragging");clearDragStates()});

function handleDragOver(zone,e){e.preventDefault();setDragState(zone,true);e.dataTransfer.dropEffect=zone===deckDropZone?"copy":"move"}
function handleDragLeave(zone,e){if(!zone.contains(e.relatedTarget))setDragState(zone,false)}
deckDropZone.addEventListener("dragover",e=>handleDragOver(deckDropZone,e));deckDropZone.addEventListener("dragleave",e=>handleDragLeave(deckDropZone,e));
inventoryDropZone.addEventListener("dragover",e=>handleDragOver(inventoryDropZone,e));inventoryDropZone.addEventListener("dragleave",e=>handleDragLeave(inventoryDropZone,e));
deckDropZone.addEventListener("drop",async e=>{e.preventDefault();clearDragStates();try{const p=JSON.parse(e.dataTransfer.getData("text/plain")||"{}");if(p.source==="inventory"&&p.originalId!=null)await addCardById(p.originalId)}catch(_){setStatus("Não foi possível concluir o arraste.",true)}});
inventoryDropZone.addEventListener("drop",async e=>{e.preventDefault();clearDragStates();try{const p=JSON.parse(e.dataTransfer.getData("text/plain")||"{}");if(p.source==="deck"&&p.slot!=null)await removeCardBySlot(p.slot)}catch(_){setStatus("Não foi possível concluir o arraste.",true)}});

function updateSelectionSummary(){deckSelectionCount.textContent=selection.size;deckSelectionAvailable.textContent=selectionCards.length+" cartas elegíveis";confirmDeckSelection.disabled=selection.size!==STORY_DECK_SIZE;deckSelectionStatus.textContent=selection.size===STORY_DECK_SIZE?"25 cartas selecionadas. Clique em “Usar este Deck” para aplicar.":"Selecione "+(STORY_DECK_SIZE-selection.size)+" carta(s) para completar o deck.";deckSelectionStatus.classList.remove("is-error")}
function renderSelectionCards(){deckSelectionGrid.innerHTML=selectionCards.map(card=>{const selected=selection.has(String(card.originalId)),image=getCardImage(card);return '<article class="deck-selection-card '+(selected?"is-selected":"")+'">'+(image?'<img class="deck-selection-art" src="'+escapeHtml(image)+'" alt="'+escapeHtml(card.name||"Carta")+'">':'<span class="deck-selection-placeholder">?</span>')+'<span class="deck-selection-check">✓</span><strong class="deck-selection-name">'+escapeHtml(card.name||"Sem nome")+'</strong><span class="deck-selection-meta">Mana '+(Number(card.mana)||0)+' · '+escapeHtml(card.collectionName||card.work||"Coleção")+'</span><div class="deck-selection-actions-inline"><button class="deck-selection-toggle" type="button" data-card-id="'+escapeHtml(card.originalId)+'">'+(selected?"✓ Selecionada":"Escolher")+'</button><button class="deck-selection-preview" type="button" data-preview-card-id="'+escapeHtml(card.originalId)+'">ⓘ Ficha</button></div></article>'}).join("");updateSelectionSummary()}
async function openDeckSelection(){const allCards=await getAll(STORES.COLLECTION);selectionCards=allCards.filter(isPlayerDeckEligible).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"pt-BR"));selection=new Set();if(selectionCards.length<STORY_DECK_SIZE)deckSelectionGrid.innerHTML='<div class="empty-inventory">São necessárias pelo menos 25 cartas elegíveis para montar o deck. Atualmente existem '+selectionCards.length+'.</div>';else renderSelectionCards();updateSelectionSummary();deckSelectionOverlay.classList.add("open");deckSelectionOverlay.setAttribute("aria-hidden","false")}
function closeDeckSelection(){deckSelectionOverlay.classList.remove("open");deckSelectionOverlay.setAttribute("aria-hidden","true")}
selectDeckButton.addEventListener("click",async()=>{try{await openDeckSelection()}catch(e){setStatus(e.message||"Não foi possível abrir a seleção de deck.",true)}});
deckSelectionGrid.addEventListener("click",e=>{const preview=e.target.closest(".deck-selection-preview");if(preview){e.stopPropagation();openInfo(preview.dataset.previewCardId);return}const toggle=e.target.closest(".deck-selection-toggle");if(!toggle)return;const id=String(toggle.dataset.cardId);if(selection.has(id))selection.delete(id);else{if(selection.size>=STORY_DECK_SIZE){deckSelectionStatus.textContent="O deck já possui 25 cartas. Remova uma antes de escolher outra.";deckSelectionStatus.classList.add("is-error");return}selection.add(id)}renderSelectionCards()});
cancelDeckSelection.addEventListener("click",closeDeckSelection);
confirmDeckSelection.addEventListener("click",async()=>{if(selection.size!==STORY_DECK_SIZE)return;confirmDeckSelection.disabled=true;deckSelectionStatus.textContent="Aplicando novo deck...";try{await saveStoryDeck([...selection]);closeDeckSelection();await reload();setStatus("Novo deck aplicado. Ele será usado nas próximas batalhas.")}catch(e){confirmDeckSelection.disabled=false;deckSelectionStatus.textContent=e.message||"Não foi possível aplicar o deck.";deckSelectionStatus.classList.add("is-error")}});
clearDeckButton.addEventListener("click",async()=>{if(!deck.length)return;await clearDeck();await clearStoryDeck();await reload();setStatus("Deck limpo. Deck de História precisa de uma nova seleção.")});
reload().catch(e=>{console.error(e);setStatus("Não foi possível carregar o Inventário e o Deck.",true)});