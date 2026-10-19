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
let documentosEnviados={matutino:null,vespertino:null,individual:null};

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
function converterGradeTurmas(tipo,resultado){
  const dias={Seg:"Segunda-feira",Ter:"Terça-feira",Qua:"Quarta-feira",Qui:"Quinta-feira",Sex:"Sexta-feira"};
  const intervalos={"07:00":["07:00","07:50"],"07:50":["07:50","08:40"],"08:40":["08:40","09:30"],"09:40":["09:40","10:30"],"10:30":["10:30","11:20"],"11:20":["11:20","12:10"],"12:15":["12:15","13:05"],"13:05":["13:05","13:55"],"13:55":["13:55","14:45"],"14:55":["14:55","15:45"],"15:45":["15:45","16:35"],"16:35":["16:35","17:25"]};
  const saida=[];
  resultado.paginasItens.forEach((grupos,pagina)=>{
    const cabecalhos=[];
    grupos.forEach(g=>g.itens.forEach(item=>{const turma=item.texto.replace(/\s+/g,"").toUpperCase();if(/^(6[A-C]|7[A-C]|8[A-C]|9[A-E]|[123][A-D])$/.test(turma)&&!cabecalhos.some(c=>c.turma===turma))cabecalhos.push({turma,x:item.x});}));
    cabecalhos.sort((a,b)=>a.x-b.x);
    if(!cabecalhos.length)return;
    const linhas=grupos.map(g=>{const itens=g.itens;const timeItem=itens.find(i=>/^\d{2}:\d{2}$/.test(i.texto));const diaItem=itens.find(i=>dias[i.texto]);return {itens,time:timeItem?timeItem.texto:"",dia:diaItem?dias[diaItem.texto]:""};});
    for(let i=0;i<linhas.length;i++){
      if(!linhas[i].dia)continue;
      const dia=linhas[i].dia;let inicio=i-1;
      while(inicio>=0&&linhas[inicio].time&& !linhas[inicio].dia)inicio--;
      inicio=Math.max(i-1,inicio+1);
      let fim=i+1;while(fim<linhas.length&&!linhas[fim].dia)fim++;
      for(let j=inicio;j<fim;j++){
        const row=linhas[j];if(!row.time||!intervalos[row.time])continue;
        const celulas=cabecalhos.map(c=>({turma:c.turma,x:c.x,textos:[]}));
        row.itens.forEach(item=>{
          if(item.texto===row.time||dias[item.texto]||/^(6[A-C]|7[A-C]|8[A-C]|9[A-E]|[123][A-D])$/.test(item.texto)||/^\d{2}:\d{2}$/.test(item.texto))return;
          if(item.x<cabecalhos[0].x-100)return;
          let melhor=celulas[0];for(const cel of celulas){if(Math.abs(item.x-cel.x)<Math.abs(item.x-melhor.x))melhor=cel;}
          melhor.textos.push({x:item.x,texto:item.texto});
        });
        celulas.forEach(c=>{
          const texto=c.textos.sort((x,y)=>x.x-y.x).map(x=>x.texto).join(" ").replace(/\s+/g," ").trim();
          if(!texto||/^[-–—]+$/.test(texto)||/^RC\b/i.test(texto))return;
          const m=texto.match(/^(.+?)\s*\(([^()]+)\)\s*$/);if(!m)return;
          const componente=m[1].trim(),professor=m[2].trim();
          if(!componente||!professor)return;
          saida.push({dia,inicio:intervalos[row.time][0],fim:intervalos[row.time][1],turma:c.turma,componente,professor,turno:tipo==="matutino"?"manhã":"tarde",origem:tipo,pagina:pagina+1});
        });
      }
    }
  });
  const unicos=new Map();saida.forEach(a=>unicos.set([a.dia,a.inicio,a.turma,a.professor,a.componente].join("|"),a));return [...unicos.values()];
}
function mostrarGradeConvertida(aulas){
  previsualizacaoLeitura.innerHTML="";
  const sec=document.createElement("section");const h=document.createElement("h3");h.textContent="Grade extraída dos relatórios de turmas";sec.appendChild(h);
  const resumo=document.createElement("p");resumo.textContent=aulas.length+" aulas com professor, componente e turma identificados.";sec.appendChild(resumo);
  const details=document.createElement("details");details.open=true;const sum=document.createElement("summary");sum.textContent="Conferir grade convertida";details.appendChild(sum);
  const table=document.createElement("table");const thead=document.createElement("thead");thead.innerHTML="<tr><th>Dia</th><th>Horário</th><th>Turma</th><th>Componente</th><th>Professor</th></tr>";table.appendChild(thead);const tbody=document.createElement("tbody");
  aulas.slice(0,300).forEach(a=>{const tr=document.createElement("tr");[a.dia,a.inicio+"–"+a.fim,a.turma,a.componente,a.professor].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});tbody.appendChild(tr);});table.appendChild(tbody);details.appendChild(table);sec.appendChild(details);previsualizacaoLeitura.appendChild(sec);
}
pdfForm.addEventListener("submit",async e=>{
  e.preventDefault();
  const arquivos={matutino:pdfMatutino.files[0],vespertino:pdfVespertino.files[0],individual:pdfIndividual.files[0]};
  if(Object.values(arquivos).some(f=>!f)){statusPdf.textContent="Selecione os três PDFs antes de continuar.";return;}
  const botao=document.getElementById("enviarPdfs");botao.disabled=true;previsualizacaoLeitura.innerHTML="";statusPdf.textContent="Lendo e enviando os três relatórios...";if(estadoConversao)estadoConversao.textContent="Extraindo as células das tabelas e montando a grade.";const resultados={};
  try{
    for(const [tipo,file] of Object.entries(arquivos)){
      statusPdf.textContent="Lendo "+tipo+"...";const leitura=await extrairTextoPdf(file);if(leitura.paginas.join("").trim().length<30)throw new Error("O PDF "+tipo+" não contém texto selecionável suficiente.");resultados[tipo]=leitura;
      const formData=new FormData();formData.append("pdf",file);const resposta=await fetch("/api/horarios/pdf/"+tipo,{method:"POST",body:formData});const dados=await resposta.json();if(!resposta.ok)throw new Error(dados.erro||"Falha ao enviar "+tipo+".");documentosEnviados[tipo]=dados.arquivo;atualizarEstadoDocumentos();
    }
    const aulas=[...converterGradeTurmas("matutino",resultados.matutino),...converterGradeTurmas("vespertino",resultados.vespertino)];
    registros=aulas.map(a=>({professor:a.professor,sala:"",turma:a.turma,componente:a.componente,horario:a.dia+" "+a.inicio+"–"+a.fim,dia:a.dia,inicio:a.inicio,fim:a.fim,turno:a.turno}));
    renderizar();
    if(!aulas.length)throw new Error("Os PDFs foram enviados, mas não consegui reconhecer as células de turma/professor. A grade não foi alterada.");
    mostrarGradeConvertida(aulas);
    if(estadoConversao)estadoConversao.textContent="Conversão concluída: "+aulas.length+" aulas identificadas. A grade foi salva para exibição automática por dia e horário.";
    statusPdf.textContent="Os três PDFs foram enviados. Foram identificadas "+aulas.length+" aulas; salvando a grade para o Totem...";
    const salvar=await fetch("/api/horarios/importar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({aulas})});const salvo=await salvar.json();if(!salvar.ok)throw new Error(salvo.erro||"Não foi possível salvar a grade.");
    const totalDetectado=aulas.length;const total12h15=aulas.filter(a=>a.inicio==="12:15").length;statusPdf.textContent=salvo.total!==totalDetectado?"ATENÇÃO: "+totalDetectado+" identificadas, mas "+salvo.total+" aceitas. Diferença: "+(totalDetectado-salvo.total)+". Aulas iniciadas às 12:15 detectadas: "+total12h15+".":"Concluído: "+salvo.total+" aulas salvas; "+total12h15+" iniciadas às 12:15. Confira se os totais batem com os PDFs.";
    await carregarAtual();
  }catch(err){statusPdf.textContent="Falha na conversão: "+err.message;if(estadoConversao)estadoConversao.textContent="Não foi possível concluir a conversão. Veja a mensagem acima; a grade publicada anterior foi preservada.";}
  finally{botao.disabled=false;}
});
function atualizarEstadoDocumentos(){
  const nomes={matutino:"Matutino",vespertino:"Vespertino",individual:"Individual"};
  estadoDocumentos.innerHTML="";
  Object.entries(nomes).forEach(([tipo,nome])=>{const li=document.createElement("li");li.textContent=nome+": "+(documentosEnviados[tipo]?"enviado ("+documentosEnviados[tipo]+")":"ainda não enviado");estadoDocumentos.appendChild(li);});
}
async function carregarDocumentos(){
  try{const r=await fetch("/api/horarios/documentos");if(!r.ok)return;const d=await r.json();documentosEnviados={matutino:d.matutino,vespertino:d.vespertino,individual:d.individual};atualizarEstadoDocumentos();}
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
