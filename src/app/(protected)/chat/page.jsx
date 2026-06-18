'use client';
import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Download, FileText, FileSpreadsheet, Presentation, File } from 'lucide-react';

const GREETING = `👋 Olá! Sou o **Agrônomo IA**.

Posso ajudar com:
- 🧪 Análise e interpretação de solo
- 🌱 Recomendações de calagem e adubação
- 🌾 Manejo de culturas (café, soja, milho e mais)
- 🐛 Diagnóstico de pragas e doenças
- 📋 Geração de laudos técnicos

Como posso te ajudar hoje?`;

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

export default function ChatPage() {
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage(e) {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const allMsgs = [...messages, userMsg].filter(m => m.role !== 'system');
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: allMsgs }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content || 'Erro ao processar.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Erro de conexão. Tente novamente.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function generateDoc(tipo) {
    const assistantMsgs = messages.filter(m => m.role === 'assistant');
    if (assistantMsgs.length < 2) return alert('Converse primeiro para gerar um documento.');
    setGenerating(tipo);
    try {
      const res = await fetch('/api/document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      const { content } = await res.json();
      const nome = `agronomo_ia_${Date.now()}`;

      if (tipo === 'txt') {
        const blob = new Blob([content], { type: 'text/plain' });
        download(blob, `${nome}.txt`);
      } else if (tipo === 'html') {
        const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Laudo Técnico</title>
        <style>body{font-family:Arial,sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6}
        h1,h2,h3{color:#15803d}table{border-collapse:collapse;width:100%}
        td,th{border:1px solid #ddd;padding:8px}th{background:#f0fdf4}</style></head>
        <body>${content.replace(/## (.*)/g,'<h2>$1</h2>').replace(/### (.*)/g,'<h3>$1</h3>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}</body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        download(blob, `${nome}.html`);
      }
    } catch (err) {
      alert('Erro ao gerar documento.');
    } finally {
      setGenerating('');
    }
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  const hasContent = messages.filter(m => m.role === 'assistant').length > 1;

  const sugestoes = [
    'Analise este resultado de solo: pH 5.2, P 8 mg/dm³, K 80 mg/dm³',
    'Recomendação de calagem para café no cerrado',
    'Qual a dose de adubação para milho em solo argiloso?',
    'Como identificar deficiência de boro no café?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chat Agrônomo IA</h1>
          <p className="text-gray-500 text-sm mt-0.5">Assistente técnico com base EMBRAPA</p>
        </div>
        {hasContent && (
          <div className="flex gap-2">
            <button onClick={() => generateDoc('txt')} disabled={!!generating} className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-60">
              <File className="w-3.5 h-3.5" />
              {generating === 'txt' ? 'Gerando...' : 'TXT'}
            </button>
            <button onClick={() => generateDoc('html')} disabled={!!generating} className="btn-secondary text-xs flex items-center gap-1.5 disabled:opacity-60">
              <FileText className="w-3.5 h-3.5" />
              {generating === 'html' ? 'Gerando...' : 'HTML'}
            </button>
          </div>
        )}
      </div>

      {/* Chat area */}
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

      {/* Sugestões (só se vazio) */}
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

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          ref={inputRef}
          className="input flex-1"
          placeholder="Digite sua dúvida agronômica..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(e)}
          disabled={loading}
        />
        <button type="submit" disabled={!input.trim() || loading} className="btn-primary px-4 disabled:opacity-60">
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
