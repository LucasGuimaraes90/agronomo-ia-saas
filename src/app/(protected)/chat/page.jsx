'use client';
import { useState, useRef, useEffect } from 'react';
import {
  Send, Bot, User, FileText, File, Plus, MessageSquare,
  Trash2, Download,
} from 'lucide-react';
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
  return (
    <div className={`flex gap-3 ${isBot ? '' : 'flex-row-reverse'}`}>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isBot ? 'bg-primary-100' : 'bg-gray-200'}`}>
        {isBot ? <Bot className="w-4 h-4 text-primary-600" /> : <User className="w-4 h-4 text-gray-600" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isBot ? 'bg-white border border-gray-200 text-gray-800' : 'bg-primary-600 text-white'}`}>
        <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
          __html: msg.content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/^## (.*)/gm, '<h2 class="font-bold text-base mt-2 mb-1">$1</h2>')
            .replace(/^### (.*)/gm, '<h3 class="font-semibold mt-2 mb-1">$1</h3>')
            .replace(/^- (.*)/gm, '<span class="block pl-3">• $1</span>')
            .replace(/\n\n/g, '<br/><br/>')
        }} />
      </div>
    </div>
  );
}

const BOTOES_EXPORT = [
  { formato: 'docx', label: 'Word', icon: FileText, cor: 'text-blue-600', bg: 'hover:bg-blue-50 border-blue-200' },
  { formato: 'pptx', label: 'PowerPoint', icon: FileText, cor: 'text-orange-600', bg: 'hover:bg-orange-50 border-orange-200' },
  { formato: 'xlsx', label: 'Excel', icon: FileText, cor: 'text-green-600', bg: 'hover:bg-green-50 border-green-200' },
  { formato: 'txt', label: 'TXT', icon: File, cor: 'text-gray-600', bg: 'hover:bg-gray-50 border-gray-200' },
  { formato: 'html', label: 'HTML', icon: Download, cor: 'text-purple-600', bg: 'hover:bg-purple-50 border-purple-200' },
];

export default function ChatPage() {
  const [messages, setMessages] = useState([GREETING_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState('');
  const [conversas, setConversas] = useState([]);
  const [conversaId, setConversaId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const supabase = createClient();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    carregarConversas();
  }, []);

  async function carregarConversas() {
    setLoadingHistory(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('conversas_chat')
      .select('id, titulo, updated_at')
      .eq('agronomo_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(20);
    setConversas(data || []);
    setLoadingHistory(false);
  }

  async function abrirConversa(conv) {
    const { data } = await supabase
      .from('conversas_chat')
      .select('messages')
      .eq('id', conv.id)
      .single();
    if (data?.messages) {
      setMessages([GREETING_MSG, ...data.messages]);
      setConversaId(conv.id);
    }
  }

  async function novaConversa() {
    setMessages([GREETING_MSG]);
    setConversaId(null);
    setInput('');
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
      ? (typeof firstUser.content === 'string' ? firstUser.content : 'Conversa').substring(0, 60)
      : 'Conversa';

    if (conversaId) {
      await supabase
        .from('conversas_chat')
        .update({ messages: msgs, titulo, updated_at: new Date().toISOString() })
        .eq('id', conversaId);
    } else {
      const { data } = await supabase
        .from('conversas_chat')
        .insert({ agronomo_id: user.id, titulo, messages: msgs })
        .select('id')
        .single();
      if (data?.id) setConversaId(data.id);
    }
    carregarConversas();
  }

  async function exportarComMsgs(msgs, formato) {
    setGenerating(formato);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, formato }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        alert('Erro ao gerar arquivo: ' + err.error);
        return;
      }
      const blob = await res.blob();
      downloadBlob(blob, `agronomo_ia_${Date.now()}.${formato}`);
    } catch (err) {
      alert('Erro ao gerar arquivo: ' + err.message);
    } finally {
      setGenerating('');
    }
  }

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const allMsgs = newMessages.filter(m => m.role !== 'system' && m.content !== GREETING);
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMsgs }),
      });
      const data = await res.json();

      // Detecta marcador de geração automática [[GERAR:formato]]
      let rawContent = data.content || 'Erro ao processar.';
      const gerarMatch = rawContent.match(/\[\[GERAR:(docx|pptx|xlsx)\]\]/);
      const autoFormato = gerarMatch ? gerarMatch[1] : null;
      const conteudoLimpo = rawContent.replace(/\[\[GERAR:[a-z]+\]\]/g, '').trim();

      const assistantMsg = { role: 'assistant', content: conteudoLimpo };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      const toSave = finalMessages.filter(m => m.content !== GREETING);
      await salvarConversa(toSave);

      // Auto-gera o arquivo se o IA incluiu o marcador
      if (autoFormato) {
        await exportarComMsgs(toSave, autoFormato);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Erro de conexão. Tente novamente.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportar(formato) {
    const assistantMsgs = messages.filter(m => m.role === 'assistant');
    if (assistantMsgs.length < 2) {
      alert('Converse primeiro para gerar um documento.');
      return;
    }
    setGenerating(formato);

    try {
      const msgsFiltradas = messages.filter(m => m.content !== GREETING);

      if (formato === 'docx' || formato === 'pptx' || formato === 'xlsx') {
        const res = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: msgsFiltradas, formato }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
          alert('Erro ao gerar arquivo: ' + err.error);
          return;
        }
        const blob = await res.blob();
        downloadBlob(blob, `agronomo_ia_${Date.now()}.${formato}`);
      } else {
        const res = await fetch('/api/document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: msgsFiltradas }),
        });
        if (!res.ok) { alert('Erro ao gerar documento.'); return; }
        const { content } = await res.json();
        const nome = `agronomo_ia_${Date.now()}`;
        if (formato === 'txt') {
          downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), `${nome}.txt`);
        } else if (formato === 'html') {
          const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Laudo Técnico — Agrônomo IA</title><style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:820px;margin:40px auto;padding:0 24px;line-height:1.7;color:#1f2937}h1{color:#15803d;border-bottom:3px solid #15803d;padding-bottom:12px}h2{color:#15803d;margin-top:32px;border-left:4px solid #15803d;padding-left:12px}h3{color:#166534}table{border-collapse:collapse;width:100%;margin:16px 0}td,th{border:1px solid #d1d5db;padding:10px 14px}th{background:#f0fdf4;font-weight:600}.rodape{margin-top:48px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af}</style></head><body><h1>Laudo Técnico Agronômico</h1><p style="color:#6b7280;font-size:14px">Gerado em: ${new Date().toLocaleDateString('pt-BR')} • Agrônomo IA</p>${content.replace(/## (.*)/g,'<h2>$1</h2>').replace(/### (.*)/g,'<h3>$1</h3>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/^- (.*)/gm,'<li>$1</li>').replace(/\n/g,'<br>')}<div class="rodape">Documento gerado pelo Agrônomo IA. Este laudo é orientativo.</div></body></html>`;
          downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${nome}.html`);
        }
      }
    } catch (err) {
      alert('Erro ao gerar documento: ' + err.message);
    } finally {
      setGenerating('');
    }
  }

  const hasContent = messages.filter(m => m.role === 'assistant').length > 1;

  const sugestoes = [
    'Analise este resultado de solo: pH 5.2, P 8 mg/dm³, K 80 mg/dm³',
    'Recomendação de calagem para café no cerrado',
    'Qual a dose de adubação para milho em solo argiloso?',
    'Como identificar deficiência de boro no café?',
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
            <div
              key={conv.id}
              onClick={() => abrirConversa(conv)}
              className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer text-xs transition-colors ${conversaId === conv.id ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-100 text-gray-600'}`}
            >
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
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chat Agrônomo IA</h1>
            <p className="text-gray-500 text-sm mt-0.5">Assistente tecnico especializado em agronomia</p>
          </div>
          {hasContent && (
            <div className="flex flex-wrap gap-1.5 justify-end">
              <span className="text-xs text-gray-400 self-center mr-1">Exportar:</span>
              {BOTOES_EXPORT.map(({ formato, label, icon: Icon, cor, bg }) => (
                <button
                  key={formato}
                  onClick={() => exportar(formato)}
                  disabled={!!generating}
                  className={`btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-60 border ${bg} ${cor}`}
                  title={`Baixar como ${label}`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {generating === formato ? 'Gerando...' : label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 card overflow-y-auto p-4 space-y-4 mb-4">
          {messages.map((msg, i) => <Mensagem key={i} msg={msg} />)}
          {(loading || generating) && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                {generating ? (
                  <p className="text-xs text-gray-500">⚙️ Gerando arquivo {generating.toUpperCase()}...</p>
                ) : (
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {sugestoes.map((s, i) => (
              <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-colors">
                {s}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            className="input flex-1"
            placeholder="Digite sua dúvida agronômica..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(e)}
            disabled={loading || !!generating}
          />
          <button type="submit" disabled={!input.trim() || loading || !!generating} className="btn-primary px-4 disabled:opacity-60">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
