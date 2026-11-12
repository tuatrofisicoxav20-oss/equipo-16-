/* EstudiandoAndo · laboratorio visual del prototipo anterior, integrado al proyecto modular. */
(function(TA){'use strict';
 const {html,icon,ui}=TA;
 TA.visual={};
 function numline(step){
   const nums=Array.from({length:14},(_,i)=>i-5);
   const x=v=>44+(v+5)*34;
   const walk=step===0?'':step===1?`<path d="M ${x(-3)} 63 L ${x(0)} 63" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"/>`:`<path d="M ${x(-3)} 63 L ${x(2)} 63" stroke="var(--accent)" stroke-width="6" stroke-linecap="round"/>`;
   const msg=['Partimos de −3. Ubica el punto inicial en la recta.','Para sumar 5, avanzamos hacia la derecha.','Llegamos a 2: así visualizamos −3 + 5 = 2.'][step];
   return html`<figure class="math-visual"><svg viewBox="0 0 550 148" role="img" aria-label="Recta numérica de menos cinco a ocho. ${msg}">
     <path d="M32 66H533" stroke="var(--ink-2)" stroke-width="2"/><path d="m526 60 9 6-9 6" fill="none" stroke="var(--ink-2)" stroke-width="2"/>
     ${TA.raw(nums.map(n=>`<g><path d="M${x(n)} 60V73" stroke="var(--ink-2)" stroke-width="2"/><text x="${x(n)}" y="94" fill="var(--ink)" text-anchor="middle" font-size="15">${n}</text></g>`).join(''))}
     ${TA.raw(walk)}<circle cx="${step===2?x(2):x(-3)}" cy="66" r="8" fill="var(--brand)" stroke="var(--surface)" stroke-width="3"/>
     <text x="${x(-3)}" y="28" text-anchor="middle" fill="var(--brand-ink)" font-size="17" font-weight="700">−3</text>
     ${step>0?html`<text x="${x(0)}" y="42" fill="var(--accent-ink)" text-anchor="middle" font-size="16" font-weight="700">+5 →</text>`:''}</svg>
     <figcaption class="math-caption" aria-live="polite">Paso ${step+1} de 3 · ${msg}</figcaption></figure>`;
 }
 function balance(step){
   const equations=['x + 8 = 15','x + 8 − 8 = 15 − 8','x = 7','7 + 8 = 15 ✓'];
   const txt=['Una ecuación es como una balanza: los dos lados deben pesar lo mismo.','Restamos 8 a ambos lados para conservar el equilibrio.','La incógnita queda sola. Comprueba el resultado.','Sustituimos x por 7: la igualdad sigue siendo verdadera.'];
   return html`<figure class="math-visual"><svg viewBox="0 0 440 200" role="img" aria-label="Modelo de balanza, paso ${step+1}: ${txt[step]}">
     <path d="M220 42v115 M170 157h100" stroke="var(--ink-2)" stroke-width="7" stroke-linecap="round"/>
     <path d="M65 73H375 M110 73v35 M330 73v35" stroke="var(--brand)" stroke-width="5" stroke-linecap="round" fill="none"/>
     <path d="M55 110H165L148 140H72Z M275 110H385L367 140H294Z" fill="var(--brand-soft)" stroke="var(--brand)" stroke-width="3"/>
     <text x="110" y="128" fill="var(--brand-ink)" text-anchor="middle" font-size="20" font-weight="700">${step<2?'x + 8':step===2?'x':'7'}</text>
     <text x="330" y="128" fill="var(--brand-ink)" text-anchor="middle" font-size="20" font-weight="700">${step<2?'15':'7'}</text>
     <circle cx="220" cy="73" r="10" fill="var(--accent)"/>
     <text x="220" y="24" fill="var(--ink)" text-anchor="middle" font-size="23" font-weight="700">${equations[step]}</text>
     </svg><figcaption class="math-caption" aria-live="polite">Paso ${step+1} de 4 · ${txt[step]}</figcaption></figure>`;
 }
 TA.visual.view=()=>{
   const step=TA.state.ui.visualStep||0;const bal=TA.state.ui.balanceStep||0;
   return html`${ui.pageHeader({title:'Aprende con dibujos',lead:'Dos dibujos que puedes recorrer paso a paso para entender las matemáticas.',back:{href:'#/aprender',label:'Volver a aprender'}})}
   <div class="note note--accent">${icon('spark',22)}<p><strong>El asistente puede darte pistas.</strong> Explora el dibujo, observa cada cambio y después pregunta al tutor por qué funciona. Estos dibujos funcionan sin internet.</p></div>
   <div class="grid grid--2 visual-layout">
   ${ui.card({title:'1. Operaciones con signos',titleIcon:'chart',body:html`<p>¿Qué significa <strong>−3 + 5</strong>? Muévete sobre la recta numérica, sin saltar directamente al resultado.</p>${numline(step)}<div class="cluster visual-actions"><button class="btn btn--secondary" type="button" data-action="visual-prev" ${TA.attr(!step,'disabled')}>${icon('left',18)}Anterior</button><button class="btn btn--primary" type="button" data-action="visual-next" ${TA.attr(step===2,'disabled')}>Siguiente paso ${icon('right',18)}</button><button class="btn btn--ghost" type="button" data-action="visual-reset">Repetir</button></div>`})}
   ${ui.card({title:'2. Resolver con una balanza',titleIcon:'target',body:html`<p>¿Por qué hacemos la <strong>misma operación a los dos lados</strong> de una ecuación?</p>${balance(bal)}<div class="cluster visual-actions"><button class="btn btn--secondary" type="button" data-action="balance-prev" ${TA.attr(!bal,'disabled')}>${icon('left',18)}Anterior</button><button class="btn btn--primary" type="button" data-action="balance-next" ${TA.attr(bal===3,'disabled')}>Siguiente paso ${icon('right',18)}</button><button class="btn btn--ghost" type="button" data-action="balance-reset">Repetir</button></div>`})}
   </div><div class="note note--accent visual-finish"><div><strong>¿Puedes explicarlo con tus palabras?</strong><p>Si lo comprendes, intenta resolver un problema nuevo sin ayuda. Si aún tienes dudas, el tutor te acompañará con pistas.</p><div class="cluster"><a href="#/tutor" class="btn btn--primary">${icon('chat',18)}Pedir una pista</a><a href="#/comprobar" class="btn btn--secondary">${icon('target',18)}Comprobar sin ayuda</a></div></div></div>`;
 };
 Object.assign(TA.actions,{
   'visual-prev':()=>{TA.state.ui.visualStep=Math.max(0,(TA.state.ui.visualStep||0)-1);TA.render();},
   'visual-next':()=>{TA.state.ui.visualStep=Math.min(2,(TA.state.ui.visualStep||0)+1);TA.render();},
   'visual-reset':()=>{TA.state.ui.visualStep=0;TA.render();},
   'balance-prev':()=>{TA.state.ui.balanceStep=Math.max(0,(TA.state.ui.balanceStep||0)-1);TA.render();},
   'balance-next':()=>{TA.state.ui.balanceStep=Math.min(3,(TA.state.ui.balanceStep||0)+1);TA.render();},
   'balance-reset':()=>{TA.state.ui.balanceStep=0;TA.render();}
 });
})(window.TA);
