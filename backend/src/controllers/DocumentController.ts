import { Request, Response } from 'express';
import { RAGService } from '../services/RAGService';

export const listDocuments = async (req: Request, res: Response) => {
  try {
    const docs = await RAGService.listDocuments();
    return res.json(docs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const uploadDocument = async (req: Request, res: Response) => {
  try {
    let filename = 'document.txt';
    let mimeType = 'text/plain';
    let content = '';

    if (req.file) {
      filename = req.file.originalname;
      mimeType = req.file.mimetype;
      content = req.file.buffer.toString('utf8');
    } else if (req.body.text && req.body.filename) {
      filename = req.body.filename;
      content = req.body.text;
    } else {
      return res.status(400).json({ error: 'Please provide a file upload or text content with filename.' });
    }

    if (!content.trim()) {
      return res.status(400).json({ error: 'Document content cannot be empty.' });
    }

    const doc = await RAGService.ingestDocument(filename, mimeType, content);
    return res.status(201).json(doc);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await RAGService.deleteDocument(id);
    return res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
