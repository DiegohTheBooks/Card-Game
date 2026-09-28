import { getAll, STORES } from "../core/database.js";
import { getPlayerProfile, getProgress, savePlayerProfile } from "../player/profile.js";
import { getAchievementsState, syncAchievementStats, ACHIEVEMENTS } from "../player/achievements.js";
import { campaignData, getCampaignProgress } from "../campaign/campaign.js";
import { escapeHtml } from "../core/utils.js";

const $ = id => document.getElementById(id);
const els = {
 avatar:$("authorAvatar"), name:$("profileName"), presentation:$("profilePresentation"),
 level:$("profileLevel"), xp:$("profileXp"), xpNext:$("profileXpNext"), xpBar:$("profileXpBar"),
 hp:$("profileHp"), mana:$("profileMana"), discovered:$("profileDiscovered"),
 achievements:$("profileAchievements"), campaigns:$("campaignsList"), achievementList:$("achievementsList"),
 dialog:$("profileDialog"), form:$("profileForm"), nameInput:$("profileNameInput"),
 presentationInput:$("profilePresentationInput"), avatarSelect:$("profileAvatarSelect"),
 avatarPreview:$("avatarPreview"), edit:$("editProfileButton"), cancel:$("cancelProfileButton")
};
let profile, cards=[], codex=[], achievementState, campaignProgress;

function cardImage(card){ return card?.image || card?.imageData || card?.imageUrl || card?.art || ""; }

function renderAvatar(target, originalId){
 const card=cards.find(c=>String(c.originalId)===String(originalId));
 const image=cardImage(card);
 if(card && image) target.innerHTML='<img src="'+escapeHtml(image)+'" alt="">';
 else target.textContent="✦";
}

function render(){
 const progress=getProgress(profile);
 els.name.textContent=profile.name||"Autor";
 els.presentation.textContent=profile.presentation||"";
 els.level.textContent=profile.level;
 els.xp.textContent=progress.progressXp;
 els.xpNext.textContent=progress.nextLevelXp;
 els.xpBar.style.width=progress.percent+"%";
 els.hp.textContent=profile.maxHp;
 els.mana.textContent=profile.startingMana;
 els.discovered.textContent=codex.length;
 const unlocked=new Set(achievementState.unlocked||[]);
 els.achievements.textContent=unlocked.size+" / "+ACHIEVEMENTS.length;
 renderAvatar(els.avatar,profile.avatar);

 els.campaigns.innerHTML=campaignData.campaigns.map(c=>{
  const defeated=c.stages.filter(s=>Number(campaignProgress.defeated?.[s.id]||0)>0).length;
  const complete=defeated===c.stages.length;
  return '<div class="campaign-row"><div><strong>'+escapeHtml(c.name)+'</strong><small>'+defeated+' / '+c.stages.length+' batalhas concluídas</small></div><span class="campaign-status">'+(complete?"CONCLUÍDA":(defeated?"EM ANDAMENTO":"NÃO INICIADA"))+'</span></div>';
 }).join("");

 const recent=ACHIEVEMENTS.slice().sort((a,b)=>{
  const au=unlocked.has(a.id), bu=unlocked.has(b.id);
  return Number(bu)-Number(au);
 }).slice(0,6);
 els.achievementList.innerHTML=recent.map(a=>{
  const ok=unlocked.has(a.id);
  const value=a.type==="campaignStagesDefeated"
   ? achievementState.stats.campaignStagesDefeated.length
   : Number(achievementState.stats[a.type]||0);
  return '<div class="achievement-row '+(ok?"is-unlocked":"")+'"><strong>'+(ok?"✓ ":"")+escapeHtml(a.title)+'</strong><small>'+value+' / '+a.target+' — '+escapeHtml(a.description)+'</small></div>';
 }).join("");
}

function populateAvatarOptions(){
 const discovered=new Set(codex.map(c=>String(c.originalId)));
 const options=cards.filter(c=>discovered.has(String(c.originalId)));
 els.avatarSelect.innerHTML='<option value="">Nenhum personagem — usar símbolo</option>'+
 options.sort((a,b)=>String(a.name).localeCompare(String(b.name),"pt-BR"))
 .map(c=>'<option value="'+escapeHtml(c.originalId)+'">'+escapeHtml(c.name)+(c.work?" — "+escapeHtml(c.work):"")+'</option>').join("");
 els.avatarSelect.value=profile.avatar||"";
 updateAvatarPreview();
}

function updateAvatarPreview(){ renderAvatar(els.avatarPreview,els.avatarSelect.value); }

function openEditor(){
 els.nameInput.value=profile.name||"";
 els.presentationInput.value=profile.presentation||"";
 populateAvatarOptions();
 if(typeof els.dialog.showModal==="function") els.dialog.showModal();
 else els.dialog.setAttribute("open","");
}

els.edit.addEventListener("click",openEditor);
els.cancel.addEventListener("click",()=>els.dialog.close());
els.avatarSelect.addEventListener("change",updateAvatarPreview);

els.form.addEventListener("submit",async event=>{
 event.preventDefault();
 try{
  profile=await savePlayerProfile({
   name:els.nameInput.value.trim()||"Autor",
   presentation:els.presentationInput.value.trim()||"Dando vida aos personagens de Um Mundo Além das Páginas.",
   avatar:els.avatarSelect.value
  });
  els.dialog.close();
  render();
 }catch(error){ console.error("Não foi possível salvar o perfil:",error); }
});

async function load(){
 [profile,cards,codex,campaignProgress]=await Promise.all([
  getPlayerProfile(),getAll(STORES.COLLECTION),getAll(STORES.CODEX),getCampaignProgress()
 ]);
 await syncAchievementStats();
 achievementState=await getAchievementsState();
 render();
}
load().catch(error=>{console.error(error);els.name.textContent="Não foi possível carregar o perfil.";});