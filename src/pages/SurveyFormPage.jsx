import { useState, useEffect, useCallback } from 'react';
import { usePageMeta } from '../hooks/usePageMeta';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import IdentityStep from '../components/survey/IdentityStep';
import LocationStep from '../components/survey/LocationStep';
import MediaStep from '../components/survey/MediaStep';
import VerificationStep from '../components/survey/VerificationStep';

const STEPS = [
    { key: 'identity', label: 'Identitas', icon: '👤' },
    { key: 'location', label: 'Lokasi', icon: '📍' },
    { key: 'media', label: 'Media', icon: '📷' },
    { key: 'verify', label: 'Verifikasi', icon: '✅' },
];

export default function SurveyFormPage() {
    const { id } = useParams();
    usePageMeta(id && id !== 'new' ? 'Edit Survey' : 'Survey Baru', 'Formulir survey vetting karyawan — identitas, lokasi GPS, foto, rekaman audio, dan tanda tangan digital.');
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();

    const [currentStep, setCurrentStep] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        employee_id: '',
        employee_name: '',
        employee_nik: '',
        employee_dept: '',
        employeePosition: '',
        surveyor_id: user?.id,
        surveyor_name: user?.name,
        created_at: new Date().toISOString(),
        latitude: null,
        longitude: null,
        accuracy: null,
        photo0: null,
        photo1: null,
        photo2: null,
        audioBlob: null,
        audioDuration: 0,
        interviewSummary: '',
        signature: null,
        status: 'draft',
    });

    // Load existing survey if editing
    useEffect(() => {
        if (id && id !== 'new') {
            api.get(`/surveys/${id}`).then((survey) => {
                if (survey) {
                    const mergedData = { ...survey };
                    // Flatten the nested 'data' object back into root for form editing
                    if (survey.data && typeof survey.data === 'object') {
                        Object.assign(mergedData, survey.data);
                    }
                    setFormData(mergedData);
                }
            }).catch(() => {});
        }
    }, [id]);

    const updateField = useCallback((field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    }, []);

    const updateFields = useCallback((fields) => {
        setFormData((prev) => ({ ...prev, ...fields }));
    }, []);

    // Save draft — can be called from ANY step, even if incomplete
    const saveDraft = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const surveyData = {
                employee_id: formData.employee_id,
                employee_name: formData.employee_name,
                employee_nik: formData.employee_nik,
                employee_dept: formData.employee_dept,
                status: 'draft',
                survey_date: formData.created_at,
                latitude: formData.latitude,
                longitude: formData.longitude,
                accuracy: formData.accuracy,
                data: {
                    employeePosition: formData.employeePosition,
                    photo0: formData.photo0,
                    photo1: formData.photo1,
                    photo2: formData.photo2,
                    audioBlob: formData.audioBlob, // ADDED: Save audio locally
                    interviewSummary: formData.interviewSummary,
                    audioDuration: formData.audioDuration,
                },
                signature: formData.signature,
            };
            if (formData.id) {
                await api.put(`/surveys/${formData.id}`, surveyData);
            } else {
                const result = await api.post('/surveys', surveyData);
                updateField('id', result.id);
            }
            toast.success('Draft tersimpan! Anda bisa melanjutkan nanti.');
        } catch (e) {
            toast.error(e.message || 'Gagal menyimpan draft');
        } finally {
            setIsSaving(false);
        }
    };

    // Save and exit — saves as draft and navigates back
    const saveAndExit = async () => {
        await saveDraft();
        navigate('/history');
    };

    const submitSurvey = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const surveyData = {
                employee_id: formData.employee_id,
                employee_name: formData.employee_name,
                employee_nik: formData.employee_nik,
                employee_dept: formData.employee_dept,
                status: 'saved',
                survey_date: formData.created_at,
                latitude: formData.latitude,
                longitude: formData.longitude,
                accuracy: formData.accuracy,
                data: {
                    employeePosition: formData.employeePosition,
                    photo0: formData.photo0,
                    photo1: formData.photo1,
                    photo2: formData.photo2,
                    audioBlob: formData.audioBlob, // ADDED: Save audio locally
                    interviewSummary: formData.interviewSummary,
                    audioDuration: formData.audioDuration,
                },
                signature: formData.signature,
            };
            if (formData.id) {
                await api.put(`/surveys/${formData.id}`, surveyData);
            } else {
                await api.post('/surveys', surveyData);
            }
            toast.success('Survey berhasil dikirim!');
            navigate('/history');
        } catch (e) {
            setIsSaving(false);
            toast.error(e.message || 'Gagal mengirim survey');
        }
    };

    const nextStep = () => {
        if (currentStep < STEPS.length - 1) setCurrentStep((s) => s + 1);
    };

    const prevStep = () => {
        if (currentStep > 0) setCurrentStep((s) => s - 1);
    };

    const renderStep = () => {
        switch (currentStep) {
            case 0:
                return <IdentityStep data={formData} updateField={updateField} updateFields={updateFields} />;
            case 1:
                return <LocationStep data={formData} updateField={updateField} updateFields={updateFields} />;
            case 2:
                return <MediaStep data={formData} updateField={updateField} />;
            case 3:
                return (
                    <VerificationStep
                        data={formData}
                        updateField={updateField}
                        onSubmit={submitSurvey}
                        onSaveDraft={saveDraft}
                        isSaving={isSaving}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">{id && id !== 'new' ? 'Edit Survey' : 'Survey Baru'}</h1>
                <p className="page-subtitle">
                    {STEPS[currentStep].icon} Langkah {currentStep + 1} dari {STEPS.length} — {STEPS[currentStep].label}
                </p>
            </div>

            {/* Stepper — all steps clickable */}
            <div className="stepper">
                {STEPS.map((step, i) => (
                    <div key={step.key} className={`step ${i === currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}>
                        <div
                            className="step-circle"
                            onClick={() => setCurrentStep(i)}
                            style={{ cursor: 'pointer' }}
                            title={`Langkah ${i + 1}: ${step.label}`}
                        >
                            {i < currentStep ? '✓' : i + 1}
                        </div>
                        {i < STEPS.length - 1 && <div className="step-line" />}
                    </div>
                ))}
            </div>

            {/* Step Content */}
            <div className="card" style={{ marginBottom: 20 }}>
                {renderStep()}
            </div>

            {/* Navigation */}
            {currentStep < 3 && (
                <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={prevStep} disabled={currentStep === 0}>
                        ← Sebelumnya
                    </button>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-ghost" onClick={saveAndExit} title="Simpan dan kembali nanti" disabled={isSaving}>
                            {isSaving ? <span className="spinner" /> : '💾'} Simpan & Keluar
                        </button>
                        <button className="btn btn-primary" onClick={nextStep} id="next-step-btn">
                            Selanjutnya →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
