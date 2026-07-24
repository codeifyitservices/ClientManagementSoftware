import React from "react";
import DataBackupSection from "./DataBackupSection";

export default function DataBackupPage({ token, showToast, onRestoreSuccess }) {
  return (
    <div className="w-full animate-fade-in font-sans space-y-6">
      <DataBackupSection
        token={token}
        showToast={showToast}
        onRestoreSuccess={onRestoreSuccess}
      />
    </div>
  );
}
