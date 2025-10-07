// src/components/RoleSelect.jsx
import React from "react";
import { ROLES } from "../constants/roles";

export default function RoleSelect({ roles, activeRoles, onSelectRole }) {
  return (
    <div className="role-select-container">
      <h2>Select Your Tracking Role</h2>
      <div className="role-buttons">
        {roles.map((role) => {
          const isLocked = activeRoles.includes(role.id);
          return (
            <button
              key={role.id}
              className={`role-btn ${isLocked ? "locked" : ""}`}
              onClick={() => !isLocked && onSelectRole(role.id)}
              disabled={isLocked}
            >
              {role.label} {isLocked ? "🔒" : "🟢"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
