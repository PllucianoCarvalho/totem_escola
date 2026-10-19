const pdfForm=document.getElementById("pdfForm");
const pdfMatutino=document.getElementById("pdfMatutino");
const pdfVespertino=document.getElementById("pdfVespertino");
const pdfIndividual=document.getElementById("pdfIndividual");
const estadoDocumentos=document.getElementById("estadoDocumentos");
const previsualizacaoLeitura=document.getElementById("previsualizacaoLeitura");
const statusPdf=document.getElementById("statusPdf");
const linhas=document.getElementById("linhasHorarios");
const statusSalvar=document.getElementById("statusSalvar");
const estadoAtual=document.getElementById("estadoAtual");
if(window.pdfjsLib)pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
let registros=[];
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
function converterCandidatos(tipo,resultado){
  const dias={Seg:"Segunda-feira",Ter:"Terça-feira",Qua:"Quarta-feira",Qui:"Quinta-feira",Sex:"Sexta-feira"};
  const horarios=["07:00","07:50","08:40","09:40","10:30","11:20","12:15","13:05","13:55","14:55","15:45","16:35"];
  const saida=[];
  resultado.paginasItens.forEach((grupos,pagina)=>{
    let dia="";
    grupos.forEach(g=>{
      const linha=g.itens.map(i=>i.texto).join(" ");
      const md=linha.match(/\b(Seg|Ter|Qua|Qui|Sex)\b/i);
      if(md){const k=md[1].charAt(0).toUpperCase()+md[1].slice(1).toLowerCase();dia=dias[k]||dia;}
      const mh=linha.match(/\b(\d{2}:\d{2})\b/);
      if(!mh||!dia||!horarios.includes(mh[1]))return;
      const texto=linha.replace(mh[1]," ");
      const pares=[...texto.matchAll(/([^()\n]{2,70}?)\s*\(([^()\n]{2,45})\)/g)];
      pares.forEach(p=>{
        const componente=p[1].replace(/^(Seg|Ter|Qua|Qui|Sex)\s*/i,"").trim();
        const professor=p[2].trim();
        if(!componente||!professor||/horário escolar gerado|página:/i.test(componente))return;
        saida.push({dia,horario:mh[1],turma:"",componente,professor,origem:tipo,pagina:pagina+1,conferir:true});
      });
    });
  });
  return saida;
}
function mostrarLeitura(tipo,resultado){
  const sec=document.createElement("section");sec.className="resultado-leitura";
  const titulo=document.createElement("h3");titulo.textContent=({matutino:"Matutino",vespertino:"Vespertino",individual:"Individual dos professores"})[tipo]+" — "+resultado.total+" páginas";sec.appendChild(titulo);
  const candidatos=converterCandidatos(tipo,resultado);
  const aviso=document.createElement("p");aviso.textContent="Pré-conversão experimental: "+candidatos.length+" pares componente/professor identificados. Turma/coluna ainda não é inferida automaticamente; revise antes de usar.";sec.appendChild(aviso);
  const amostra=document.createElement("details");const amostraTitulo=document.createElement("summary");amostraTitulo.textContent="Ver amostra dos candidatos extraídos";amostra.appendChild(amostraTitulo);
  const tabela=document.createElement("table");const thead=document.createElement("thead");thead.innerHTML="<tr><th>Dia</th><th>Horário</th><th>Componente</th><th>Professor</th><th>Página</th></tr>";tabela.appendChild(thead);
  const tbody=document.createElement("tbody");
  candidatos.slice(0,100).forEach(c=>{const tr=document.createElement("tr");[c.dia,c.horario,c.componente,c.professor,String(c.pagina)].forEach(v=>{const td=document.createElement("td");td.textContent=v;tr.appendChild(td);});tbody.appendChild(tr);});
  tabela.appendChild(tbody);amostra.appendChild(tabela);sec.appendChild(amostra);
  const detalhes=document.createElement("details");const resumo=document.createElement("summary");resumo.textContent="Ver texto extraído do PDF";detalhes.appendChild(resumo);
  resultado.paginas.forEach((texto,i)=>{const h=document.createElement("h4");h.textContent="Página "+(i+1);detalhes.appendChild(h);const pre=document.createElement("pre");pre.textContent=texto||"[Nenhum texto selecionável nesta página]";pre.style.whiteSpace="pre-wrap";pre.style.overflowWrap="anywhere";detalhes.appendChild(pre);});
  sec.appendChild(detalhes);previsualizacaoLeitura.appendChild(sec);
}
pdfForm.addEventListener("submit",async e=>{
  e.preventDefault();
  const arquivos={matutino:pdfMatutino.files[0],vespertino:pdfVespertino.files[0],individual:pdfIndividual.files[0]};
  const faltantes=Object.entries(arquivos).filter(([tipo,file])=>!file).map(([tipo])=>tipo);
  if(faltantes.length){statusPdf.textContent="Selecione os três arquivos: Matutino, Vespertino e Individual.";return;}
  for(const [tipo,file] of Object.entries(arquivos)){if(!file.name.toLowerCase().endsWith(".pdf")){statusPdf.textContent="O arquivo "+tipo+" não parece ser um PDF.";return;}}
  const botao=document.getElementById("enviarPdfs");botao.disabled=true;previsualizacaoLeitura.innerHTML="";statusPdf.textContent="Lendo e enviando os relatórios...";
  try{
    for(const [tipo,file] of Object.entries(arquivos)){
      statusPdf.textContent="Lendo "+tipo+"...";
      const leitura=await extrairTextoPdf(file);
      const totalCaracteres=leitura.paginas.join("").trim().length;
      if(totalCaracteres<30)throw new Error("O PDF "+tipo+" não contém texto selecionável suficiente. Pode ser necessário OCR.");
      mostrarLeitura(tipo,leitura);
      statusPdf.textContent="Enviando "+tipo+"...";
      const formData=new FormData();formData.append("pdf",file);
      const resposta=await fetch("/api/horarios/pdf/"+tipo,{method:"POST",body:formData});
      const dados=await resposta.json();if(!resposta.ok)throw new Error(dados.erro||"Falha ao enviar "+tipo+".");
      documentosEnviados[tipo]=dados.arquivo;atualizarEstadoDocumentos();
    }
    statusPdf.textContent="Leitura concluída. A pré-conversão experimental identificou pares de componente/professor para conferência; as turmas ainda não foram associadas com segurança e nada foi publicado.";
  }catch(err){statusPdf.textContent="Falha na leitura/envio: "+err.message;}
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
  try{const r=await fetch("/api/horarios");if(!r.ok)throw new Error();const d=await r.json();registros=d.professores||[];renderizar();estadoAtual.textContent=d.atualizadoEm?"Última publicação: "+new Date(d.atualizadoEm).toLocaleString("pt-BR")+" · "+registros.length+" registros.":"Ainda não há horários publicados.";}
  catch{estadoAtual.textContent="Não foi possível consultar a versão publicada.";}
}
carregarAtual();