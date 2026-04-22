export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  export const getFileExtension = (filename) => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  };
  
  export const validateFile = (file) => {
    const validTypes = Object.values(FILE_TYPES);
    return validTypes.includes(file.type);
  };

  export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  export const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };
  
  export const generateFileTypeIcon = (fileType) => {
    // Returns appropriate icon based on file type
    switch (fileType.toLowerCase()) {
      case 'application/pdf':
        return 'PdfIcon';
      case 'text/plain':
        return 'TextIcon';
      // Add more cases as needed
      default:
        return 'FileIcon';
    }
  };