import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

export const SkeletonText: React.FC<{ width?: string } & SkeletonProps> = ({ width = 'w-24', className = '' }) => (
  <div className={`animate-pulse h-3 bg-gray-200 rounded ${width} ${className}`} />
);

export const SkeletonCircle: React.FC<{ size?: string } & SkeletonProps> = ({ size = 'h-6 w-6', className = '' }) => (
  <div className={`animate-pulse bg-gray-200 rounded-full ${size} ${className}`} />
);



