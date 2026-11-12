/* EstudiandoAndo · gráficas accesibles y reutilizables, sin librerías externas. */
(function(TA){
 'use strict';
 const {html}=TA;
 const charts=TA.charts={};
 const clamp=n=>Math.max(0,Math.min(100,Number(n)||0));
 /** Historial de demostración + registros nuevos de evaluaciones reales del prototipo. */
 charts.studentHistory=(id)=>{
   const baselines={x:[28,33,39,43],d:[20,27,31,37]};
   const p=TA.state.progress[id];
   if(p){
     const history=(p.history||[]).slice(-4);
     return [...(baselines[id]||[25,33,40,45]).map((score,i)=>({label:`Sem. ${i+1}`,score})),
       ...history.map((point,i)=>({label:point.label||`Actividad ${i+1}`,score:point.score})),
       {label:'Ahora',score:TA.util.avg(p.mastery)||0}].slice(-7);
   }
   const r=TA.data.roster.find(r=>r.id===id);
   const final=r?TA.util.avg(r.mastery)||0:0;
   return [final-20,final-15,final-10,final-5,final].map((score,i)=>({label:i===4?'Ahora':`Sem. ${i+1}`,score:clamp(score)}));
 };
 charts.record=(p,label)=>{
   if(!Array.isArray(p.history))p.history=[];
   p.history.push({label,score:TA.util.avg(p.mastery)||0,at:Date.now()});
   if(p.history.length>15)p.history=p.history.slice(-15);
 };
 charts.line=({points,title='Así cambia el avance',help='Los datos anteriores son de ejemplo.'})=>{
   const items=(points||[]).map(p=>({label:String(p.label),score:clamp(p.score)}));
   if(!items.length)return html`<p>Aún no hay actividades para mostrar.</p>`;
   const W=570,H=238,L=42,R=22,T=27,B=44;
   const X=i=>L+(i*(W-L-R)/Math.max(1,items.length-1));
   const Y=v=>T+(100-v)*(H-T-B)/100;
   const grid=[0,25,50,75,100].map(v=>`<line x1="${L}" y1="${Y(v)}" x2="${W-R}" y2="${Y(v)}" class="trend-guide"/><text x="${L-9}" y="${Y(v)+4}" text-anchor="end" class="trend-axis">${v}</text>`).join('');
   const path=items.map((p,i)=>`${i?'L':'M'} ${X(i).toFixed(2)} ${Y(p.score).toFixed(2)}`).join(' ');
   const dots=items.map((p,i)=>`<circle cx="${X(i)}" cy="${Y(p.score)}" r="6" class="trend-point"/><text x="${X(i)}" y="${Math.max(15,Y(p.score)-12)}" text-anchor="middle" class="trend-value">${p.score}%</text><text x="${X(i)}" y="${H-13}" text-anchor="middle" class="trend-axis">${TA.esc(p.label.length>12?p.label.slice(0,10)+'…':p.label)}</text>`).join('');
   const from=items[0].score,now=items[items.length-1].score,delta=Math.round(now-from);
   const message=delta>0?`Subió ${delta} puntos desde ${items[0].label}.`:delta<0?`Bajó ${Math.abs(delta)} puntos desde ${items[0].label}; conviene repasar.`:'Se mantuvo igual desde el primer registro.';
   const desc=`${title}. ${items.map(p=>`${p.label}: ${p.score} de 100 puntos`).join('; ')}.`;
   return html`<figure class="trend-figure">
     <figcaption class="chart-takeaway"><span class="chart-takeaway__label">Lo más importante</span><strong>Ahora: ${now} de 100</strong><span>${message}</span></figcaption>
     <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${desc}" preserveAspectRatio="xMidYMid meet"><title>${title}</title>
       ${TA.raw(grid)}<path class="trend-path" d="${path}"/>${TA.raw(dots)}</svg>
     <p class="trend-caption"><span class="chart-charthelp">Los puntos muestran el resultado de cada periodo, no una calificación escolar.</span> ${help}</p>
     <details class="chart-details"><summary>Leer todos los resultados</summary>
       <div class="table-wrap" role="region" aria-label="Valores de ${title}" tabindex="0"><table class="table"><thead><tr><th scope="col">Momento</th><th scope="col">Avance (de 100)</th></tr></thead><tbody>
         ${items.map(p=>html`<tr><th scope="row">${p.label}</th><td>${p.score} de 100</td></tr>`)}</tbody></table></div>
     </details></figure>`;
 };
 charts.distribution=(segments,total)=>{
   const items=segments.map(s=>({...s,count:Math.max(0,Number(s.count)||0)}));
   const n=total||items.reduce((a,s)=>a+s.count,0)||1;
   return html`<figure class="dist-figure"><figcaption class="chart-short-intro">Cada fila indica cuántos estudiantes están en esa situación. El número también aparece escrito.</figcaption>
     <ul class="learning-groups">${items.map((s,i)=>html`<li class="learning-group">
       <div class="learning-group__header"><strong>${s.label}</strong><span>${s.count} de ${n} estudiantes</span></div>
       <div class="learning-group__track" aria-hidden="true"><span class="learning-group__fill dist-${s.tone}" style="width:${(s.count/n*100).toFixed(1)}%"></span></div>
     </li>`)}</ul>
   </figure>`;
 };
 charts.compareGroups=(groups,active)=>{
   return html`<figure class="compare-groups"><figcaption class="chart-short-intro">Selecciona un grupo para ver sus resultados. El número representa puntos de 100.</figcaption>
     <ul class="compare-group-list">${groups.map(g=>{
       const score=TA.util.avg(TA.teacher.groupAverage(g.id))||0;
       return html`<li><a href="#/grupo" class="group-graph-link${g.id===active?' is-current':''}" data-action="choose-group" data-id="${g.id}" ${TA.attr(g.id===active,'aria-current="true"')}>
         <span class="group-graph-name">${g.label}</span><span class="group-graph-bar" aria-hidden="true"><span style="width:${score}%"></span></span><strong>${score}/100</strong></a></li>`;
     })}</ul></figure>`;
 };
})(window.TA);
