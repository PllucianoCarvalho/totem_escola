const pdfForm=document.getElementById("pdfForm");
const pdfInput=document.getElementById("pdfInput");
const statusPdf=document.getElementById("statusPdf");
const linhas=document.getElementById("linhasHorarios");
const statusSalvar=document.getElementById("statusSalvar");
const estadoAtual=document.getElementById("estadoAtual");
if(window.pdfjsLib)pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
let registros=[];

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
pdfForm.addEventListener("submit",async e=>{
  e.preventDefault();const file=pdfInput.files[0];if(!file)return;
  if(!file.name.toLowerCase().endsWith(".pdf")){statusPdf.textContent="Selecione um arquivo PDF.";return;}
  statusPdf.textContent="Lendo o PDF...";
  try{
    const texto=await extrairTexto(file);
    if(!texto.length)throw new Error("Não encontrei texto selecionável. Este PDF pode ser escaneado; será necessário OCR.");
    const linhasUtil=texto.filter(l=>!/(horário|horario|professor|professores|turma|componente curricular)/i.test(l)||l.split(/\s{2,}/).length>2);
    registros=linhasUtil.map(interpretarLinha);
    renderizar();
    const formData=new FormData();formData.append("pdf",file);
    const resposta=await fetch("/api/horarios/pdf",{method:"POST",body:formData});
    const dados=await resposta.json();if(!resposta.ok)throw new Error(dados.erro||"Falha ao guardar o PDF.");
    statusPdf.textContent="PDF lido e armazenado. Revise cuidadosamente os campos antes de publicar.";
  }catch(err){statusPdf.textContent="Não foi possível importar: "+err.message;}
});
document.getElementById("adicionarLinha").addEventListener("click",()=>{registros.push({professor:"",sala:"",turma:"",componente:"",horario:""});renderizar();});
document.getElementById("salvarHorarios").addEventListener("click",async()=>{
  statusSalvar.textContent="Salvando...";
  try{
    const resposta=await fetch("/api/horarios",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({professores:registros})});
    const dados=await resposta.json();if(!resposta.ok)throw new Error(dados.erro||"Falha ao salvar.");
    statusSalvar.textContent="Horários publicados. Registros: "+dados.total+".";
    carregarAtual();
  }catch(err){statusSalvar.textContent="Erro: "+err.message;}
});
async function carregarAtual(){
  try{const r=await fetch("/api/horarios");if(!r.ok)throw new Error();const d=await r.json();registros=d.professores||[];renderizar();estadoAtual.textContent=d.atualizadoEm?"Última publicação: "+new Date(d.atualizadoEm).toLocaleString("pt-BR")+" · "+registros.length+" registros.":"Ainda não há horários publicados.";}
  catch{estadoAtual.textContent="Não foi possível consultar a versão publicada.";}
}
carregarAtual();