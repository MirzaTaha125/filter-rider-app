const SESSION_EXPIRED_EVENT = 'auth:session-expired';

export const dispatchSessionExpired = () => {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
};

export const subscribeToSessionExpired = (callback) => {
    window.addEventListener(SESSION_EXPIRED_EVENT, callback);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, callback);
};
