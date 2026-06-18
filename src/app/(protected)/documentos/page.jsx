'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { FileText, Trash2, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DocumentosPage() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visualizando, setVisualizando] = useState(null);
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('documentos').select('*, clientes(nome)').eq('agronomo_id', user.id).order('criado_em', { ascending: false });
    setDocs(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!confirm('Remover este documento?')) return;
    await supabase.from('documentos').delete().eq('id', id);
    load();
  }

  function downloadTxt(doc) {
    const blob = new Blob([doc.conteudo], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.titulo.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tipoIcon = { PDF: '📄', Excel: '📊', Word: '📝', PPT: '📑', TXT: '📃', HTML: '🌐' };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
        <p className="text-gray-500 text-sm mt-0.5">Laudos e relatórios gerados pelo Agrônomo IA</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : docs.length === 0 ? (
        <div className="card p-16 text-center text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhum documento salvo</p>
          <p className="text-sm mt-1">Documentos gerados no Chat IA aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => (
            <div key={doc.id} className="card p-4 flex items-center gap-4">
              <div className="text-2xl">{tipoIcon[doc.tipo] || '📄'}</div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{doc.titulo}</p>
                <p className="text-sm text-gray-500">
                  {doc.clientes?.nome && `${doc.clientes.nome} · `}
                  {doc.tipo} · {format(new Date(doc.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              <div className="flex gap-2">
                {doc.conteudo && (
                  <>
                    <button onClick={() => setVisualizando(doc)} className="btn-secondary text-xs flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </button>
                    <button onClick={() => downloadTxt(doc)} className="btn-secondary text-xs">⬇️</button>
                  </>
                )}
                <button onClick={() => handleDelete(doc.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de visualização */}
      {visualizando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold truncate">{visualizando.titulo}</h2>
              <button onClick={() => setVisualizando(null)} className="text-gray-400 hover:text-gray-600 ml-4"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
                {visualizando.conteudo}
              </pre>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => downloadTxt(visualizando)} className="btn-secondary text-sm">⬇️ Baixar TXT</button>
              <button onClick={() => setVisualizando(null)} className="btn-primary text-sm">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
