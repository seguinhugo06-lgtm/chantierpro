import { useState, useEffect } from 'react';
import OnboardingSplash from './OnboardingSplash';
import OnboardingTour from './OnboardingTour';
import OnboardingSetup from './OnboardingSetup';
import OnboardingComplete from './OnboardingComplete';

/**
 * Main Onboarding Container
 * Manages the full onboarding flow: Splash -> Tour -> Setup -> Complete
 */
export default function Onboarding({
  onComplete,
  onSkip,
  isDark = false,
  couleur = '#f97316'
}) {
  const [currentStep, setCurrentStep] = useState('splash'); // splash, tour, setup, complete
  const [userData, setUserData] = useState({
    entreprise: '',
    prenom: '',
    nom: '',
    metier: null,
    taille: null
  });
  const [startTime] = useState(Date.now());

  // Analytics: onboarding_started
  useEffect(() => {}, []);

  const handleStartTour = () => {
    // Analytics: onboarding_step_completed (splash)
    setCurrentStep('tour');
  };

  const handleTourComplete = () => {
    // Analytics: onboarding_step_completed (tour)
    setCurrentStep('setup');
  };

  const handleSetupComplete = (data) => {
    setUserData(data);
    // Analytics: onboarding_step_completed (setup)
    setCurrentStep('complete');
  };

  const handleFinalComplete = () => {
    // Analytics: onboarding_completed
    // Save to localStorage
    localStorage.setItem('batigesti_onboarding_complete', 'true');
    localStorage.setItem('batigesti_user_data', JSON.stringify(userData));

    onComplete?.(userData);
  };

  const handleSkip = () => {
    // Analytics: onboarding_skipped
    localStorage.setItem('batigesti_onboarding_skipped', 'true');
    onSkip?.();
  };

  return (
    <div className="fixed inset-0 z-[100]">
      {currentStep === 'splash' && (
        <OnboardingSplash
          onStart={handleStartTour}
          onSkip={handleSkip}
          isDark={isDark}
          couleur={couleur}
        />
      )}

      {currentStep === 'tour' && (
        <OnboardingTour
          onComplete={handleTourComplete}
          onSkip={handleSkip}
          isDark={isDark}
          couleur={couleur}
        />
      )}

      {currentStep === 'setup' && (
        <OnboardingSetup
          onComplete={handleSetupComplete}
          onSkip={handleSkip}
          initialData={userData}
          isDark={isDark}
          couleur={couleur}
        />
      )}

      {currentStep === 'complete' && (
        <OnboardingComplete
          userData={userData}
          onComplete={handleFinalComplete}
          isDark={isDark}
          couleur={couleur}
        />
      )}
    </div>
  );
}
