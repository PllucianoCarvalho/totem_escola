const lista=document.getElementById("lista");
const relogio=document.getElementById("relogio");
const diaSemana=document.getElementById("diaSemana");
const aulaAtual=document.getElementById("aulaAtual");
const quantidade=document.getElementById("quantidade");
const atualizacao=document.getElementById("atualizacao");
let professores=[];
const aulas=[
 {periodo:"manhã",inicio:"07:50",fim:"08:40",numero:1},
 {periodo:"manhã",inicio:"08:40",fim:"09:30",numero:2},
 {periodo:"manhã",inicio:"09:40",fim:"10:30",numero:3},
 {periodo:"manhã",inicio:"10:30",fim:"11:20",numero:4},
 {periodo:"manhã",inicio:"11:20",fim:"12:10",numero:5},
 {periodo:"tarde",inicio:"13:05",fim:"13:55",numero:1},
 {periodo:"tarde",inicio:"13:55",fim:"14:45",numero:2},
 {periodo:"tarde",inicio:"14:55",fim:"15:45",numero:3},
 {periodo:"tarde",inicio:"15:45",fim:"16:35",numero:4},
 {periodo:"tarde",inicio:"16:35",fim:"17:25",numero:5}
];
function minutos(hora){const [h,m]=hora.split(":").map(Number);return h*60+m;}
function atualizarCabecalho(){
 const agora=new Date(),hora=String(agora.getHours()).padStart(2,"0")+":"+String(agora.getMinutes()).padStart(2,"0");
 relogio.textContent=hora;
 diaSemana.textContent=agora.toLocaleDateString("pt-BR",{weekday:"long"});
 const m=agora.getHours()*60+agora.getMinutes();
 const aula=aulas.find(a=>m>=minutos(a.inicio)&&m<minutos(a.fim));
 if(aula){aulaAtual.textContent=aula.numero+"ª aula · "+aula.inicio+"–"+aula.fim+" ("+aula.periodo+")";}
 else{aulaAtual.textContent="Fora do horário de aula";}
 const periodo=aula?.periodo;
 const emAula=professores.filter(p=>{const h=(p.horario||"").toLowerCase();return !h||!periodo||h.includes(periodo)||h.includes(aula.inicio);});
 quantidade.textContent=aula?"Aguardando grade validada":"Grade escolar";
}
function montarCartao(nome,etiqueta){
 const card=document.createElement("article");card.className="cartao";
 const titulo=document.createElement("h2");titulo.className="nome";titulo.textContent=nome||"Professor não informado";
 const tag=document.createElement("span");tag.className="etiqueta";tag.textContent=etiqueta||"Turma/componente não informado";
 card.append(titulo,tag);return card;
}
function renderizar(){
 lista.innerHTML="";
 if(!professores.length){
  const p=document.createElement("p");p.className="vazio";
  p.textContent="Os horários ainda estão sendo organizados a partir dos relatórios oficiais.";
  lista.appendChild(p);return;
 }
 professores.forEach(p=>lista.appendChild(montarCartao(p.professor,[p.componente,p.turma].filter(Boolean).join(" · "))));
}
async function carregar(){
 try{const r=await fetch("/api/horarios",{cache:"no-store"});if(!r.ok)throw new Error();const d=await r.json();professores=Array.isArray(d.professores)?d.professores:[];renderizar();atualizacao.textContent="Atualizado às "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});}
 catch{lista.innerHTML='<p class="vazio">Não foi possível carregar os horários.</p>';atualizacao.textContent="Falha ao atualizar os dados.";}
}
atualizarCabecalho();carregar();
setInterval(()=>{atualizarCabecalho();carregar();},60000);
