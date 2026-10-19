const lista=document.getElementById("lista");
const relogio=document.getElementById("relogio");
const diaSemana=document.getElementById("diaSemana");
const aulaAtual=document.getElementById("aulaAtual");
const quantidade=document.getElementById("quantidade");
const busca=document.getElementById("busca");
const modoProfessor=document.getElementById("modoProfessor");
const modoTurma=document.getElementById("modoTurma");
const atualizacao=document.getElementById("atualizacao");
let professores=[];
let modo="professor";
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
 quantidade.textContent=aula?professores.length+" professor(es) cadastrado(s)":"Grade escolar";
}
function montarCartao(nome,etiqueta){
 const card=document.createElement("article");card.className="cartao";
 const titulo=document.createElement("h2");titulo.className="nome";titulo.textContent=nome||"Professor não informado";
 const tag=document.createElement("span");tag.className="etiqueta";tag.textContent=etiqueta||"Turma/componente não informado";
 card.append(titulo,tag);return card;
}
function renderizar(){
 const termo=busca.value.trim().toLocaleLowerCase("pt-BR");
 lista.innerHTML="";
 let itens=[];
 if(modo==="professor"){
   itens=professores.map(p=>({nome:p.professor,etiqueta:[p.turma,p.componente].filter(Boolean).join(" · "),busca:[p.professor,p.turma,p.componente,p.sala,p.horario].join(" ")}));
 }else{
   const grupos=new Map();
   professores.forEach(p=>{const turma=(p.turma||"Turma não informada").trim();if(!grupos.has(turma))grupos.set(turma,[]);grupos.get(turma).push(p);});
   itens=[...grupos.entries()].map(([turma,ps])=>({nome:turma,etiqueta:ps.map(p=>[p.professor,p.componente].filter(Boolean).join(" · ")).filter(Boolean).join("  |  "),busca:[turma,...ps.flatMap(p=>[p.professor,p.componente])].join(" ")}));
 }
 itens=itens.filter(i=>!termo||i.busca.toLocaleLowerCase("pt-BR").includes(termo));
 if(!itens.length){const p=document.createElement("p");p.className="vazio";p.textContent=professores.length?"Nenhum resultado para essa busca.":"Os horários ainda não foram publicados.";lista.appendChild(p);return;}
 itens.forEach(i=>lista.appendChild(montarCartao(i.nome,i.etiqueta)));
}
async function carregar(){
 try{const r=await fetch("/api/horarios",{cache:"no-store"});if(!r.ok)throw new Error();const d=await r.json();professores=Array.isArray(d.professores)?d.professores:[];renderizar();atualizacao.textContent="Atualizado às "+new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});}
 catch{lista.innerHTML='<p class="vazio">Não foi possível carregar os horários.</p>';atualizacao.textContent="Falha ao atualizar os dados.";}
}
modoProfessor.addEventListener("click",()=>{modo="professor";modoProfessor.classList.add("ativo");modoTurma.classList.remove("ativo");renderizar();});
modoTurma.addEventListener("click",()=>{modo="turma";modoTurma.classList.add("ativo");modoProfessor.classList.remove("ativo");renderizar();});
busca.addEventListener("input",renderizar);
atualizarCabecalho();carregar();
setInterval(()=>{atualizarCabecalho();carregar();},60000);
