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

  // Track analytics
  useEffect(() => {
    console.log('Analytics: onboarding_started');
  }, []);

  const handleStartTour = () => {
    console.log('Analytics: onboarding_step_completed', { step: 'splash' });
    setCurrentStep('tour');
  };

  const handleTourComplete = () => {
    console.log('Analytics: onboarding_step_completed', { step: 'tour' });
    setCurrentStep('setup');
  };

  const handleSetupComplete = (data) => {
    setUserData(data);
    console.log('Analytics: onboarding_step_completed', { step: 'setup' });
    setCurrentStep('complete');
  };

  const handleFinalComplete = () => {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log('Analytics: onboarding_completed', { duration, userData });

    // Save to localStorage
    localStorage.setItem('chantierpro_onboarding_complete', 'true');
    localStorage.setItem('chantierpro_user_data', JSON.stringify(userData));

    onComplete?.(userData);
  };

  const handleSkip = () => {
    console.log('Analytics: onboarding_skipped', { step: currentStep });
    localStorage.setItem('chantierpro_onboarding_skipped', 'true');
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
