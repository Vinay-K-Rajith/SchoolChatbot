import React, { useState } from "react";

const NewProjectForm: React.FC = () => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [result, setResult] = useState<{ apiKey: string; embedCode: string } | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    const res = await fetch("/api/v1/admin/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, name, geminiApiKey }),
    });
    if (res.ok) {
      const data = await res.json();
      setResult({ apiKey: data.apiKey, embedCode: data.embedCode });
      setCode(""); setName(""); setGeminiApiKey("");
    } else {
      const err = await res.json();
      setError(err.error || "Failed to create project.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-2">New Project/School Creation</h2>
      <input className="input" placeholder="Code" value={code} onChange={e => setCode(e.target.value)} required />
      <input className="input" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
      <input className="input" placeholder="Gemini API Key" value={geminiApiKey} onChange={e => setGeminiApiKey(e.target.value)} required />
      <button className="btn btn-primary w-full" type="submit">Create Project</button>
      {error && <div className="text-red-600">{error}</div>}
      {result && (
        <div className="mt-4">
          <div><b>API Key:</b> <code>{result.apiKey}</code></div>
          <div className="mt-2"><b>Embed Code:</b>
            <textarea className="input w-full" value={result.embedCode} readOnly rows={2} />
          </div>
        </div>
      )}
    </form>
  );
};

export default NewProjectForm; 