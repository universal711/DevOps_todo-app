export class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AppError';
    }
}

export const handleApiError = async (response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new AppError(errorData.detail || 'API request failed', response.status);
    }
    return response.json();
};

export const showErrorToast = (message) => {
    alert(`Error: ${message}`);
};

export const showSuccessToast = (message) => {
    alert(`Success: ${message}`);
};