
const D=window.STUDY_DATA,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let view="notes",chapter=D.chapters[0]?.id||"1",cardIndex=0,flipped=false;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const inline=s=>esc(s).replace(/\b(git|docker|terraform|pwd|cd|SSH|RDP|STDIN|STDOUT|STDERR|CMD|ENTRYPOINT|VPC|IAM|S3|EBS|EFS|EC2|PATH)\b/g,"<code>$1</code>");
function blockHTML(b){
 if(b.type==="paragraph")return `<p>${inline(b.text)}</p>`;
 if(b.type==="bullet")return `<ul><li>${inline(b.text)}</li></ul>`;
 if(b.type==="number")return `<ol><li>${inline(b.text.replace(/^\d+\.\s*/,""))}</li></ol>`;
 if(b.type==="code" || b.type==="codeblock"){
   const lang=esc(b.language||"Code");
   return `<div class="codeBlock"><div class="codeTop"><span>${lang}</span><button class="copyCode" type="button">Copy</button></div><pre><code>${esc(b.text)}</code></pre></div>`;
 }
 if(b.type==="howto")return `<div class="howto"><b>${inline(b.text)}</b></div>`;
 if(b.type==="exam_answer")return `<div class="examAnswer">${inline(b.text)}</div>`;
 if(b.type==="callout"){
   const body=(b.body||[]).map(blockHTML).join("");
   return `<div class="callout"><h3>${esc(b.title)}</h3>${body}</div>`;
 }
 if(b.type==="table"){
   const rows=b.rows||[]; if(!rows.length)return "";
   if(rows.length===1 && rows[0].length===1){
     const parts=rows[0][0].split("\n");
     return `<div class="callout"><h3>${esc(parts.shift()||"Note")}</h3><p>${inline(parts.join(" "))}</p></div>`;
   }
   return `<div class="tableWrap"><table><thead><tr>${rows[0].map(x=>`<th>${inline(x)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map(r=>`<tr>${r.map(x=>`<td>${inline(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
 }
 return "";
}
function mergeLists(html){return html.replace(/<\/ul>\s*<ul>/g,"").replace(/<\/ol>\s*<ol>/g,"");}
function renderChapters(){
 $("#chapters").innerHTML=D.chapters.map((c,i)=>`<button class="chapter ${c.id===chapter?"active":""}" data-id="${c.id}"><small>${String(i+1).padStart(2,"0")}</small>${esc(c.title)}</button>`).join("");
 $$(".chapter").forEach(b=>b.onclick=()=>{chapter=b.dataset.id;view="notes";setNav();render();});
}
function setNav(){$$(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===view))}
function renderNotes(){
 const c=D.chapters.find(x=>x.id===chapter)||D.chapters[0];
 $("#content").innerHTML=`<div class="hero"><div class="eyebrow">${D.course} · Chapter ${c.id}</div><h1>${esc(c.full_title||c.title)}</h1><p class="lead">${esc(c.lead||"Structured directly from the complete review handbook.")}</p></div>`+
 c.sections.map((s,i)=>{const id=slug(s.title)+"-"+c.id+"-"+i,done=localStorage.getItem("done:"+id)==="1";return `<section id="${id}" class="section"><div class="sectionHead"><h2>${esc(s.title)}</h2><button class="doneBtn ${done?"done":""}" data-id="${id}">${done?"✓ Completed":"Mark complete"}</button></div><div class="card">${mergeLists(s.blocks.map(blockHTML).join(""))}</div></section>`}).join("");
 $$(".doneBtn").forEach(b=>b.onclick=()=>{const k="done:"+b.dataset.id,v=localStorage.getItem(k)==="1";localStorage.setItem(k,v?"0":"1");renderNotes();progress();});
 bindCopyButtons();
 $("#toc").innerHTML=c.sections.map((s,i)=>`<button class="tocBtn" data-go="${slug(s.title)+"-"+c.id+"-"+i}">${esc(s.title)}</button>`).join("");
 $$(".tocBtn").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.go)?.scrollIntoView());
}
function renderQuiz(){
 const items=D.qa.length?D.qa:D.flashcards.slice(0,30).map((x,i)=>({n:i+1,q:x.front,a:x.back}));
 $("#content").innerHTML=`<div class="hero"><div class="eyebrow">Active Recall</div><h1>Practice Quiz</h1><p class="lead">Instructor-style questions with answers hidden until you reveal them.</p></div><div class="controls"><button id="shuffle" class="primary">Shuffle</button><button id="hide" class="secondary">Hide all answers</button></div><div id="quiz" class="quizGrid">${quizHTML(items)}</div>`;
 bindQuiz(items);$("#toc").innerHTML="";
}
function quizHTML(items){return items.map(q=>`<article class="quizCard"><div class="eyebrow">Question ${q.n}</div><h3>${esc(q.q)}</h3><button class="answerBtn">Show answer</button><div class="answer"><b>Answer:</b> ${inline(q.a)}</div></article>`).join("")}
function bindQuiz(items){$$(".answerBtn").forEach(b=>b.onclick=()=>{const a=b.nextElementSibling;a.classList.toggle("show");b.textContent=a.classList.contains("show")?"Hide answer":"Show answer"});$("#shuffle").onclick=()=>{items.sort(()=>Math.random()-.5);$("#quiz").innerHTML=quizHTML(items);bindQuiz(items)};$("#hide").onclick=()=>{$$(".answer").forEach(a=>a.classList.remove("show"));$$(".answerBtn").forEach(b=>b.textContent="Show answer")}}
function renderFlash(){
 const cards=D.flashcards,c=cards[cardIndex%cards.length];
 $("#content").innerHTML=`<div class="hero"><div class="eyebrow">Memorize Fast</div><h1>Flashcards</h1><p class="lead">Click the card to flip it.</p></div><div class="flashStage"><div id="flash" class="flashCard"><span class="label">${esc(c.chapter)}</span><div class="main">${inline(flipped?c.back:c.front)}</div><span class="hint">${flipped?"Answer":"Question"} · click to flip</span></div></div><div class="controls"><button id="prev" class="secondary">← Previous</button><button id="random" class="primary">Random</button><button id="next" class="secondary">Next →</button><span>${cardIndex+1} / ${cards.length}</span></div>`;
 $("#flash").onclick=()=>{flipped=!flipped;renderFlash()};$("#prev").onclick=()=>{cardIndex=(cardIndex-1+cards.length)%cards.length;flipped=false;renderFlash()};$("#next").onclick=()=>{cardIndex=(cardIndex+1)%cards.length;flipped=false;renderFlash()};$("#random").onclick=()=>{cardIndex=Math.floor(Math.random()*cards.length);flipped=false;renderFlash()};$("#toc").innerHTML="";
}
function renderTraps(){
 $("#content").innerHTML=`<div class="hero"><div class="eyebrow">High-Yield Warnings</div><h1>Professor Says</h1><p class="lead">Every common exam trap gathered into one clean rapid-review page.</p></div>`+D.traps.map(t=>`<div class="trapCard"><b>${esc(t.chapter)}</b><p>${inline(t.text)}</p></div>`).join("");
 $("#toc").innerHTML="";
}
function renderResources(){
 $("#content").innerHTML=`<div class="hero"><div class="eyebrow">Downloads & Publishing</div><h1>Resources</h1><p class="lead">Use the original handbook or publish this site directly with GitHub Pages.</p></div><div class="resourceGrid"><div class="resource"><h3>Original DOCX</h3><p>The source document used to preserve the real tables, headings, code blocks, and organization.</p><a href="resources/CIS4930-Review-Handbook.docx">Download DOCX</a></div><div class="resource"><h3>GitHub Pages</h3><p>Upload every file in this folder to your repository root, then select main / root in Settings → Pages.</p></div><div class="resource"><h3>Offline Use</h3><p>Open index.html locally. No server, build process, or API key is required.</p></div></div>`;$("#toc").innerHTML="";
}
function renderSearch(q){
 const query=q.toLowerCase().trim(),hits=[];
 D.chapters.forEach(c=>c.sections.forEach(s=>{const text=JSON.stringify(s.blocks);if((s.title+" "+text).toLowerCase().includes(query))hits.push({c,s})}));
 $("#content").innerHTML=`<div class="hero"><div class="eyebrow">Search</div><h1>Results for “${esc(q)}”</h1><p class="lead">${hits.length} matching sections.</p></div>`+(hits.length?hits.map(({c,s})=>`<section class="section"><div class="sectionHead"><h2>${esc(s.title)}</h2></div><div class="card"><div class="eyebrow">${esc(c.title)}</div>${mergeLists(s.blocks.map(blockHTML).join(""))}</div></section>`).join(""):`<div class="empty">No exact match. Try fewer words or a command name.</div>`);$("#toc").innerHTML="";
}
function bindCopyButtons(){
 $$(".copyCode").forEach(btn=>btn.onclick=async()=>{
   const text=btn.closest(".codeBlock").querySelector("code").innerText;
   try{await navigator.clipboard.writeText(text);btn.textContent="Copied";setTimeout(()=>btn.textContent="Copy",1200)}
   catch{btn.textContent="Select text"}
 });
}
function progress(){let all=0,done=0;D.chapters.forEach(c=>c.sections.forEach((s,i)=>{all++;if(localStorage.getItem("done:"+slug(s.title)+"-"+c.id+"-"+i)==="1")done++}));const p=all?Math.round(done/all*100):0;$("#progressLabel").textContent=p+"% studied";$("#progressBar").style.width=p+"%"}
function render(){renderChapters();if(view==="notes")renderNotes();if(view==="quiz")renderQuiz();if(view==="flashcards")renderFlash();if(view==="traps")renderTraps();if(view==="resources")renderResources();progress();window.scrollTo({top:0,behavior:"smooth"})}
$$(".nav").forEach(b=>b.onclick=()=>{view=b.dataset.view;setNav();render()});$("#search").addEventListener("keydown",e=>{if(e.key==="Enter")renderSearch(e.target.value)});$("#search").addEventListener("search",e=>{if(!e.target.value)render()});$("#theme").onclick=()=>{document.documentElement.classList.toggle("light");localStorage.setItem("theme",document.documentElement.classList.contains("light")?"light":"dark")};if(localStorage.getItem("theme")==="light")document.documentElement.classList.add("light");render();
