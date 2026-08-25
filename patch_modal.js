const fs = require('fs');
const content = fs.readFileSync('src/components/LiveMatch.tsx', 'utf-8');
const modalCode = `
      {/* End Match Confirmation Modal */}
      {isEndMatchModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-8 max-w-md w-full animate-in zoom-in-95 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">¿Finalizar Partido?</h2>
            <p className="text-[#6E6E75] text-center mb-8">
              El partido se detendrá y se guardará en el historial. Esta acción no se puede deshacer de forma automática.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setIsEndMatchModalOpen(false)}
                className="flex-1 px-4 py-3 bg-[#1C1C1F] text-white font-bold rounded-xl hover:bg-[#2A2A2E] transition-colors border border-[#2A2A2E]"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmEndMatch}
                className="flex-1 px-4 py-3 bg-[#FF4B4B] text-black font-bold rounded-xl hover:bg-[#FF4B4B]/90 transition-colors shadow-lg shadow-[#FF4B4B]/20"
              >
                Finalizar y Guardar
              </button>
            </div>
          </div>
        </div>
      )}
`;
const updated = content.replace('    </div>\n  );\n}', modalCode + '    </div>\n  );\n}');
fs.writeFileSync('src/components/LiveMatch.tsx', updated);
