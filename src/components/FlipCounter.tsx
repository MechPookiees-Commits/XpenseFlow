import React from 'react';
import { motion } from 'motion/react';
import { formatINR } from '../utils/numberFormat';

interface FlipCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  includeDecimals?: boolean;
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const SIZE_CONFIG = {
  sm: {
    height: 20,
    fontSize: 'text-sm',
    width: 10,
    symbolSize: 'text-xs',
  },
  md: {
    height: 24,
    fontSize: 'text-base',
    width: 12,
    symbolSize: 'text-sm',
  },
  lg: {
    height: 32,
    fontSize: 'text-2xl',
    width: 16,
    symbolSize: 'text-lg',
  },
  xl: {
    height: 40,
    fontSize: 'text-3xl',
    width: 20,
    symbolSize: 'text-xl',
  },
};

interface DigitWheelProps {
  char: string;
  height: number;
  width: number;
  fontSize: string;
  index: number;
}

const DigitWheel: React.FC<DigitWheelProps> = ({ char, height, width, fontSize, index }) => {
  const isDigit = /\d/.test(char);

  if (!isDigit) {
    return (
      <span
        style={{ height: `${height}px`, lineHeight: `${height}px` }}
        className={`inline-block font-mono font-medium text-slate-400 select-none ${fontSize}`}
      >
        {char}
      </span>
    );
  }

  const digitNumber = parseInt(char, 10);

  return (
    <div
      style={{
        height: `${height}px`,
        width: `${width}px`,
      }}
      className="relative overflow-hidden inline-block font-mono font-semibold tracking-tight select-none"
    >
      {/* Mechanical Dial Roller */}
      <motion.div
        initial={false}
        animate={{ y: -digitNumber * height }}
        transition={{
          type: 'spring',
          stiffness: 280,
          damping: 26,
          mass: 0.8,
          delay: index * 0.03, // Slight cascading roll effect across digits
        }}
        className="absolute top-0 left-0 w-full flex flex-col items-center"
      >
        {DIGITS.map((num) => (
          <div
            key={num}
            style={{
              height: `${height}px`,
              lineHeight: `${height}px`,
            }}
            className={`w-full flex items-center justify-center text-slate-100 ${fontSize}`}
          >
            {num}
          </div>
        ))}
      </motion.div>

      {/* Subtle mechanical top & bottom shadow gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-b from-[#08090d]/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-t from-[#08090d]/80 to-transparent" />
    </div>
  );
};

export const FlipCounter: React.FC<FlipCounterProps> = ({
  value,
  prefix = '₹',
  suffix = '',
  size = 'md',
  className = '',
  includeDecimals = false,
}) => {
  const config = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const formattedString = formatINR(value, includeDecimals);
  const characters = formattedString.split('');

  return (
    <span
      className={`inline-flex items-center align-baseline font-mono tracking-tight text-white ${className}`}
      aria-label={`${prefix}${formattedString}${suffix}`}
    >
      {prefix && (
        <span
          style={{ height: `${config.height}px`, lineHeight: `${config.height}px` }}
          className={`inline-block mr-0.5 text-slate-400 font-normal ${config.symbolSize}`}
        >
          {prefix}
        </span>
      )}

      <span className="inline-flex items-center">
        {characters.map((char, idx) => (
          <DigitWheel
            key={`${idx}-${char}`}
            char={char}
            height={config.height}
            width={config.width}
            fontSize={config.fontSize}
            index={characters.length - idx}
          />
        ))}
      </span>

      {suffix && (
        <span
          style={{ height: `${config.height}px`, lineHeight: `${config.height}px` }}
          className={`inline-block ml-0.5 text-slate-400 font-normal ${config.symbolSize}`}
        >
          {suffix}
        </span>
      )}
    </span>
  );
};
