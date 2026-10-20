const pdfForm=document.getElementById("pdfForm");
const pdfMatutino=document.getElementById("pdfMatutino");
const pdfVespertino=document.getElementById("pdfVespertino");
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
  if(!registros.length){linhas.innerHTML='<tr><td colspan="5" class="vazio">Nenhum registro. Importe um PDF ou adicione uma linha.</td></tr>';return;}
  registros.forEach((r,i)=>{
    const tr=document.createElement("tr");
    [["professor","Professor"],["turma","Turma"],["componente","Componente"],["horario","Horário letivo"]].forEach(([key,label])=>{
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
function normalizarNomeProfessor(valor){
  return String(valor||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9 ]/g," ").replace(/\s+/g," ").trim();
}
function extrairProfessores(resultado){
  const professores=[];
  resultado.paginasItens.forEach((grupos,pagina)=>{
    grupos.forEach(g=>{
      const cabecalhos=[];
      g.itens.forEach(i=>{
        if(!/^Hor$/i.test(i.texto))return;
        const dias=g.itens.filter(d=>["Seg","Ter","Qua","Qui","Sex"].includes(d.texto)&&d.x>i.x);
        if(dias.length>=4) cabecalhos.push(i);
      });
      cabecalhos.forEach(cab=>{
        const anteriores=grupos.filter(l=>l.y>cab.y&&l.y-cab.y<=40);
        if(!anteriores.length)return;
        const yNome=Math.min(...anteriores.map(l=>l.y));
        const fragmentos=anteriores.filter(l=>Math.abs(l.y-yNome)<=2).flatMap(l=>l.itens)
          .filter(i=>i.x>=cab.x-45&&i.x<cab.x+210&&!/^(Hor|Seg|Ter|Qua|Qui|Sex|0?[1-6][º°o]?)$/i.test(i.texto))
          .sort((a,b)=>a.x-b.x);
        const nome=fragmentos.map(i=>i.texto).join(" ").replace(/\s+/g," ").trim();
        if(nome&&/[A-Za-zÀ-ÿ]{2}/.test(nome)) professores.push({nome,pagina:pagina+1,x:cab.x,y:cab.y});
      });
    });
  });
  const unicos=new Map();
  professores.forEach(p=>{
    const chave=normalizarNomeProfessor(p.nome);
    if(chave&&!unicos.has(chave))unicos.set(chave,p);
  });
  return [...unicos.values()];
}
function converterRelatorioIndividual(resultado){
  const nomesDias={"Seg":"segunda-feira","Ter":"terça-feira","Qua":"quarta-feira","Qui":"quinta-feira","Sex":"sexta-feira"};
  const horarios={
    manha:[["07:00","07:50"],["07:50","08:40"],["08:40","09:30"],["09:40","10:30"],["10:30","11:20"],["11:20","12:10"]],
    tarde:[["12:15","13:05"],["13:05","13:55"],["13:55","14:45"],["14:55","15:45"],["15:45","16:35"],["16:35","17:25"]]
  };
  const valoresConhecidos=[
    {re:/^(?:[1-9][A-E])(?:\s+II)?$/i,tipo:"TURMA"},
    {re:/^H\/A$/i,tipo:"HORA_ATIVIDADE"},
    {re:/^AETE$/i,tipo:"TREINO"},
    {re:/^ROBO$/i,tipo:"ROBOTICA"},
    {re:/^(?:-+|—+)$/,tipo:"SEM_VINCULO"}
  ];
  const resultadoCelulas=[],blocos=[],professores=extrairProfessores(resultado);
  resultado.paginasItens.forEach((grupos,pagina)=>{
    const cabecalhos=[];
    grupos.forEach(g=>{
      const hors=g.itens.filter(i=>/^Hor$/i.test(i.texto));
      hors.forEach(item=>{
        const dias=g.itens.filter(i=>["Seg","Ter","Qua","Qui","Sex"].includes(i.texto)&&i.x>item.x);
        if(dias.length>=4&&!cabecalhos.some(c=>Math.abs(c.x-item.x)<8&&Math.abs(c.y-g.y)<3))
          cabecalhos.push({x:item.x,y:g.y,dias:dias.map(i=>({dia:nomesDias[i.texto],rotulo:i.texto,x:i.x})).sort((a,b)=>a.x-b.x)});
      });
    });
    cabecalhos.sort((a,b)=>a.x-b.x);
    cabecalhos.forEach((cab,idx)=>{
      const limiteEsq=cab.x-8,limiteDir=cabecalhos[idx+1]?.x-8??Infinity;
      const nomeProfessor=professores.filter(p=>p.pagina===pagina+1&&p.x>=cab.x-8&&p.x<=cab.x+8)
        .sort((a,b)=>Math.abs(a.y-cab.y)-Math.abs(b.y-cab.y))[0]?.nome||"";
      const linhasPeriodos=grupos.filter(g=>g.y<cab.y&&g.y>cab.y-230&&g.itens.some(i=>/^0?[1-6][º°o]?$/.test(i.texto)));
      const periodosOrdenados=[...new Map(linhasPeriodos.map(g=>[Math.round(g.y),g])).values()].sort((a,b)=>b.y-a.y);
      const seis=periodosOrdenados.slice(0,12);
      blocos.push({pagina:pagina+1,bloco:idx+1,professor:nomeProfessor,periodosDetectados:seis.length});
      for(let linhaIndex=0;linhaIndex<12;linhaIndex++){
        const linha=seis[linhaIndex];
        const turno=linhaIndex<6?"manhã":"tarde";
        const periodo=(linhaIndex%6)+1;
        const faixa=horarios[turno][periodo-1];
        const itemPeriodo=linha?.itens.find(i=>/^0?[1-6][º°o]?$/.test(i.texto)&&i.x>=limiteEsq-12&&i.x<limiteDir);
        for(const col of cab.dias){
          const candidatos=linha?linha.itens.filter(i=>i.x>=col.x-34&&i.x<col.x+34&&i!==itemPeriodo):[];
          const textos=candidatos.filter(i=>!/^(0?[1-6][º°o]?)$/.test(i.texto)).sort((a,b)=>a.x-b.x);
          let bruto=textos.map(i=>i.texto).join(" ").replace(/\s+/g," ").trim().toUpperCase();
          if(!bruto)bruto=""; 
          const classificado=valoresConhecidos.find(v=>v.re.test(bruto));
          let tipo=classificado?.tipo|| (bruto?"DESCONHECIDO":"SEM_VINCULO");
          let turma=(tipo==="TURMA"||tipo==="ROBOTICA")?bruto:"";
          const origem=textos[0]?{x:textos[0].x,y:textos[0].y}:null;
          resultadoCelulas.push({
            professor:nomeProfessor||"PROFESSOR_NÃO_RECONHECIDO",turma,tipo,valorOriginal:bruto||"(sem texto)",
            dia:col.dia,periodo,turno,inicio:faixa[0],fim:faixa[1],
            componente:"A confirmar",origem:"individual",pagina:pagina+1,bloco:idx+1,
            x:origem?.x??col.x,y:origem?.y??linha?.y??cab.y
          });
        }
      }
    });
  });
  const nomes=[...new Set(professores.map(p=>normalizarNomeProfessor(p.nome)))].filter(Boolean);
  const esperados=27;
  const auditoria={
    professoresDetectados:nomes.length,
    professores:professores.map(p=>({nome:p.nome,pagina:p.pagina,x:Math.round(p.x),y:Math.round(p.y)})),
    blocos:blocos.length,
    celulasEsperadas:blocos.length*60,
    celulasClassificadas:resultadoCelulas.length,
    contagemPorTipo:resultadoCelulas.reduce((acc,c)=>{acc[c.tipo]=(acc[c.tipo]||0)+1;return acc;},{}),
    desconhecidas:resultadoCelulas.filter(c=>c.tipo==="DESCONHECIDO"),
    periodosFaltantes:blocos.filter(b=>b.periodosDetectados<12),
    tentativas:1,
    metaProfessores:esperados
  };
  return {aulas:resultadoCelulas.filter(c=>["TURMA","ROBOTICA","HORA_ATIVIDADE","TREINO"].includes(c.tipo)),celulas:resultadoCelulas,auditoria};
}
function mostrarGradeConvertida(aulas){
  previsualizacaoLeitura.innerHTML="";
  const sec=document.createElement("section");const h=document.createElement("h3");h.textContent="Grade extraída do relatório individual";sec.appendChild(h);
  const resumo=document.createElement("p");resumo.textContent=aulas.length+" aulas identificadas; o componente curricular precisa ser confirmado.";sec.appendChild(resumo);
  const details=document.createElement("details");details.open=true;const sum=document.createElement("summary");sum.textContent="Conferir grade convertida";details.appendChild(sum);
  const table=document.createElement("table");const thead=document.createElement("thead");thead.innerHTML="<tr><th>Dia</th><th>Horário</th><th>Turma</th><th>Componente</th><th>Professor</th></tr>";table.appendChild(thead);const tbody=document.createElement("tbody");
  aulas.slice(0,300).forEach(a=>{const tr=document.createElement("tr");[a.dia,a.inicio+"–"+a.fim,a.turma,a.componente,a.professor].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});tbody.appendChild(tr);});table.appendChild(tbody);details.appendChild(table);sec.appendChild(details);previsualizacaoLeitura.appendChild(sec);
}
pdfForm.addEventListener("submit",async e=>{
  e.preventDefault();
  const arquivo=pdfIndividual.files[0];
  if(!arquivo){statusPdf.textContent="Selecione o PDF individual dos professores.";return;}
  const botao=document.getElementById("enviarPdfs");botao.disabled=true;previsualizacaoLeitura.innerHTML="";statusPdf.textContent="Lendo o relatório individual...";if(estadoConversao)estadoConversao.textContent="Extraindo professores, dias, turmas e períodos de todas as páginas.";
  try{
    const leitura=await extrairTextoPdf(arquivo);
    if(leitura.total<1||leitura.paginas.join("").trim().length<100)throw new Error("O PDF individual não contém texto selecionável suficiente.");
    const formData=new FormData();formData.append("pdf",arquivo);
    const resposta=await fetch("/api/horarios/pdf/individual",{method:"POST",body:formData});
    const dados=await resposta.json();if(!resposta.ok)throw new Error(dados.erro||"Falha ao enviar o relatório individual.");
    documentosEnviados.individual=dados.arquivo;atualizarEstadoDocumentos();
    const aulas=converterRelatorioIndividual(leitura);
    registros=aulas.map(a=>({professor:a.professor,turma:a.turma,componente:a.componente,horario:a.dia+" "+a.inicio+"–"+a.fim,dia:a.dia,inicio:a.inicio,fim:a.fim,turno:a.turno,origem:a.origem}));
    renderizar();
    if(!aulas.length)throw new Error("O PDF foi lido, mas nenhuma aula foi identificada com segurança. A grade publicada anterior foi preservada.");
    mostrarGradeConvertida(aulas);
    if(estadoConversao)estadoConversao.textContent="Prévia: "+aulas.length+" aulas identificadas no relatório individual. Componentes precisam de confirmação. Nada foi publicado automaticamente.";
    statusPdf.textContent="Prévia pronta: "+aulas.length+" aulas. Confira os registros antes de publicar.";
  }catch(err){statusPdf.textContent="Falha na conversão: "+err.message;if(estadoConversao)estadoConversao.textContent="Não foi possível concluir a conversão. A grade publicada anterior foi preservada.";}
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
document.getElementById("adicionarLinha").addEventListener("click",()=>{registros.push({professor:"",turma:"",componente:"",horario:""});renderizar();});
document.getElementById("salvarHorarios").addEventListener("click",async()=>{
  statusSalvar.textContent="Salvando...";
  try{
    const prepararRegistro=r=>{const m=String(r.horario||"").match(/^(segunda-feira|terça-feira|quarta-feira|quinta-feira|sexta-feira|sábado|domingo)\s+(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})$/i);return {professor:r.professor,turma:r.turma,componente:r.componente,horario:r.horario,dia:m?m[1]:(r.dia||""),inicio:m?m[2]:(r.inicio||""),fim:m?m[3]:(r.fim||""),turno:(m?Number(m[2].slice(0,2)):Number(String(r.inicio||"00").slice(0,2)))<12?"manhã":"tarde",origem:r.origem||""};};
    const registrosProntos=registros.map(prepararRegistro);
    const resposta=await fetch("/api/horarios",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({professores:registrosProntos,aulas:registrosProntos,pdf:pdfSelecionado})});
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
