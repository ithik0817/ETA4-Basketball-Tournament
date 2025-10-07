// src/components/GameRoleSelector.jsx
import React from 'react';

const GameRoleSelector = ({ gameId, tournamentId, onRoleSelect, lockedRoles, myRole }) => {
  const allRoles = ['homeOffense', 'homeDefense', 'awayOffense', 'awayDefense'];

  return (
    <div>
      <h3>Select Your Role</h3>
      {allRoles.map(roleName => {
        const isLockedByAnother = lockedRoles[roleName] && lockedRoles[roleName] !== myRole;
        const isMyRole = lockedRoles[roleName] === myRole;
        return (
          <button
            key={roleName}
            onClick={() => onRoleSelect(roleName)}
            disabled={isLockedByAnother}
            className={isMyRole ? 'active' : ''}
          >
            {roleName}
            {isLockedByAnother && ' (Locked)'}
          </button>
        );
      })}
    </div>
  );
};

export default GameRoleSelector;