const pdfForm=document.getElementById("pdfForm");
const pdfIndividual=document.getElementById("pdfIndividual");
const estadoDocumentos=document.getElementById("estadoDocumentos");
const previsualizacaoLeitura=document.getElementById("previsualizacaoLeitura");
const estadoConversao=document.getElementById("estadoConversao");
const statusPdf=document.getElementById("statusPdf");
const linhas=document.getElementById("linhasHorarios");
const statusSalvar=document.getElementById("statusSalvar");
const estadoAtual=document.getElementById("estadoAtual");
if(window.pdfjsLib)pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
let registros=[];
let aulasPublicadas=[];
let pdfSelecionado=null;
let documentosEnviados={individual:null};

function renderizar(){
  linhas.innerHTML="";
  if(!registros.length){linhas.innerHTML='<tr><td colspan="6" class="vazio">Nenhum registro. Importe um PDF ou adicione uma linha.</td></tr>';return;}
  registros.forEach((r,i)=>{
    const tr=document.createElement("tr");
    [["professor","Professor"],["sala","Sala"],["turma","Turma"],["componente","Componente"],["horario","Horário"]].forEach(([key,label])=>{
      const td=document.createElement("td"),input=document.createElement("input");
      input.value=r[key]||"";input.placeholder=label;input.setAttribute("aria-label",label);
      input.addEventListener("input",()=>r[key]=input.value);td.appendChild(input);tr.appendChild(td);
    });
    const td=document.createElement("td"),btn=document.createElement("button");
    btn.type="button";btn.className="remover";btn.textContent="Excluir";btn.addEventListener("click",()=>{registros.splice(i,1);renderizar();});
    td.appendChild(btn);tr.appendChild(td);linhas.appendChild(tr);
  });
}

const filtroProfessor=document.getElementById("filtroProfessor");
const filtroTurma=document.getElementById("filtroTurma");
const filtroComponente=document.getElementById("filtroComponente");
const filtroDia=document.getElementById("filtroDia");
const resultadosGrade=document.getElementById("resultadosGrade");
const resultadoFiltros=document.getElementById("resultadoFiltros");
function normalizarFiltro(valor){return String(valor||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").trim();}
function renderizarConsultaGrade(){
  if(!resultadosGrade)return;
  const professor=normalizarFiltro(filtroProfessor.value),turma=normalizarFiltro(filtroTurma.value),componente=normalizarFiltro(filtroComponente.value),dia=filtroDia.value;
  const filtradas=aulasPublicadas.filter(a=>
    normalizarFiltro(a.professor).includes(professor)&&
    normalizarFiltro(a.turma).includes(turma)&&
    normalizarFiltro(a.componente).includes(componente)&&
    (!dia||normalizarFiltro(a.dia)===normalizarFiltro(dia))
  ).sort((a,b)=>String(a.dia||"").localeCompare(String(b.dia||""),"pt-BR")||String(a.inicio||"").localeCompare(String(b.inicio||""))||String(a.turma||"").localeCompare(String(b.turma||""),"pt-BR"));
  resultadosGrade.innerHTML="";
  if(!filtradas.length){
    const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=6;td.className="vazio";td.textContent=aulasPublicadas.length?"Nenhuma aula corresponde aos filtros selecionados.":"Ainda não há grade de aulas publicada.";tr.appendChild(td);resultadosGrade.appendChild(tr);
  }else{
    filtradas.forEach(a=>{
      const tr=document.createElement("tr");
      [a.dia||"—",a.inicio&&a.fim?a.inicio+"–"+a.fim:(a.horario||"—"),a.turma||"—",a.componente||"—",a.professor||"—",a.turno||"—"].forEach(valor=>{const td=document.createElement("td");td.textContent=valor;tr.appendChild(td);});
      resultadosGrade.appendChild(tr);
    });
  }
  resultadoFiltros.textContent=filtradas.length+" de "+aulasPublicadas.length+" aula(s) exibida(s).";
}
function prepararFiltroDias(){
  const ordemDias=["segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado","domingo"];
  const dias=[...new Set(aulasPublicadas.map(a=>a.dia).filter(Boolean))].sort((a,b)=>ordemDias.indexOf(normalizarFiltro(a))-ordemDias.indexOf(normalizarFiltro(b)));
  filtroDia.innerHTML='<option value="">Todos os dias</option>';
  dias.forEach(dia=>{const option=document.createElement("option");option.value=dia;option.textContent=dia;filtroDia.appendChild(option);});
  renderizarConsultaGrade();
}
[filtroProfessor,filtroTurma,filtroComponente].forEach(campo=>campo.addEventListener("input",renderizarConsultaGrade));
filtroDia.addEventListener("change",renderizarConsultaGrade);
document.getElementById("limparFiltros").addEventListener("click",()=>{
  filtroProfessor.value="";filtroTurma.value="";filtroComponente.value="";filtroDia.value="";renderizarConsultaGrade();
});

function interpretarLinha(texto){
  const limpa=texto.replace(/\s+/g," ").trim();
  const turma=(limpa.match(/\b\d+\s*[º°o]?\s*[A-Z]\b/i)||[])[0]||"";
  const sala=(limpa.match(/\b(?:sala|laboratório|lab\.?)[\s:-]*[\w.-]+/i)||[])[0]||"";
  const horario=(limpa.match(/\b(?:[1-6]ª?\s*aula|\d{1,2}:\d{2}\s*[-–aà]\s*\d{1,2}:\d{2})\b/i)||[])[0]||"";
  const partes=limpa.split(/\s{2,}|\t+/).map(p=>p.trim()).filter(Boolean);
  let professor=partes[0]||limpa,componente="";
  if(partes.length>=2)componente=partes.find(p=>p!==professor&&p!==turma&&p!==sala&&p!==horario)||"";
  return {professor,sala,turma,componente,horario,linhaOriginal:limpa};
}
async function extrairTexto(file){
  if(!window.pdfjsLib)throw new Error("A biblioteca de leitura de PDF não carregou. Verifique a conexão e tente novamente.");
  const buffer=await file.arrayBuffer(),pdf=await pdfjsLib.getDocument({data:buffer}).promise;
  const linhasTexto=[];
  for(let p=1;p<=pdf.numPages;p++){
    const pagina=await pdf.getPage(p),conteudo=await pagina.getTextContent();
    let atual="",ultimoY=null;
    for(const item of conteudo.items){
      const y=item.transform?item.transform[5]:null;
      if(ultimoY!==null&&y!==null&&Math.abs(y-ultimoY)>3){if(atual.trim())linhasTexto.push(atual.trim());atual="";}
      atual+=item.str+"  ";ultimoY=y;
    }
    if(atual.trim())linhasTexto.push(atual.trim());
  }
  return linhasTexto.filter(l=>l.replace(/\s/g,"").length>2);
}
async function extrairTextoPdf(file){
  if(!window.pdfjsLib)throw new Error("A biblioteca PDF.js não carregou.");
  const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;
  const paginas=[],paginasItens=[];
  for(let n=1;n<=pdf.numPages;n++){
    const pagina=await pdf.getPage(n),conteudo=await pagina.getTextContent();
    const itens=conteudo.items.filter(i=>i.str&&i.str.trim()).map(i=>({texto:i.str.trim(),x:i.transform?i.transform[4]:0,y:i.transform?i.transform[5]:0}));
    const grupos=[];
    itens.sort((a,b)=>Math.abs(b.y-a.y)>2?b.y-a.y:a.x-b.x).forEach(item=>{
      let grupo=grupos.find(g=>Math.abs(g.y-item.y)<=2);
      if(!grupo){grupo={y:item.y,itens:[]};grupos.push(grupo);}
      grupo.itens.push(item);
    });
    grupos.sort((a,b)=>b.y-a.y);
    grupos.forEach(g=>g.itens.sort((a,b)=>a.x-b.x));
    paginasItens.push(grupos);
    paginas.push(grupos.map(g=>g.itens.map(i=>i.texto).join("  ")).join("\n"));
  }
  return {paginas,paginasItens,total:pdf.numPages};
}
function converterRelatorioIndividual(resultado){
  const dias=["Seg","Ter","Qua","Qui","Sex"];
  const slots=[["07:00","07:50"],["07:50","08:40"],["08:40","09:30"],["09:40","10:30"],["10:30","11:20"],["11:20","12:10"],["12:15","13:05"],["13:05","13:55"],["13:55","14:45"],["14:55","15:45"],["15:45","16:35"],["16:35","17:25"]];
  const aulas=[];
  resultado.paginasItens.forEach((grupos,pagina)=>{
    const linhas=grupos.map(g=>({y:g.y,itens:g.itens.slice().sort((a,b)=>a.x-b.x)}));
    const cabecalhos=[];
    linhas.forEach((linha,idx)=>{
      const hor=linha.itens.filter(i=>/^Hor$/i.test(i.texto));
      hor.forEach(h=>{
        const seguintes=linha.itens.filter(i=>i.x>h.x&&i.x<h.x+190);
        const diasX=dias.map(d=>{const item=seguintes.find(i=>i.texto===d);return item?item.x:null;});
        if(diasX.filter(x=>x!==null).length<4)return;
        const anterior=linhas.slice(Math.max(0,idx-3),idx).flatMap(l=>l.itens).filter(i=>i.x>=h.x-8&&i.x<h.x+190&&!/^(Hor|Seg|Ter|Qua|Qui|Sex)$/i.test(i.texto));
        const nomeItem=anterior.sort((a,b)=>b.y-a.y)[0];
        if(!nomeItem)return;
        cabecalhos.push({nome:nomeItem.texto.trim(),xHor:h.x,diasX, y:linha.y});
      });
    });
    cabecalhos.forEach((c,ci)=>{
      const proximo=cabecalhos[ci+1];const limite=proximo?proximo.xHor:Infinity;
      const linhasTempo=linhas.filter(l=>l.y<c.y).sort((a,b)=>b.y-a.y);
      const candidatos=[];
      linhasTempo.forEach(l=>{
        const dentro=l.itens.filter(i=>i.x>=c.xHor-5&&i.x<limite);
        const hi=dentro.find(i=>/^0?[1-6][º°o]?$/i.test(i.texto));
        if(!hi)return;
        const n=Number(hi.texto.match(/\d+/)[0]);
        const yKey=Math.round(l.y);
        if(!candidatos.some(q=>q.yKey===yKey))candidatos.push({yKey,y:l.y,n,itens:dentro});
      });
      candidatos.sort((a,b)=>b.y-a.y);
      const contagem={};
      candidatos.forEach(row=>{
        const ocorrencia=contagem[row.n]||0;contagem[row.n]=ocorrencia+1;
        const slotIndex=(ocorrencia===0?0:6)+(row.n-1);
        if(slotIndex>=slots.length)return;
        dias.forEach((dia,di)=>{
          const x=c.diasX[di];if(x===null)return;
          const nextX=c.diasX.slice(di+1).find(v=>v!==null);
          const cel=row.itens.filter(i=>i.x>=x-3&&(nextX===undefined||i.x<nextX-3)&&!/^(0?[1-6][º°o]?|Hor|Seg|Ter|Qua|Qui|Sex)$/i.test(i.texto)).map(i=>i.texto).join(" ").replace(/\s+/g," ").trim();
          if(!cel||/^-{2,}$/.test(cel)||/^H\/?A$/i.test(cel)||/^H\/A$/i.test(cel))return;
          const turma=(cel.match(/\b(?:[1-3][A-D]|[6-9][A-E])(?:\s*II)?\b/i)||[])[0];
          if(!turma)return;
          aulas.push({dia:({"Seg":"Segunda-feira","Ter":"Terça-feira","Qua":"Quarta-feira","Qui":"Quinta-feira","Sex":"Sexta-feira"})[dia],inicio:slots[slotIndex][0],fim:slots[slotIndex][1],turma:turma.replace(/\s+/g," ").trim(),componente:"A confirmar",professor:c.nome,turno:slotIndex<6?"manhã":"tarde",origem:"individual",pagina:pagina+1});
        });
      });
    });
  });
  const unicos=new Map();aulas.forEach(a=>unicos.set([a.dia,a.inicio,a.turma,a.professor].join("|"),a));return [...unicos.values()];
}
function mostrarGradeConvertida(aulas){
  previsualizacaoLeitura.innerHTML="";
  const sec=document.createElement("section");const h=document.createElement("h3");h.textContent="Grade extraída do relatório individual";sec.appendChild(h);
  const resumo=document.createElement("p");resumo.textContent=aulas.length+" aulas com professor, componente e turma identificados.";sec.appendChild(resumo);
  const details=document.createElement("details");details.open=true;const sum=document.createElement("summary");sum.textContent="Conferir grade convertida";details.appendChild(sum);
  const table=document.createElement("table");const thead=document.createElement("thead");thead.innerHTML="<tr><th>Dia</th><th>Horário</th><th>Turma</th><th>Componente</th><th>Professor</th></tr>";table.appendChild(thead);const tbody=document.createElement("tbody");
  aulas.slice(0,300).forEach(a=>{const tr=document.createElement("tr");[a.dia,a.inicio+"–"+a.fim,a.turma,a.componente,a.professor].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});tbody.appendChild(tr);});table.appendChild(tbody);details.appendChild(table);sec.appendChild(details);previsualizacaoLeitura.appendChild(sec);
}
pdfForm.addEventListener("submit",async e=>{
  e.preventDefault();
  const arquivo=pdfIndividual.files[0];
  if(!arquivo){statusPdf.textContent="Selecione o relatório individual em PDF.";return;}
  const botao=document.getElementById("enviarPdfs");botao.disabled=true;previsualizacaoLeitura.innerHTML="";statusPdf.textContent="Lendo o relatório individual...";if(estadoConversao)estadoConversao.textContent="Extraindo os horários individuais dos professores.";
  try{
    const leitura=await extrairTextoPdf(arquivo);
    if(leitura.paginas.join("").trim().length<30)throw new Error("O PDF individual não contém texto selecionável suficiente.");
    const formData=new FormData();formData.append("pdf",arquivo);
    const resposta=await fetch("/api/horarios/pdf/individual",{method:"POST",body:formData});
    const dados=await resposta.json();if(!resposta.ok)throw new Error(dados.erro||"Falha ao enviar o relatório individual.");
    documentosEnviados={individual:dados.arquivo};atualizarEstadoDocumentos();
    const aulas=converterRelatorioIndividual(leitura);
    registros=aulas.map(a=>({professor:a.professor,sala:"",turma:a.turma,componente:a.componente,horario:a.dia+" "+a.inicio+"–"+a.fim,dia:a.dia,inicio:a.inicio,fim:a.fim,turno:a.turno}));
    renderizar();
    if(!aulas.length)throw new Error("O relatório foi enviado, mas a leitura automática não identificou aulas com segurança. A grade publicada anterior foi preservada.");
    mostrarGradeConvertida(aulas);
    if(estadoConversao)estadoConversao.textContent="Leitura experimental: "+aulas.length+" aulas identificadas. O relatório individual informa turma e horário, mas não o componente curricular; esses campos precisam ser confirmados na revisão.";
    statusPdf.textContent="Relatório individual enviado. Foram identificadas "+aulas.length+" aulas. O componente curricular não consta neste relatório e está marcado como A confirmar; revise antes de usar a grade.";
    const salvar=await fetch("/api/horarios/importar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({aulas})});const salvo=await salvar.json();if(!salvar.ok)throw new Error(salvo.erro||"Não foi possível salvar a grade.");
    const totalDetectado=aulas.length;const total12h15=aulas.filter(a=>a.inicio==="12:15").length;statusPdf.textContent=salvo.total!==totalDetectado?"ATENÇÃO: "+totalDetectado+" identificadas, mas "+salvo.total+" aceitas. Diferença: "+(totalDetectado-salvo.total)+". Aulas iniciadas às 12:15 detectadas: "+total12h15+".":"Concluído: "+salvo.total+" aulas salvas; "+total12h15+" iniciadas às 12:15. Confira se os totais batem com os PDFs.";
    await carregarAtual();
  }catch(err){statusPdf.textContent="Falha na conversão: "+err.message;if(estadoConversao)estadoConversao.textContent="Não foi possível concluir a conversão. Veja a mensagem acima; a grade publicada anterior foi preservada.";}
  finally{botao.disabled=false;}
});
function atualizarEstadoDocumentos(){
  const nomes={individual:"Relatório individual"};
  estadoDocumentos.innerHTML="";
  Object.entries(nomes).forEach(([tipo,nome])=>{const li=document.createElement("li");li.textContent=nome+": "+(documentosEnviados[tipo]?"enviado ("+documentosEnviados[tipo]+")":"ainda não enviado");estadoDocumentos.appendChild(li);});
}
async function carregarDocumentos(){
  try{const r=await fetch("/api/horarios/documentos");if(!r.ok)return;const d=await r.json();documentosEnviados={individual:d.individual};atualizarEstadoDocumentos();}
  catch{}
}
document.getElementById("adicionarLinha").addEventListener("click",()=>{registros.push({professor:"",sala:"",turma:"",componente:"",horario:""});renderizar();});
document.getElementById("salvarHorarios").addEventListener("click",async()=>{
  statusSalvar.textContent="Salvando...";
  try{
    const resposta=await fetch("/api/horarios",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({professores:registros,pdf:pdfSelecionado})});
    const dados=await resposta.json();if(!resposta.ok)throw new Error(dados.erro||"Falha ao salvar.");
    statusSalvar.textContent="Horários publicados. Registros: "+dados.total+".";
    carregarAtual();
carregarDocumentos();
  }catch(err){statusSalvar.textContent="Erro: "+err.message;}
});
async function carregarAtual(){
  try{const r=await fetch("/api/horarios");if(!r.ok)throw new Error();const d=await r.json();registros=d.professores||[];aulasPublicadas=Array.isArray(d.aulas)?d.aulas:[];renderizar();prepararFiltroDias();estadoAtual.textContent=d.atualizadoEm?"Última publicação: "+new Date(d.atualizadoEm).toLocaleString("pt-BR")+" · "+registros.length+" registros.":"Ainda não há horários publicados.";}
  catch{estadoAtual.textContent="Não foi possível consultar a versão publicada.";}
}
carregarAtual();
const botaoVoltarTopo=document.getElementById("voltarTopo");
if(botaoVoltarTopo)botaoVoltarTopo.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
