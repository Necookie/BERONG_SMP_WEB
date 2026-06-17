// EnrollForm.tsx — React island for the enrollment/contact form
// Wired to FastAPI via src/lib/api.ts; hydrate with client:visible

import { useState, useId } from 'react';
import { submitLead } from '../../lib/api';
import type { LeadPayload } from '../../lib/api';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function EnrollForm() {
  const id = useId();
  const usernameId  = `${id}-username`;
  const emailId     = `${id}-email`;
  const messageId   = `${id}-message`;

  const [form, setForm] = useState<LeadPayload>({ username: '', email: '', message: '' });
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const result = await submitLead(form);
    if (result.ok) {
      setStatus('success');
      setForm({ username: '', email: '', message: '' });
    } else {
      setStatus('error');
      setErrorMsg(result.error);
    }
  };

  const inputBase =
    'w-full bg-surface-deep border border-border-stone px-4 py-3 font-mono text-xs font-medium text-on-surface placeholder:text-text-obsidian focus:outline-none focus:border-primary transition-colors duration-200';

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Enrollment request form"
      className="space-y-6 max-w-lg mx-auto"
    >
      {/* Username */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor={usernameId}
          className="font-mono text-xs font-medium text-on-surface-variant uppercase tracking-widest"
        >
          Minecraft Username <span aria-hidden="true" className="text-primary">*</span>
        </label>
        <input
          id={usernameId}
          name="username"
          type="text"
          required
          autoComplete="username"
          placeholder="Steve_Researcher"
          value={form.username}
          onChange={handleChange}
          className={inputBase}
          aria-required="true"
          disabled={status === 'loading' || status === 'success'}
        />
      </div>

      {/* Email */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor={emailId}
          className="font-mono text-xs font-medium text-on-surface-variant uppercase tracking-widest"
        >
          Email Address <span aria-hidden="true" className="text-primary">*</span>
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="researcher@lspu.edu.ph"
          value={form.email}
          onChange={handleChange}
          className={inputBase}
          aria-required="true"
          disabled={status === 'loading' || status === 'success'}
        />
      </div>

      {/* Message */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor={messageId}
          className="font-mono text-xs font-medium text-on-surface-variant uppercase tracking-widest"
        >
          Message / Purpose{' '}
          <span className="text-text-obsidian normal-case tracking-normal">(optional)</span>
        </label>
        <textarea
          id={messageId}
          name="message"
          rows={4}
          placeholder="Briefly describe your research purpose or reason for joining…"
          value={form.message}
          onChange={handleChange}
          className={`${inputBase} resize-none`}
          disabled={status === 'loading' || status === 'success'}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'loading' || status === 'success'}
        className="mc-button w-full px-8 py-4 font-mono text-xs font-medium uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
        aria-live="polite"
      >
        {status === 'loading'
          ? 'Sending…'
          : status === 'success'
          ? '✓ Request Sent'
          : 'Request Access'}
      </button>

      {/* Feedback messages */}
      {status === 'success' && (
        <p
          role="status"
          className="font-mono text-xs font-medium text-primary border border-primary/30 bg-primary/10 px-4 py-3"
        >
          ✓ Your enrollment request has been received. We will contact you via email.
        </p>
      )}

      {status === 'error' && (
        <p
          role="alert"
          className="font-mono text-xs font-medium text-error border border-error/30 bg-error/10 px-4 py-3"
        >
          ✗ {errorMsg || 'Something went wrong. Please try again.'}
        </p>
      )}
    </form>
  );
}
