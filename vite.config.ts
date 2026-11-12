import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function aiStudyPlugin() {
  return {
    name: 'ai-study-api',
    configureServer(server: any) {
      server.middlewares.use('/api/ai-study', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
          return;
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: 'unconfigured',
            message: 'خدمة المساعد الدراسي الذكي غير مفعلة حالياً (مفتاح API غير متوفر في بيئة الخادم).'
          }));
          return;
        }

        const handlePayload = async (payload: any) => {
          try {
            const { action, text } = payload || {};
            if (!text || !text.trim()) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'empty_prompt', message: 'يرجى إدخال نص أو سؤال دراسي للمساعدة.' }));
              return;
            }

            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey });

            const prompts: Record<string, string> = {
              explain: `أنت أستاذ مساعد أكاديمي بملحقة المدرسة العليا للأساتذة بالجلفة (ENS Djelfa). اشرح المفهوم أو المحور الآتي شرحاً ديداكتيكياً واضحاً ومنهجياً يساعد طالب التكوين التعليمي:\n\n${text}`,
              summarize: `لخّص النص الدراسي أو المحاضرة الآتية في نقاط رئيسية مركزة ومرتبة منطقياً، مع إبراز المفاهيم الديداكتيكية الأساسية:\n\n${text}`,
              questions: `قم بإنشاء 4 أسئلة مراجعة نموذجية متنوعة مع إجاباتها النموذجية المختصرة حول الموضوع الآتي لاختبار الفهم والاستعداد للامتحان:\n\n${text}`,
              study_plan: `اقترح خطة مراجعة وتنظيم وقت ذكية تغطي المحاور الدراسية الآتية موزعة على أيام الأسبوع:\n\n${text}`,
            };

            const systemInstruction = 'أنت مساعد دراسي أكاديمي لطلبة المدرسة العليا للأساتذة بالجلفة. هدفك مساعدة الطلبة في فهم الدروس ومراجعتها ديداكتيكياً. تنبيه حاسم: لا تخترع أو تدعِ أي مواعيد إدارية أو رزنامات امتحانات أو قرارات رسمية خاصة بالملحقة، وأرشد الطالب دائماً إلى مراجعة إعلانات مصلحة التمدرس الرسمية.';

            const response = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: {
                systemInstruction,
                temperature: 0.3,
              }
            });

            if (!response || !response.text) {
              throw new Error('لم يتم استلام نص من نموذج المساعد الذكي.');
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              result: response.text,
            }));
          } catch (err: any) {
            console.error('AI Study API error:', err?.message || err);
            const is503 = String(err?.message || '').includes('503') || String(err?.message || '').includes('high demand');
            res.statusCode = is503 ? 503 : 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: false,
              error: is503 ? 'service_busy' : 'generation_failed',
              message: is503
                ? 'خدمة المساعد الدراسي الذكي تشهد ضغطاً مؤقتاً في خوادم Google AI. يرجى إعادة المحاولة بعد بضع ثوانٍ.'
                : 'حدث خطأ مؤقت أثناء معالجة الطلب الذكي في الخادم.'
            }));
          }
        };

        if (req.body && typeof req.body === 'object') {
          handlePayload(req.body);
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body || '{}');
            handlePayload(parsed);
          } catch (e) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'invalid_json', message: 'صيغة JSON غير صالحة.' }));
          }
        });
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), aiStudyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

