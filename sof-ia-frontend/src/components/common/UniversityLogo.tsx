import React, { useState } from 'react';
import universityLogo from '/src/assets/logos/university-logo.png';

interface UniversityLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  variant?: 'default' | 'white' | 'inverted';
  showText?: boolean;
  className?: string;
  alt?: string;
  background?: 'yellow' | 'white' | 'indigo' | 'transparent';
  standalone?: boolean;
}

const UniversityLogo: React.FC<UniversityLogoProps> = ({
  size = 'md',
  variant = 'default',
  className = '',
  alt = 'Logo Universitaria de Colombia',
  background = 'yellow',
  standalone = false
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  
  const getSizeClass = (size: string) => {
    const sizes: Record<string, string> = { 
      sm: 'w-8 h-8', 
      md: 'w-12 h-12', 
      lg: 'w-16 h-16', 
      xl: 'w-20 h-20', 
      xxl: 'w-24 h-24' 
    };
    return sizes[size] || 'w-12 h-12';
  };

  const getSizeInPixels = (size: string) => {
    const sizes: Record<string, number> = { 
      sm: 32, 
      md: 48, 
      lg: 64, 
      xl: 80, 
      xxl: 96 
    };
    return sizes[size] || 48;
  };

  const getOptimizedClass = (background: string) => {
    const optimizations: Record<string, string> = {
      yellow: 'drop-shadow-sm',
      white: 'drop-shadow-md',
      indigo: 'drop-shadow-sm',
      transparent: 'drop-shadow-lg'
    };
    return optimizations[background] || '';
  };

  const getVariantFilter = () => {
    if (variant === 'white') {
      return 'brightness-0 invert';
    }
    return '';
  };

  const getVariantTextColor = () => {
    return variant === 'white' ? 'text-white' : 'text-university-indigo';
  };

  const getVariantBgGradient = () => {
    if (variant === 'white') {
      return 'from-white/30 to-white/10';
    }
    return 'from-university-yellow to-university-yellow-dark';
  };

  const getVariantBorderColor = () => {
    if (variant === 'white') {
      return 'border-white/30';
    }
    return 'border-university-yellow-light';
  };

  if (standalone) {
    return (
      <img
        src={universityLogo}
        alt={alt}
        width={getSizeInPixels(size)}
        height={getSizeInPixels(size)}
        className={`transition-opacity duration-300 ${getVariantFilter()} ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${getOptimizedClass(background)} ${className}`}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          console.warn('Logo universitario no disponible');
          setHasError(true);
        }}
      />
    );
  }

  return (
    <div className={`${getSizeClass(size)} ${className} relative`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg" />
      )}
      
      {!hasError ? (
        <img
          src={universityLogo}
          alt={alt}
          width={getSizeInPixels(size)}
          height={getSizeInPixels(size)}
          className={`w-full h-full object-contain transition-opacity duration-300 ${getVariantFilter()} ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${getOptimizedClass(background)}`}
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            console.warn('Logo universitario no disponible');
            setHasError(true);
          }}
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${getVariantBgGradient()} rounded-xl flex items-center justify-center border-2 ${getVariantBorderColor()}`}>
          <span className={`${getVariantTextColor()} font-bold text-lg font-poppins`}>U</span>
        </div>
      )}
    </div>
  );
};

export default UniversityLogo;
