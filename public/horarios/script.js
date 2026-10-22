const lista=document.getElementById("lista");
const relogio=document.getElementById("relogio");
const diaSemana=document.getElementById("diaSemana");
const aulaAtual=document.getElementById("aulaAtual");
const quantidade=document.getElementById("quantidade");
const atualizacao=document.getElementById("atualizacao");
let professores=[];
let aulasGrade=[];
let configuracaoHorario={tipoEscola:"regular",inicioAulas:"07:00",duracaoAula:50,inicioIntervalo:"09:30",duracaoIntervalo:20};
let horariosAula=[];
function minutos(h){const [a,b]=String(h||"00:00").split(":").map(Number);return a*60+b;}
function formatarHora(total){total=((total%1440)+1440)%1440;return String(Math.floor(total/60)).padStart(2,"0")+":"+String(total%60).padStart(2,"0");}
function montarHorariosAula(quantidadePeriodos=12){
 const c=configuracaoHorario;let atual=minutos(c.inicioAulas),aplicouIntervalo=false;
 const pausa=minutos(c.inicioIntervalo),duracao=Number(c.duracaoAula)||50,intervalo=Number(c.duracaoIntervalo)||20,resultado=[];
 for(let numero=1;numero<=quantidadePeriodos;numero++){
  if(!aplicouIntervalo&&(atual>=pausa||atual+duracao>pausa)){atual=pausa+intervalo;aplicouIntervalo=true;}
  resultado.push({inicio:formatarHora(atual),fim:formatarHora(atual+duracao),numero});
  atual+=duracao;
 }
 return resultado;
}
function horarioPorPeriodo(periodo){return horariosAula.find(h=>h.numero===Number(periodo))||null;}
function normalizarAulasComHorario(aulas){return aulas.map(a=>{const slot=horarioPorPeriodo(a.periodo);return slot?{...a,inicio:slot.inicio,fim:slot.fim,horario:slot.inicio+"–"+slot.fim}:a;});}
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
 if(!aulasGrade.length){const p=document.createElement("p");p.className="vazio";p.textContent="Nenhuma grade publicada ainda. Importe o relatório geral e clique em salvar/publicar no painel administrativo.";lista.appendChild(p);return;}
 if(!aulaAtualAgora()){const p=document.createElement("p");p.className="vazio";p.textContent="Não há aula neste horário.";lista.appendChild(p);return;}
 if(!atuais.length){const p=document.createElement("p");p.className="vazio";p.textContent="Nenhum professor encontrado para esta aula e horário.";lista.appendChild(p);return;}
 atuais.sort((a,b)=>a.professor.localeCompare(b.professor,"pt-BR")||a.turma.localeCompare(b.turma,"pt-BR"));
 atuais.forEach(a=>lista.appendChild(montarCartao(a.professor,[a.turma,a.componente].filter(Boolean).join(" · "))));
}
async function carregar(){
 try{const r=await fetch("/api/horarios",{cache:"no-store"});if(!r.ok)throw new Error();const d=await r.json();configuracaoHorario={...configuracaoHorario,...(d.configuracao||{})};professores=Array.isArray(d.professores)?d.professores:[];aulasGrade=normalizarAulasComHorario(Array.isArray(d.aulas)?d.aulas:[]);horariosAula=montarHorariosAula(Math.max(12,...aulasGrade.map(a=>Number(a.periodo)||0)));renderizar();atualizacao.textContent="Grade atualizada às "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});}
 catch{lista.innerHTML='<p class="vazio">Não foi possível carregar os horários.</p>';atualizacao.textContent="Falha ao atualizar os dados.";}
}
atualizarCabecalho();carregar();
setInterval(()=>{atualizarCabecalho();carregar();},60000);
