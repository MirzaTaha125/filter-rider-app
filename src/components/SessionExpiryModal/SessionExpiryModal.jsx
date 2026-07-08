import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, LogIn } from 'lucide-react';
import { subscribeToSessionExpired } from '../../utils/authEvents';
import { setAuthToken } from '../../api';
import './SessionExpiryModal.css';

const SessionExpiryModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = subscribeToSessionExpired(() => {
            setIsOpen(true);
        });

        return () => unsubscribe();
    }, []);

    const handleSignInAgain = () => {
        setAuthToken(null);
        setIsOpen(false);
        navigate('/signin');
    };

    if (!isOpen) return null;

    return (
        <div className="session-modal-overlay">
            <div className="session-modal-content">
                <div className="session-modal-header">
                    <div className="session-modal-icon">
                        <AlertCircle size={32} color="#ef4444" />
                    </div>
                    <h2 className="session-modal-title">Session Expired</h2>
                </div>
                <div className="session-modal-body">
                    <p>Your session has expired. Please sign in again to continue managing the platform.</p>
                </div>
                <div className="session-modal-footer">
                    <button className="btn-signin-again" onClick={handleSignInAgain}>
                        <LogIn size={18} />
                        <span>Sign in again</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SessionExpiryModal;
