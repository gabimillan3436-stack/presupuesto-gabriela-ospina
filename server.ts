import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  Content,
  FunctionCall,
  FunctionDeclaration,
  GoogleGenAI,
  Part,
  Type,
} from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Modelos priorizados en cascada (solo modelos activos y soportados)
const MODEL_CASCADE = [
  'gemini-4-hydrogen',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
] as const;

const TRANSCRIBE_MODEL = 'gemini-3.5-transcribe';
const RETRYABLE_STATUS_CODES = new Set([429, 503, 404]);

const registerExpenseDeclaration: FunctionDeclaration = {
  name: 'registerExpense',
  description:
    'Registra un gasto personal en pesos colombianos (COP) dentro del presupuesto del usuario.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      amount: {
        type: Type.NUMBER,
        description:
          'Valor numérico positivo del gasto en pesos colombianos (COP). Por ejemplo: 500, 25000, 38500.',
      },
      date: {
        type: Type.STRING,
        description:
          'Fecha del gasto en formato estricto YYYY-MM-DD (por ejemplo 2026-11-18). Si el usuario dice "hoy", usa la fecha actual del contexto.',
      },
      description: {
        type: Type.STRING,
        description:
          'Descripción breve y clara del gasto (por ejemplo "Comida", "Almuerzo", "Pasajes de bus").',
      },
      category: {
        type: Type.STRING,
        description:
          'Categoría del gasto. Debe ser exactamente una de: "Alimentación", "Transporte", "Servicios públicos", "Ropa y compras personales", "Entretenimiento y ocio".',
      },
    },
    required: ['amount', 'date', 'description', 'category'],
  },
};

interface MediaAttachmentInput {
  kind: 'image' | 'audio';
  mimeType: string;
  data: string; // base64 sin prefijo data:...
  fileName?: string;
}

interface ChatMessageInput {
  role: 'user' | 'assistant';
  text: string;
}

interface BudgetContextInput {
  userName?: string;
  baseMonthlyBudget?: number;
  totalIncome?: number;
  monthlyBudget?: number;
  totalSpent?: number;
  availableBalance?: number;
  spentPercent?: number;
  currentDate?: string;
  recentMovementsSummary?: string;
}

function formatCOPServer(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  return `${sign}$${abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} COP`;
}

function extractStatusCode(error: unknown): number {
  if (!error || typeof error !== 'object') return 500;
  const errObj = error as Record<string, unknown>;

  const direct =
    typeof errObj.status === 'number'
      ? errObj.status
      : typeof errObj.code === 'number'
        ? errObj.code
        : undefined;
  if (direct && direct >= 400 && direct < 600) {
    return direct;
  }

  if (errObj.error && typeof errObj.error === 'object') {
    const nested = errObj.error as Record<string, unknown>;
    if (typeof nested.code === 'number') return nested.code;
    if (typeof nested.status === 'number') return nested.status;
  }

  const msg =
    typeof errObj.message === 'string'
      ? errObj.message
      : JSON.stringify(error);

  if (/\b429\b|RESOURCE_EXHAUSTED/i.test(msg)) return 429;
  if (/\b503\b|UNAVAILABLE|overloaded/i.test(msg)) return 503;
  if (/\b404\b|NOT_FOUND/i.test(msg)) return 404;
  if (/\b403\b|PERMISSION_DENIED/i.test(msg)) return 403;
  if (/\b400\b|INVALID_ARGUMENT|API_KEY_INVALID/i.test(msg)) return 400;

  return 500;
}

function extractErrorMessage(error: unknown): string {
  if (!error) return 'Error desconocido en el servicio de IA.';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (obj.error && typeof obj.error === 'object') {
      const nested = obj.error as Record<string, unknown>;
      if (typeof nested.message === 'string') return nested.message;
    }
  }
  return 'No fue posible procesar la solicitud con el servicio de IA.';
}

function extractPartsRobustly(parts: Part[] | undefined): {
  text: string;
  functionCalls: FunctionCall[];
} {
  if (!Array.isArray(parts) || parts.length === 0) {
    return { text: '', functionCalls: [] };
  }

  const textChunks: string[] = [];
  const functionCalls: FunctionCall[] = [];

  for (const part of parts) {
    if (typeof part.text === 'string' && part.text.trim().length > 0) {
      textChunks.push(part.text);
    }
    if (part.functionCall && part.functionCall.name) {
      functionCalls.push(part.functionCall);
    }
  }

  return {
    text: textChunks.join('\n').trim(),
    functionCalls,
  };
}

function buildSystemInstruction(context: BudgetContextInput): string {
  const userName = (context.userName || 'Usuario').trim() || 'Usuario';
  const currentDate = context.currentDate || '2026-11-18';
  const monthlyBudget = context.monthlyBudget ?? 3_200_000;
  const totalSpent = context.totalSpent ?? 0;
  const availableBalance = context.availableBalance ?? monthlyBudget;
  const totalIncome = context.totalIncome ?? 0;
  const spentPercent = (context.spentPercent ?? 0).toFixed(1).replace('.', ',');

  return [
    'Eres el asistente financiero integrado de "Mi Presupuesto Mensual", experto en finanzas personales en Colombia (pesos colombianos COP).',
    'Tu tono es breve, amable, claro y práctico.',
    '',
    'Contexto dinámico actual:',
    `- Nombre del usuario: ${userName}`,
    `- Fecha actual de referencia: ${currentDate}`,
    `- Presupuesto total disponible: ${formatCOPServer(monthlyBudget)} (incluye ${formatCOPServer(totalIncome)} en ingresos registrados)`,
    `- Total gastado: ${formatCOPServer(totalSpent)} (${spentPercent}% del presupuesto)`,
    `- Saldo disponible para gastar: ${formatCOPServer(availableBalance)}`,
    context.recentMovementsSummary
      ? `- Movimientos recientes: ${context.recentMovementsSummary}`
      : '- Aún no hay movimientos registrados este mes.',
    '',
    'Reglas importantes (obligatorias):',
    '1. Si el usuario menciona haber hecho o querer registrar un gasto (por ejemplo "Gasté 500 en comida hoy", "Pagué 18000 de taxi ayer", "Almuerzo de 22000") con datos claros, llama a la función `registerExpense` con amount, date (YYYY-MM-DD), description y category.',
    '2. Las únicas categorías válidas son: "Alimentación", "Transporte", "Servicios públicos", "Ropa y compras personales", "Entretenimiento y ocio". Elige la más adecuada según la descripción.',
    '3. Si el usuario dice "hoy", usa la fecha actual del contexto. Si dice "ayer", resta un día en formato YYYY-MM-DD.',
    '4. Siempre confirma de forma breve y cordial los datos registrados (monto en COP, descripción, categoría y fecha) antes o después de usar la función.',
    '5. Usa siempre la herramienta `registerExpense` para guardar datos confirmados. Al finalizar un registro, dirígete al usuario por su nombre (ejemplo: "¡Listo, ' + userName + '! He guardado tu gasto...").',
    '6. Para consultas de compras o presupuesto, compara el gasto solicitado con el saldo disponible del contexto y responde con exactitud.',
    '',
    'Reglas para Imágenes (tickets, recibos, capturas de compra o apuntes de gasto):',
    '- Extrae: monto, fecha y descripción (y asigna la categoría más adecuada).',
    '- Si la imagen es borrosa, algún dato no se ve o está dudoso/incompleto, pregunta al usuario antes de guardar; NO inventes información ni asumas montos o fechas que no sean visibles.',
    '- Si la imagen no tiene relación con gastos o finanzas de Mi Presupuesto, indica claramente que no puedes procesarla ni registrarla.',
    '',
    'Reglas para Audio (nota de voz grabada o archivo de audio):',
    '- Transcribe el audio y extrae: monto, fecha y descripción (y asigna la categoría más adecuada).',
    '- Si falta algún dato (por ejemplo el monto o la descripción) o no se entiende con claridad, solicita aclaración antes de guardar; NO inventes datos.',
    '- Si el audio no tiene que ver con gastos o finanzas de Mi Presupuesto, responde que no puedes procesarlo ni registrarlo.',
  ].join('\n');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey
    ? new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      })
    : null;

  app.post('/api/assistant', async (req: Request, res: Response) => {
    if (!ai) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY no está configurada en el entorno del servidor.',
        status: 500,
      });
    }

    const { messages, budgetContext, attachment } = (req.body ?? {}) as {
      messages?: ChatMessageInput[];
      budgetContext?: BudgetContextInput;
      attachment?: MediaAttachmentInput | null;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Se requiere al menos un mensaje para consultar al asistente.',
        status: 400,
      });
    }

    const validHistory = messages.filter(
      (m) =>
        m &&
        typeof m.text === 'string' &&
        (m.role === 'user' || m.role === 'assistant')
    );

    if (validHistory.length === 0) {
      return res.status(400).json({
        error: 'El historial de mensajes no contiene datos válidos.',
        status: 400,
      });
    }

    let audioTranscription: string | undefined;
    let inlinePartForLastUserTurn: Part | null = null;

    if (
      attachment &&
      typeof attachment.data === 'string' &&
      attachment.data.length > 0 &&
      typeof attachment.mimeType === 'string'
    ) {
      const mediaPart: Part = {
        inlineData: {
          mimeType: attachment.mimeType,
          data: attachment.data,
        },
      };

      if (attachment.kind === 'audio') {
        // Intentar transcripción dedicada con gemini-3.5-transcribe primero
        try {
          const transcribeRes = await ai.models.generateContent({
            model: TRANSCRIBE_MODEL,
            contents: {
              parts: [
                mediaPart,
                {
                  text: 'Transcribe literalmente en español el contenido de este audio. No agregues ni inventes información.',
                },
              ],
            },
          });
          const transcribed = (transcribeRes.text ?? '').trim();
          if (transcribed.length > 0) {
            audioTranscription = transcribed;
          } else {
            inlinePartForLastUserTurn = mediaPart;
          }
        } catch (err) {
          console.warn(
            `[Assistant] Transcripción con ${TRANSCRIBE_MODEL} falló, usando audio multimodal en cascada:`,
            extractErrorMessage(err)
          );
          inlinePartForLastUserTurn = mediaPart;
        }
      } else if (attachment.kind === 'image') {
        inlinePartForLastUserTurn = mediaPart;
      }
    }

    const lastIdx = validHistory.length - 1;
    const contents: Content[] = validHistory
      .map((m, idx) => {
        const parts: Part[] = [];
        const isLastUser = idx === lastIdx && m.role === 'user';

        if (isLastUser && inlinePartForLastUserTurn) {
          parts.push(inlinePartForLastUserTurn);
        }

        let textContent = m.text.trim();
        if (isLastUser && audioTranscription) {
          const prefix = textContent
            ? `${textContent}\n\n`
            : '';
          textContent = `${prefix}[Nota de voz transcrita literalmente]: "${audioTranscription}"`;
        } else if (isLastUser && inlinePartForLastUserTurn && !textContent) {
          textContent =
            attachment?.kind === 'image'
              ? 'Analiza esta imagen para ver si corresponde a un gasto (ticket, recibo, captura o apunte). Extrae monto, fecha y descripción. Si falta algún dato o está borroso, pregúntame sin inventar.'
              : 'Transcribe esta nota de voz y extrae monto, fecha y descripción del gasto. Si falta algún dato, pídeme aclaración sin inventar.';
        }

        if (textContent.length > 0) {
          parts.push({ text: textContent });
        }

        return {
          role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
          parts,
        };
      })
      .filter((c) => c.parts.length > 0);

    if (contents.length === 0) {
      return res.status(400).json({
        error: 'El mensaje enviado está vacío.',
        status: 400,
      });
    }

    const systemInstruction = buildSystemInstruction(budgetContext ?? {});
    const tools = [{ functionDeclarations: [registerExpenseDeclaration] }];
    const userName = (budgetContext?.userName || 'Usuario').trim() || 'Usuario';

    const modelsAttempted: string[] = [];
    let lastErrorStatus = 500;
    let lastErrorMessage = 'Error inesperado al consultar Gemini.';

    for (const modelName of MODEL_CASCADE) {
      modelsAttempted.push(modelName);
      try {
        const response1 = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            tools,
          },
        });

        const candidate1Content = response1.candidates?.[0]?.content;
        const extracted1 = extractPartsRobustly(candidate1Content?.parts);

        let finalReplyText = extracted1.text;
        const extractedCalls = extracted1.functionCalls;

        // Si el modelo invocó registerExpense y aún no incluyó confirmación textual, enviamos functionResponse
        if (extractedCalls.length > 0 && candidate1Content) {
          const registerCall = extractedCalls.find(
            (fc) => fc.name === 'registerExpense'
          );

          if (registerCall && !finalReplyText) {
            try {
              const args = (registerCall.args ?? {}) as Record<string, unknown>;
              const currentAvailable = budgetContext?.availableBalance ?? 0;
              const spentAmount = Number(args.amount) || 0;
              const updatedAvailable = currentAvailable - spentAmount;

              const response2 = await ai.models.generateContent({
                model: modelName,
                contents: [
                  ...contents,
                  candidate1Content,
                  {
                    role: 'user',
                    parts: [
                      {
                        functionResponse: {
                          id: registerCall.id,
                          name: registerCall.name,
                          response: {
                            status: 'success',
                            userName,
                            registeredExpense: args,
                            updatedAvailableBalanceCOP: updatedAvailable,
                          },
                        },
                      },
                    ],
                  },
                ],
                config: {
                  systemInstruction,
                  tools,
                },
              });

              const extracted2 = extractPartsRobustly(
                response2.candidates?.[0]?.content?.parts
              );
              if (extracted2.text) {
                finalReplyText = extracted2.text;
              }
            } catch {
              // Si el turno de confirmación falla transitoriamente, confirmamos con los datos validados de la función
            }
          }

          if (!finalReplyText && registerCall) {
            const args = (registerCall.args ?? {}) as Record<string, unknown>;
            const amt = Number(args.amount) || 0;
            const desc = String(args.description || 'Gasto');
            const cat = String(args.category || 'Alimentación');
            const dateStr = String(args.date || 'hoy');
            finalReplyText = `¡Listo, ${userName}! He guardado tu gasto de ${formatCOPServer(amt)} en "${desc}" (${cat}) con fecha ${dateStr}.`;
          }
        }

        if (!finalReplyText && extractedCalls.length === 0) {
          finalReplyText =
            'Recibí tu mensaje, pero no pude generar una respuesta clara. ¿Puedes reformularlo?';
        }

        return res.json({
          reply: finalReplyText,
          transcription: audioTranscription,
          functionCalls: extractedCalls,
          modelUsed: modelName,
          modelsAttempted,
        });
      } catch (err) {
        const status = extractStatusCode(err);
        const message = extractErrorMessage(err);
        lastErrorStatus = status;
        lastErrorMessage = message;

        console.warn(
          `[Assistant] Modelo "${modelName}" falló con estado ${status}: ${message}`
        );

        if (RETRYABLE_STATUS_CODES.has(status)) {
          continue;
        }

        return res.status(status).json({
          error: message,
          status,
          modelFailed: modelName,
          modelsAttempted,
        });
      }
    }

    return res.status(lastErrorStatus).json({
      error: lastErrorMessage,
      status: lastErrorStatus,
      modelsAttempted,
    });
  });

  if (IS_PRODUCTION) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
