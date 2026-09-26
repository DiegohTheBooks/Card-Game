import { getAll, put, STORES } from "../core/database.js";
import { importSingleCardJson } from "../cards/importer.js";
import { getCardImage, escapeHtml } from "../core/utils.js";

const input=document.getElementById("shopImportInput"),grid=document.getElementById("shopGrid"),empty=document.getElementById("shopEmpty"),status=document.getElementById("shopStatus");
let cards=[];
function render(){
 empty.hidden=cards.length>0;
 if(!cards.length){grid.innerHTML="";return;}
 grid.innerHTML=cards.map(c=>{
  const img=getCardImage(c);
  return '<article class="shop-card"><div class="shop-art">'+(img?'<img src="'+escapeHtml(img)+'" alt="'+escapeHtml(c.name)+'" loading="lazy">':'')+'</div><div class="shop-info"><h2>'+escapeHtml(c.name)+'</h2><small>'+escapeHtml(c.work||"Carta especial")+'</small><div class="shop-meta"><span>MANA '+c.mana+'</span><span>'+(c.shopPrice>0?(c.shopCurrency==="gold"?"🟡 ":"🪙 ")+c.shopPrice:"Preço não definido")+'</span></div><div class="shop-status">Carta cadastrada na Loja. A compra/resgate será conectado ao sistema de moedas quando a economia da Loja for ativada.</div><button class="button-secondary" type="button" data-id="'+escapeHtml(c.originalId)+'">Ver ficha</button></div></article>';
 }).join("");
}
async function load(){
 const entries=await getAll(STORES.SHOP);const collection=await getAll(STORES.COLLECTION);
 cards=entries.map(e=>collection.find(c=>String(c.originalId)===String(e.originalId))).filter(Boolean);
 status.textContent=cards.length?cards.length+" carta(s) especial(is) na Loja.":"Nenhuma carta especial cadastrada.";render();
}
input.addEventListener("change",async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{
  const payload=JSON.parse(await file.text());
  const result=await importSingleCardJson(payload);
  const card=result.cards[0];
  await put(STORES.SHOP,{originalId:String(card.originalId),importedAt:new Date().toISOString(),shopPrice:Number(card.shopPrice)||0,shopCurrency:card.shopCurrency||"gold"});
  await load();
  status.textContent='Carta "'+card.name+'" adicionada à Loja.';
 }catch(error){console.error(error);status.textContent=error.message||"Não foi possível importar a carta.";}finally{input.value="";}
});
grid.addEventListener("click",e=>{const button=e.target.closest("button[data-id]");if(!button)return;const card=cards.find(c=>String(c.originalId)===button.dataset.id);if(card)window.dispatchEvent(new CustomEvent("cardduels:open-sheet",{detail:card}));});
load().catch(error=>{console.error(error);status.textContent="Não foi possível carregar a Loja.";});