(() => {
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = 'spendwise_v1';
  const seedCategories = [
    {id:'food',name:'Food',color:'#d7a45b'},{id:'transport',name:'Transport',color:'#b58b4d'},
    {id:'bills',name:'Bills',color:'#e1c27b'},{id:'shopping',name:'Shopping',color:'#a9824d'},
    {id:'entertainment',name:'Entertainment',color:'#c5a56a'},{id:'other',name:'Other',color:'#a0a3b4'}
  ];
  const today = new Date();
  const dateISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const monthISO = (d) => dateISO(d).slice(0,7);
  const makeDate = (month, day) => `${month}-${String(day).padStart(2,'0')}`;
  const currentMonth = monthISO(today);
  const demo = [
    {id:'demo1',amount:450,category:'food',date:makeDate(currentMonth,2),note:'Groceries and lunch'},
    {id:'demo2',amount:120,category:'transport',date:makeDate(currentMonth,4),note:'Metro and bus'},
    {id:'demo3',amount:1800,category:'bills',date:makeDate(currentMonth,7),note:'Electricity bill'},
    {id:'demo4',amount:680,category:'shopping',date:makeDate(currentMonth,9),note:'Household essentials'},
    {id:'demo5',amount:250,category:'food',date:makeDate(currentMonth,12),note:'Coffee and snacks'}
  ];
  let state = loadState();
  let toastTimer;
  function loadState(){
    try { const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)); if(saved && Array.isArray(saved.expenses) && Array.isArray(saved.categories)) return saved; } catch(e){}
    return {expenses:demo,categories:seedCategories};
  }
  function save(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
  const money = (n) => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(n || 0);
  const category = (id) => state.categories.find(c=>c.id===id) || {id:'other',name:'Other',color:'#a0a3b4'};
  const escapeHTML = (s) => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function notify(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),2400);}
  function showModal(id){$(id).classList.remove('hidden');const first=$(id).querySelector('input:not([type=hidden]),select');if(first)first.focus();}
  function closeModal(id){$(id).classList.add('hidden');}
  function setView(name){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$(name+'View').classList.add('active');document.querySelectorAll('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('pageTitle').textContent={dashboard:'Overview',transactions:'Transactions',history:'Monthly History',categories:'Categories'}[name];if(name==='dashboard')renderDashboard();if(name==='transactions')renderTransactions();if(name==='history')renderHistory();if(name==='categories')renderCategories();}
  function monthExpenses(month){return state.expenses.filter(e=>e.date.startsWith(month));}
  function sum(items){return items.reduce((a,e)=>a+Number(e.amount),0);}
  function monthOffset(month,offset){const [y,m]=month.split('-').map(Number);return monthISO(new Date(y,m-1+offset,1));}
  function renderDashboard(){
    const month=$('dashboardMonth').value||currentMonth, items=monthExpenses(month), prev=monthExpenses(monthOffset(month,-1));
    const total=sum(items), previous=sum(prev), pct=previous?((total-previous)/previous)*100:null;
    $('monthTotal').textContent=money(total);$('monthCount').textContent=items.length;
    const [yy,mm]=month.split('-').map(Number);const days=month===currentMonth?today.getDate():new Date(yy,mm,0).getDate();
    $('dailyAverage').textContent=money(days?total/days:0);
    const change=$('monthChange');change.className='change '+(pct===null?'neutral':pct>0?'positive':pct<0?'negative':'neutral');change.textContent=pct===null?'No previous data':`${pct>0?'+':''}${pct.toFixed(1)}%`;
    $('donutTotal').textContent=money(total);drawDonut(items);drawTrend(month);
    const recent=[...state.expenses].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
    $('recentRows').innerHTML=recent.map(rowHTML).join('');$('recentEmpty').classList.toggle('hidden',recent.length>0);
  }
  function rowHTML(e){const c=category(e.category);return `<tr><td><div class="description-cell"><span class="transaction-symbol" style="background:${c.color}20;color:${c.color}">${iconFor(c.name)}</span>${escapeHTML(e.note||c.name)}</div></td><td><span class="category-tag" style="background:${c.color}18;color:${c.color}"><i style="background:${c.color}"></i>${escapeHTML(c.name)}</span></td><td>${new Date(e.date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td><td class="amount-cell">${money(e.amount)}</td><td class="row-actions"><button class="action-btn" data-edit="${e.id}" aria-label="Edit expense">✎</button><button class="action-btn" data-delete="${e.id}" aria-label="Delete expense">×</button></td></tr>`;}
  function iconFor(name){return ({Food:'◒',Transport:'↗',Bills:'▤',Shopping:'◇',Entertainment:'♫',Other:'✦'})[name]||'✦';}
  function drawDonut(items){
    const canvas=$('donutChart'),ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1,w=240,h=240;canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,w,h);
    const totals=state.categories.map(c=>({c,v:items.filter(e=>e.category===c.id).reduce((a,e)=>a+Number(e.amount),0)})).filter(x=>x.v>0).sort((a,b)=>b.v-a.v);
    const total=totals.reduce((a,x)=>a+x.v,0);let angle=-Math.PI/2;
    if(!total){ctx.beginPath();ctx.arc(120,120,83,0,Math.PI*2);ctx.strokeStyle='#eeeef4';ctx.lineWidth=22;ctx.stroke();}
    else totals.forEach(x=>{const next=angle+x.v/total*Math.PI*2;ctx.beginPath();ctx.arc(120,120,83,angle,next);ctx.strokeStyle=x.c.color;ctx.lineWidth=22;ctx.lineCap='butt';ctx.stroke();angle=next;});
    $('categoryLegend').innerHTML=totals.length?totals.slice(0,6).map(x=>`<div class="legend-item"><i class="legend-dot" style="background:${x.c.color}"></i><span class="legend-name">${escapeHTML(x.c.name)}</span><span class="legend-value">${Math.round(x.v/total*100)}%</span></div>`).join(''):'<span class="legend-item">No spending recorded</span>';
  }
  function drawTrend(month){
    const canvas=$('trendChart'),ctx=canvas.getContext('2d'),h=270,dpr=window.devicePixelRatio||1;
    const recorded=state.expenses.map(e=>e.date.slice(0,7)).filter(Boolean).sort();
    // Show the complete timeline from the first recorded month through the latest recorded month.
    const first=recorded.length?recorded[0]:month;
    const end=recorded.length?recorded[recorded.length-1]:month;
    const months=[];let cursor=first;
    while(cursor<=end && months.length<240){months.push(cursor);cursor=monthOffset(cursor,1);}
    if(!months.length)months.push(month);
    const values=months.map(m=>sum(monthExpenses(m))),max=Math.max(...values,100),left=48,right=16,top=20,bottom=48;
    const slot=58,bw=30,w=Math.max(650,left+right+months.length*slot),chartH=h-top-bottom,chartW=w-left-right;
    canvas.style.width=w+'px';canvas.style.minWidth=w+'px';canvas.width=w*dpr;canvas.height=h*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    ctx.font='11px DM Sans';ctx.textAlign='right';ctx.fillStyle='#a1a2b1';ctx.strokeStyle='#eeeef4';ctx.lineWidth=1;
    for(let i=0;i<=3;i++){const y=top+chartH*i/3;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(w-right,y);ctx.stroke();ctx.fillText(money(max*(1-i/3)),left-8,y+4);}
    values.forEach((v,i)=>{const bh=v/max*chartH,x=left+i*slot+(slot-bw)/2,y=top+chartH-bh;ctx.fillStyle=months[i]===month?'#d8b66d':'#80683d';ctx.beginPath();ctx.roundRect(x,y,bw,Math.max(3,bh),[6,6,2,2]);ctx.fill();ctx.fillStyle='#999bad';ctx.textAlign='center';const dt=new Date(months[i]+'-01T00:00:00');ctx.fillText(dt.toLocaleDateString('en-IN',{month:'short'}),x+bw/2,h-25);ctx.fillText(dt.toLocaleDateString('en-IN',{year:'2-digit'}),x+bw/2,h-11);});
  }

  function renderHistory(){
    const month=$('historyMonth').value||currentMonth;
    const items=[...monthExpenses(month)].sort((a,b)=>b.date.localeCompare(a.date));
    const previous=monthExpenses(monthOffset(month,-1));
    const total=sum(items),prevTotal=sum(previous);
    $('historyTotal').textContent=money(total);
    $('historyCount').textContent=items.length;
    $('historyPrevious').textContent=money(prevTotal);
    $('historyMonthLabel').textContent=new Date(month+'-01T00:00:00').toLocaleDateString('en-IN',{month:'long',year:'numeric'});
    $('historyComparison').textContent=prevTotal?`${total>prevTotal?'+':''}${((total-prevTotal)/prevTotal*100).toFixed(1)}% vs previous month`:'No previous month records';
    $('historyRecordLabel').textContent=`${items.length} ${items.length===1?'record':'records'} for ${$('historyMonthLabel').textContent}`;
    $('historyRows').innerHTML=items.map(rowHTML).join('');
    $('historyEmpty').classList.toggle('hidden',items.length>0);
    const categoryTotals=state.categories.map(c=>({category:c,total:sum(items.filter(e=>e.category===c.id))})).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
    $('historyCategories').innerHTML=categoryTotals.length?categoryTotals.map(x=>`<div class="history-category-item"><div class="history-category-head"><span><i class="legend-dot" style="background:${x.category.color}"></i>${escapeHTML(x.category.name)}</span><strong>${money(x.total)}</strong></div><div class="history-progress"><span style="width:${total?x.total/total*100:0}%;background:${x.category.color}"></span></div></div>`).join(''):'<p class="history-no-data">No category spending recorded for this month.</p>';
  }
  function exportHistoryCSV(){
    const month=$('historyMonth').value||currentMonth;
    const items=monthExpenses(month);
    const rows=[['id','amount','category','date','note'],...items.map(e=>[e.id,e.amount,category(e.category).name,e.date,e.note||''])];
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`expenses-${month}.csv`;a.click();URL.revokeObjectURL(url);notify('Selected month exported successfully.');
  }
  function renderTransactions(){
    const search=$('searchInput').value.toLowerCase(),cat=$('categoryFilter').value,month=$('transactionMonth').value;
    const items=[...state.expenses].filter(e=>(!month||e.date.startsWith(month))&&(cat==='all'||e.category===cat)&&(`${e.note} ${category(e.category).name}`).toLowerCase().includes(search)).sort((a,b)=>b.date.localeCompare(a.date));
    $('transactionRows').innerHTML=items.map(rowHTML).join('');$('transactionEmpty').classList.toggle('hidden',items.length>0);$('tableFooter').textContent=`Showing ${items.length} ${items.length===1?'transaction':'transactions'} · Total ${money(sum(items))}`;
  }
  function populateCategorySelects(){
    $('expenseCategory').innerHTML=state.categories.map(c=>`<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
    $('categoryFilter').innerHTML='<option value="all">All categories</option>'+state.categories.map(c=>`<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('');
  }
  function renderCategories(){
    $('categoryCards').innerHTML=state.categories.map(c=>{const count=state.expenses.filter(e=>e.category===c.id).length;return `<article class="category-card"><div class="category-swatch" style="background:${c.color}20;color:${c.color}">${iconFor(c.name)}</div><div class="category-info"><strong>${escapeHTML(c.name)}</strong><small>${count} ${count===1?'expense':'expenses'}</small></div><div class="category-actions"><button data-category-edit="${c.id}" aria-label="Edit ${escapeHTML(c.name)}">✎</button><button data-category-delete="${c.id}" aria-label="Delete ${escapeHTML(c.name)}">×</button></div></article>`;}).join('');
  }
  function openExpense(id){
    $('expenseForm').reset();$('expenseError').textContent='';$('expenseId').value='';$('expenseModalTitle').textContent='Add expense';const selectedMonth=$('dashboardView').classList.contains('active')?($('dashboardMonth').value||currentMonth):$('historyView').classList.contains('active')?($('historyMonth').value||currentMonth):currentMonth;const selectedDay=selectedMonth===currentMonth?today.getDate():1;$('expenseDate').value=makeDate(selectedMonth,Math.min(selectedDay,new Date(Number(selectedMonth.slice(0,4)),Number(selectedMonth.slice(5,7)),0).getDate()));populateCategorySelects();
    if(id){const e=state.expenses.find(x=>x.id===id);if(!e)return;$('expenseId').value=e.id;$('amount').value=e.amount;$('expenseCategory').value=e.category;$('expenseDate').value=e.date;$('note').value=e.note||'';$('expenseModalTitle').textContent='Edit expense';}
    showModal('expenseModal');
  }
  function editCategory(id){const c=category(id);$('categoryForm').reset();$('categoryError').textContent='';$('categoryId').value=c.id;$('categoryName').value=c.name;$('categoryColor').value=c.color;$('categoryModalTitle').textContent='Edit category';showModal('categoryModal');}
  function exportCSV(){
    const rows=[['id','amount','category','date','note'],...state.expenses.map(e=>[e.id,e.amount,category(e.category).name,e.date,e.note||''])];
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');
    const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='spendora-expenses.csv';a.click();URL.revokeObjectURL(url);notify('CSV file exported successfully.');
  }
  document.querySelectorAll('.nav-link').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
  document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.goto)));
  $('openExpense').addEventListener('click',()=>openExpense());document.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>openExpense()));
  document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
  document.querySelectorAll('.modal-backdrop').forEach(back=>back.addEventListener('click',e=>{if(e.target===back)closeModal(back.id);}));
  $('dashboardMonth').value=currentMonth;$('dashboardMonth').addEventListener('change',renderDashboard);$('historyMonth').value=currentMonth;$('historyMonth').addEventListener('change',renderHistory);
  const shiftMonth=(inputId,delta,render)=>{const input=$(inputId),base=input.value||currentMonth;input.value=monthOffset(base,delta);render();};
  $('dashboardPrev').addEventListener('click',()=>shiftMonth('dashboardMonth',-1,renderDashboard));
  $('dashboardNext').addEventListener('click',()=>shiftMonth('dashboardMonth',1,renderDashboard));
  $('historyPrev').addEventListener('click',()=>shiftMonth('historyMonth',-1,renderHistory));
  $('historyNext').addEventListener('click',()=>shiftMonth('historyMonth',1,renderHistory));
  $('exportHistoryCsv').addEventListener('click',exportHistoryCSV);
  $('searchInput').addEventListener('input',renderTransactions);$('categoryFilter').addEventListener('change',renderTransactions);$('transactionMonth').addEventListener('change',renderTransactions);
  $('clearFilters').addEventListener('click',()=>{$('searchInput').value='';$('categoryFilter').value='all';$('transactionMonth').value='';renderTransactions();});
  $('exportCsv').addEventListener('click',exportCSV);$('addCategory').addEventListener('click',()=>{ $('categoryForm').reset();$('categoryId').value='';$('categoryModalTitle').textContent='New category';$('categoryError').textContent='';showModal('categoryModal');});
  $('expenseForm').addEventListener('submit',e=>{
    e.preventDefault();const amount=Number($('amount').value),cat=$('expenseCategory').value,date=$('expenseDate').value,note=$('note').value.trim(),id=$('expenseId').value;
    if(!Number.isFinite(amount)||amount<=0){$('expenseError').textContent='Enter an amount greater than zero.';return;}
    if(!cat||!state.categories.some(c=>c.id===cat)){$('expenseError').textContent='Please choose a valid category.';return;}
    if(!date){$('expenseError').textContent='Please select a date.';return;}
    if(note.length>120){$('expenseError').textContent='Note must be 120 characters or fewer.';return;}
    const record={id:id||('exp_'+Date.now()),amount,category:cat,date,note};const index=state.expenses.findIndex(x=>x.id===id);if(index>=0)state.expenses[index]=record;else state.expenses.push(record);
    const recordedMonth=date.slice(0,7);$('dashboardMonth').value=recordedMonth;$('historyMonth').value=recordedMonth;
    save();closeModal('expenseModal');refresh();notify(index>=0?'Expense updated.':'Expense added.');
  });
  $('categoryForm').addEventListener('submit',e=>{
    e.preventDefault();const id=$('categoryId').value,name=$('categoryName').value.trim(),color=$('categoryColor').value;
    if(!name){$('categoryError').textContent='Enter a category name.';return;}
    if(state.categories.some(c=>c.name.toLowerCase()===name.toLowerCase()&&c.id!==id)){$('categoryError').textContent='A category with this name already exists.';return;}
    if(id){const c=category(id);c.name=name;c.color=color;}else state.categories.push({id:'cat_'+Date.now(),name,color});
    save();closeModal('categoryModal');refresh();notify(id?'Category updated.':'Category added.');
  });
  document.addEventListener('click',e=>{
    const edit=e.target.closest('[data-edit]');if(edit){openExpense(edit.dataset.edit);return;}
    const del=e.target.closest('[data-delete]');if(del){if(confirm('Delete this expense? This cannot be undone.')){state.expenses=state.expenses.filter(x=>x.id!==del.dataset.delete);save();refresh();notify('Expense deleted.');}return;}
    const ce=e.target.closest('[data-category-edit]');if(ce){editCategory(ce.dataset.categoryEdit);return;}
    const cd=e.target.closest('[data-category-delete]');if(cd){const id=cd.dataset.categoryDelete;if(state.expenses.some(x=>x.category===id)){alert('This category is being used by one or more expenses. Remove or reassign those expenses before deleting it.');return;}if(state.categories.length<=1){alert('Keep at least one category.');return;}if(confirm('Delete this category?')){state.categories=state.categories.filter(c=>c.id!==id);save();refresh();notify('Category deleted.');}}
  });
  function refresh(){populateCategorySelects();renderDashboard();renderTransactions();renderHistory();renderCategories();}
  $('todayLabel').textContent=today.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  populateCategorySelects();refresh();
  window.addEventListener('resize',()=>{if($('dashboardView').classList.contains('active'))renderDashboard();});
})();