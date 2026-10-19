const lista=document.getElementById("lista");
const relogio=document.getElementById("relogio");
const diaSemana=document.getElementById("diaSemana");
const aulaAtual=document.getElementById("aulaAtual");
const quantidade=document.getElementById("quantidade");
const atualizacao=document.getElementById("atualizacao");
let professores=[];
let aulasGrade=[];
const horariosAula=[
 {inicio:"07:50",fim:"08:40",numero:1},{inicio:"08:40",fim:"09:30",numero:2},{inicio:"09:40",fim:"10:30",numero:3},{inicio:"10:30",fim:"11:20",numero:4},{inicio:"11:20",fim:"12:10",numero:5},
 {inicio:"13:05",fim:"13:55",numero:1},{inicio:"13:55",fim:"14:45",numero:2},{inicio:"14:55",fim:"15:45",numero:3},{inicio:"15:45",fim:"16:35",numero:4},{inicio:"16:35",fim:"17:25",numero:5}
];
const diasNomes=["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
function minutos(h){const [a,b]=h.split(":").map(Number);return a*60+b;}
function aulaAtualAgora(){const d=new Date(),m=d.getHours()*60+d.getMinutes();return horariosAula.find(a=>m>=minutos(a.inicio)&&m<minutos(a.fim))||null;}
function atualizarCabecalho(){
 const agora=new Date(),hora=String(agora.getHours()).padStart(2,"0")+":"+String(agora.getMinutes()).padStart(2,"0");
 relogio.textContent=hora;diaSemana.textContent=diasNomes[agora.getDay()].replace(/^./,c=>c.toUpperCase());
 const aula=aulaAtualAgora();
 if(aula){aulaAtual.textContent=aula.numero+"ª aula · "+aula.inicio+"–"+aula.fim+" ("+(minutos(aula.inicio)<12*60?"manhã":"tarde")+")";}
 else{aulaAtual.textContent="Fora do horário de aula";}
 const emAula=filtrarAulasAgora();quantidade.textContent=emAula.length+" professor(es) em aula";
}
function filtrarAulasAgora(){
 const agora=new Date(),dia=diasNomes[agora.getDay()],m=agora.getHours()*60+agora.getMinutes();
 return aulasGrade.filter(a=>a.dia.toLocaleLowerCase("pt-BR")===dia&&m>=minutos(a.inicio)&&m<minutos(a.fim));
}
function montarCartao(nome,etiqueta){
 const card=document.createElement("article");card.className="cartao";
 const titulo=document.createElement("h2");titulo.className="nome";titulo.textContent=nome||"Professor não informado";
 const tag=document.createElement("span");tag.className="etiqueta";tag.textContent=etiqueta||"Turma/componente não informado";
 card.append(titulo,tag);return card;
}
function renderizar(){
 lista.innerHTML="";
 const atuais=filtrarAulasAgora();
 if(!aulasGrade.length){const p=document.createElement("p");p.className="vazio";p.textContent="Nenhuma grade importada ainda. Envie os três relatórios no painel administrativo.";lista.appendChild(p);return;}
 if(!aulaAtualAgora()){const p=document.createElement("p");p.className="vazio";p.textContent="Não há aula neste horário.";lista.appendChild(p);return;}
 if(!atuais.length){const p=document.createElement("p");p.className="vazio";p.textContent="Nenhum professor encontrado para esta aula e horário.";lista.appendChild(p);return;}
 atuais.sort((a,b)=>a.professor.localeCompare(b.professor,"pt-BR")||a.turma.localeCompare(b.turma,"pt-BR"));
 atuais.forEach(a=>lista.appendChild(montarCartao(a.professor,[a.turma,a.componente].filter(Boolean).join(" · "))));
}
async function carregar(){
 try{const r=await fetch("/api/horarios",{cache:"no-store"});if(!r.ok)throw new Error();const d=await r.json();aulasGrade=Array.isArray(d.aulas)?d.aulas:[];professores=Array.isArray(d.professores)?d.professores:[];renderizar();atualizacao.textContent="Grade atualizada às "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});}
 catch{lista.innerHTML='<p class="vazio">Não foi possível carregar os horários.</p>';atualizacao.textContent="Falha ao atualizar os dados.";}
}
atualizarCabecalho();carregar();
setInterval(()=>{atualizarCabecalho();carregar();},60000);
