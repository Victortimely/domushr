/**
 * AI Service for DomusHR
 * 
 * Karena Anda belum memiliki API Key, service ini akan melakukan simulasi (Mock) 
 * proses analisis AI secara real-time. Jika Anda sudah memiliki API Key (misalnya DeepSeek),
 * Anda cukup mengganti konfigurasi di bawah ini.
 */

const USE_MOCK_API = true; // Ubah ke 'false' jika sudah punya API Key

export const analyzeSurveyData = async (surveyData) => {
    if (USE_MOCK_API) {
        return await mockDeepSeekAPI(surveyData);
    } else {
        return await callRealDeepSeekAPI(surveyData);
    }
};

/**
 * Simulasi pemanggilan API (membutuhkan waktu 2-3 detik)
 */
const mockDeepSeekAPI = async (surveyData) => {
    return new Promise((resolve) => {
        // Simulasi delay jaringan dan proses "thinking" dari AI (2000ms - 3500ms)
        const delay = Math.floor(Math.random() * 1500) + 2000;
        
        setTimeout(() => {
            // Logika mock sederhana: jika ada kata kunci tertentu di summary
            const summary = (surveyData.data?.interviewSummary || '').toLowerCase();
            let result = { score: 0, label: '', color: '', icon: '', desc: '' };

            if (summary.includes('ragu') || summary.includes('mencurigakan') || summary.includes('bohong') || summary.includes('tidak sesuai')) {
                result = { 
                    score: 35, 
                    label: 'Risiko Tinggi', 
                    color: 'var(--danger)', 
                    icon: '🚨', 
                    desc: 'Terdeteksi inkonsistensi pada alamat rumah atau wawancara. Potensi risiko keamanan finansial tinggi. Wajib investigasi lanjutan.' 
                };
            } else if (summary.includes('standar') || summary.includes('biasa') || summary === 'tidak ada ringkasan' || summary === '') {
                result = { 
                    score: 65, 
                    label: 'Perlu Verifikasi Lanjut', 
                    color: 'var(--warning)', 
                    icon: '⚠️', 
                    desc: 'Kondisi lingkungan rumah standar. Tidak ada red flag yang parah, namun data pendukung (seperti foto RT) perlu diverifikasi ulang oleh supervisor.' 
                };
            } else {
                result = { 
                    score: 92, 
                    label: 'Aman (Tervalidasi)', 
                    color: 'var(--success)', 
                    icon: '✅', 
                    desc: 'Alamat tempat tinggal jelas dan sesuai KTP. Lingkungan terverifikasi aman. Risiko fraud sangat rendah.' 
                };
            }

            resolve(result);
        }, delay);
    });
};

/**
 * Implementasi API Asli (Contoh menggunakan DeepSeek V3)
 * Anda bisa mendaftar di platform DeepSeek (deepseek.com) dan mendapatkan API Key.
 */
const callRealDeepSeekAPI = async (surveyData) => {
    const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY; 
    
    if (!API_KEY) {
        throw new Error("API Key tidak ditemukan di .env");
    }

    const prompt = `
    Anda adalah AI analis risiko HR untuk perusahaan finansial.
    Tugas Anda adalah menilai "Integritas dan Risiko Keamanan" dari calon karyawan berdasarkan catatan survei lapangan ke rumah mereka.

    Data Survei:
    - Nama: ${surveyData.employee_name}
    - Alamat KTP: ${surveyData.data?.employeeAddress}
    - Alamat Saat Ini: ${surveyData.data?.employeeCurrentAddress}
    - Ringkasan Wawancara: ${surveyData.data?.interviewSummary || 'Tidak ada catatan'}
    - Koordinat Lokasi: ${surveyData.latitude}, ${surveyData.longitude}

    Berikan hasil analisis dalam format JSON murni:
    {
      "score": (0-100, 100 berarti sangat aman),
      "label": ("Risiko Tinggi" / "Perlu Verifikasi Lanjut" / "Aman (Tervalidasi)"),
      "color": ("var(--danger)" / "var(--warning)" / "var(--success)"),
      "icon": ("🚨" / "⚠️" / "✅"),
      "desc": (Alasan singkat maksimal 2 kalimat)
    }
    `;

    try {
        // Endpoint DeepSeek Chat API sangat mirip dengan OpenAI API
        const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": \`Bearer \${API_KEY}\`
            },
            body: JSON.stringify({
                model: "deepseek-chat", // DeepSeek-V3
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        return JSON.parse(data.choices[0].message.content);
    } catch (error) {
        console.error("AI API Error:", error);
        throw error;
    }
};
