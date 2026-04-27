import React, { useState } from 'react';
import { Type, Image as ImageIcon, Video, Square, Trash2, Copy, Download } from 'lucide-react';

interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'shape';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
}

export default function CreativeStudio() {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const addElement = (type: 'text' | 'image' | 'shape') => {
    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type,
      content: type === 'text' ? 'Novo texto' : type === 'image' ? 'URL da imagem' : '',
      x: 50,
      y: 50,
      width: type === 'text' ? 200 : 150,
      height: type === 'text' ? 50 : 150,
      color: '#3b82f6',
    };
    setElements([...elements, newElement]);
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements(elements.map((el) => (el.id === id ? { ...el, ...updates } : el)));
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter((el) => el.id !== id));
  };

  const selectedElement = elements.find((el) => el.id === selectedId);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold">🎨 Creative Studio</h1>
          <p className="text-slate-400 mt-2">Crie criativos profissionais para suas campanhas</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Ferramentas */}
          <div className="lg:col-span-1 space-y-6">
            {/* Ferramentas */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">✏️ Ferramentas</h2>
              <div className="space-y-2">
                <button
                  onClick={() => addElement('text')}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                >
                  <Type className="w-4 h-4" />
                  Adicionar Texto
                </button>
                <button
                  onClick={() => addElement('image')}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                >
                  <ImageIcon className="w-4 h-4" />
                  Adicionar Imagem
                </button>
                <button
                  onClick={() => addElement('shape')}
                  className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                >
                  <Square className="w-4 h-4" />
                  Adicionar Forma
                </button>
              </div>
            </div>

            {/* Templates */}
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">📋 Templates</h2>
              <div className="space-y-2">
                {['Antes/Depois', 'Depoimento', 'Infográfico', 'Story'].map((template) => (
                  <button
                    key={template}
                    className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition text-left text-sm"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>

            {/* Properties */}
            {selectedElement && (
              <div className="bg-slate-800 rounded-lg p-6">
                <h2 className="text-lg font-bold mb-4">⚙️ Propriedades</h2>
                <div className="space-y-4">
                  {selectedElement.type === 'text' && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-300 mb-2">Texto</label>
                        <input
                          type="text"
                          value={selectedElement.content}
                          onChange={(e) =>
                            updateElement(selectedId!, { content: e.target.value })
                          }
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-300 mb-2">Cor</label>
                        <input
                          type="color"
                          value={selectedElement.color}
                          onChange={(e) =>
                            updateElement(selectedId!, { color: e.target.value })
                          }
                          className="w-full h-10 rounded cursor-pointer"
                        />
                      </div>
                    </>
                  )}

                  {selectedElement.type === 'image' && (
                    <div>
                      <label className="block text-sm text-slate-300 mb-2">URL Imagem</label>
                      <input
                        type="text"
                        value={selectedElement.content}
                        onChange={(e) =>
                          updateElement(selectedId!, { content: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                        placeholder="https://..."
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Largura</label>
                      <input
                        type="number"
                        value={selectedElement.width}
                        onChange={(e) =>
                          updateElement(selectedId!, { width: Number(e.target.value) })
                        }
                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1">Altura</label>
                      <input
                        type="number"
                        value={selectedElement.height}
                        onChange={(e) =>
                          updateElement(selectedId!, { height: Number(e.target.value) })
                        }
                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => deleteElement(selectedId!)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition mt-4"
                  >
                    <Trash2 className="w-4 h-4" />
                    Deletar
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-slate-800 rounded-lg p-6 space-y-2">
              <button
                onClick={() => setPreviewMode(!previewMode)}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
              >
                {previewMode ? '✏️ Editar' : '👁️ Preview'}
              </button>
              <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Baixar PNG
              </button>
            </div>
          </div>

          {/* Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-lg p-8 aspect-video flex items-center justify-center relative overflow-hidden">
              {/* Canvas Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-white to-slate-100"></div>

              {/* Canvas Elements */}
              <div className="relative w-full h-full">
                {elements.map((element) => (
                  <div
                    key={element.id}
                    onClick={() => setSelectedId(element.id)}
                    className={`absolute cursor-move transition ${
                      selectedId === element.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{
                      left: `${element.x}px`,
                      top: `${element.y}px`,
                      width: `${element.width}px`,
                      height: `${element.height}px`,
                    }}
                    draggable
                    onDragEnd={(e) => {
                      updateElement(element.id, {
                        x: element.x + e.movementX,
                        y: element.y + e.movementY,
                      });
                    }}
                  >
                    {element.type === 'text' && (
                      <div
                        className="w-full h-full flex items-center justify-center rounded text-center p-2"
                        style={{ color: element.color }}
                      >
                        <span className="font-bold">{element.content}</span>
                      </div>
                    )}

                    {element.type === 'image' && (
                      <img
                        src={element.content}
                        alt="Criativo"
                        className="w-full h-full object-cover rounded"
                        onError={() => (
                          <div className="w-full h-full bg-slate-300 rounded flex items-center justify-center text-slate-500">
                            Imagem inválida
                          </div>
                        )}
                      />
                    )}

                    {element.type === 'shape' && (
                      <div
                        className="w-full h-full rounded"
                        style={{ backgroundColor: element.color }}
                      ></div>
                    )}
                  </div>
                ))}

                {elements.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                    <p>Comece adicionando elementos →</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
