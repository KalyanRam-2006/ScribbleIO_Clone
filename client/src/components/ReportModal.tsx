import React, { useState } from "react";
import { SupportedLanguage, t } from "../i18n";
import { Player } from "../App";
import { Avatar } from "./Avatar";

interface ReportModalProps {
  target: Player;
  lang: SupportedLanguage;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export function ReportModal({ target, lang, onClose, onSubmit }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState("Inappropriate drawing");
  const [customText, setCustomText] = useState("");

  const reasons = [
    { id: "Inappropriate drawing", label: t("reportReasonNsfw", lang) || "Inappropriate / NSFW drawing" },
    { id: "Offensive chat or name", label: t("reportReasonChat", lang) || "Offensive language or name" },
    { id: "Griefing / Trolling", label: t("reportReasonGrief", lang) || "Griefing, spamming, or trolling" },
    { id: "AFK / Inactive", label: t("reportReasonAfk", lang) || "Inactive or refusing to draw" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reason = customText.trim() ? `${selectedReason}: ${customText.trim()}` : selectedReason;
    onSubmit(reason);
  };

  return (
    <div className="replay-backdrop" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#ef4444] text-2xl font-bold">report</span>
            <div>
              <h3 className="font-extrabold text-lg text-[#dae2ff] m-0">
                {t("reportPlayerTitle", lang) || "Report Player"}
              </h3>
              <p className="text-xs text-[#a08e7a] m-0">
                {t("reportingTarget", lang) || "Reporting"} <b>{target.name}</b>
              </p>
            </div>
          </div>
          <button className="replay-close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="report-modal-body">
          <div className="report-target-preview">
            <Avatar avatar={target.avatar} name={target.name} size="md" />
            <div className="flex flex-col">
              <span className="font-bold text-sm text-[#dae2ff]">{target.name}</span>
              <span className="text-xs text-[#adc6ff]">Score: {target.score} pts</span>
            </div>
          </div>

          <label className="report-label">
            {t("selectReportReason", lang) || "Select violation category:"}
          </label>
          <div className="report-options">
            {reasons.map((r) => (
              <label
                key={r.id}
                className={`report-option ${selectedReason === r.id ? "active" : ""}`}
              >
                <input
                  type="radio"
                  name="reportReason"
                  value={r.id}
                  checked={selectedReason === r.id}
                  onChange={() => setSelectedReason(r.id)}
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>

          <label className="report-label mt-2">
            {t("optionalDetails", lang) || "Additional details (optional):"}
          </label>
          <input
            type="text"
            className="room-input"
            placeholder={t("reportDetailsPlaceholder", lang) || "Provide brief context..."}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            maxLength={60}
          />

          <div className="report-actions">
            <button type="button" className="btn-secondary py-2 px-4" onClick={onClose}>
              {t("cancel", lang) || "Cancel"}
            </button>
            <button type="submit" className="btn-primary bg-[#ef4444] border-[#000c2b] py-2 px-4 text-white">
              {t("submitReport", lang) || "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
