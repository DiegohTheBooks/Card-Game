import {
 campaignData, getCampaignProgress, generateRewardOptions, claimReward,
 getStoryDeckCards, saveStoryDeck, isPlayerDeckEligible, STORY_DECK_SIZE,
 getCardsForSource
} from "../campaign/campaign.js";
import { getCardImage, escapeHtml } from "../core/utils.js";

const map=document.getElementById("campaignMap");
const rewardOverlay=document.getElementById("rewardOverlay");
const rewardGrid=document.getElementById("rewardGrid");
const rewardStageName=document.getElementById("rewardStageName");
const rewardStatus=document.getElementById("rewardStatus");
const rewardCampaignName=document.getElementById("rewardCampaignName");
const storyDeckOverlay=document.getElementById("storyDeckOverlay");
const storyDeckGrid=document.getElementById("storyDeckGrid");
const storyDeckSelectedCount=document.getElementById("storyDeckSelectedCount");
const storyDeckAvailableCount=document.getElementById("storyDeckAvailableCount");
const storyDeckStatus=document.getElementById("storyDeckStatus");
const confirmStoryDeck=document.getElementById("confirmStoryDeck");
let storyDeckSelection=new Set(),storyDeckCards=[],storyDeckReady=false;

function updateStoryDeckSummary(){
 storyDeckSelectedCount.textContent=storyDeckSelection.size;
 storyDeckAvailableCount.textContent=storyDeckCards.length+" cartas disponíveis para escolha.";
 confirmStoryDeck.disabled=storyDeckSelection.size!==STORY_DECK_SIZE;
 storyDeckStatus.textContent=storyDeckSelection.size===STORY_DECK_SIZE
 ? "25 cartas selecionadas. Você pode confirmar seu Baralho da História."
 : storyDeckCards.length<STORY_DECK_SIZE
 ? "Você precisa importar pelo menos 25 cartas elegíveis para criar o Baralho da História."
 : "Selecione "+(STORY_DECK_SIZE-storyDeckSelection.size)+" carta(s) para completar o baralho.";
 storyDeckStatus.classList.toggle("is-error",storyDeckCards.length<STORY_DECK_SIZE);
}

function renderStoryDeckCards(){
 storyDeckGrid.innerHTML=storyDeckCards.map(card=>{
  const selected=storyDeckSelection.has(String(card.originalId)),image=getCardImage(card);
  return '<button class="story-deck-card '+(selected?"is-selected":"")+'" type="button" data-card-id="'+escapeHtml(card.originalId)+'">'+
   (image?'<img src="'+escapeHtml(image)+'" alt="'+escapeHtml(card.name||"Carta")+'">':'<span class="story-deck-card-placeholder">?</span>')+
   '<span class="story-deck-check">✓</span><span class="story-deck-card-name">'+escapeHtml(card.name||"Sem nome")+
   '</span><span class="story-deck-card-meta">Mana '+(Number(card.mana)||0)+' · '+escapeHtml(card.collectionName||card.work||"Coleção")+'</span></button>';
 }).join("");
 updateStoryDeckSummary();
}

async function openStoryDeckSetup(){
 const {getAll,STORES}=await import("../core/database.js");
 const allCards=await getAll(STORES.COLLECTION);
 storyDeckCards=allCards.filter(isPlayerDeckEligible).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""),"pt-BR"));
 storyDeckSelection=new Set();
 if(!storyDeckCards.length) storyDeckGrid.innerHTML='<div class="reward-empty"><h3>Nenhuma carta disponível</h3><p>Importe cartas do Álbum antes de criar o Baralho da História.</p></div>';
 else renderStoryDeckCards();
 storyDeckOverlay.classList.add("open");storyDeckOverlay.setAttribute("aria-hidden","false");
}

function closeStoryDeckSetup(){storyDeckOverlay.classList.remove("open");storyDeckOverlay.setAttribute("aria-hidden","true");}

function findBossCard(campaign,sourceCards){
 const exact=sourceCards.find(card=>String(card.name||"").trim().toLocaleLowerCase("pt-BR")===String(campaign.boss.name||"").trim().toLocaleLowerCase("pt-BR"));
 return exact||sourceCards[sourceCards.length-1]||sourceCards[0]||null;
}

function renderMap(progress,allCards){
 map.innerHTML=campaignData.campaigns.map(campaign=>{
  const sourceCards=getCardsForSource(allCards,campaign.source);
  const bossCard=findBossCard(campaign,sourceCards);
  const defeated=campaign.stages.filter(s=>Number(progress.defeated[s.id]||0)>0).length;
  const image=bossCard?getCardImage(bossCard):"";
  return '<a class="campaign-card" href="campanha-detalhe.html?campaign='+encodeURIComponent(campaign.id)+'">'+
   '<div class="campaign-card-art">'+(image?'<img src="'+escapeHtml(image)+'" alt="'+escapeHtml(bossCard.name||campaign.boss.name)+'">':'<div class="campaign-card-placeholder">BOSS</div>')+
   '<span class="campaign-card-badge">BOSS</span></div><div class="campaign-card-body">'+
   '<span class="campaign-kicker">CAMPANHA</span><h2>'+escapeHtml(campaign.name)+'</h2>'+
   '<p>'+escapeHtml(campaign.work)+' · '+defeated+'/10 batalhas concluídas</p>'+
   '<span class="campaign-card-link">'+(sourceCards.length?"Entrar na campanha →":"Importe cartas para liberar →")+'</span></div></a>';
 }).join("");
}

function renderRewardCards(options,stageId){
 rewardGrid.innerHTML=options.length?options.map(card=>'<button class="reward-card" type="button" data-card-id="'+escapeHtml(card.originalId)+'"><img src="'+escapeHtml(getCardImage(card))+'" alt="'+escapeHtml(card.name||"Carta")+'"><span class="reward-card-name">'+escapeHtml(card.name||"Sem nome")+'</span><span class="reward-card-work">'+escapeHtml(card.work||"Obra")+'</span><span class="reward-card-mana">Mana '+(Number(card.mana)||0)+'</span><span class="reward-card-action">Escolher</span></button>').join(""):'<div class="reward-empty"><h3>Nenhuma carta disponível</h3><p>A Coleção ainda não possui cartas compatíveis com esta campanha.</p></div>';
 rewardGrid.querySelectorAll(".reward-card").forEach(button=>button.addEventListener("click",async()=>{
  try{button.disabled=true;const card=await claimReward(stageId,button.dataset.cardId);rewardStatus.textContent=card.name+" foi adicionada ao seu Inventário.";setTimeout(()=>{rewardOverlay.classList.remove("open");load();},700);}
  catch(error){button.disabled=false;rewardStatus.textContent=error.message||"Não foi possível receber a recompensa.";}
 }));
}

async function openPendingReward(stageId){
 const options=await generateRewardOptions(stageId),stage=campaignData.stages.find(item=>Number(item.id)===Number(stageId));
 if(!stage)return;
 rewardCampaignName.textContent=stage.campaignName;
 rewardStageName.textContent=stage.boss?"Boss — "+stage.name:stage.name;
 rewardStatus.textContent="Escolha 1 carta da fonte. As outras duas serão descartadas.";
 renderRewardCards(options,stage.id);rewardOverlay.classList.add("open");rewardOverlay.setAttribute("aria-hidden","false");
}

async function load(){
 try{
  storyDeckReady=Boolean(await getStoryDeckCards());
  const progress=await getCampaignProgress();
  const {getAll,STORES}=await import("../core/database.js");
  const allCards=await getAll(STORES.COLLECTION);
  renderMap(progress,allCards);
  if(!storyDeckReady)await openStoryDeckSetup();
  const requestedReward=new URLSearchParams(location.search).get("reward");
  if(requestedReward&&progress.pendingRewards[Number(requestedReward)]){await openPendingReward(Number(requestedReward));}
  else for(const campaign of campaignData.campaigns)for(const stage of campaign.stages)if(progress.pendingRewards[stage.id]){await openPendingReward(stage.id);return;}
 }catch(error){console.error(error);map.innerHTML='<div class="empty-state"><span>⚠</span><h2>Não foi possível carregar a História</h2><p>'+escapeHtml(error.message||"Erro desconhecido.")+'</p></div>';}
}

storyDeckGrid.addEventListener("click",event=>{
 const button=event.target.closest(".story-deck-card");if(!button)return;
 const id=String(button.dataset.cardId);
 if(storyDeckSelection.has(id))storyDeckSelection.delete(id);
 else{if(storyDeckSelection.size>=STORY_DECK_SIZE){storyDeckStatus.textContent="O baralho já possui 25 cartas. Remova uma antes de escolher outra.";storyDeckStatus.classList.add("is-error");return;}storyDeckSelection.add(id);}
 renderStoryDeckCards();
});

confirmStoryDeck.addEventListener("click",async()=>{
 if(storyDeckSelection.size!==STORY_DECK_SIZE)return;
 confirmStoryDeck.disabled=true;storyDeckStatus.textContent="Salvando seu Baralho da História...";
 try{await saveStoryDeck([...storyDeckSelection]);storyDeckReady=true;closeStoryDeckSetup();const progress=await getCampaignProgress();const {getAll,STORES}=await import("../core/database.js");renderMap(progress,await getAll(STORES.COLLECTION));}
 catch(error){storyDeckStatus.textContent=error.message||"Não foi possível salvar o baralho.";storyDeckStatus.classList.add("is-error");confirmStoryDeck.disabled=false;}
});
document.getElementById("closeReward").addEventListener("click",()=>rewardOverlay.classList.remove("open"));
rewardOverlay.addEventListener("click",e=>{if(e.target===rewardOverlay)rewardOverlay.classList.remove("open")});
load();