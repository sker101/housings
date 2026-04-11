import React, { useState } from 'react';

export default function ModerationModal({
    isOpen,
    onClose,
    onSubmit,
    title,
    templates,
    targetText
}) {
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [customReason, setCustomReason] = useState('');

    // Reset state when modal opens
    const handleClose = () => {
        setSelectedTemplate('');
        setCustomReason('');
        onClose();
    }

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const finalReason = selectedTemplate === 'other' ? customReason : selectedTemplate;
        if (!finalReason.trim()) {
            return;
        }
        onSubmit(finalReason.trim());
    };

    const isSubmitDisabled =
        !selectedTemplate || (selectedTemplate === 'other' && !customReason.trim());

    return (
        <div
            className="modal-overlay"
            role="presentation"
            onClick={handleClose}
            onKeyDown={(e) => e.key === 'Escape' && handleClose()}
        >
            <div
                className="modal-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                tabIndex={-1}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <h2 id="modal-title">{title}</h2>
                    <button type="button" className="btn btn--icon" onClick={handleClose} aria-label="Close">
                        &times;
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    {targetText && <p className="muted" style={{ marginBottom: '1rem' }}>Target: <strong>{targetText}</strong></p>}

                    <p style={{ marginBottom: '0.5rem' }}>Select a reason:</p>
                    <div className="radio-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                        {templates.map((template, index) => (
                            <label key={index} className="radio-field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="radio"
                                    name="moderation_reason"
                                    value={template}
                                    checked={selectedTemplate === template}
                                    onChange={(e) => setSelectedTemplate(e.target.value)}
                                />
                                {template}
                            </label>
                        ))}

                        <label className="radio-field" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="radio"
                                name="moderation_reason"
                                value="other"
                                checked={selectedTemplate === 'other'}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                            />
                            Other (Custom Reason)
                        </label>
                    </div>

                    {selectedTemplate === 'other' && (
                        <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label htmlFor="custom-reason">Custom Reason</label>
                            <textarea
                                id="custom-reason"
                                className="input-field"
                                rows={3}
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Enter custom reason here..."
                                required
                            />
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
                        <button type="button" className="btn btn--ghost" onClick={handleClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn--primary" disabled={isSubmitDisabled}>
                            Confirm
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
