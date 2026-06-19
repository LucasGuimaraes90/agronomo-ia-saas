'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, File, Plus, MessageSquare, Trash2, Paperclip, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';

const GREETING = `Ola! Sou o Agronomo IA.

Posso ajudar com:
- Analise e interpretacao de solo
- Recomendacoes de calagem e adubacao
- Manejo de culturas (cafe, soja, milho e mais)
- Diagnostico de pragas e doencas
- Geracao de laudos tecnicos

Voce pode enviar texto ou anexar uma foto/imagem do laudo de solo para eu analisar!`;

const GREETING_MSG = { role: 'assistant', content: GREETING };

function Mensagem({ msg }) {
  const isBot = msg.role === 'assistant';
  const hasImage = Array.isArray(msg.content);
  const textContent = hasImage ? msg.content.find(b => b.type === 'text')?.text || '' : msg.content;
  const imageBlock = hasImage ? msg.content.find(b => b.type === 'image') : null;

  return (
    <div className={`flex gap-3 ${isBot ? '' : 'flex-row-reverse'}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isBot ? 'bg-primary-100' : 'bg-gray-200'}`}>
        {isBot ? <Bot className="w-4 h-4 text-primary-600" /> : <User className="w-4 h-4 text-gray-600" />}
      </div>
      <div className={`max-w-[80%] space-y-2`}>
        {imageBlock && (
          <div className={`rounded-2xl overflow-hidden border border-gray-200 ${isBot ? '' : 'ml-auto'}`}>
            <img src={`data:${imageBlock.media_type};base64,${imageBlock.data}`} alt="Imagem enviada" className="max-w-xs max-h-48 object-contain bg-gray-50" />
          </div>
        )}
        {textContent && (
          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${isBot ? 'bg-white border border-gray-200 text-gray-800' : 'bg-primary-600 text-white'}`}>
            <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
              __html: textContent
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/^## (.*)/gm, '<h2 class="font-bold text-base mt-2 mb-1">$1</h2>')
                .replace(/^### (.*)/gm, '<h3 class="font-semibold mt-2 mb-1">$1</h3>')
                .replace(/^- (.*)/gm, '<span class="block pl-3">- $1</span>')
                .replace(/\n\n/g, '<br/><br/>')
            }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([GREETING_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState('');
  const [conversas, setConversas] = useState([]);
  const [conversaId, setConversaId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [pendingImage, setPendingImage] = useState(null); // { data, media_type, name }
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);
  const supabase = createClient();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);
  useEffect(() => { carregarConversas(); }, []);

  async function carregarConversas() {
    setLoadingHistory(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('conversas_chat')
      .select('id, titulo, updated_at').eq('agronomo_id', user.id)
      .order('updated_at', { ascending: false }).limit(20);
    setConversas(data || []);
    setLoadingHistory(false);
  }

  async function abrirConversa(conv) {
    const { data } = await supabase.from('conversas_chat').select('messages').eq('id', conv.id).single();
    if (data?.messages) { setMessages([GREETING_MSG, ...data.messages]); setConversaId(conv.id); }
  }

  async function novaConversa() {
    setMessages([GREETING_MSG]); setConversaId(null); setInput(''); setPendingImage(null);
    inputRef.current?.focus();
  }

  async function deletarConversa(e, id) {
    e.stopPropagation();
    await supabase.from('conversas_chat').delete().eq('id', id);
    if (conversaId === id) novaConversa();
    carregarConversas();
  }

  async function salvarConversa(msgs) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const firstUser = msgs.find(m => m.role === 'user');
    const titulo = firstUser
      ? (Array.isArray(firstUser.content) ? firstUser.content.find(b => b.type === 'text')?.text : firstUser.content)?.substring(0, 60) || 'Imagem enviada'
      : 'Conversa';
    if (conversaId) {
      await supabase.from('conversas_chat').update({ messages: msgs, titulo, updated_at: new Date().toISOString() }).eq('id', conversaId);
    } else {
      const { data } = await supabase.from('conversas_chat').insert({ agronomo_id: user.id, titulo, messages: msgs }).select('id').single();
      if (data?.id) setConversaId(data.id);
    }
    carregarConversas();
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(',')[1];
      setPendingImage({ data: base64, media_type: file.type || 'image/jpeg', name: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function sendMessage(e) {
    e?.preventDefault();
    if ((!input.trim() && !pendingImage) || loading) return;

    let userContent;
    if (pendingImage) {
      userContent = [
        { type: 'image', data: pendingImage.data, media_type: pendingImage.media_type },
        { type: 'text', text: input.trim() || 'Analise esta imagem e me ajude com as recomendacoes agronomicas.' },
      ];
    } else {
      userContent = input.trim();
    }

    const userMsg = { role: 'user', content: userContent };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setPendingImage(null);
    setLoading(true);

    try {
      const allMsgs = newMessages.filter(m => {
        const txt = Array.isArray(m.content) ? m.content.find(b => b.type === 'text')?.text : m.content;
        return txt !== GREETING;
      });
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMsgs }),
      });
      const data = await res.json();
      const assistantMsg = { role: 'assistant', content: data.content || 'Erro ao processar.' };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      await salvarConversa(finalMessages.filter(m => {
        const txt = Array.isArray(m.content) ? m.content.find(b => b.type === 'text')?.text : m.content;
        return txt !== GREETING;
      }));
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erro de conexao. Tente novamente.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function generateDoc(tipo) {
    if (messages.filter(m => m.role === 'assistant').length < 2) return alert('Converse primeiro para gerar um documento.');
    setGenerating(tipo);
    try {
      const res = await fetch('/api/document', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      const { content } = await res.json();
      const nome = `agronomo_ia_${Date.now()}`;
      if (tipo === 'txt') download(new Blob([content], { type: 'text/plain' }), `${nome}.txt`);
      else if (tipo === 'html') {
        const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Laudo Tecnico</title>
        <style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6}
        h1,h2,h3{color:#15803d}table{border-collapse:collapse;width:100%}
        td,th{border:1px solid #ddd;padding:8px}th{background:#f0fdf4}</style></head>
        <body>${content.replace(/## (.*)/g,'<h2>$1</h2>').replace(/### (.*)/g,'<h3>$1</h3>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}</body></html>`;
        download(new Blob([html], { type: 'text/html' }), `${nome}.html`);
      }
    } catch { alert('Erro ao gerar documento.'); }
    finally { setGenerating(''); }
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const hasContent = messages.filter(m => m.role === 'assistant').length > 1;
  const sugestoes = [
    'Analise este resultado de solo: pH 5.2, P 8 mg/dm3, K 80 mg/dm3',
    'Recomendacao de calagem para cafe no cerrado',
    'Qual a dose de adubacao para milho em solo argiloso?',
    'Como identificar deficiencia de boro no cafe?',
  ];

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-4">
      <div className="w-56 flex flex-col gap-2 flex-shrink-0">
        <button onClick={novaConversa} className="btn-primary text-sm flex items-center gap-2 justify-center">
          <Plus className="w-4 h-4" /> Nova conversa
        </button>
        <div className="flex-1 overflow-y-auto space-y-1">
          {loadingHistory ? (
            <p className="text-xs text-gray-400 text-center py-4">Carregando...</p>
          ) : conversas.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Nenhuma conversa salva</p>
          ) : conversas.map(conv => (
            <div key={conv.id} onClick={() => abrirConversa(conv)}
              className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer text-xs transition-colors ${conversaId === conv.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-100 text-gray-600'}`}>
              <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1 truncate">{conv.titulo}</span>
              <button onClick={e => deletarConversa(e, conv.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chat Agronomo IA</h1>
            <p className="text-gray-500 text-sm mt-0.5">Assistente tecnico especializado em agronomia</p>
          </div>
          {hasContent && (
            <div className="flex gap-2">
              <button onClick={() => generateDoc('txt')} disabled={!!generating} className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-60">
                <File className="w-3.5 h-3.5" />{generating === 'txt' ? 'Gerando...' : 'TXT'}
              </button>
              <button onClick={() => generateDoc('html')} disabled={!!generating} className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-60">
                <FileText className="w-3.5 h-3.5" />{generating === 'html' ? 'Gerando...' : 'HTML'}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 card overflow-y-auto p-4 space-y-4 mb-4">
          {messages.map((msg, i) => <Mensagem key={i} msg={msg} />)}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && !pendingImage && (
          <div className="flex flex-wrap gap-2 mb-3">
            {sugestoes.map((s, i) => (
              <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}

        {pendingImage && (
          <div className="mb-2 flex items-center gap-2 bg-primary-50 border border-primary-200 rounded-xl px-3 py-2">
            <img src={`data:${pendingImage.media_type};base64,${pendingImage.data}`} alt="preview" className="w-10 h-10 object-cover rounded-lg" />
            <span className="text-xs text-primary-700 flex-1 truncate">{pendingImage.name}</span>
            <button onClick={() => setPendingImage(null)} className="text-primary-400 hover:text-primary-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={sendMessage} className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="btn-secondary px-3 flex-shrink-0" title="Anexar imagem ou documento">
            <Paperclip className="w-4 h-4" />
          </button>
          <input ref={inputRef} className="input flex-1"
            placeholder={pendingImage ? "Adicione um comentario sobre a imagem (opcional)..." : "Digite sua duvida agronomica..."}
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(e)}
            disabled={loading} />
          <button type="submit" disabled={(!input.trim() && !pendingImage) || loading} className="btn-primary px-4 disabled:opacity-60">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
