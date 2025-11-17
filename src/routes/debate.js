import express from 'express';
import { debateController } from '../controller/debateController.js';

const router = express.Router();

// Start a new debate
router.post('/start', async (req, res) => {
  try {
    const { topic, options } = req.body;
    
    if (!topic) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    const debateId = `debate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const controller = debateController.create(debateId, topic, options);
    
    // Start debate in background
    controller.start().catch(err => {
      console.error('Debate error:', err);
    });

    res.json({
      debateId,
      topic,
      status: 'started',
    });
  } catch (error) {
    console.error('Error starting debate:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get debate status
router.get('/:debateId/status', (req, res) => {
  const { debateId } = req.params;
  const controller = debateController.get(debateId);
  
  if (!controller) {
    return res.status(404).json({ error: 'Debate not found' });
  }

  res.json({
    debateId,
    state: controller.state,
    messageCount: controller.history.length,
  });
});

// Get debate history
router.get('/:debateId/history', (req, res) => {
  const { debateId } = req.params;
  const controller = debateController.get(debateId);
  
  if (!controller) {
    return res.status(404).json({ error: 'Debate not found' });
  }

  res.json({
    debateId,
    history: controller.history,
    state: controller.state,
  });
});

// Pause debate
router.post('/:debateId/pause', (req, res) => {
  const { debateId } = req.params;
  const controller = debateController.get(debateId);
  
  if (!controller) {
    return res.status(404).json({ error: 'Debate not found' });
  }

  controller.pause();
  res.json({ 
    debateId, 
    status: 'paused',
    isPaused: true 
  });
});

// Resume debate
router.post('/:debateId/resume', (req, res) => {
  const { debateId } = req.params;
  const controller = debateController.get(debateId);
  
  if (!controller) {
    return res.status(404).json({ error: 'Debate not found' });
  }

  controller.resume();
  res.json({ 
    debateId, 
    status: 'resumed',
    isPaused: false 
  });
});

export { router as debateRouter };

