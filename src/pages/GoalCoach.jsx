import React from 'react';
import GoalCoachWizard from '../components/goals/GoalCoachWizard';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function GoalCoach() {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate(createPageUrl('Home'));
  };

  return <GoalCoachWizard onClose={handleClose} />;
}