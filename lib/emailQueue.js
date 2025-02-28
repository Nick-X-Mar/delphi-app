/**
 * Simple email queue system for handling bulk email operations
 */
import { sendEmail } from './emailService';

class EmailQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.onProgressCallback = null;
    this.onCompleteCallback = null;
  }

  /**
   * Add an email to the queue
   * @param {Object} emailData - Email data including to, subject, body, etc.
   */
  addToQueue(emailData) {
    this.queue.push(emailData);
    return this;
  }

  /**
   * Add multiple emails to the queue
   * @param {Array} emailDataArray - Array of email data objects
   */
  addBulkToQueue(emailDataArray) {
    this.queue = [...this.queue, ...emailDataArray];
    return this;
  }

  /**
   * Set a callback function to be called after each email is sent
   * @param {Function} callback - Function to call with progress information
   */
  onProgress(callback) {
    this.onProgressCallback = callback;
    return this;
  }

  /**
   * Set a callback function to be called when all emails have been sent
   * @param {Function} callback - Function to call when complete
   */
  onComplete(callback) {
    this.onCompleteCallback = callback;
    return this;
  }

  /**
   * Start processing the email queue
   */
  async process() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    const totalEmails = this.queue.length;
    let sentCount = 0;
    let failedCount = 0;

    try {
      while (this.queue.length > 0) {
        const emailData = this.queue.shift();
        try {
          const result = await sendEmail(emailData);
          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
            console.error('Failed to send email:', result.error);
          }
        } catch (error) {
          failedCount++;
          console.error('Failed to send email:', error);
        }

        if (this.onProgressCallback) {
          this.onProgressCallback({
            total: totalEmails,
            sent: sentCount,
            failed: failedCount,
            remaining: this.queue.length,
            percentComplete: Math.round((sentCount + failedCount) / totalEmails * 100)
          });
        }
      }
    } finally {
      this.isProcessing = false;
      if (this.onCompleteCallback) {
        this.onCompleteCallback({
          total: totalEmails,
          sent: sentCount,
          failed: failedCount
        });
      }
    }
  }

  /**
   * Clear the email queue
   */
  clear() {
    if (!this.isProcessing) {
      this.queue = [];
    }
    return this;
  }
}

// Export a singleton instance
export const emailQueue = new EmailQueue(); 