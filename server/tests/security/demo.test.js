const request = require('supertest');
const express = require('express');

describe('Security Test Demo - XSS Prevention', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Mock endpoint that should prevent XSS
    app.post('/api/comment', (req, res) => {
      const { comment } = req.body;

      // Simulate XSS protection by escaping HTML
      const escapedComment = comment
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

      res.json({
        success: true,
        originalComment: comment,
        escapedComment: escapedComment,
      });
    });
  });

  test('should prevent XSS script injection', async () => {
    const maliciousScript = '<script>alert("XSS Attack!")</script>';

    const response = await request(app)
      .post('/api/comment')
      .send({ comment: maliciousScript })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.escapedComment).toBe(
      '&lt;script&gt;alert(&quot;XSS Attack!&quot;)&lt;/script&gt;'
    );
    expect(response.body.escapedComment).not.toContain('<script>');
  });

  test('should prevent iframe injection', async () => {
    const iframeAttack = '<iframe src="javascript:alert(\'XSS\')"></iframe>';

    const response = await request(app)
      .post('/api/comment')
      .send({ comment: iframeAttack })
      .expect(200);

    expect(response.body.escapedComment).not.toContain('<iframe');
    expect(response.body.escapedComment).toContain('&lt;iframe');
  });

  test('should allow safe content', async () => {
    const safeComment = 'This is a safe comment with normal text.';

    const response = await request(app)
      .post('/api/comment')
      .send({ comment: safeComment })
      .expect(200);

    expect(response.body.escapedComment).toBe(safeComment);
  });
});
