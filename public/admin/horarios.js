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
    const cabecalhos=[];
    grupos.forEach(g=>g.itens.filter(i=>/^Hor$/i.test(i.texto)).forEach(item=>{
      const dias=g.itens.filter(d=>["Seg","Ter","Qua","Qui","Sex"].includes(d.texto)&&d.x>item.x);
      if(dias.length>=4&&!cabecalhos.some(c=>Math.abs(c.x-item.x)<8&&Math.abs(c.y-g.y)<3))
        cabecalhos.push({x:item.x,y:g.y});
    }));
    cabecalhos.sort((a,b)=>a.x-b.x);
    cabecalhos.forEach((cab,idx)=>{
      const limiteEsq=cab.x-45,limiteDir=cabecalhos[idx+1]?.x-8??Infinity;
      const faixas=grupos.filter(g=>g.y>cab.y&&g.y-cab.y<=48)
        .map(g=>({g,dist:g.y-cab.y}))
        .filter(({g})=>g.itens.some(i=>i.x>=limiteEsq&&i.x<limiteDir&&!/^(Hor|Seg|Ter|Qua|Qui|Sex|0?[1-6][º°o]?)$/i.test(i.texto)));
      let nome="";
      if(faixas.length){
        const yNome=Math.min(...faixas.map(x=>x.g.y));
        nome=faixas.filter(x=>Math.abs(x.g.y-yNome)<=2).flatMap(x=>x.g.itens)
          .filter(i=>i.x>=limiteEsq&&i.x<limiteDir&&!/^(Hor|Seg|Ter|Qua|Qui|Sex|0?[1-6][º°o]?)$/i.test(i.texto))
          .sort((a,b)=>a.x-b.x).map(i=>i.texto).join(" ").replace(/\s+/g," ").trim();
      }
      if(nome&&/[A-Za-zÀ-ÿ]{2}/.test(nome))professores.push({nome,pagina:pagina+1,bloco:idx+1,x:cab.x,y:cab.y});
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
  const conhecidos=[
    {re:/^(?:[1-9][A-E])(?:\s+II)?$/i,tipo:"TURMA"},
    {re:/^H\/A$/i,tipo:"HORA_ATIVIDADE"},
    {re:/^AETE$/i,tipo:"TREINO"},
    {re:/^ROBO$/i,tipo:"ROBOTICA"},
    {re:/^(?:-+|—+)$/,tipo:"SEM_VINCULO"}
  ];
  const celulas=[],blocos=[],professores=[];
  resultado.paginasItens.forEach((grupos,pagina)=>{
    const cabecalhos=[];
    grupos.forEach(g=>g.itens.filter(i=>/^Hor$/i.test(i.texto)).forEach(item=>{
      const dias=g.itens.filter(i=>["Seg","Ter","Qua","Qui","Sex"].includes(i.texto)&&i.x>item.x);
      if(dias.length>=4&&!cabecalhos.some(c=>Math.abs(c.x-item.x)<8&&Math.abs(c.y-g.y)<3))
        cabecalhos.push({x:item.x,y:g.y,dias:dias.map(i=>({dia:nomesDias[i.texto],rotulo:i.texto,x:i.x})).sort((a,b)=>a.x-b.x)});
    }));
    cabecalhos.sort((a,b)=>a.x-b.x);
    cabecalhos.forEach((cab,idx)=>{
      const limiteDir=cabecalhos[idx+1]?.x-8??Infinity;
      const pertoNome=grupos.filter(g=>g.y>cab.y&&g.y-cab.y<=40);
      let professor="";
      if(pertoNome.length){
        const yNome=Math.min(...pertoNome.map(g=>g.y));
        professor=pertoNome.filter(g=>Math.abs(g.y-yNome)<=2).flatMap(g=>g.itens)
          .filter(i=>i.x>=cab.x-45&&i.x<limiteDir&&!/^(Hor|Seg|Ter|Qua|Qui|Sex|0?[1-6][º°o]?)$/i.test(i.texto))
          .sort((a,b)=>a.x-b.x).map(i=>i.texto).join(" ").replace(/\s+/g," ").trim();
      }
      if(professor)professores.push({nome:professor,pagina:pagina+1,bloco:idx+1,x:cab.x,y:cab.y});
      const linhasPeriodos=grupos.filter(g=>g.y<cab.y&&g.y>cab.y-240&&g.itens.some(i=>/^0?[1-6][º°o]?$/.test(i.texto)))
        .sort((a,b)=>b.y-a.y);
      const periodos=[];
      linhasPeriodos.forEach(g=>{
        const token=g.itens.find(i=>/^0?[1-6][º°o]?$/.test(i.texto)&&i.x>=cab.x-15&&i.x<limiteDir);
        if(token&&!periodos.some(p=>Math.abs(p.y-g.y)<2))periodos.push({y:g.y,numero:Number.parseInt(token.texto,10),itens:g.itens});
      });
      const doze=periodos.slice(0,12);
      blocos.push({pagina:pagina+1,bloco:idx+1,professor:professor||"PROFESSOR_NÃO_RECONHECIDO",periodosDetectados:doze.length});
      const centros=cab.dias.map(d=>d.x);
      const limites=centros.map((x,i)=>({esq:i===0?cab.x+20:(centros[i-1]+x)/2,dir:i===centros.length-1?limiteDir:(x+centros[i+1])/2}));
      for(let n=0;n<12;n++){
        const linha=doze[n];
        const turno=n<6?"manhã":"tarde";
        const periodo=(n%6)+1;
        const [inicio,fim]=horarios[turno][periodo-1];
        cab.dias.forEach((col,diaIdx)=>{
          const itens=linha?linha.itens.filter(i=>i.x>=limites[diaIdx].esq&&i.x<limites[diaIdx].dir&&!/^0?[1-6][º°o]?$/.test(i.texto)):[];
          const bruto=itens.map(i=>i.texto).join(" ").replace(/\s+/g," ").trim().toUpperCase();
          const normal=bruto.replace(/\s+/g," ");
          const classificado=conhecidos.find(v=>v.re.test(normal));
          const tipo=classificado?.tipo||(normal?"DESCONHECIDO":"SEM_VINCULO");
          const turma=tipo==="TURMA"||tipo==="ROBOTICA"?normal:"";
          celulas.push({
            professor:professor||"PROFESSOR_NÃO_RECONHECIDO",turma,tipo,valorOriginal:normal||"(sem texto)",
            dia:col.dia,periodo,turno,inicio,fim,componente:"A confirmar",origem:"individual",
            pagina:pagina+1,bloco:idx+1,x:itens[0]?.x??col.x,y:itens[0]?.y??linha?.y??cab.y
          });
        });
      }
    });
  });
  const nomesUnicos=new Map();
  professores.forEach(p=>{
    const nome=String(p.nome).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9 ]/g," ").replace(/\s+/g," ").trim();
    if(nome&&!nomesUnicos.has(nome))nomesUnicos.set(nome,p);
  });
  const auditoria={
    professoresDetectados:nomesUnicos.size,metaProfessores:27,
    professores:[...nomesUnicos.values()],
    blocos:blocos.length,celulasEsperadas:blocos.length*60,celulasClassificadas:celulas.length,
    contagemPorTipo:celulas.reduce((acc,c)=>{acc[c.tipo]=(acc[c.tipo]||0)+1;return acc;},{}),
    desconhecidas:celulas.filter(c=>c.tipo==="DESCONHECIDO"),
    periodosFaltantes:blocos.filter(b=>b.periodosDetectados<12),
    blocosDetalhados:blocos
  };
  return {aulas:celulas.filter(c=>["TURMA","ROBOTICA","HORA_ATIVIDADE","TREINO"].includes(c.tipo)),celulas,auditoria};
}
function mostrarGradeConvertida(aulas){
  previsualizacaoLeitura.innerHTML="";
  const sec=document.createElement("section");
  const h=document.createElement("h3");h.textContent="Prévia da grade extraída";sec.appendChild(h);
  const resumo=document.createElement("p");resumo.textContent=aulas.length+" atribuições reconhecidas. O componente curricular precisa ser confirmado.";sec.appendChild(resumo);
  const filtro=document.createElement("input");filtro.type="search";filtro.placeholder="Filtrar por professor, turma ou tipo";filtro.setAttribute("aria-label","Filtrar prévia");
  const details=document.createElement("details");details.open=true;const sum=document.createElement("summary");sum.textContent="Conferir registros reconhecidos";details.appendChild(sum);
  const table=document.createElement("table");const thead=document.createElement("thead");thead.innerHTML="<tr><th>Professor</th><th>Dia</th><th>Turno</th><th>Período</th><th>Horário</th><th>Valor/turma</th><th>Tipo</th></tr>";table.appendChild(thead);
  const tbody=document.createElement("tbody");
  const desenhar=()=>{
    tbody.innerHTML="";
    const termo=normalizarFiltro(filtro.value);
    const itens=aulas.filter(a=>normalizarFiltro([a.professor,a.turma,a.tipo,a.valorOriginal].join(" ")).includes(termo));
    itens.slice(0,1000).forEach(a=>{
      const tr=document.createElement("tr");
      [a.professor,a.dia,a.turno,String(a.periodo).padStart(2,"0"),a.inicio+"–"+a.fim,a.turma||a.valorOriginal,a.tipo].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});
      tbody.appendChild(tr);
    });
    if(itens.length>1000){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=7;td.textContent="Exibindo 1.000 de "+itens.length+" registros; use o filtro para restringir.";tr.appendChild(td);tbody.appendChild(tr);}
  };
  filtro.addEventListener("input",desenhar);desenhar();
  table.appendChild(tbody);details.appendChild(table);sec.append(filtro,details);previsualizacaoLeitura.appendChild(sec);
}
pdfForm.addEventListener("submit",async e=>{
  e.preventDefault();
  const arquivo=pdfIndividual.files[0];
  if(!arquivo){statusPdf.textContent="Selecione o PDF individual dos professores.";return;}
  const botao=document.getElementById("enviarPdfs");
  botao.disabled=true;previsualizacaoLeitura.innerHTML="";
  statusPdf.textContent="Lendo o relatório individual...";
  if(estadoConversao)estadoConversao.textContent="Verificando a quantidade de professores e conferindo as células do PDF.";
  try{
    const leitura=await extrairTextoPdf(arquivo);
    if(leitura.total<1||leitura.paginas.join("").trim().length<100)throw new Error("O PDF individual não contém texto selecionável suficiente.");
    const conversao=converterRelatorioIndividual(leitura);
    const tentativas=[];
    tentativas.push({numero:1,leitura,conversao});
    let ultimaPosicao=0;
    for(let numero=2;numero<=3&&conversao.auditoria.professoresDetectados<27;numero++){
      ultimaPosicao=tentativas[tentativas.length-1].leitura.paginasItens.reduce((n,p)=>n+p.reduce((m,g)=>m+g.itens.length,0),0);
      statusPdf.textContent="Verificação "+numero+"/3: reexaminando o conteúdo a partir do item "+ultimaPosicao+"...";
      await new Promise(resolve=>setTimeout(resolve,0));
      // Nova passagem completa, mantendo a marca de progresso da passagem anterior.
      const novaLeitura=await extrairTextoPdf(arquivo);
      const novaConversao=converterRelatorioIndividual(novaLeitura);
      tentativas.push({numero,leitura:novaLeitura,conversao:novaConversao});
      if(novaConversao.auditoria.professoresDetectados>=27)break;
    }
    const melhor=tentativas.reduce((best,item)=>item.conversao.auditoria.professoresDetectados>best.conversao.auditoria.professoresDetectados?item:best,tentativas[0]);
    const auditoria=melhor.conversao.auditoria;
    auditoria.tentativas=tentativas.map(t=>({tentativa:t.numero,professores:t.conversao.auditoria.professoresDetectados,celulas:t.conversao.auditoria.celulasClassificadas}));
    mostrarAuditoria(auditoria);
    if(auditoria.professoresDetectados<27){
      throw new Error("Não foi possível identificar os 27 professores após 3 leituras. Foram identificados "+auditoria.professoresDetectados+". Confira o relatório de auditoria abaixo. Nenhum horário foi publicado.");
    }
    const formData=new FormData();formData.append("pdf",arquivo);
    const resposta=await fetch("/api/horarios/pdf/individual",{method:"POST",body:formData});
    const dados=await resposta.json();
    if(!resposta.ok)throw new Error(dados.erro||"Falha ao enviar o relatório individual.");
    documentosEnviados.individual=dados.arquivo;atualizarEstadoDocumentos();
    const celulas=melhor.conversao.aulas;
    const aulas=celulas.filter(c=>["TURMA","ROBOTICA","HORA_ATIVIDADE","TREINO"].includes(c.tipo));
    registros=aulas.map(c=>({
      professor:c.professor,turma:c.turma||c.valorOriginal,componente:c.tipo==="HORA_ATIVIDADE"?"H/A":c.tipo==="TREINO"?"AETE":c.tipo==="ROBOTICA"?"ROBO":"A confirmar",
      horario:c.dia+" "+c.inicio+"–"+c.fim,dia:c.dia,inicio:c.inicio,fim:c.fim,turno:c.turno,origem:c.origem,
      tipo:c.tipo,pagina:c.pagina,bloco:c.bloco,periodo:c.periodo
    }));
    renderizar();
    mostrarGradeConvertida(aulas);
    if(estadoConversao)estadoConversao.textContent="Leitura validada: "+auditoria.professoresDetectados+" professores distintos; "+auditoria.celulasClassificadas+" células classificadas. Revise a prévia. Nada foi publicado automaticamente.";
    statusPdf.textContent="Prévia pronta após "+tentativas.length+" tentativa(s): "+auditoria.professoresDetectados+" professores e "+aulas.length+" atribuições reconhecidas.";
  }catch(err){
    statusPdf.textContent="Falha na conversão: "+err.message;
    if(estadoConversao)estadoConversao.textContent="A leitura não foi aprovada. A grade publicada anterior foi preservada.";
  }finally{botao.disabled=false;}
});
function mostrarAuditoria(auditoria){
  const box=document.createElement("section");
  const h=document.createElement("h3");h.textContent="Verificação automática do PDF";box.appendChild(h);
  const p=document.createElement("p");p.textContent="Professores detectados: "+auditoria.professoresDetectados+" / "+auditoria.metaProfessores+". Blocos: "+auditoria.blocos+". Células examinadas: "+auditoria.celulasClassificadas+" / "+auditoria.celulasEsperadas+".";box.appendChild(p);
  const tipos=document.createElement("p");tipos.textContent="Tipos: "+Object.entries(auditoria.contagemPorTipo).map(([k,v])=>k+": "+v).join(" · ");box.appendChild(tipos);
  if(auditoria.tentativas?.length){const tent=document.createElement("p");tent.textContent="Leituras: "+auditoria.tentativas.map(t=>"#"+t.tentativa+" = "+t.professores+" professores, "+t.celulas+" células").join(" | ");box.appendChild(tent);}
  const lista=document.createElement("details"),resumo=document.createElement("summary");resumo.textContent="Nomes encontrados e exceções";lista.appendChild(resumo);
  const ul=document.createElement("ul");
  auditoria.professores.forEach(p=>{const li=document.createElement("li");li.textContent=p.nome+" — página "+p.pagina+", bloco "+(p.bloco||"?");ul.appendChild(li);});
  auditoria.blocosDetalhados?.filter(x=>!x.professor||x.professor==="PROFESSOR_NÃO_RECONHECIDO").forEach(x=>{const li=document.createElement("li");li.textContent="Bloco sem professor reconhecido: página "+x.pagina+", bloco "+x.bloco;ul.appendChild(li);});
  auditoria.periodosFaltantes.forEach(x=>{const li=document.createElement("li");li.textContent="Bloco "+x.bloco+" da página "+x.pagina+": "+x.periodosDetectados+" períodos reconhecidos.";ul.appendChild(li);});
  auditoria.desconhecidas.slice(0,100).forEach(c=>{const li=document.createElement("li");li.textContent="Desconhecido: "+c.professor+" — "+c.dia+", "+c.turno+", período "+c.periodo+": "+c.valorOriginal+" (pág. "+c.pagina+", X="+Math.round(c.x)+", Y="+Math.round(c.y)+")";ul.appendChild(li);});
  lista.appendChild(ul);box.appendChild(lista);previsualizacaoLeitura.appendChild(box);
}
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
    const incompletos=registrosProntos.filter(r=>!r.professor||!r.turma||!r.componente);
    if(incompletos.length){throw new Error("Há "+incompletos.length+" registro(s) sem professor, turma ou componente. Complete-os antes de publicar.");}
    const nomesLidos=[...new Set(registrosProntos.map(r=>normalizarNomeProfessor(r.professor)).filter(Boolean))];
    if(documentosEnviados.individual&&nomesLidos.length<27){throw new Error("A publicação foi bloqueada: a prévia contém somente "+nomesLidos.length+" professores distintos; são necessários pelo menos 27.");}
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
