'use client';
import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import {client} from '@/lib/supabase/browser';
import './atendimento.css';

type Ticket={id:string;subject:string;status:string;priority:string;notes:string|null;contact_id:string|null;created_at:string};
type Contact={id:string;name:string};
type Filter='all'|'open'|'pending'|'resolved';
const statusLabels:Record<string,string>={open:'Em andamento',pending:'Aguardando',resolved:'Resolvido'};
const priorityLabels:Record<string,string>={low:'Baixa',normal:'Normal',high:'Alta'};
function initials(name:string){return name.trim().split(/\s+/).slice(0,2).map(s=>s[0]?.toUpperCase()||'').join('')||'?'}
function when(value:string){return new Date(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}
export default function Atendimento({userId}:{userId:string}){
 const [org,setOrg]=useState('');const [tickets,setTickets]=useState<Ticket[]>([]);const [contacts,setContacts]=useState<Contact[]>([]);
 const [query,setQuery]=useState('');const [filter,setFilter]=useState<Filter>('all');const [selected,setSelected]=useState('');
 const [modal,setModal]=useState(false);const [subject,setSubject]=useState('');const [contact,setContact]=useState('');
 const [priority,setPriority]=useState('normal');const [notes,setNotes]=useState('');const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);const [loading,setLoading]=useState(true);const [mobileView,setMobileView]=useState<'list'|'detail'|'context'>('list');
 const [contextOpen,setContextOpen]=useState(true);
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   const db=client();const {data:members,error:memberError}=await db.from('organization_members').select('organization_id').eq('user_id',userId).limit(1);
   if(memberError)throw memberError;
   const id=members?.[0]?.organization_id||'';setOrg(id);
   if(!id){setTickets([]);setContacts([]);setError('Nenhuma organização vinculada ao usuário.');return}
   const [a,b]=await Promise.all([
    db.from('service_tickets').select('id,subject,status,priority,notes,contact_id,created_at').eq('organization_id',id).order('created_at',{ascending:false}),
    db.from('contacts').select('id,name').eq('organization_id',id)
   ]);
   if(a.error)throw a.error;if(b.error)throw b.error;
   setTickets(a.data||[]);setContacts(b.data||[]);
  }catch(e){setError(e instanceof Error?e.message:'Falha ao carregar atendimentos.')}
  finally{setLoading(false)}
 },[userId]);
 useEffect(()=>{void load()},[load]);
 const contactMap=useMemo(()=>new Map(contacts.map(c=>[c.id,c])),[contacts]);
 const filtered=useMemo(()=>tickets.filter(t=>{
  if(filter!=='all'&&t.status!==filter)return false;
  const name=t.contact_id?contactMap.get(t.contact_id)?.name||'':'';
  return (t.subject+' '+name+' '+(t.notes||'')).toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR'));
 }),[tickets,filter,query,contactMap]);
 const current=filtered.find(t=>t.id===selected)||filtered[0];
 const currentContact=current?.contact_id?contactMap.get(current.contact_id):undefined;
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!org||busy)return;
  setBusy(true);setError('');
  const {error:failure}=await client().from('service_tickets').insert({organization_id:org,subject:subject.trim(),contact_id:contact||null,priority,notes:notes.trim()||null});
  if(failure)setError(failure.message);
  else{setModal(false);setSubject('');setContact('');setPriority('normal');setNotes('');setFilter('all');setQuery('');await load()}
  setBusy(false);
 }
 async function change(ticket:Ticket,status:string){
  if(busy)return;setBusy(true);setError('');
  const {error:failure}=await client().from('service_tickets').update({status,resolved_at:status==='resolved'?new Date().toISOString():null}).eq('id',ticket.id).eq('organization_id',org);
  if(failure)setError(failure.message);else await load();
  setBusy(false);
 }
 const counts={all:tickets.length,open:tickets.filter(t=>t.status==='open').length,pending:tickets.filter(t=>t.status==='pending').length,resolved:tickets.filter(t=>t.status==='resolved').length};
 return <div className="ca-real">
  <div className="ca-real-heading"><div><div className="ca-real-eyebrow">WORKSPACE / OPERAÇÃO</div><h1>Atendimento</h1><p>Gerencie seus atendimentos e acompanhe cada solicitação em um só lugar.</p></div><button className="ca-real-primary" onClick={()=>setModal(true)} disabled={!org||loading}>+ Novo atendimento</button></div>
  {error&&<div role="alert" className="ca-real-error">{error}<button onClick={()=>void load()}>Tentar novamente</button></div>}
  <div className="ca-real-summary"><span><b>{counts.all}</b> Total</span><span><i className="ca-real-dot green"/><b>{counts.open}</b> Em andamento</span><span><i className="ca-real-dot amber"/><b>{counts.pending}</b> Aguardando</span><span><i className="ca-real-dot gray"/><b>{counts.resolved}</b> Resolvidos</span></div>
  <div className={'ca-real-workspace ca-real-mobile-'+mobileView}>
   <section className="ca-real-inbox" aria-label="Lista de atendimentos">
    <div className="ca-real-inbox-header"><div className="ca-real-section-title">Caixa de entrada <span>{filtered.length}</span></div><input type="search" aria-label="Pesquisar atendimentos" placeholder="Buscar assunto, contato ou nota..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <div className="ca-real-filters" role="group" aria-label="Filtrar atendimentos">{([['all','Todos'],['open','Em andamento'],['pending','Aguardando'],['resolved','Resolvidos']] as const).map(([value,label])=><button key={value} aria-pressed={filter===value} onClick={()=>{setFilter(value);setMobileView('list')}}>{label}</button>)}</div>
    <div className="ca-real-ticket-list">{loading?<p className="ca-real-empty" role="status">Carregando atendimentos...</p>:filtered.length===0?<p className="ca-real-empty">Nenhum atendimento encontrado.</p>:filtered.map(t=>{const name=t.contact_id?contactMap.get(t.contact_id)?.name:'Sem contato vinculado';return <button key={t.id} className={'ca-real-ticket '+(current?.id===t.id?'is-selected':'')} onClick={()=>{setSelected(t.id);setMobileView('detail')}} aria-current={current?.id===t.id?'true':undefined}><span className="ca-real-avatar">{initials(name||'?')}</span><span className="ca-real-ticket-body"><span className="ca-real-ticket-top"><strong>{name}</strong><time dateTime={t.created_at}>{when(t.created_at)}</time></span><span className="ca-real-ticket-subject">{t.subject}</span><span className="ca-real-ticket-meta"><span className={'ca-real-status ca-real-status-'+t.status}>{statusLabels[t.status]||t.status}</span><span>{priorityLabels[t.priority]||t.priority}</span></span></span></button>})}</div>
    <div className="ca-real-inbox-footer">Atendimentos registrados no Supabase</div>
   </section>
   <section className="ca-real-detail" aria-label="Detalhes do atendimento">
    {current?<><div className="ca-real-detail-header"><button className="ca-real-back" onClick={()=>setMobileView('list')} aria-label="Voltar à lista">←</button><span className="ca-real-avatar">{initials(currentContact?.name||'?')}</span><div className="ca-real-detail-heading"><strong>{currentContact?.name||'Contato não vinculado'}</strong><small>Atendimento #{current.id.slice(0,8)}</small></div><button className="ca-real-context-button" onClick={()=>{setContextOpen(true);setMobileView('context')}}>Informações</button></div>
      <div className="ca-real-detail-scroll"><div className="ca-real-case"><span className="ca-real-kicker">REGISTRO DE ATENDIMENTO</span><h2>{current.subject}</h2><div className="ca-real-case-meta"><span>Criado em {new Date(current.created_at).toLocaleDateString('pt-BR')}</span><span className={'ca-real-status ca-real-status-'+current.status}>{statusLabels[current.status]||current.status}</span></div></div>
      <div className="ca-real-note"><span className="ca-real-kicker">OBSERVAÇÕES DO TICKET</span><p>{current.notes||'Nenhuma observação registrada.'}</p></div>
      <div className="ca-real-no-chat"><span aria-hidden="true">◌</span><strong>Mensagens ainda não disponíveis</strong><p>Este módulo gerencia tickets reais. O histórico e o envio de mensagens serão disponibilizados quando houver integração com um canal de atendimento.</p></div></div>
      <div className="ca-real-detail-bottom"><label htmlFor="ca-real-status">Status do atendimento</label><select id="ca-real-status" value={current.status} disabled={busy} onChange={e=>void change(current,e.target.value)}><option value="open">Em andamento</option><option value="pending">Aguardando</option><option value="resolved">Resolvido</option></select></div>
    </>:<div className="ca-real-empty-detail">Selecione um atendimento para visualizar os detalhes.</div>}
   </section>
   <aside className="ca-real-context" aria-label="Contexto do cliente">
    <div className="ca-real-context-header"><button className="ca-real-back" onClick={()=>setMobileView('detail')} aria-label="Voltar ao atendimento">←</button><strong>Contexto do cliente</strong><button className="ca-real-collapse" onClick={()=>setContextOpen(v=>!v)} aria-expanded={contextOpen}>{contextOpen?'−':'+'}</button></div>
    {current&&contextOpen?<div className="ca-real-context-content"><div className="ca-real-contact-card"><span className="ca-real-avatar large">{initials(currentContact?.name||'?')}</span><strong>{currentContact?.name||'Sem contato vinculado'}</strong><small>{currentContact?'Contato cadastrado':'Nenhum contato associado'}</small></div><div className="ca-real-context-group"><h3>Dados do contato</h3><dl><dt>Nome</dt><dd>{currentContact?.name||'Não informado'}</dd><dt>Identificador</dt><dd className="ca-real-id">{currentContact?.id||'Não vinculado'}</dd></dl></div><div className="ca-real-context-group"><h3>Gestão do atendimento</h3><dl><dt>Status</dt><dd>{statusLabels[current.status]||current.status}</dd><dt>Prioridade</dt><dd>{priorityLabels[current.priority]||current.priority}</dd><dt>Responsável</dt><dd>Não disponível nesta integração</dd></dl></div><div className="ca-real-context-group"><h3>Contexto comercial</h3><p>Dados de negócios e etapas do CRM não estão vinculados a este registro.</p></div></div>:!current?<p className="ca-real-empty">Selecione um atendimento.</p>:null}
   </aside>
  </div>
  {modal&&<div className="ca-real-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><form className="ca-real-modal" onSubmit={e=>void save(e)} aria-label="Novo atendimento"><div className="ca-real-modal-header"><div><span className="ca-real-kicker">NOVO REGISTRO</span><h2>Criar atendimento</h2></div><button type="button" onClick={()=>setModal(false)} aria-label="Fechar">×</button></div><label htmlFor="ca-real-subject">Assunto *</label><input id="ca-real-subject" required maxLength={180} value={subject} onChange={e=>setSubject(e.target.value)}/><label htmlFor="ca-real-contact">Contato</label><select id="ca-real-contact" value={contact} onChange={e=>setContact(e.target.value)}><option value="">Sem contato vinculado</option>{contacts.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><label htmlFor="ca-real-priority">Prioridade</label><select id="ca-real-priority" value={priority} onChange={e=>setPriority(e.target.value)}><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option></select><label htmlFor="ca-real-notes">Observações</label><textarea id="ca-real-notes" rows={4} value={notes} onChange={e=>setNotes(e.target.value)}/><div className="ca-real-modal-actions"><button type="button" onClick={()=>setModal(false)}>Cancelar</button><button className="ca-real-primary" type="submit" disabled={busy||!subject.trim()}>{busy?'Salvando...':'Criar atendimento'}</button></div></form></div>}
 </div>
}
