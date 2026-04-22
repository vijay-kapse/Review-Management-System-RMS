export const API_ENDPOINTS = {
    LOGIN: '/api/login/',
    REGISTER: '/api/register/',
    UPLOAD: '/api/upload/',
    RESULTS: '/api/results/',
    VIEW_DOCUMENT: (id) => `/api/view/${id}`,
    SAVE_SESSION: '/api/save_session/',
    LOAD_SESSION: '/api/load_session/',
  };
  
  export const FILE_TYPES = {
    PDF: 'application/pdf',
    WORD: 'application/msword',
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    TEXT: 'text/plain',
  };