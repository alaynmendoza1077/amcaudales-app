import React from 'react';
import AuthModal from './AuthModal';

export default function StartLoginPortal({ onGuestAccess, onClose }) {
  return (
    <AuthModal
      isOpen={true}
      onClose={onClose || onGuestAccess}
    />
  );
}
