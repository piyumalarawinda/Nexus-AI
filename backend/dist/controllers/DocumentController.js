"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDocument = exports.uploadDocument = exports.listDocuments = void 0;
const RAGService_1 = require("../services/RAGService");
const listDocuments = async (req, res) => {
    try {
        const docs = await RAGService_1.RAGService.listDocuments();
        return res.json(docs);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.listDocuments = listDocuments;
const uploadDocument = async (req, res) => {
    try {
        let filename = 'document.txt';
        let mimeType = 'text/plain';
        let content = '';
        if (req.file) {
            filename = req.file.originalname;
            mimeType = req.file.mimetype;
            content = req.file.buffer.toString('utf8');
        }
        else if (req.body.text && req.body.filename) {
            filename = req.body.filename;
            content = req.body.text;
        }
        else {
            return res.status(400).json({ error: 'Please provide a file upload or text content with filename.' });
        }
        if (!content.trim()) {
            return res.status(400).json({ error: 'Document content cannot be empty.' });
        }
        const doc = await RAGService_1.RAGService.ingestDocument(filename, mimeType, content);
        return res.status(201).json(doc);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.uploadDocument = uploadDocument;
const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        await RAGService_1.RAGService.deleteDocument(id);
        return res.json({ success: true, message: 'Document deleted successfully.' });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
exports.deleteDocument = deleteDocument;
