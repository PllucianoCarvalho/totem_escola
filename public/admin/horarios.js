const form = document.getElementById("relatorioForm");

async function carregarGradeOficial() {
  const botao = document.getElementById("carregarGradeOficial");
  botao.disabled = true;
  statusImportacao.textContent = "Carregando grade oficial...";
  previa.innerHTML = "";
  try {
    if (!window.TOTEM_HORARIOS_OFICIAIS) throw new Error("Os dados da grade oficial não foram carregados. Atualize a página e tente novamente.");
    const fonte = window.TOTEM_HORARIOS_OFICIAIS;
    if (!Array.isArray(fonte.e) || !fonte.e.length) throw new Error("A fonte oficial não contém aulas.");
    const dias = { Seg:"segunda-feira", Ter:"terça-feira", Qua:"quarta-feira", Qui:"quinta-feira", Sex:"sexta-feira", Sáb:"sábado", Sab:"sábado" };
    const aulas = [], excecoes = [], vistos = new Set();
    for (const linha of fonte.e) {
      if (!Array.isArray(linha) || linha.length < 6) { excecoes.push("Registro malformado"); continue; }
      const [siglaTurno, diaCurto, inicio, turma, componente, professor] = linha.map(v => String(v ?? "").trim());
      const dia = dias[diaCurto] || "";
      if (!dia || !/^([01]\d|2[0-3]):[0-5]\d$/.test(inicio) || !turma || !componente || !professor) {
        excecoes.push([siglaTurno,diaCurto,inicio,turma,componente,professor].join(" | ")); continue;
      }
      const fimMin = Number(inicio.slice(0,2))*60 + Number(inicio.slice(3,5)) + 50;
      const fim = String(Math.floor((fimMin%1440)/60)).padStart(2,"0")+":"+String(fimMin%60).padStart(2,"0");
      const turno = siglaTurno === "M" ? "Matutino" : siglaTurno === "V" ? "Vespertino" : siglaTurno === "N" ? "Noturno" : siglaTurno;
      const chave = [dia,inicio,turma,componente,professor,turno].join("|").toLocaleLowerCase("pt-BR");
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      aulas.push({professor,turma,componente,dia,inicio,fim,turno,horario:inicio+"–"+fim,periodo:"",
        origem:"grade-oficial-ProfessorMarcio",valorOriginal:componente+" ("+professor+")"});
    }
    if (!aulas.length) throw new Error("Nenhuma aula completa reconhecida; os horários publicados foram preservados.");
    registros = aulas.map(a=>({...a}));
    renderizar();
    mostrarPrevia({aulas:aulas.map(a=>({...a,periodo:a.horario})),turmas:[...new Set(aulas.map(a=>a.turma))],
      dias:[...new Set(aulas.map(a=>a.dia))],periodos:[...new Set(aulas.map(a=>a.horario))],
      excecoes:excecoes.map(valor=>({dia:"Fonte oficial",periodo:"—",turma:"—",valor}))});
    estadoConversao.textContent="Prévia da grade oficial carregada. Confira os dados e publique apenas quando estiver correto.";
    statusImportacao.textContent="Prévia oficial: "+aulas.length+" aulas completas, "+new Set(aulas.map(a=>a.turma)).size+
      " turmas, "+new Set(aulas.map(a=>a.professor)).size+" professores, "+new Set(aulas.map(a=>a.dia)).size+" dias."+
      (excecoes.length?" Registros incompletos ignorados: "+excecoes.length+".":"");
  } catch (erro) {
    statusImportacao.textContent="Falha ao carregar a grade oficial: "+erro.message;
  } finally { botao.disabled = false; }
}
document.getElementById("carregarGradeOficial").addEventListener("click", carregarGradeOficial);

const arquivoInput = document.getElementById("relatorioGeral");
const statusImportacao = document.getElementById("statusImportacao");
const previa = document.getElementById("previsualizacaoLeitura");
const estadoConversao = document.getElementById("estadoConversao");
const linhas = document.getElementById("linhasHorarios");
const statusSalvar = document.getElementById("statusSalvar");
const estadoAtual = document.getElementById("estadoAtual");
let registros = [];
let aulasPublicadas = [];
let configuracaoHorario = { tipoEscola: "regular", inicioAulas: "07:00", duracaoAula: 50, inicioIntervalo: "09:30", duracaoIntervalo: 20 };

const camposConfiguracao = {
  tipoEscola: document.getElementById("tipoEscola"),
  inicioAulas: document.getElementById("inicioAulas"),
  duracaoAula: document.getElementById("duracaoAula"),
  inicioIntervalo: document.getElementById("inicioIntervalo"),
  duracaoIntervalo: document.getElementById("duracaoIntervalo")
};
const statusConfiguracao = document.getElementById("statusConfiguracao");

function lerCamposConfiguracao() {
  return {
    tipoEscola: camposConfiguracao.tipoEscola.value,
    inicioAulas: camposConfiguracao.inicioAulas.value,
    duracaoAula: Number(camposConfiguracao.duracaoAula.value),
    inicioIntervalo: camposConfiguracao.inicioIntervalo.value,
    duracaoIntervalo: Number(camposConfiguracao.duracaoIntervalo.value)
  };
}
function minutosHorario(valor) {
  const [h, m] = String(valor || "00:00").split(":").map(Number);
  return h * 60 + m;
}
function horaTexto(total) {
  total = ((total % 1440) + 1440) % 1440;
  return String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
}
function horarioDoPeriodo(periodo, config = configuracaoHorario) {
  const alvo = Number(periodo);
  if (!Number.isInteger(alvo) || alvo < 1) return null;
  let atual = minutosHorario(config.inicioAulas), aplicouIntervalo = false;
  const intervalo = minutosHorario(config.inicioIntervalo), duracao = Number(config.duracaoAula) || 50;
  const pausa = Number(config.duracaoIntervalo) || 20;
  let resultado = null;
  for (let n = 1; n <= alvo; n++) {
    if (!aplicouIntervalo && (atual >= intervalo || atual + duracao > intervalo)) {
      atual = intervalo + pausa;
      aplicouIntervalo = true;
    }
    resultado = { inicio: horaTexto(atual), fim: horaTexto(atual + duracao) };
    atual += duracao;
  }
  return resultado;
}
function aplicarHorariosCalculados(aulas, config = configuracaoHorario) {
  return aulas.map(a => {
    const slot = horarioDoPeriodo(a.periodo, config);
    return slot ? { ...a, ...slot, horario: slot.inicio + "–" + slot.fim } : { ...a };
  });
}
function preencherCamposConfiguracao(config) {
  configuracaoHorario = { ...configuracaoHorario, ...(config || {}) };
  Object.entries(camposConfiguracao).forEach(([chave, campo]) => {
    if (campo) campo.value = configuracaoHorario[chave];
  });
}

function norm(v) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim(); }
function renderizar() {
  linhas.innerHTML = "";
  if (!registros.length) { linhas.innerHTML = '<tr><td colspan="5" class="vazio">Nenhum registro. Importe um relatório ou adicione uma linha manualmente.</td></tr>'; return; }
  registros.forEach((r, i) => {
    const tr = document.createElement("tr");
    [["professor","Professor"],["turma","Turma"],["componente","Componente"],["horario","Dia e período"]].forEach(([key,label]) => {
      const td = document.createElement("td"), input = document.createElement("input");
      input.value = r[key] || ""; input.placeholder = label; input.setAttribute("aria-label",label);
      input.addEventListener("input", () => r[key] = input.value); td.appendChild(input); tr.appendChild(td);
    });
    const td = document.createElement("td"), btn = document.createElement("button");
    btn.type = "button"; btn.className = "remover"; btn.textContent = "Excluir";
    btn.addEventListener("click", () => { registros.splice(i,1); renderizar(); });
    td.appendChild(btn); tr.appendChild(td); linhas.appendChild(tr);
  });
}
const filtroProfessor = document.getElementById("filtroProfessor");
const filtroTurma = document.getElementById("filtroTurma");
const filtroComponente = document.getElementById("filtroComponente");
const filtroDia = document.getElementById("filtroDia");
const resultadosGrade = document.getElementById("resultadosGrade");
const resultadoFiltros = document.getElementById("resultadoFiltros");

function renderizarConsulta() {
  const p = norm(filtroProfessor.value), t = norm(filtroTurma.value), c = norm(filtroComponente.value), d = filtroDia.value;
  const items = aulasPublicadas.filter(a => norm(a.professor).includes(p) && norm(a.turma).includes(t) && norm(a.componente).includes(c) && (!d || norm(a.dia) === norm(d)))
    .sort((a,b) => String(a.dia||"").localeCompare(String(b.dia||""),"pt-BR") || Number(a.periodo||0)-Number(b.periodo||0) || String(a.turma||"").localeCompare(String(b.turma||""),"pt-BR"));
  resultadosGrade.innerHTML = "";
  if (!items.length) {
    const tr=document.createElement("tr"), td=document.createElement("td"); td.colSpan=6; td.className="vazio";
    td.textContent=aulasPublicadas.length?"Nenhuma aula corresponde aos filtros selecionados.":"Ainda não há grade de aulas publicada.";
    tr.appendChild(td); resultadosGrade.appendChild(tr);
  } else items.forEach(a => {
    const tr=document.createElement("tr"), horario=a.horario || (a.inicio&&a.fim?a.inicio+"–"+a.fim:a.periodo?a.periodo+"º período":"—");
    [a.dia||"—",horario,a.turma||"—",a.componente||"—",a.professor||"—",a.turno||"A confirmar"].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});
    resultadosGrade.appendChild(tr);
  });
  resultadoFiltros.textContent=items.length+" de "+aulasPublicadas.length+" aula(s) exibida(s).";
}
function prepararDias() {
  const ordem=["segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado","domingo"];
  const dias=[...new Set(aulasPublicadas.map(a=>a.dia).filter(Boolean))].sort((a,b)=>ordem.indexOf(norm(a))-ordem.indexOf(norm(b)));
  filtroDia.innerHTML='<option value="">Todos os dias</option>';
  dias.forEach(d=>{const o=document.createElement("option");o.value=d;o.textContent=d;filtroDia.appendChild(o);});
  renderizarConsulta();
}
[filtroProfessor,filtroTurma,filtroComponente].forEach(x=>x.addEventListener("input",renderizarConsulta));
filtroDia.addEventListener("change",renderizarConsulta);
document.getElementById("limparFiltros").addEventListener("click",()=>{filtroProfessor.value="";filtroTurma.value="";filtroComponente.value="";filtroDia.value="";renderizarConsulta();});

function cellText(cell) { return String(cell?.textContent||"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim(); }
function diaDe(rotulo) { return ({seg:"segunda-feira",ter:"terça-feira",qua:"quarta-feira",qui:"quinta-feira",sex:"sexta-feira"})[String(rotulo).toLowerCase()] || ""; }
function lerAula(valor) {
  const v=String(valor||"").replace(/\u00a0/g," ").replace(/\s+/g," ").trim();
  if (!v || /^[-—]+$/.test(v)) return null;
  const m=v.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (!m || !m[1].trim() || !m[2].trim()) return {erro:v};
  return {componente:m[1].trim(),professor:m[2].trim(),original:v};
}
async function converter(file) {
  const bytes=await file.arrayBuffer();
  const source=new TextDecoder("windows-1252").decode(bytes);
  const doc=new DOMParser().parseFromString(source,"text/html");
  const table=doc.querySelector("table");
  if(!table) throw new Error("Não encontrei uma tabela HTML. Exporte novamente o relatório geral do Urânia+.");
  const rows=[...table.querySelectorAll("tr")];
  if(rows.length<2) throw new Error("A tabela do relatório está vazia.");
  const header=[...rows[0].cells].map(cellText), turmas=header.slice(2).filter(Boolean);
  if(!turmas.length) throw new Error("Não encontrei as turmas no cabeçalho.");
  const aulas=[], excecoes=[], dias=new Set(), periodos=new Set();
  let diaAtual="";
  for(let i=1;i<rows.length;i++){
    const cells=[...rows[i].cells]; if(!cells.length) continue;
    const dia=diaDe(cellText(cells[0])), desloc=dia?1:0;
    if(dia) diaAtual=dia;
    if(!diaAtual) continue;
    const rotulo=cellText(cells[desloc]), match=rotulo.match(/^0*(\d{1,2})\s*[º°o]?$/i);
    if(!match) continue;
    const periodo=Number(match[1]); if(!periodo || periodo>20) continue;
    periodos.add(periodo); dias.add(diaAtual);
    const aulasDaLinha=cells.slice(desloc+1);
    turmas.forEach((turma,j)=>{
      const valor=cellText(aulasDaLinha[j]), aula=lerAula(valor);
      if(!aula) return;
      if(aula.erro){excecoes.push({dia:diaAtual,periodo,turma,valor});return;}
      aulas.push({professor:aula.professor,turma,componente:aula.componente,
        horario:diaAtual+" · "+String(periodo).padStart(2,"0")+"º período",dia:diaAtual,
        inicio:"",fim:"",turno:"A confirmar",periodo:String(periodo),origem:"urania-html",valorOriginal:aula.original});
    });
  }
  if(!aulas.length) throw new Error("Nenhuma célula no padrão DISCIPLINA (PROFESSOR) foi encontrada.");
  return {aulas,turmas,dias:[...dias],periodos:[...periodos].sort((a,b)=>a-b),excecoes};
}
function mostrarPrevia(r) {
  previa.innerHTML="";
  const sec=document.createElement("section"), resumo=document.createElement("p");
  resumo.textContent=r.aulas.length+" aulas identificadas · "+r.turmas.length+" turmas · "+r.dias.length+" dias · "+r.periodos.length+" períodos. Horários de relógio ainda não atribuídos.";
  sec.appendChild(resumo);
  const busca=document.createElement("input");busca.type="search";busca.placeholder="Filtrar por professor, turma, componente ou período";busca.setAttribute("aria-label","Filtrar prévia");
  const details=document.createElement("details");details.open=true;
  const sum=document.createElement("summary");sum.textContent="Conferir aulas identificadas";details.appendChild(sum);
  const table=document.createElement("table"),thead=document.createElement("thead"),tbody=document.createElement("tbody");
  thead.innerHTML="<tr><th>Professor</th><th>Dia</th><th>Período</th><th>Turma</th><th>Componente</th></tr>";table.appendChild(thead);
  function draw(){
    tbody.innerHTML="";const term=norm(busca.value), filtered=r.aulas.filter(a=>norm([a.professor,a.turma,a.componente,a.horario].join(" ")).includes(term));
    filtered.slice(0,1000).forEach(a=>{const tr=document.createElement("tr");[a.professor,a.dia,a.periodo+"º",a.turma,a.componente].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});tbody.appendChild(tr);});
    if(filtered.length>1000){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=5;td.textContent="Exibindo 1.000 de "+filtered.length+" aulas; use o filtro.";tr.appendChild(td);tbody.appendChild(tr);}
  }
  busca.addEventListener("input",draw);draw();table.appendChild(tbody);details.appendChild(table);sec.append(busca,details);
  if(r.excecoes.length){
    const aviso=document.createElement("p");aviso.textContent=r.excecoes.length+" célula(s) não reconhecidas ficaram fora da importação.";sec.appendChild(aviso);
    const d=document.createElement("details"),s=document.createElement("summary"),ul=document.createElement("ul");s.textContent="Ver exceções (até 100)";d.appendChild(s);
    r.excecoes.slice(0,100).forEach(e=>{const li=document.createElement("li");li.textContent=e.dia+", período "+e.periodo+", turma "+e.turma+": "+e.valor;ul.appendChild(li);});d.appendChild(ul);sec.appendChild(d);
  }
  previa.appendChild(sec);
}
form.addEventListener("submit",async e=>{
  e.preventDefault();const file=arquivoInput.files[0];if(!file){statusImportacao.textContent="Selecione o relatório geral.";return;}
  const btn=document.getElementById("importarRelatorio");btn.disabled=true;previa.innerHTML="";statusImportacao.textContent="Lendo relatório...";
  try{
    const r=await converter(file);registros=r.aulas.map(a=>({...a}));renderizar();mostrarPrevia(r);
    estadoConversao.textContent="Leitura concluída. Revise os registros; nada foi publicado automaticamente.";
    statusImportacao.textContent="Pronto: "+r.aulas.length+" aulas em "+r.turmas.length+" turmas."+(r.excecoes.length?" Células para conferir: "+r.excecoes.length+".":"");
  }catch(err){statusImportacao.textContent="Falha na leitura: "+err.message;estadoConversao.textContent="A grade publicada anteriormente foi preservada.";}
  finally{btn.disabled=false;}
});
document.getElementById("adicionarLinha").addEventListener("click",()=>{registros.push({professor:"",turma:"",componente:"",horario:"",dia:"",inicio:"",fim:"",turno:"A confirmar",periodo:""});renderizar();});
document.getElementById("salvarHorarios").addEventListener("click",async()=>{
  statusSalvar.textContent="Salvando...";
  try{
    const ready=aplicarHorariosCalculados(registros.map(r=>({...r,professor:String(r.professor||"").trim(),turma:String(r.turma||"").trim(),componente:String(r.componente||"").trim(),horario:String(r.horario||"").trim(),periodo:String(r.periodo||"").trim()})));
    if(!ready.length) throw new Error("Não há registros para publicar.");
    const missing=ready.filter(r=>!r.professor||!r.turma||!r.componente||!r.dia);
    if(missing.length) throw new Error(missing.length+" registro(s) sem professor, turma, componente ou dia. Corrija antes de publicar.");
    const response=await fetch("/api/horarios",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({professores:ready,aulas:ready})});
    const data=await response.json();if(!response.ok)throw new Error(data.erro||"Falha ao salvar.");
    statusSalvar.textContent="Horários publicados. Aulas: "+(data.totalAulas??data.total)+".";
    await carregarAtual();
  }catch(err){statusSalvar.textContent="Erro: "+err.message;}
});

document.getElementById("salvarConfiguracao").addEventListener("click", async () => {
  statusConfiguracao.textContent = "Salvando configuração...";
  try {
    const config = lerCamposConfiguracao();
    const response = await fetch("/api/horarios/configuracao", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erro || "Não foi possível salvar a configuração.");
    preencherCamposConfiguracao(data.configuracao);
    statusConfiguracao.textContent = "Configuração salva. Os horários serão recalculados para os períodos publicados.";
    await carregarAtual();
  } catch (err) {
    statusConfiguracao.textContent = "Erro: " + err.message;
  }
});

async function carregarAtual(){
  try{
    const response=await fetch("/api/horarios");if(!response.ok)throw new Error();
    const data=await response.json();preencherCamposConfiguracao(data.configuracao);registros=data.professores||[];aulasPublicadas=aplicarHorariosCalculados(Array.isArray(data.aulas)?data.aulas:[], configuracaoHorario);
    renderizar();prepararDias();
    estadoAtual.textContent=data.atualizadoEm?"Última publicação: "+new Date(data.atualizadoEm).toLocaleString("pt-BR")+" · "+aulasPublicadas.length+" aulas.":"Ainda não há horários publicados.";
  }catch{estadoAtual.textContent="Não foi possível consultar a versão publicada.";}
}
carregarAtual();
const topo=document.getElementById("voltarTopo");if(topo)topo.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
